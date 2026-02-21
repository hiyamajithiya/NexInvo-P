# NexInvo - Tally-like Voucher System Implementation Plan (Revised)

## Document Info
- **Version:** 2.0
- **Date:** January 19, 2026
- **Status:** PENDING APPROVAL

---

## Executive Summary

This document outlines the comprehensive implementation plan to enhance NexInvo with a **full double-entry accounting system** with Tally-like voucher types. Based on thorough analysis of the existing codebase, significant infrastructure already exists that can be leveraged.

---

## Part 1: Current System Analysis

### 1.1 What Already Exists (Can Be Reused)

| Component | Status | What Exists |
|-----------|--------|-------------|
| **Invoice/Sales** | ✅ Complete | Full invoice system with GST, proforma/tax types, auto-numbering |
| **Receipt (Money In)** | ✅ Complete | Payment model with TDS, auto-receipt generation, PDF |
| **Payment (Expense)** | ✅ Complete | ExpensePayment with 13 categories, payment methods |
| **Supplier Payment** | ✅ Complete | SupplierPayment linked to Purchase |
| **Purchase** | ✅ Complete | Full purchase order with line items, GST, status tracking |
| **Tally Mapping** | ✅ Complete | Ledger mappings (Sales, GST, Round Off, Discount) |
| **Tally Sync** | ✅ Partial | Invoice sync to Tally, import clients/products |
| **Auto-numbering** | ✅ Complete | Pattern exists for Invoice, Receipt, Purchase |
| **GST Calculation** | ✅ Complete | CGST/SGST/IGST with interstate detection |
| **TDS Support** | ✅ Complete | Income Tax TDS and GST TDS in payments |
| **Multi-tenancy** | ✅ Complete | Organization-based isolation |

### 1.2 What Needs to Be Built

| Component | Status | What's Needed |
|-----------|--------|---------------|
| **Chart of Accounts** | ❌ Missing | AccountGroup, LedgerAccount models |
| **Contra Voucher** | ❌ Missing | Bank/Cash transfer entries |
| **Journal Voucher** | ❌ Missing | Manual debit/credit entries |
| **Debit Note** | ❌ Missing | Sales return/adjustment |
| **Credit Note** | ❌ Missing | Purchase return/adjustment |
| **Double-Entry Posting** | ❌ Missing | VoucherEntry model for Dr/Cr |
| **Ledger Reports** | ❌ Missing | Trial Balance, P&L, Balance Sheet |
| **Bank Reconciliation** | ❌ Missing | Statement matching |
| **Opening Balances** | ❌ Missing | Account opening balance setup |

### 1.3 Existing Models Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING MODELS (REUSABLE)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Invoice ──────────┬──── Payment ──────── Receipt               │
│  (Sales)           │     (Money In)       (Acknowledgment)      │
│  - invoice_number  │     - amount                               │
│  - invoice_type    │     - tds_amount                           │
│  - status          │     - gst_tds_amount                       │
│  - GST amounts     │     - amount_received                      │
│  - total_amount    │     - payment_method                       │
│                    │     - reference_number                     │
│                    │                                            │
│  Purchase ─────────┴──── SupplierPayment                        │
│  (Buy)                   (Money Out to Supplier)                │
│  - purchase_number       - amount                               │
│  - supplier              - payment_method                       │
│  - payment_status        - reference_number                     │
│  - GST amounts                                                  │
│                                                                  │
│  ExpensePayment ─────────────────────────────────────────────   │
│  (Money Out - General)                                          │
│  - payee_name                                                   │
│  - category (13 types)                                          │
│  - amount, payment_method                                       │
│                                                                  │
│  TallyMapping ───────────────────────────────────────────────   │
│  - sales_ledger_name                                            │
│  - cgst_ledger_name, sgst_ledger_name, igst_ledger_name        │
│  - round_off_ledger_name, discount_ledger_name                  │
│  - default_party_group                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Feature Analysis from Competitors

### 2.1 LiveKeeping (IndiaMART)
| Feature | Priority | Notes |
|---------|----------|-------|
| Voucher Types (Sales, Purchase, Receipt, Payment, Contra, Debit Note, Credit Note) | High | Core requirement |
| Real-time Tally Sync | High | Already partially exists |
| Daily Book, Ledgers, Trial Balance | High | To be built |
| WhatsApp Payment Reminders | Medium | Can enhance existing |
| Multi-company/Multi-user | ✅ Exists | Already implemented |
| GST Compliance | ✅ Exists | Already implemented |

### 2.2 CredFlow
| Feature | Priority | Notes |
|---------|----------|-------|
| Automated Payment Reminders (SMS/Email/IVR) | Medium | Enhance existing |
| Bank Reconciliation | High | To be built |
| Debtor-wise Analysis | Medium | Report enhancement |
| Projected Cash Flows | Low | Phase 7+ |
| Auto-allocation of Payments | Medium | Enhance existing |
| Daily Business Reports via WhatsApp | Low | Phase 7+ |

### 2.3 Biz Analyst
| Feature | Priority | Notes |
|---------|----------|-------|
| Quotation, Sales Order, Purchase Order | Partial | Invoice exists |
| Payment Reminders via WhatsApp | Medium | Exists in Receipts.js |
| Sales Analysis by Location/Item/Month | Medium | Report enhancement |
| Inactive Customer Tracking | Low | Phase 7+ |
| Offline Capability | Low | Future enhancement |
| Geo-tagged Check-in/out | Low | Not planned |

---

## Part 3: Voucher Types Specification

### 3.1 Data Entry Menu (Final Structure)

```
Data Entry
├── 1. Invoice (Sales) ────── ✅ EXISTS
├── 2. Receipt ─────────────── ✅ EXISTS (needs ledger posting)
├── 3. Payment ─────────────── ✅ EXISTS (needs ledger posting)
├── 4. Contra ──────────────── ❌ NEW
├── 5. Journal Entry ───────── ❌ NEW
├── 6. Purchase ────────────── ✅ EXISTS (Goods Trader)
├── 7. Debit Note ──────────── ❌ NEW
└── 8. Credit Note ─────────── ❌ NEW
```

### 3.2 Voucher Behavior (Tally-like)

#### 1. Invoice (Sales Voucher) - ✅ EXISTS
```
Current: Creates Invoice with GST
Enhancement: Auto-post to ledger on creation

Dr. Sundry Debtors (Customer)      ₹XX,XXX
    Cr. Sales Account                      ₹YY,YYY
    Cr. CGST Payable                       ₹Z,ZZZ
    Cr. SGST Payable                       ₹Z,ZZZ
    (Being goods sold on credit)
```

#### 2. Receipt Voucher - ✅ EXISTS (Enhance)
```
Current: Records payment against invoice
Enhancement: Select Bank/Cash account, auto-post to ledger

Dr. Bank Account / Cash Account    ₹XX,XXX
    Cr. Sundry Debtors (Customer)          ₹XX,XXX
    (Being payment received from customer)
```
**Enhancement Needed:**
- Add Bank/Cash account selection dropdown
- Auto-create ledger entry on save
- Show account balance after entry

#### 3. Payment Voucher - ✅ EXISTS (Enhance)
```
Current: ExpensePayment with categories
Enhancement: Select Bank/Cash as source, Expense/Party as destination

Dr. Expense Account / Supplier     ₹XX,XXX
    Cr. Bank Account / Cash Account        ₹XX,XXX
    (Being payment made for expenses)
```
**Enhancement Needed:**
- Replace "category" with ledger account selection
- Add Bank/Cash account selection
- Auto-create ledger entry on save

#### 4. Contra Voucher - ❌ NEW
```
Dr. Bank Account (HDFC)            ₹XX,XXX
    Cr. Cash Account                       ₹XX,XXX
    (Being cash deposited to bank)
```
**Rules:**
- Only Bank/Cash accounts allowed
- Exactly 2 entries (1 debit, 1 credit)
- Common scenarios:
  - Cash deposited to bank
  - Cash withdrawn from bank
  - Transfer between banks

#### 5. Journal Voucher - ❌ NEW
```
Dr. Account A                      ₹XX,XXX
Dr. Account B                      ₹YY,YYY
    Cr. Account C                          ₹ZZ,ZZZ
    (Narration describing adjustment)
```
**Rules:**
- Multiple debit/credit entries allowed
- **Total Debit MUST equal Total Credit**
- Used for:
  - Opening balance entries
  - Depreciation
  - Accruals/Prepayments
  - Error corrections
  - Year-end adjustments

#### 6. Purchase Voucher - ✅ EXISTS (Enhance)
```
Current: Creates Purchase with GST
Enhancement: Auto-post to ledger

Dr. Purchase Account               ₹YY,YYY
Dr. CGST Input                     ₹Z,ZZZ
Dr. SGST Input                     ₹Z,ZZZ
    Cr. Sundry Creditors (Supplier)        ₹XX,XXX
    (Being goods purchased on credit)
```

#### 7. Debit Note - ❌ NEW
```
Dr. Sundry Creditors (Supplier)    ₹XX,XXX
    Cr. Purchase Return Account            ₹XX,XXX
    (Being goods returned to supplier)
```
**Purpose:** Purchase returns, price adjustments from supplier

#### 8. Credit Note - ❌ NEW
```
Dr. Sales Return Account           ₹XX,XXX
    Cr. Sundry Debtors (Customer)          ₹XX,XXX
    (Being goods returned by customer)
```
**Purpose:** Sales returns, price reductions to customer

---

## Part 4: Database Schema Design

### 4.1 New Models Required

#### Model 1: AccountGroup
```python
class AccountGroup(models.Model):
    """
    Hierarchical account classification (Tally-style groups)
    """
    NATURE_CHOICES = [
        ('debit', 'Debit'),      # Assets, Expenses
        ('credit', 'Credit'),    # Liabilities, Income, Equity
    ]

    organization = ForeignKey(Organization, on_delete=CASCADE)
    name = CharField(max_length=100)
    parent = ForeignKey('self', null=True, blank=True, on_delete=CASCADE)
    nature = CharField(max_length=10, choices=NATURE_CHOICES)
    is_primary = BooleanField(default=False)  # Cannot be deleted
    sequence = IntegerField(default=0)  # Display order

    class Meta:
        unique_together = ['organization', 'name']
        ordering = ['sequence', 'name']
```

**Predefined Groups (Auto-created per Organization):**
```
├── Capital Account (Credit)
│   └── Reserves & Surplus
├── Current Assets (Debit)
│   ├── Bank Accounts
│   ├── Cash-in-Hand
│   ├── Deposits (Asset)
│   ├── Loans & Advances (Asset)
│   ├── Stock-in-Hand
│   └── Sundry Debtors
├── Current Liabilities (Credit)
│   ├── Duties & Taxes
│   │   ├── GST Payable
│   │   ├── GST Input Credit
│   │   └── TDS Payable
│   ├── Provisions
│   └── Sundry Creditors
├── Direct Expenses (Debit)
│   └── Purchase Accounts
├── Direct Income (Credit)
│   └── Sales Accounts
├── Fixed Assets (Debit)
├── Indirect Expenses (Debit)
│   ├── Administrative Expenses
│   ├── Bank Charges
│   └── Miscellaneous Expenses
├── Indirect Income (Credit)
│   ├── Interest Received
│   └── Discount Received
├── Loans (Liability) (Credit)
│   ├── Bank OD/CC
│   ├── Secured Loans
│   └── Unsecured Loans
└── Suspense A/c (Debit)
```

#### Model 2: LedgerAccount
```python
class LedgerAccount(models.Model):
    """
    Individual ledger accounts (Chart of Accounts)
    """
    ACCOUNT_TYPE_CHOICES = [
        ('bank', 'Bank Account'),
        ('cash', 'Cash Account'),
        ('debtor', 'Sundry Debtor'),
        ('creditor', 'Sundry Creditor'),
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('asset', 'Asset'),
        ('liability', 'Liability'),
        ('equity', 'Capital/Equity'),
        ('tax', 'Tax Account'),
        ('stock', 'Stock/Inventory'),
    ]

    organization = ForeignKey(Organization, on_delete=CASCADE)
    account_code = CharField(max_length=20, blank=True)
    name = CharField(max_length=200)
    alias = CharField(max_length=100, blank=True)  # Short name
    group = ForeignKey(AccountGroup, on_delete=PROTECT)
    account_type = CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)

    # Opening Balance (as of financial year start)
    opening_balance = DecimalField(max_digits=15, decimal_places=2, default=0)
    opening_balance_type = CharField(max_length=2, choices=[('Dr', 'Debit'), ('Cr', 'Credit')], default='Dr')
    opening_balance_date = DateField(null=True, blank=True)

    # Current Balance (computed field, updated on each transaction)
    current_balance = DecimalField(max_digits=15, decimal_places=2, default=0)
    current_balance_type = CharField(max_length=2, choices=[('Dr', 'Debit'), ('Cr', 'Credit')], default='Dr')

    # Bank Account Details
    is_bank_account = BooleanField(default=False)
    bank_name = CharField(max_length=100, blank=True)
    account_number = CharField(max_length=50, blank=True)
    ifsc_code = CharField(max_length=20, blank=True)
    branch = CharField(max_length=100, blank=True)

    # Party Link (for Debtor/Creditor accounts)
    linked_client = ForeignKey('Client', null=True, blank=True, on_delete=SET_NULL)
    linked_supplier = ForeignKey('Supplier', null=True, blank=True, on_delete=SET_NULL)

    # GST Details
    gst_applicable = BooleanField(default=False)
    gstin = CharField(max_length=15, blank=True)
    gst_registration_type = CharField(max_length=20, blank=True)  # Regular, Composition, etc.

    # Control flags
    is_active = BooleanField(default=True)
    is_system_account = BooleanField(default=False)  # Cannot delete (Cash, Sales, etc.)
    allow_negative_balance = BooleanField(default=True)

    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['organization', 'name']
        ordering = ['group__sequence', 'name']
```

#### Model 3: Voucher
```python
class Voucher(models.Model):
    """
    Master voucher for all transaction types
    """
    VOUCHER_TYPE_CHOICES = [
        ('sales', 'Sales'),
        ('purchase', 'Purchase'),
        ('receipt', 'Receipt'),
        ('payment', 'Payment'),
        ('contra', 'Contra'),
        ('journal', 'Journal'),
        ('debit_note', 'Debit Note'),
        ('credit_note', 'Credit Note'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('posted', 'Posted'),
        ('cancelled', 'Cancelled'),
    ]

    organization = ForeignKey(Organization, on_delete=CASCADE)
    voucher_type = CharField(max_length=20, choices=VOUCHER_TYPE_CHOICES)
    voucher_number = CharField(max_length=50)  # Auto-generated
    voucher_date = DateField()

    # Reference to existing entities (optional, for linking)
    invoice = ForeignKey('Invoice', null=True, blank=True, on_delete=SET_NULL)
    payment_record = ForeignKey('Payment', null=True, blank=True, on_delete=SET_NULL)
    purchase = ForeignKey('Purchase', null=True, blank=True, on_delete=SET_NULL)
    expense_payment = ForeignKey('ExpensePayment', null=True, blank=True, on_delete=SET_NULL)

    # Party account (for Receipt/Payment vouchers)
    party_ledger = ForeignKey(LedgerAccount, null=True, blank=True,
                              on_delete=PROTECT, related_name='party_vouchers')

    # Totals
    total_amount = DecimalField(max_digits=15, decimal_places=2, default=0)

    # Metadata
    narration = TextField(blank=True)
    reference_number = CharField(max_length=100, blank=True)  # Cheque no, UTR, etc.
    reference_date = DateField(null=True, blank=True)

    # Status
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='posted')

    # Tally Sync
    synced_to_tally = BooleanField(default=False)
    tally_voucher_number = CharField(max_length=50, blank=True)
    tally_sync_date = DateTimeField(null=True, blank=True)

    # Audit
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['organization', 'voucher_type', 'voucher_number']
        ordering = ['-voucher_date', '-created_at']
```

#### Model 4: VoucherEntry
```python
class VoucherEntry(models.Model):
    """
    Individual debit/credit line in a voucher (Double-Entry)
    """
    voucher = ForeignKey(Voucher, on_delete=CASCADE, related_name='entries')
    ledger_account = ForeignKey(LedgerAccount, on_delete=PROTECT)

    debit_amount = DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_amount = DecimalField(max_digits=15, decimal_places=2, default=0)

    # Bill/Invoice reference for party accounts
    bill_reference = CharField(max_length=100, blank=True)
    bill_date = DateField(null=True, blank=True)
    bill_type = CharField(max_length=20, blank=True)  # New Ref, Against Ref, Advance

    # Line narration
    particulars = CharField(max_length=500, blank=True)

    # Display sequence
    sequence = IntegerField(default=0)

    class Meta:
        ordering = ['sequence']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update ledger account balance
        self.ledger_account.update_balance()
```

#### Model 5: VoucherNumberSeries
```python
class VoucherNumberSeries(models.Model):
    """
    Auto-numbering configuration per voucher type per financial year
    """
    organization = ForeignKey(Organization, on_delete=CASCADE)
    voucher_type = CharField(max_length=20)

    prefix = CharField(max_length=20, default='')  # e.g., "RCP/", "PMT/", "CNT/"
    suffix = CharField(max_length=20, blank=True)
    starting_number = IntegerField(default=1)
    current_number = IntegerField(default=0)

    financial_year = CharField(max_length=10)  # "2025-26"

    # Width for zero-padding (e.g., 4 means 0001, 0002)
    number_width = IntegerField(default=4)

    class Meta:
        unique_together = ['organization', 'voucher_type', 'financial_year']
```

**Default Voucher Prefixes:**
| Voucher Type | Prefix | Example |
|-------------|--------|---------|
| Receipt | RCP/ | RCP/2025-26/0001 |
| Payment | PMT/ | PMT/2025-26/0001 |
| Contra | CNT/ | CNT/2025-26/0001 |
| Journal | JV/ | JV/2025-26/0001 |
| Debit Note | DN/ | DN/2025-26/0001 |
| Credit Note | CN/ | CN/2025-26/0001 |

#### Model 6: FinancialYear
```python
class FinancialYear(models.Model):
    """
    Financial year configuration (Indian: April-March)
    """
    organization = ForeignKey(Organization, on_delete=CASCADE)

    name = CharField(max_length=10)  # "2025-26"
    start_date = DateField()  # April 1, 2025
    end_date = DateField()    # March 31, 2026

    is_active = BooleanField(default=True)
    is_closed = BooleanField(default=False)

    # Books Beginning
    books_beginning_date = DateField(null=True, blank=True)

    class Meta:
        unique_together = ['organization', 'name']
        ordering = ['-start_date']
```

#### Model 7: BankReconciliation
```python
class BankReconciliation(models.Model):
    """
    Bank statement reconciliation
    """
    organization = ForeignKey(Organization, on_delete=CASCADE)
    bank_account = ForeignKey(LedgerAccount, on_delete=CASCADE)

    reconciliation_date = DateField()
    statement_date = DateField()

    # Statement Balance
    statement_opening_balance = DecimalField(max_digits=15, decimal_places=2)
    statement_closing_balance = DecimalField(max_digits=15, decimal_places=2)

    # Book Balance
    book_balance = DecimalField(max_digits=15, decimal_places=2)

    # Reconciliation Summary
    reconciled_amount = DecimalField(max_digits=15, decimal_places=2, default=0)
    unreconciled_credits = DecimalField(max_digits=15, decimal_places=2, default=0)
    unreconciled_debits = DecimalField(max_digits=15, decimal_places=2, default=0)

    status = CharField(max_length=20, choices=[
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ], default='in_progress')

    notes = TextField(blank=True)
    completed_by = ForeignKey(User, null=True, on_delete=SET_NULL)
    completed_at = DateTimeField(null=True)

    created_at = DateTimeField(auto_now_add=True)
```

#### Model 8: BankReconciliationItem
```python
class BankReconciliationItem(models.Model):
    """
    Individual reconciliation entries
    """
    reconciliation = ForeignKey(BankReconciliation, on_delete=CASCADE, related_name='items')
    voucher_entry = ForeignKey(VoucherEntry, null=True, on_delete=SET_NULL)

    transaction_date = DateField()
    description = CharField(max_length=500)
    debit_amount = DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_amount = DecimalField(max_digits=15, decimal_places=2, default=0)

    # Bank statement reference
    bank_reference = CharField(max_length=100, blank=True)
    bank_date = DateField(null=True, blank=True)

    is_reconciled = BooleanField(default=False)
    reconciled_date = DateField(null=True, blank=True)

    # For unmatched bank entries (not in books)
    is_bank_only = BooleanField(default=False)
```

---

## Part 5: Integration with Existing System

### 5.1 Auto-create Ledger Accounts

**When Client is Created:**
```python
# In Client.save() or signal
LedgerAccount.objects.create(
    organization=client.organization,
    name=client.name,
    group=AccountGroup.objects.get(name='Sundry Debtors'),
    account_type='debtor',
    linked_client=client,
    gst_applicable=bool(client.gstin),
    gstin=client.gstin or ''
)
```

**When Supplier is Created:**
```python
# In Supplier.save() or signal
LedgerAccount.objects.create(
    organization=supplier.organization,
    name=supplier.name,
    group=AccountGroup.objects.get(name='Sundry Creditors'),
    account_type='creditor',
    linked_supplier=supplier,
    gst_applicable=bool(supplier.gstin),
    gstin=supplier.gstin or ''
)
```

### 5.2 Auto-post Vouchers from Existing Transactions

**When Invoice is Created (Status: Sent):**
```python
def create_sales_voucher(invoice):
    voucher = Voucher.objects.create(
        organization=invoice.organization,
        voucher_type='sales',
        voucher_date=invoice.invoice_date,
        invoice=invoice,
        total_amount=invoice.total_amount,
        narration=f"Sales to {invoice.client.name}",
        status='posted'
    )

    # Debit Customer
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=get_or_create_party_ledger(invoice.client),
        debit_amount=invoice.total_amount,
        sequence=1
    )

    # Credit Sales
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=get_sales_ledger(),
        credit_amount=invoice.subtotal,
        sequence=2
    )

    # Credit CGST/SGST or IGST
    if invoice.cgst_amount:
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=get_cgst_ledger(),
            credit_amount=invoice.cgst_amount,
            sequence=3
        )
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=get_sgst_ledger(),
            credit_amount=invoice.sgst_amount,
            sequence=4
        )
    elif invoice.igst_amount:
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=get_igst_ledger(),
            credit_amount=invoice.igst_amount,
            sequence=3
        )
```

**When Payment (Receipt) is Recorded:**
```python
def create_receipt_voucher(payment, bank_account):
    voucher = Voucher.objects.create(
        organization=payment.organization,
        voucher_type='receipt',
        voucher_date=payment.payment_date,
        payment_record=payment,
        total_amount=payment.amount,
        narration=f"Received from {payment.invoice.client.name}",
        reference_number=payment.reference_number,
        status='posted'
    )

    # Debit Bank/Cash
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=bank_account,
        debit_amount=payment.amount_received,
        sequence=1
    )

    # Debit TDS Receivable (if TDS deducted)
    if payment.tds_amount:
        VoucherEntry.objects.create(
            voucher=voucher,
            ledger_account=get_tds_receivable_ledger(),
            debit_amount=payment.tds_amount,
            sequence=2
        )

    # Credit Customer
    VoucherEntry.objects.create(
        voucher=voucher,
        ledger_account=get_or_create_party_ledger(payment.invoice.client),
        credit_amount=payment.amount,
        bill_reference=payment.invoice.invoice_number,
        sequence=3
    )
```

### 5.3 Enhance Existing Components

**Receipt Form Enhancement:**
```
Current Fields:
- Invoice Selection
- Payment Date
- Amount, TDS, GST TDS
- Payment Method
- Reference Number

New Fields to Add:
+ Bank/Cash Account (Dropdown of Bank/Cash ledgers)
+ (Auto-post to ledger on save)
```

**Payment Form Enhancement:**
```
Current Fields:
- Payment Date
- Payee Name
- Amount
- Category (13 types)
- Payment Method
- Reference Number

Changes:
- Replace "Category" → Expense Ledger Account (Dropdown)
+ Add Bank/Cash Account (Source of payment)
+ (Auto-post to ledger on save)
```

---

## Part 6: API Endpoints

### 6.1 Account Management
```
GET    /api/account-groups/                  - List all groups (tree)
POST   /api/account-groups/                  - Create group
GET    /api/account-groups/{id}/             - Get group
PUT    /api/account-groups/{id}/             - Update group
DELETE /api/account-groups/{id}/             - Delete (if empty)

GET    /api/ledger-accounts/                 - List accounts
POST   /api/ledger-accounts/                 - Create account
GET    /api/ledger-accounts/{id}/            - Get account
PUT    /api/ledger-accounts/{id}/            - Update account
DELETE /api/ledger-accounts/{id}/            - Delete (if no entries)
GET    /api/ledger-accounts/{id}/statement/  - Ledger statement
GET    /api/ledger-accounts/banks/           - Bank accounts only
GET    /api/ledger-accounts/cash/            - Cash accounts only
GET    /api/ledger-accounts/parties/         - Debtor/Creditor accounts
GET    /api/ledger-accounts/expenses/        - Expense accounts
GET    /api/ledger-accounts/income/          - Income accounts
```

### 6.2 Voucher Operations
```
# List all vouchers with filters
GET    /api/vouchers/?type=receipt&from_date=&to_date=

# Contra Voucher
POST   /api/vouchers/contra/                 - Create contra
GET    /api/vouchers/contra/                 - List contra vouchers
GET    /api/vouchers/contra/{id}/            - Get contra details
PUT    /api/vouchers/contra/{id}/            - Update (if draft)
DELETE /api/vouchers/contra/{id}/            - Delete (if draft)

# Journal Voucher
POST   /api/vouchers/journal/                - Create journal
GET    /api/vouchers/journal/                - List journal vouchers
GET    /api/vouchers/journal/{id}/           - Get journal details
PUT    /api/vouchers/journal/{id}/           - Update (if draft)
DELETE /api/vouchers/journal/{id}/           - Delete (if draft)
POST   /api/vouchers/journal/validate/       - Validate (Dr = Cr)

# Debit Note
POST   /api/vouchers/debit-note/             - Create debit note
GET    /api/vouchers/debit-note/             - List debit notes

# Credit Note
POST   /api/vouchers/credit-note/            - Create credit note
GET    /api/vouchers/credit-note/            - List credit notes

# Voucher Actions
POST   /api/vouchers/{id}/cancel/            - Cancel voucher
POST   /api/vouchers/{id}/duplicate/         - Duplicate voucher
```

### 6.3 Reports
```
GET    /api/reports/trial-balance/?as_on=2026-01-19
GET    /api/reports/profit-loss/?from=2025-04-01&to=2026-03-31
GET    /api/reports/balance-sheet/?as_on=2026-01-19
GET    /api/reports/daybook/?date=2026-01-19
GET    /api/reports/cash-book/?from=&to=
GET    /api/reports/bank-book/?account_id=&from=&to=
GET    /api/reports/ledger/?account_id=&from=&to=
GET    /api/reports/receivables/             - Outstanding debtors
GET    /api/reports/payables/                - Outstanding creditors
GET    /api/reports/ageing/receivables/      - Ageing analysis
GET    /api/reports/ageing/payables/         - Ageing analysis
GET    /api/reports/gst-summary/?from=&to=
```

### 6.4 Bank Reconciliation
```
GET    /api/bank-reconciliation/             - List all
POST   /api/bank-reconciliation/             - Start new
GET    /api/bank-reconciliation/{id}/        - Get details
PUT    /api/bank-reconciliation/{id}/        - Update
POST   /api/bank-reconciliation/{id}/complete/ - Mark complete
GET    /api/bank-reconciliation/{id}/unmatched/ - Unmatched items
POST   /api/bank-reconciliation/import/      - Import CSV/Excel
POST   /api/bank-reconciliation/{id}/match/  - Auto-match entries
```

### 6.5 Financial Year
```
GET    /api/financial-years/                 - List years
POST   /api/financial-years/                 - Create year
GET    /api/financial-years/current/         - Get active year
POST   /api/financial-years/{id}/close/      - Close year
POST   /api/financial-years/{id}/reopen/     - Reopen year
```

### 6.6 Tally Sync Enhancement
```
POST   /api/tally-sync/export-vouchers/      - Export vouchers to Tally
GET    /api/tally-sync/pending-vouchers/     - Vouchers pending sync
POST   /api/tally-sync/import-ledgers/       - Import Tally ledgers
POST   /api/tally-sync/sync-chart-of-accounts/ - Sync groups & accounts
```

---

## Part 7: Frontend Components

### 7.1 New Components

| Component | Purpose | Priority |
|-----------|---------|----------|
| **LedgerMaster.js** | CRUD for ledger accounts | Phase 1 |
| **AccountGroups.js** | Manage account groups | Phase 1 |
| **ContraEntry.js** | Create contra vouchers | Phase 2 |
| **JournalEntry.js** | Multi-line journal entry | Phase 2 |
| **DebitNote.js** | Create debit notes | Phase 3 |
| **CreditNote.js** | Create credit notes | Phase 3 |
| **TrialBalance.js** | Trial balance report | Phase 3 |
| **ProfitLoss.js** | P&L statement | Phase 3 |
| **BalanceSheet.js** | Balance sheet | Phase 3 |
| **DayBook.js** | All transactions by date | Phase 3 |
| **LedgerReport.js** | Account-wise statement | Phase 3 |
| **CashBook.js** | Cash transactions | Phase 3 |
| **BankBook.js** | Bank transactions | Phase 3 |
| **BankReconciliation.js** | Bank recon interface | Phase 4 |
| **FinancialYearSettings.js** | FY management | Phase 1 |

### 7.2 Components to Enhance

| Component | Enhancement Needed |
|-----------|-------------------|
| **Receipts.js** | Add Bank/Cash account dropdown |
| **Payments.js** | Replace category with ledger selection |
| **Invoices.js** | Show voucher number after creation |
| **Purchases.js** | Show voucher number after creation |
| **Settings.js** | Add Voucher Numbering tab |
| **Dashboard.js** | Add new menu items |

### 7.3 Updated Menu Structure

```
Dashboard
│
├── Master
│   ├── Clients
│   ├── Suppliers (Goods Trader)
│   ├── Service Master (Service Provider)
│   ├── Product Master (Goods Trader)
│   ├── Ledger Accounts ⭐ NEW
│   └── Account Groups ⭐ NEW
│
├── Data Entry
│   ├── Invoice (Sales)
│   ├── Receipt ⭐ ENHANCED
│   ├── Payment ⭐ ENHANCED
│   ├── Contra ⭐ NEW
│   ├── Journal Entry ⭐ NEW
│   ├── Purchase (Goods Trader)
│   ├── Debit Note ⭐ NEW
│   └── Credit Note ⭐ NEW
│
├── Reports ⭐ EXPANDED
│   ├── Day Book ⭐ NEW
│   ├── Cash Book ⭐ NEW
│   ├── Bank Book ⭐ NEW
│   ├── Ledger ⭐ NEW
│   ├── Trial Balance ⭐ NEW
│   ├── Profit & Loss ⭐ NEW
│   ├── Balance Sheet ⭐ NEW
│   ├── Outstanding
│   │   ├── Receivables
│   │   └── Payables
│   ├── Ageing Analysis ⭐ NEW
│   └── GST Reports (Existing)
│
├── Banking ⭐ NEW
│   ├── Bank Reconciliation
│   └── Bank Statements
│
├── Inventory (Goods Trader - Existing)
│
├── Settings
│   ├── Company Settings
│   ├── Invoice Settings
│   ├── Voucher Numbering ⭐ NEW
│   └── Financial Year ⭐ NEW
│
└── Tally Sync
    ├── Setu Download
    ├── Sync Accounts ⭐ NEW
    └── Sync Vouchers ⭐ NEW
```

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Priority: CRITICAL**

**Backend:**
1. Create `FinancialYear` model + migration
2. Create `AccountGroup` model + migration
3. Create `LedgerAccount` model + migration
4. Create seed data function for default groups
5. Create seed data function for default ledgers (Cash, Sales, Purchase, GST)
6. Add signals to auto-create party ledgers when Client/Supplier created
7. Create serializers for AccountGroup, LedgerAccount
8. Create ViewSets with CRUD operations
9. Add API endpoints

**Frontend:**
1. Create `LedgerMaster.js` - Account list, create, edit, delete
2. Create `AccountGroups.js` - Group hierarchy view
3. Create `FinancialYearSettings.js` - FY management
4. Update Dashboard.js menu with new items
5. Add routes in App.js

**Deliverables:**
- Chart of Accounts fully functional
- Default groups/accounts seeded on organization creation
- Client/Supplier auto-linked to ledger accounts

---

### Phase 2: Voucher System (Week 3-4)
**Priority: CRITICAL**

**Backend:**
1. Create `Voucher` model + migration
2. Create `VoucherEntry` model + migration
3. Create `VoucherNumberSeries` model + migration
4. Create auto-numbering service (by voucher type, by FY)
5. Create voucher validation service (Dr = Cr for Journal)
6. Create `ContraVoucherSerializer` with validation (only Bank/Cash)
7. Create `JournalVoucherSerializer` with multi-line support
8. Create ViewSets for Contra, Journal vouchers
9. Add endpoints

**Frontend:**
1. Create `ContraEntry.js`
   - Source account dropdown (Bank/Cash only)
   - Destination account dropdown (Bank/Cash only)
   - Amount, date, narration
   - Auto-generate voucher number
2. Create `JournalEntry.js`
   - Multi-line grid (Account, Debit, Credit, Particulars)
   - Add/Remove row buttons
   - Running total display
   - Balance validation (Dr = Cr)
   - Date, narration
3. Update Dashboard menu

**Deliverables:**
- Contra entry fully functional
- Journal entry with multi-line and validation
- Auto-numbering working

---

### Phase 3: Reports & Integration (Week 5-6)
**Priority: HIGH**

**Backend:**
1. Create Trial Balance report service
2. Create P&L statement service
3. Create Balance Sheet service
4. Create Day Book report service
5. Create Ledger statement service
6. Create Cash Book, Bank Book services
7. Add report API endpoints
8. Integrate voucher creation with Invoice (auto-post Sales voucher)
9. Integrate voucher creation with Payment (auto-post Receipt voucher)
10. Create Debit Note, Credit Note serializers and views

**Frontend:**
1. Create `TrialBalance.js` - Account-wise balances
2. Create `ProfitLoss.js` - Income vs Expenses
3. Create `BalanceSheet.js` - Assets vs Liabilities
4. Create `DayBook.js` - Date-wise transactions
5. Create `LedgerReport.js` - Account statement
6. Create `CashBook.js`, `BankBook.js`
7. Create `DebitNote.js`, `CreditNote.js`
8. **Enhance `Receipts.js`** - Add Bank/Cash account dropdown
9. **Enhance `Payments.js`** - Replace category with ledger account

**Deliverables:**
- All financial reports working
- Existing Receipt/Payment auto-posting to ledger
- Debit/Credit notes functional

---

### Phase 4: Bank Reconciliation (Week 7)
**Priority: MEDIUM**

**Backend:**
1. Create `BankReconciliation` model + migration
2. Create `BankReconciliationItem` model + migration
3. Create bank statement import parser (CSV, Excel, OFX)
4. Create auto-matching algorithm
5. Create reconciliation ViewSet
6. Add endpoints

**Frontend:**
1. Create `BankReconciliation.js`
   - Bank account selection
   - Statement period selection
   - Statement upload
   - Matching interface
   - Unmatched items list
   - Complete reconciliation

**Deliverables:**
- Bank reconciliation functional
- Statement import working
- Auto-matching implemented

---

### Phase 5: Tally Sync Enhancement (Week 8)
**Priority: MEDIUM**

**Backend:**
1. Create voucher export to Tally XML format
2. Create ledger import from Tally
3. Create chart of accounts sync
4. Update TallyConnector for voucher posting
5. Add sync tracking for vouchers

**Frontend:**
1. Create `TallySyncAccounts.js` - Sync ledgers
2. Create `TallySyncVouchers.js` - Export vouchers
3. Enhance existing Tally sync UI

**Deliverables:**
- Export vouchers to Tally
- Import ledgers from Tally
- Two-way account sync

---

### Phase 6: Advanced Features (Week 9+)
**Priority: LOW**

1. **Payment Reminders Enhancement** (CredFlow-style)
   - Multi-channel reminders (SMS, Email, WhatsApp)
   - Custom reminder schedules
   - Escalation rules

2. **Analytics Dashboard**
   - Cash flow projections
   - Debtor analysis
   - Collection period trends
   - Outstanding ageing graphs

3. **Ageing Reports**
   - Receivables ageing (0-30, 31-60, 61-90, 90+ days)
   - Payables ageing

4. **Opening Balance Import**
   - Bulk import opening balances
   - Tally import for balances

---

## Part 9: Validation Rules

### 9.1 Voucher Validation

| Voucher | Rule |
|---------|------|
| **Contra** | Only Bank/Cash accounts allowed. Exactly 2 entries. |
| **Journal** | Total Debit MUST equal Total Credit. Min 2 entries. |
| **Receipt** | Must have Bank/Cash debit, Party/Income credit. |
| **Payment** | Must have Bank/Cash credit, Party/Expense debit. |
| **Debit Note** | Must reference original transaction. |
| **Credit Note** | Must reference original transaction. |

### 9.2 Account Validation

| Rule | Description |
|------|-------------|
| Bank accounts | Only under "Bank Accounts" group |
| Cash accounts | Only under "Cash-in-Hand" group |
| Party accounts | Under "Sundry Debtors" or "Sundry Creditors" |
| Cannot delete | If account has transactions |
| System accounts | Cannot be deleted (Cash, Sales, Purchase, GST) |

### 9.3 Financial Year Rules

| Rule | Description |
|------|-------------|
| Indian format | April 1 to March 31 |
| One active FY | Only one can be active per organization |
| Cannot backdate | Vouchers cannot be before books beginning date |
| Close year | Generates closing entries, creates next year |

---

## Part 10: Default Account Setup

### 10.1 System Accounts (Auto-created)

| Account | Group | Type | System |
|---------|-------|------|--------|
| Cash | Cash-in-Hand | cash | Yes |
| Sales Account | Sales Accounts | income | Yes |
| Sales Return | Sales Accounts | income | Yes |
| Purchase Account | Purchase Accounts | expense | Yes |
| Purchase Return | Purchase Accounts | expense | Yes |
| CGST Input | GST Input Credit | tax | Yes |
| SGST Input | GST Input Credit | tax | Yes |
| IGST Input | GST Input Credit | tax | Yes |
| CGST Payable | GST Payable | tax | Yes |
| SGST Payable | GST Payable | tax | Yes |
| IGST Payable | GST Payable | tax | Yes |
| TDS Receivable | Loans & Advances | asset | Yes |
| TDS Payable | TDS Payable | liability | Yes |
| Round Off | Indirect Expenses | expense | Yes |
| Discount Allowed | Indirect Expenses | expense | Yes |
| Discount Received | Indirect Income | income | Yes |

### 10.2 User-Created Accounts

Users will create:
- Bank accounts (HDFC, SBI, etc.)
- Expense accounts (Rent, Salary, Utilities, etc.)
- Income accounts (Interest, Commission, etc.)
- Party accounts (auto-created when Client/Supplier added)

---

## Part 11: Summary

### What Will Be Built

| Feature | New/Enhance | Phase |
|---------|-------------|-------|
| Chart of Accounts (Groups + Ledgers) | NEW | 1 |
| Financial Year Management | NEW | 1 |
| Contra Voucher | NEW | 2 |
| Journal Voucher | NEW | 2 |
| Debit Note | NEW | 3 |
| Credit Note | NEW | 3 |
| Receipt with Ledger Posting | ENHANCE | 3 |
| Payment with Ledger Posting | ENHANCE | 3 |
| Trial Balance | NEW | 3 |
| Profit & Loss | NEW | 3 |
| Balance Sheet | NEW | 3 |
| Day Book | NEW | 3 |
| Ledger Report | NEW | 3 |
| Cash Book, Bank Book | NEW | 3 |
| Bank Reconciliation | NEW | 4 |
| Tally Voucher Sync | ENHANCE | 5 |
| Payment Analytics | NEW | 6 |

### Timeline Summary

| Phase | Duration | What's Delivered |
|-------|----------|------------------|
| Phase 1 | 2 weeks | Chart of Accounts, Financial Year |
| Phase 2 | 2 weeks | Contra, Journal vouchers |
| Phase 3 | 2 weeks | All reports, Debit/Credit notes, Integration |
| Phase 4 | 1 week | Bank Reconciliation |
| Phase 5 | 1 week | Tally Sync Enhancement |
| Phase 6 | 2+ weeks | Analytics, Advanced Features |

**Total: 10-12 weeks**

---

## Confirmation Required

This plan is ready for implementation. Please confirm:

1. **Financial Year**: Indian style (April-March) ✅ Confirmed
2. **Voucher Prefix**: RCP/2025-26/0001 format ✅ Confirmed
3. **Auto-create default accounts**: Yes ✅ Confirmed

Shall I proceed with Phase 1 implementation?

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial plan |
| 2.0 | 2026-01-19 | Revised after current system analysis |
