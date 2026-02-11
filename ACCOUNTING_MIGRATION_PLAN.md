# NexInvo: Invoice Management to Double-Entry Accounting Migration Plan

## Executive Summary

This document outlines the comprehensive changes required to transform NexInvo from an invoice management software to a full-fledged double-entry accounting system following Indian accounting standards and Tally-style conventions.

---

## Current State Analysis

### What Exists Today

| Module | Status | Notes |
|--------|--------|-------|
| Clients | Standalone Master | Not linked to any ledger account |
| Suppliers | Backend Model Only | Not exposed in frontend |
| GST | Invoice-level only | CGST/SGST/IGST calculated but not posted to ledger |
| Receipts | Generic payment modes | "cash", "bank_transfer" - not actual bank accounts |
| Payments | Generic payment modes | Same issue as receipts |
| Voucher System | Backend Ready | Models exist but not integrated with transactions |
| Chart of Accounts | Backend Ready | AccountGroup & LedgerAccount models exist |
| Bank Reconciliation | Backend Ready | Not fully utilized |

### Core Issues to Address

1. **Clients are NOT linked to Debtors** - Clients exist as standalone master without corresponding ledger accounts
2. **GST is NOT posted to ledger** - Tax amounts calculated but not creating accounting entries
3. **Bank/Cash selection is generic** - Cannot select specific bank accounts from master
4. **No automatic voucher creation** - Invoices/Receipts/Payments don't create double-entry vouchers
5. **Suppliers not exposed in UI** - Backend model exists but frontend is missing

---

## Proposed Changes

### Phase 1: Standard Chart of Accounts Setup

#### 1.1 Default Account Groups (Tally-style Hierarchy)

```
ASSETS (Primary - Debit Nature)
├── Current Assets
│   ├── Bank Accounts
│   ├── Cash-in-Hand
│   ├── Sundry Debtors
│   ├── Stock-in-Hand
│   └── Loans & Advances (Asset)
├── Fixed Assets
│   ├── Furniture & Fixtures
│   ├── Plant & Machinery
│   ├── Computer & Electronics
│   └── Vehicles
└── Investments

LIABILITIES (Primary - Credit Nature)
├── Current Liabilities
│   ├── Sundry Creditors
│   ├── Duties & Taxes
│   │   ├── GST Payable
│   │   ├── TDS Payable
│   │   └── Other Statutory Dues
│   └── Other Current Liabilities
├── Loans (Liability)
│   ├── Bank OD/CC
│   ├── Secured Loans
│   └── Unsecured Loans
└── Capital Account
    ├── Owner's Capital
    └── Reserves & Surplus

INCOME (Primary - Credit Nature)
├── Direct Income
│   ├── Sales Account
│   └── Service Income
└── Indirect Income
    ├── Interest Received
    ├── Discount Received
    └── Other Income

EXPENSES (Primary - Debit Nature)
├── Direct Expenses
│   ├── Purchases Account
│   └── Direct Labour
└── Indirect Expenses
    ├── Salary & Wages
    ├── Rent
    ├── Utilities (Electricity, Water)
    ├── Office Expenses
    ├── Travelling Expenses
    ├── Professional Fees
    ├── Bank Charges
    ├── Depreciation
    └── Miscellaneous Expenses
```

#### 1.2 Default Ledger Accounts to Auto-Create

| Ledger Name | Account Group | Account Type | Nature |
|-------------|---------------|--------------|--------|
| Cash A/c | Cash-in-Hand | cash | Debit |
| Petty Cash | Cash-in-Hand | cash | Debit |
| Sales Account | Sales Account | income | Credit |
| Service Income | Service Income | income | Credit |
| Purchase Account | Purchases Account | expense | Debit |
| CGST Input | GST Payable | tax | Debit |
| SGST Input | GST Payable | tax | Debit |
| IGST Input | GST Payable | tax | Debit |
| CGST Output | GST Payable | tax | Credit |
| SGST Output | GST Payable | tax | Credit |
| IGST Output | GST Payable | tax | Credit |
| TDS Receivable | Loans & Advances | asset | Debit |
| TDS Payable | TDS Payable | liability | Credit |
| Discount Allowed | Indirect Expenses | expense | Debit |
| Discount Received | Indirect Income | income | Credit |
| Round Off | Indirect Expenses | expense | Debit |

---

### Phase 2: Client → Debtor Integration

#### 2.1 Changes Required

**Backend (models.py):**
- Client model already has `linked_to_ledger` concept (via LedgerAccount.linked_client)
- Need to enforce: Every Client MUST have a corresponding LedgerAccount

**New Workflow:**
1. When Client is created → Auto-create LedgerAccount under "Sundry Debtors" group
2. Ledger name = Client name
3. Account type = "debtor"
4. Copy GSTIN, PAN, contact details to ledger
5. Link via `LedgerAccount.linked_client` FK

**Migration for Existing Clients:**
```python
# For each existing client without linked ledger:
1. Find or create "Sundry Debtors" account group
2. Create LedgerAccount with:
   - name = client.name
   - group = sundry_debtors_group
   - account_type = 'debtor'
   - linked_client = client
   - gstin = client.gstin
   - gst_applicable = True if client.gstin else False
3. Calculate opening balance from unpaid invoices
```

**Frontend Changes (Clients.js):**
- Add "Linked Ledger" display column (read-only)
- Show ledger balance alongside client
- Add "View Ledger" action button

#### 2.2 UI Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│ Clients                                                    [+ Add]  │
├─────────────────────────────────────────────────────────────────────┤
│ Code   │ Name          │ GSTIN          │ Balance    │ Actions     │
├────────┼───────────────┼────────────────┼────────────┼─────────────┤
│ ABC01  │ ABC Corp      │ 27AAACA1234A1Z5│ ₹45,000 Dr │ [Edit][📒]  │
│ XYZ02  │ XYZ Ltd       │ 29AABCX5678B1Z3│ ₹12,500 Dr │ [Edit][📒]  │
└────────┴───────────────┴────────────────┴────────────┴─────────────┘
                                                         [📒] = View Ledger
```

---

### Phase 3: Supplier/Creditor Management

#### 3.1 Changes Required

**Backend:**
- Supplier model exists but needs enhancement
- Link to LedgerAccount under "Sundry Creditors" group

**Frontend:**
- Create new `Suppliers.js` component (similar to Clients.js)
- Fields: Name, Code, GSTIN, PAN, Contact, Bank Details, Address
- Auto-create linked ledger on supplier creation

**Add to Dashboard.js:**
- New menu item: "Suppliers" under Masters section
- Route: `/suppliers`

#### 3.2 Supplier Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Supplier/Vendor name |
| code | string | Auto | Auto-generated like client code |
| gstin | string | No | 15-char GST number |
| pan | string | No | 10-char PAN |
| email | string | No | Contact email |
| phone | string | No | Contact phone |
| address | text | No | Full address |
| city, state, pincode | string | No | Address components |
| bank_name | string | No | For payment |
| account_number | string | No | Bank account |
| ifsc_code | string | No | Bank IFSC |
| payment_terms | FK | No | Default payment terms |

---

### Phase 4: GST → Duties & Taxes Integration

#### 4.1 GST Accounting Logic

**For Sales Invoice (Intra-state):**
```
Dr. Sundry Debtor A/c (Client)     ₹11,800
    Cr. Sales A/c                          ₹10,000
    Cr. CGST Output A/c                    ₹900 (9%)
    Cr. SGST Output A/c                    ₹900 (9%)
```

**For Sales Invoice (Inter-state):**
```
Dr. Sundry Debtor A/c (Client)     ₹11,800
    Cr. Sales A/c                          ₹10,000
    Cr. IGST Output A/c                    ₹1,800 (18%)
```

**For Purchase (Intra-state):**
```
Dr. Purchase A/c                   ₹10,000
Dr. CGST Input A/c                 ₹900
Dr. SGST Input A/c                 ₹900
    Cr. Sundry Creditor A/c (Supplier)     ₹11,800
```

#### 4.2 Backend Changes

**Auto-create GST voucher entries when invoice is posted:**

```python
# In Invoice.post() or signal handler:
def create_sales_voucher(invoice):
    voucher = Voucher.objects.create(
        organization=invoice.organization,
        voucher_type='sales',
        voucher_date=invoice.invoice_date,
        invoice=invoice,
        party_ledger=invoice.client.linked_ledger
    )

    # Debit: Customer/Debtor
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=invoice.client.linked_ledger,
        debit_amount=invoice.grand_total,
        credit_amount=0
    )

    # Credit: Sales Account
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=sales_ledger,
        debit_amount=0,
        credit_amount=invoice.subtotal
    )

    # Credit: GST (based on is_interstate)
    if invoice.is_interstate:
        # IGST
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=igst_output_ledger,
            debit_amount=0,
            credit_amount=invoice.igst_amount
        )
    else:
        # CGST + SGST
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=cgst_output_ledger,
            debit_amount=0,
            credit_amount=invoice.cgst_amount
        )
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=sgst_output_ledger,
            debit_amount=0,
            credit_amount=invoice.sgst_amount
        )

    voucher.post()  # Validate and update ledger balances
```

#### 4.3 GST Account Configuration

Add to Settings:
```
GST Account Configuration:
├── CGST Input Account:  [Dropdown of tax accounts]
├── SGST Input Account:  [Dropdown of tax accounts]
├── IGST Input Account:  [Dropdown of tax accounts]
├── CGST Output Account: [Dropdown of tax accounts]
├── SGST Output Account: [Dropdown of tax accounts]
├── IGST Output Account: [Dropdown of tax accounts]
└── Round Off Account:   [Dropdown of expense accounts]
```

---

### Phase 5: Bank/Cash Account Selection

#### 5.1 Current vs Proposed

**Current (Generic):**
```javascript
payment_method: ['cash', 'bank_transfer', 'cheque', 'upi', 'card']
```

**Proposed (Specific Accounts):**
```javascript
// Payment Method remains for categorization
payment_method: ['cash', 'bank_transfer', 'cheque', 'upi', 'card']

// NEW: Actual account selection
cash_bank_account: [
  { id: 1, name: 'Cash A/c', type: 'cash' },
  { id: 2, name: 'HDFC Bank A/c', type: 'bank' },
  { id: 3, name: 'ICICI Bank A/c', type: 'bank' },
  { id: 4, name: 'Petty Cash', type: 'cash' }
]
```

#### 5.2 UI Changes

**Receipts.js - Add Bank/Cash Selection:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Record Receipt                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Invoice:        [Select Invoice          ▼]                          │
│ Amount:         [₹ 11,800               ]                            │
│ Payment Method: [Bank Transfer          ▼]                           │
│                                                                      │
│ Receive In:     [HDFC Bank A/c          ▼]  ← NEW FIELD             │
│                 Options: Cash A/c, HDFC Bank, ICICI Bank, etc.       │
│                                                                      │
│ Reference No:   [UTR123456789           ]                            │
│ TDS Amount:     [₹ 0                    ]                            │
│                                                                      │
│                              [Cancel] [Save Receipt]                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Auto-filtering Logic:**
- If payment_method = 'cash' → Show only cash-type accounts
- If payment_method = 'bank_transfer'/'cheque'/'upi'/'card' → Show only bank-type accounts

#### 5.3 Backend Changes

**Payment Model Enhancement:**
```python
class Payment(models.Model):
    # ... existing fields ...

    # NEW: Link to actual bank/cash account
    cash_bank_account = models.ForeignKey(
        'LedgerAccount',
        on_delete=models.PROTECT,
        related_name='payments_received',
        null=True,
        limit_choices_to={'account_type__in': ['cash', 'bank']}
    )
```

**Receipt Voucher Creation:**
```python
def create_receipt_voucher(payment):
    voucher = Voucher.objects.create(
        organization=payment.invoice.organization,
        voucher_type='receipt',
        voucher_date=payment.payment_date,
        payment_record=payment
    )

    # Debit: Bank/Cash Account
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=payment.cash_bank_account,
        debit_amount=payment.amount_received,
        credit_amount=0
    )

    # Credit: Customer/Debtor Account
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=payment.invoice.client.linked_ledger,
        debit_amount=0,
        credit_amount=payment.amount_received
    )

    # If TDS deducted
    if payment.tds_amount > 0:
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=tds_receivable_ledger,
            debit_amount=payment.tds_amount,
            credit_amount=0
        )

    voucher.post()
```

---

### Phase 6: Auto-Voucher Creation

#### 6.1 Voucher Types and Triggers

| Transaction | Voucher Type | Trigger | Entries |
|-------------|--------------|---------|---------|
| Sales Invoice Posted | Sales | invoice.status='sent' | Dr: Debtor, Cr: Sales + GST |
| Receipt Recorded | Receipt | payment.save() | Dr: Bank/Cash, Cr: Debtor |
| Purchase Recorded | Purchase | purchase.status='received' | Dr: Purchase + GST, Cr: Creditor |
| Supplier Payment | Payment | supplier_payment.save() | Dr: Creditor, Cr: Bank/Cash |
| Expense Recorded | Payment | expense_payment.save() | Dr: Expense, Cr: Bank/Cash |
| Journal Entry | Journal | Manual | Custom entries |

#### 6.2 Implementation Strategy

**Option A: Django Signals (Recommended)**
```python
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Invoice)
def create_sales_voucher_on_invoice(sender, instance, **kwargs):
    if instance.status == 'sent' and not instance.voucher_created:
        create_sales_voucher(instance)
        instance.voucher_created = True
        instance.save(update_fields=['voucher_created'])
```

**Option B: Override save() method**
```python
class Payment(models.Model):
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            create_receipt_voucher(self)
```

---

### Phase 7: Migration for Existing Data

#### 7.1 Data Migration Steps

**Step 1: Create Default Account Groups**
```python
def create_default_account_groups(organization):
    # Create primary groups: Assets, Liabilities, Income, Expenses
    # Create sub-groups: Bank Accounts, Sundry Debtors, etc.
```

**Step 2: Create Default Ledger Accounts**
```python
def create_default_ledgers(organization):
    # Cash A/c, Sales A/c, Purchase A/c
    # GST Input/Output accounts
    # TDS accounts
```

**Step 3: Link Existing Clients to Debtors**
```python
def link_clients_to_debtors(organization):
    sundry_debtors = AccountGroup.objects.get(
        organization=organization,
        name='Sundry Debtors'
    )

    for client in Client.objects.filter(organization=organization):
        # Check if already linked
        if not LedgerAccount.objects.filter(linked_client=client).exists():
            ledger = LedgerAccount.objects.create(
                organization=organization,
                name=client.name,
                group=sundry_debtors,
                account_type='debtor',
                linked_client=client,
                gstin=client.gstin,
                gst_applicable=bool(client.gstin)
            )

            # Calculate opening balance from unpaid invoices
            unpaid = Invoice.objects.filter(
                client=client,
                payment_status__in=['pending', 'partial']
            ).aggregate(
                total=Sum('grand_total') - Sum('amount_paid')
            )['total'] or 0

            ledger.opening_balance = unpaid
            ledger.opening_balance_type = 'Dr'
            ledger.save()
```

**Step 4: Create Vouchers for Historical Transactions**
```python
def create_historical_vouchers(organization, from_date=None):
    # For each invoice without voucher
    for invoice in Invoice.objects.filter(
        organization=organization,
        voucher__isnull=True,
        status='sent'
    ):
        create_sales_voucher(invoice)

    # For each payment without voucher
    for payment in Payment.objects.filter(
        invoice__organization=organization,
        voucher__isnull=True
    ):
        create_receipt_voucher(payment)
```

#### 7.2 Migration Script Location

Create: `backend/api/management/commands/migrate_to_accounting.py`

```python
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Migrate from invoice management to double-entry accounting'

    def add_arguments(self, parser):
        parser.add_argument('--org', type=int, help='Organization ID')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        # Step 1: Create account groups
        # Step 2: Create default ledgers
        # Step 3: Link clients to debtors
        # Step 4: Link suppliers to creditors
        # Step 5: Create historical vouchers
```

---

### Phase 8: UI/UX Enhancements

#### 8.1 Menu Restructuring

**Current Menu:**
```
├── Dashboard
├── Invoices
├── Receipts
├── Payments
├── Clients
├── Masters
│   ├── Products
│   ├── Services
│   └── Ledger Master
└── Settings
```

**Proposed Menu:**
```
├── Dashboard
├── Transactions
│   ├── Sales Invoice
│   ├── Purchase
│   ├── Receipt
│   ├── Payment
│   ├── Contra (Bank↔Cash)
│   └── Journal
├── Masters
│   ├── Clients (Debtors)     ← Renamed with subtitle
│   ├── Suppliers (Creditors) ← NEW
│   ├── Products
│   ├── Services
│   ├── Bank Accounts         ← NEW (quick access)
│   └── Chart of Accounts
│       ├── Account Groups
│       └── Ledger Accounts
├── Reports
│   ├── Day Book
│   ├── Ledger Report
│   ├── Trial Balance
│   ├── Profit & Loss
│   ├── Balance Sheet
│   ├── Cash Flow
│   ├── Ageing Report
│   └── GST Reports
├── Bank Reconciliation
├── Tally Sync
└── Settings
```

#### 8.2 New Components Needed

| Component | Purpose | Priority |
|-----------|---------|----------|
| Suppliers.js | Supplier/Creditor management | High |
| ContraVoucher.js | Bank to Cash transfers | Medium |
| JournalVoucher.js | Manual journal entries | Medium |
| DayBook.js | Day-wise transaction list | Medium |
| LedgerReport.js | Account-wise transactions | High |
| ProfitLoss.js | P&L Statement | Medium |
| BalanceSheet.js | Balance Sheet | Medium |

---

### Phase 9: Settings Enhancements

#### 9.1 New Accounting Settings Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Settings > Accounting Configuration                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ DEFAULT ACCOUNTS                                                     │
│ ────────────────                                                     │
│ Sales Account:        [Sales Account           ▼]                    │
│ Purchase Account:     [Purchase Account        ▼]                    │
│ Cash Account:         [Cash A/c                ▼]                    │
│ Default Bank:         [HDFC Bank A/c           ▼]                    │
│                                                                      │
│ GST ACCOUNTS                                                         │
│ ────────────                                                         │
│ CGST Input:           [CGST Input A/c          ▼]                    │
│ SGST Input:           [SGST Input A/c          ▼]                    │
│ IGST Input:           [IGST Input A/c          ▼]                    │
│ CGST Output:          [CGST Output A/c         ▼]                    │
│ SGST Output:          [SGST Output A/c         ▼]                    │
│ IGST Output:          [IGST Output A/c         ▼]                    │
│                                                                      │
│ TDS ACCOUNTS                                                         │
│ ────────────                                                         │
│ TDS Receivable:       [TDS Receivable A/c      ▼]                    │
│ TDS Payable:          [TDS Payable A/c         ▼]                    │
│                                                                      │
│ OTHER                                                                │
│ ─────                                                                │
│ Round Off Account:    [Round Off A/c           ▼]                    │
│ Discount Allowed:     [Discount Allowed A/c    ▼]                    │
│ Discount Received:    [Discount Received A/c   ▼]                    │
│                                                                      │
│                                          [Save Settings]             │
└─────────────────────────────────────────────────────────────────────┘
```

#### 9.2 Backend Model

```python
class AccountingSettings(models.Model):
    organization = models.OneToOneField('Organization', on_delete=models.CASCADE)

    # Default Accounts
    default_sales_account = models.ForeignKey('LedgerAccount', ...)
    default_purchase_account = models.ForeignKey('LedgerAccount', ...)
    default_cash_account = models.ForeignKey('LedgerAccount', ...)
    default_bank_account = models.ForeignKey('LedgerAccount', ...)

    # GST Accounts
    cgst_input_account = models.ForeignKey('LedgerAccount', ...)
    sgst_input_account = models.ForeignKey('LedgerAccount', ...)
    igst_input_account = models.ForeignKey('LedgerAccount', ...)
    cgst_output_account = models.ForeignKey('LedgerAccount', ...)
    sgst_output_account = models.ForeignKey('LedgerAccount', ...)
    igst_output_account = models.ForeignKey('LedgerAccount', ...)

    # TDS Accounts
    tds_receivable_account = models.ForeignKey('LedgerAccount', ...)
    tds_payable_account = models.ForeignKey('LedgerAccount', ...)

    # Other
    round_off_account = models.ForeignKey('LedgerAccount', ...)
    discount_allowed_account = models.ForeignKey('LedgerAccount', ...)
    discount_received_account = models.ForeignKey('LedgerAccount', ...)
```

---

## Implementation Priority

### High Priority (Phase 1-3)

1. **Create default Chart of Accounts** - Foundation for everything
2. **Link Clients to Debtors** - Core functionality change
3. **Add Bank/Cash account selection** - Immediate usability improvement
4. **Create Suppliers component** - Creditor management

### Medium Priority (Phase 4-6)

5. **GST ledger integration** - Compliance requirement
6. **Auto-voucher creation** - Accounting automation
7. **Historical data migration** - Data consistency

### Lower Priority (Phase 7-9)

8. **Menu restructuring** - UX improvement
9. **Additional reports** - P&L, Balance Sheet
10. **Settings enhancements** - Configuration options

---

## Files to Modify/Create

### Backend Files

| File | Action | Changes |
|------|--------|---------|
| `api/models.py` | Modify | Add AccountingSettings model, enhance Payment model |
| `api/serializers.py` | Modify | Add serializers for new models/fields |
| `api/views.py` | Modify | Add views for accounting features |
| `api/signals.py` | Create | Auto-voucher creation signals |
| `api/accounting_utils.py` | Create | Helper functions for voucher creation |
| `api/management/commands/migrate_to_accounting.py` | Create | Migration command |
| `api/management/commands/setup_chart_of_accounts.py` | Create | COA setup command |

### Frontend Files

| File | Action | Changes |
|------|--------|---------|
| `Clients.js` | Modify | Show linked ledger, balance |
| `Suppliers.js` | Create | New supplier management component |
| `Receipts.js` | Modify | Add bank/cash account dropdown |
| `Payments.js` | Modify | Add bank/cash account dropdown |
| `Settings.js` | Modify | Add Accounting Configuration tab |
| `Dashboard.js` | Modify | Add menu items, routes |
| `ContraVoucher.js` | Create | Bank-Cash transfer component |
| `JournalVoucher.js` | Create | Manual journal entry component |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing data inconsistency | High | Run migration in dry-run mode first |
| Broken invoice flow | High | Add feature flag for gradual rollout |
| GST calculation errors | High | Extensive testing with various scenarios |
| Performance degradation | Medium | Optimize voucher creation queries |
| User confusion | Medium | Add tooltips and documentation |

---

## Testing Checklist

### Functional Tests

- [ ] Client creation auto-creates debtor ledger
- [ ] Supplier creation auto-creates creditor ledger
- [ ] Invoice posting creates sales voucher with correct GST split
- [ ] Receipt recording creates receipt voucher
- [ ] Payment recording creates payment voucher
- [ ] Bank/cash selection shows correct accounts
- [ ] Ledger balances update correctly after vouchers
- [ ] Trial balance is always balanced
- [ ] GST reports show correct Input/Output totals

### Migration Tests

- [ ] Existing clients get linked ledgers
- [ ] Opening balances are correct
- [ ] Historical vouchers are created
- [ ] No duplicate vouchers
- [ ] Ledger balances match invoice outstanding

---

## Conclusion

This migration transforms NexInvo from a simple invoice management tool into a comprehensive double-entry accounting system. The key changes focus on:

1. **Party Integration**: Clients/Suppliers linked to Debtors/Creditors
2. **Account Selection**: Specific bank/cash accounts instead of generic payment modes
3. **GST Compliance**: Proper tax account posting
4. **Automation**: Auto-voucher creation for all transactions
5. **Reporting**: Full financial statements capability

The foundation (Voucher system, Chart of Accounts) already exists in the backend, making this primarily an integration and UI enhancement effort rather than a complete rebuild.
