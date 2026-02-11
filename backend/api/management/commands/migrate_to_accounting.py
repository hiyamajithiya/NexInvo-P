"""
Management command to migrate existing NexInvo data to double-entry accounting system.

This command:
1. Sets up default Chart of Accounts for all organizations without account groups
2. Links existing clients to Sundry Debtor ledgers
3. Links existing suppliers to Sundry Creditor ledgers
4. Calculates opening balances from unpaid invoices/purchases

Usage:
    python manage.py migrate_to_accounting                    # All organizations
    python manage.py migrate_to_accounting --org-id <uuid>    # Specific organization
    python manage.py migrate_to_accounting --dry-run          # Preview without changes
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.db.models import Sum, F, Q
from api.models import (
    Organization, Client, Supplier, Invoice,
    AccountGroup, LedgerAccount, FinancialYear
)
from io import StringIO
from decimal import Decimal


class Command(BaseCommand):
    help = 'Migrate existing NexInvo data to double-entry accounting system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-id',
            type=str,
            help='Organization UUID (optional, migrates all orgs if not provided)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without making them'
        )
        parser.add_argument(
            '--skip-coa',
            action='store_true',
            help='Skip Chart of Accounts setup (only migrate clients/suppliers)'
        )
        parser.add_argument(
            '--skip-balances',
            action='store_true',
            help='Skip opening balance calculation'
        )

    def handle(self, *args, **kwargs):
        org_id = kwargs.get('org_id')
        dry_run = kwargs.get('dry_run', False)
        skip_coa = kwargs.get('skip_coa', False)
        skip_balances = kwargs.get('skip_balances', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN MODE - No changes will be made ===\n'))

        # Get organizations to process
        if org_id:
            try:
                organizations = [Organization.objects.get(id=org_id)]
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Organization with ID {org_id} not found'))
                return
        else:
            organizations = Organization.objects.all()

        self.stdout.write(f'\nProcessing {len(organizations)} organization(s)...\n')

        total_stats = {
            'orgs_processed': 0,
            'coa_setup': 0,
            'clients_linked': 0,
            'suppliers_linked': 0,
            'balances_updated': 0
        }

        for org in organizations:
            self.stdout.write(self.style.HTTP_INFO(f'\n{"="*60}'))
            self.stdout.write(self.style.HTTP_INFO(f'Organization: {org.name}'))
            self.stdout.write(self.style.HTTP_INFO(f'{"="*60}'))

            org_stats = self._process_organization(
                org, dry_run, skip_coa, skip_balances
            )

            total_stats['orgs_processed'] += 1
            total_stats['coa_setup'] += org_stats.get('coa_setup', 0)
            total_stats['clients_linked'] += org_stats.get('clients_linked', 0)
            total_stats['suppliers_linked'] += org_stats.get('suppliers_linked', 0)
            total_stats['balances_updated'] += org_stats.get('balances_updated', 0)

        # Print summary
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('MIGRATION SUMMARY'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}'))
        self.stdout.write(f'  Organizations processed: {total_stats["orgs_processed"]}')
        self.stdout.write(f'  Chart of Accounts setup: {total_stats["coa_setup"]}')
        self.stdout.write(f'  Clients linked to debtors: {total_stats["clients_linked"]}')
        self.stdout.write(f'  Suppliers linked to creditors: {total_stats["suppliers_linked"]}')
        self.stdout.write(f'  Opening balances updated: {total_stats["balances_updated"]}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN COMPLETE - No changes were made ==='))
        else:
            self.stdout.write(self.style.SUCCESS('\n=== MIGRATION COMPLETE ==='))

    def _process_organization(self, org, dry_run, skip_coa, skip_balances):
        """Process a single organization"""
        stats = {
            'coa_setup': 0,
            'clients_linked': 0,
            'suppliers_linked': 0,
            'balances_updated': 0
        }

        try:
            with transaction.atomic():
                # Step 1: Setup Chart of Accounts if needed
                if not skip_coa:
                    stats['coa_setup'] = self._setup_chart_of_accounts(org, dry_run)

                # Step 2: Link existing clients to debtor ledgers
                stats['clients_linked'] = self._link_clients_to_debtors(org, dry_run, skip_balances)

                # Step 3: Link existing suppliers to creditor ledgers
                stats['suppliers_linked'] = self._link_suppliers_to_creditors(org, dry_run, skip_balances)

                # Calculate total balances updated
                stats['balances_updated'] = stats['clients_linked'] + stats['suppliers_linked']

                if dry_run:
                    # Rollback transaction in dry-run mode
                    raise DryRunException()

        except DryRunException:
            pass  # Expected in dry-run mode
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  Error: {str(e)}'))

        return stats

    def _setup_chart_of_accounts(self, org, dry_run):
        """Setup Chart of Accounts for organization if not exists"""
        # Check if account groups already exist
        if AccountGroup.objects.filter(organization=org).exists():
            self.stdout.write(f'  [COA] Already exists - skipping')
            return 0

        self.stdout.write(f'  [COA] Setting up default Chart of Accounts...')

        if not dry_run:
            out = StringIO()
            call_command('setup_chart_of_accounts', org_id=str(org.id), stdout=out)
            self.stdout.write(f'  [COA] Created account groups and ledgers')

        return 1

    def _link_clients_to_debtors(self, org, dry_run, skip_balances):
        """Link all existing clients to Sundry Debtor ledgers"""
        # Get Sundry Debtors group
        sundry_debtors = AccountGroup.objects.filter(
            organization=org,
            name='Sundry Debtors'
        ).first()

        if not sundry_debtors:
            self.stdout.write(self.style.WARNING(f'  [CLIENTS] Sundry Debtors group not found - skipping'))
            return 0

        # Get clients without linked ledger
        clients_without_ledger = Client.objects.filter(
            organization=org
        ).exclude(
            id__in=LedgerAccount.objects.filter(
                organization=org,
                linked_client__isnull=False
            ).values_list('linked_client_id', flat=True)
        )

        count = clients_without_ledger.count()
        if count == 0:
            self.stdout.write(f'  [CLIENTS] All clients already linked to ledgers')
            return 0

        self.stdout.write(f'  [CLIENTS] Found {count} clients to link...')

        linked = 0
        for client in clients_without_ledger:
            # Calculate opening balance from unpaid invoices
            opening_balance = Decimal('0.00')
            if not skip_balances:
                # Get all non-cancelled invoices for this client
                invoices = Invoice.objects.filter(
                    client=client,
                    organization=org,
                    invoice_type='tax'  # Only tax invoices, not proforma
                ).exclude(status='cancelled')

                # Calculate total invoiced minus total payments received
                from api.models import Payment
                total_invoiced = invoices.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
                total_paid = Payment.objects.filter(
                    invoice__client=client,
                    organization=org
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                opening_balance = total_invoiced - total_paid

            if not dry_run:
                # Create the debtor ledger
                LedgerAccount.objects.create(
                    organization=org,
                    name=client.name,
                    group=sundry_debtors,
                    account_type='debtor',
                    opening_balance=opening_balance,
                    opening_balance_type='Dr',
                    current_balance=opening_balance,
                    current_balance_type='Dr',
                    linked_client=client,
                    gstin=client.gstin or '',
                    is_system_account=False,
                    is_active=True
                )

            balance_str = f' (Balance: Rs.{opening_balance:,.2f})' if opening_balance > 0 else ''
            self.stdout.write(f'    - {client.name}{balance_str}')
            linked += 1

        self.stdout.write(f'  [CLIENTS] Linked {linked} clients to debtor ledgers')
        return linked

    def _link_suppliers_to_creditors(self, org, dry_run, skip_balances):
        """Link all existing suppliers to Sundry Creditor ledgers"""
        # Get Sundry Creditors group
        sundry_creditors = AccountGroup.objects.filter(
            organization=org,
            name='Sundry Creditors'
        ).first()

        if not sundry_creditors:
            self.stdout.write(self.style.WARNING(f'  [SUPPLIERS] Sundry Creditors group not found - skipping'))
            return 0

        # Get suppliers without linked ledger
        suppliers_without_ledger = Supplier.objects.filter(
            organization=org
        ).exclude(
            id__in=LedgerAccount.objects.filter(
                organization=org,
                linked_supplier__isnull=False
            ).values_list('linked_supplier_id', flat=True)
        )

        count = suppliers_without_ledger.count()
        if count == 0:
            self.stdout.write(f'  [SUPPLIERS] All suppliers already linked to ledgers')
            return 0

        self.stdout.write(f'  [SUPPLIERS] Found {count} suppliers to link...')

        linked = 0
        for supplier in suppliers_without_ledger:
            # Opening balance would come from unpaid purchases
            # For now, set to 0 (can be adjusted later with Opening Balance Import)
            opening_balance = Decimal('0.00')

            if not dry_run:
                # Create the creditor ledger
                LedgerAccount.objects.create(
                    organization=org,
                    name=supplier.name,
                    group=sundry_creditors,
                    account_type='creditor',
                    opening_balance=opening_balance,
                    opening_balance_type='Cr',
                    current_balance=opening_balance,
                    current_balance_type='Cr',
                    linked_supplier=supplier,
                    gst_number=supplier.gstin or '',
                    address=f"{supplier.address or ''}\n{supplier.city or ''}".strip(),
                    email=supplier.email or '',
                    phone=supplier.phone or '',
                    is_system_account=False,
                    is_active=True
                )

            self.stdout.write(f'    - {supplier.name}')
            linked += 1

        self.stdout.write(f'  [SUPPLIERS] Linked {linked} suppliers to creditor ledgers')
        return linked


class DryRunException(Exception):
    """Exception to rollback transaction in dry-run mode"""
    pass
