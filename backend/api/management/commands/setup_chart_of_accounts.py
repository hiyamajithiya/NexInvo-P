from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Organization, AccountGroup, LedgerAccount, FinancialYear
from datetime import date


class Command(BaseCommand):
    help = 'Setup default Chart of Accounts (Tally-style account groups and ledger accounts) for an organization'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', type=str, help='Organization UUID (optional, sets up for all orgs if not provided)')
        parser.add_argument('--force', action='store_true', help='Force recreation even if accounts exist')

    def handle(self, *args, **kwargs):
        org_id = kwargs.get('org_id')
        force = kwargs.get('force', False)

        if org_id:
            try:
                organizations = [Organization.objects.get(id=org_id)]
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Organization with ID {org_id} not found'))
                return
        else:
            organizations = Organization.objects.all()

        for org in organizations:
            self.stdout.write(f'\nSetting up Chart of Accounts for: {org.name}')

            # Check if already setup
            if not force and AccountGroup.objects.filter(organization=org, is_primary=True).exists():
                self.stdout.write(self.style.WARNING(f'  Skipped - Account groups already exist (use --force to recreate)'))
                continue

            try:
                with transaction.atomic():
                    # Setup financial year first
                    self._setup_financial_year(org)

                    # Setup account groups
                    groups = self._setup_account_groups(org)

                    # Setup default ledger accounts
                    self._setup_ledger_accounts(org, groups)

                self.stdout.write(self.style.SUCCESS(f'  Successfully setup Chart of Accounts'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Failed: {str(e)}'))

    def _setup_financial_year(self, org):
        """Create current Indian financial year if not exists"""
        today = date.today()

        # Determine current FY (April to March)
        if today.month >= 4:
            fy_start = date(today.year, 4, 1)
            fy_end = date(today.year + 1, 3, 31)
            fy_name = f"{today.year}-{str(today.year + 1)[2:]}"
        else:
            fy_start = date(today.year - 1, 4, 1)
            fy_end = date(today.year, 3, 31)
            fy_name = f"{today.year - 1}-{str(today.year)[2:]}"

        fy, created = FinancialYear.objects.get_or_create(
            organization=org,
            name=fy_name,
            defaults={
                'start_date': fy_start,
                'end_date': fy_end,
                'is_active': True,
                'books_beginning_date': fy_start
            }
        )

        if created:
            self.stdout.write(f'    Created Financial Year: {fy_name}')
        else:
            self.stdout.write(f'    Financial Year exists: {fy_name}')

        return fy

    def _setup_account_groups(self, org):
        """Setup Tally-style hierarchical account groups"""

        # Delete existing primary groups for this org if force
        AccountGroup.objects.filter(organization=org).delete()

        groups = {}

        # PRIMARY GROUPS (Level 1) - Tally's 15 primary groups
        primary_groups = [
            # Capital Account
            ('Capital Account', None, 'credit', 1),

            # Current Assets
            ('Current Assets', None, 'debit', 2),

            # Current Liabilities
            ('Current Liabilities', None, 'credit', 3),

            # Direct Expenses
            ('Direct Expenses', None, 'debit', 4),

            # Direct Incomes
            ('Direct Incomes', None, 'credit', 5),

            # Fixed Assets
            ('Fixed Assets', None, 'debit', 6),

            # Indirect Expenses
            ('Indirect Expenses', None, 'debit', 7),

            # Indirect Incomes
            ('Indirect Incomes', None, 'credit', 8),

            # Investments
            ('Investments', None, 'debit', 9),

            # Loans (Liability)
            ('Loans (Liability)', None, 'credit', 10),

            # Loans & Advances (Asset)
            ('Loans & Advances (Asset)', None, 'debit', 11),

            # Miscellaneous Expenses (ASSET)
            ('Miscellaneous Expenses (ASSET)', None, 'debit', 12),

            # Suspense Account
            ('Suspense Account', None, 'debit', 13),

            # Branch / Divisions
            ('Branch / Divisions', None, 'debit', 14),

            # Purchase Accounts
            ('Purchase Accounts', None, 'debit', 15),

            # Sales Accounts
            ('Sales Accounts', None, 'credit', 16),
        ]

        for name, parent, nature, seq in primary_groups:
            group = AccountGroup.objects.create(
                organization=org,
                name=name,
                parent=None,
                nature=nature,
                is_primary=True,
                sequence=seq
            )
            groups[name] = group

        # SUB-GROUPS (Level 2)
        sub_groups = [
            # Under Capital Account
            ('Reserves & Surplus', 'Capital Account', 'credit', 1),
            ('Capital', 'Capital Account', 'credit', 2),

            # Under Current Assets
            ('Bank Accounts', 'Current Assets', 'debit', 1),
            ('Cash-in-Hand', 'Current Assets', 'debit', 2),
            ('Deposits (Asset)', 'Current Assets', 'debit', 3),
            ('Stock-in-Hand', 'Current Assets', 'debit', 4),
            ('Sundry Debtors', 'Current Assets', 'debit', 5),

            # Under Current Liabilities
            ('Duties & Taxes', 'Current Liabilities', 'credit', 1),
            ('Provisions', 'Current Liabilities', 'credit', 2),
            ('Sundry Creditors', 'Current Liabilities', 'credit', 3),

            # Under Loans (Liability)
            ('Bank OD A/c', 'Loans (Liability)', 'credit', 1),
            ('Secured Loans', 'Loans (Liability)', 'credit', 2),
            ('Unsecured Loans', 'Loans (Liability)', 'credit', 3),
        ]

        for name, parent_name, nature, seq in sub_groups:
            parent = groups.get(parent_name)
            group = AccountGroup.objects.create(
                organization=org,
                name=name,
                parent=parent,
                nature=nature,
                is_primary=False,
                sequence=seq
            )
            groups[name] = group

        self.stdout.write(f'    Created {len(groups)} account groups')
        return groups

    def _setup_ledger_accounts(self, org, groups):
        """Setup default system ledger accounts"""

        ledgers = []

        # Cash Account
        ledgers.append(LedgerAccount(
            organization=org,
            name='Cash',
            group=groups['Cash-in-Hand'],
            account_type='cash',
            is_system_account=True,
            account_code='CASH',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Petty Cash
        ledgers.append(LedgerAccount(
            organization=org,
            name='Petty Cash',
            group=groups['Cash-in-Hand'],
            account_type='cash',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Sales Account
        ledgers.append(LedgerAccount(
            organization=org,
            name='Sales Account',
            group=groups['Sales Accounts'],
            account_type='income',
            is_system_account=True,
            account_code='SALES',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # Service Revenue
        ledgers.append(LedgerAccount(
            organization=org,
            name='Service Revenue',
            group=groups['Sales Accounts'],
            account_type='income',
            is_system_account=True,
            account_code='SERVICE_REVENUE',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # Purchase Account
        ledgers.append(LedgerAccount(
            organization=org,
            name='Purchase Account',
            group=groups['Purchase Accounts'],
            account_type='expense',
            is_system_account=True,
            account_code='PURCHASE',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # GST Input CGST
        ledgers.append(LedgerAccount(
            organization=org,
            name='Input CGST',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='INPUT_CGST',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # GST Input SGST
        ledgers.append(LedgerAccount(
            organization=org,
            name='Input SGST',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='INPUT_SGST',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # GST Input IGST
        ledgers.append(LedgerAccount(
            organization=org,
            name='Input IGST',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='INPUT_IGST',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # GST Output CGST
        ledgers.append(LedgerAccount(
            organization=org,
            name='Output CGST',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='OUTPUT_CGST',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # GST Output SGST
        ledgers.append(LedgerAccount(
            organization=org,
            name='Output SGST',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='OUTPUT_SGST',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # GST Output IGST
        ledgers.append(LedgerAccount(
            organization=org,
            name='Output IGST',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='OUTPUT_IGST',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # TDS Payable
        ledgers.append(LedgerAccount(
            organization=org,
            name='TDS Payable',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='TDS_PAYABLE',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # TDS Receivable
        ledgers.append(LedgerAccount(
            organization=org,
            name='TDS Receivable',
            group=groups['Duties & Taxes'],
            account_type='tax',
            is_system_account=True,
            account_code='TDS_RECEIVABLE',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Discount Allowed
        ledgers.append(LedgerAccount(
            organization=org,
            name='Discount Allowed',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=True,
            account_code='DISCOUNT_ALLOWED',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Discount Received
        ledgers.append(LedgerAccount(
            organization=org,
            name='Discount Received',
            group=groups['Indirect Incomes'],
            account_type='income',
            is_system_account=True,
            account_code='DISCOUNT_RECEIVED',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # Round Off
        ledgers.append(LedgerAccount(
            organization=org,
            name='Round Off',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=True,
            account_code='ROUND_OFF',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Bank Charges
        ledgers.append(LedgerAccount(
            organization=org,
            name='Bank Charges',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Interest Paid
        ledgers.append(LedgerAccount(
            organization=org,
            name='Interest Paid',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Interest Received
        ledgers.append(LedgerAccount(
            organization=org,
            name='Interest Received',
            group=groups['Indirect Incomes'],
            account_type='income',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # Opening Stock
        ledgers.append(LedgerAccount(
            organization=org,
            name='Opening Stock',
            group=groups['Stock-in-Hand'],
            account_type='stock',
            is_system_account=True,
            account_code='OPENING_STOCK',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Closing Stock
        ledgers.append(LedgerAccount(
            organization=org,
            name='Closing Stock',
            group=groups['Stock-in-Hand'],
            account_type='stock',
            is_system_account=True,
            account_code='CLOSING_STOCK',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Proprietor's Capital
        ledgers.append(LedgerAccount(
            organization=org,
            name="Proprietor's Capital",
            group=groups['Capital'],
            account_type='equity',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # Drawings
        ledgers.append(LedgerAccount(
            organization=org,
            name='Drawings',
            group=groups['Capital'],
            account_type='equity',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Profit & Loss A/c
        ledgers.append(LedgerAccount(
            organization=org,
            name='Profit & Loss A/c',
            group=groups['Reserves & Surplus'],
            account_type='equity',
            is_system_account=True,
            account_code='PROFIT_LOSS',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr'
        ))

        # Salary Expense
        ledgers.append(LedgerAccount(
            organization=org,
            name='Salary & Wages',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Rent Expense
        ledgers.append(LedgerAccount(
            organization=org,
            name='Rent',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Electricity Expense
        ledgers.append(LedgerAccount(
            organization=org,
            name='Electricity Charges',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Telephone Expense
        ledgers.append(LedgerAccount(
            organization=org,
            name='Telephone Charges',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Office Expenses
        ledgers.append(LedgerAccount(
            organization=org,
            name='Office Expenses',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Travelling Expenses
        ledgers.append(LedgerAccount(
            organization=org,
            name='Travelling Expenses',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Conveyance
        ledgers.append(LedgerAccount(
            organization=org,
            name='Conveyance',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Printing & Stationery
        ledgers.append(LedgerAccount(
            organization=org,
            name='Printing & Stationery',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Depreciation
        ledgers.append(LedgerAccount(
            organization=org,
            name='Depreciation',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Bad Debts
        ledgers.append(LedgerAccount(
            organization=org,
            name='Bad Debts',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Carriage Inward (Direct Expense)
        ledgers.append(LedgerAccount(
            organization=org,
            name='Carriage Inward',
            group=groups['Direct Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Carriage Outward
        ledgers.append(LedgerAccount(
            organization=org,
            name='Carriage Outward',
            group=groups['Indirect Expenses'],
            account_type='expense',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Fixed Assets - Furniture
        ledgers.append(LedgerAccount(
            organization=org,
            name='Furniture & Fixtures',
            group=groups['Fixed Assets'],
            account_type='asset',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Fixed Assets - Computer
        ledgers.append(LedgerAccount(
            organization=org,
            name='Computer & Electronics',
            group=groups['Fixed Assets'],
            account_type='asset',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Fixed Assets - Vehicle
        ledgers.append(LedgerAccount(
            organization=org,
            name='Vehicle',
            group=groups['Fixed Assets'],
            account_type='asset',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Fixed Assets - Building
        ledgers.append(LedgerAccount(
            organization=org,
            name='Building',
            group=groups['Fixed Assets'],
            account_type='asset',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Fixed Assets - Land
        ledgers.append(LedgerAccount(
            organization=org,
            name='Land',
            group=groups['Fixed Assets'],
            account_type='asset',
            is_system_account=False,
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr'
        ))

        # Bulk create all ledgers
        LedgerAccount.objects.bulk_create(ledgers)

        self.stdout.write(f'    Created {len(ledgers)} ledger accounts')
        return ledgers
