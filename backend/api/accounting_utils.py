"""
Utility functions for double-entry accounting operations.
Handles auto-voucher creation for invoices, purchases, receipts, and payments.
"""

from django.db import transaction
from django.db.models import Max
from decimal import Decimal
from datetime import date
import logging

logger = logging.getLogger(__name__)


def get_or_create_voucher_number(organization, voucher_type, voucher_date=None):
    """
    Generate next voucher number for the given type and financial year.
    """
    from .models import VoucherNumberSeries, FinancialYear

    voucher_date = voucher_date or date.today()

    # Determine financial year (April to March)
    if voucher_date.month >= 4:
        fy_name = f"{voucher_date.year}-{str(voucher_date.year + 1)[2:]}"
    else:
        fy_name = f"{voucher_date.year - 1}-{str(voucher_date.year)[2:]}"

    # Get or create number series
    series, created = VoucherNumberSeries.objects.get_or_create(
        organization=organization,
        voucher_type=voucher_type,
        financial_year=fy_name,
        defaults={
            'prefix': f"{voucher_type.upper()[:3]}/",
            'starting_number': 1,
            'current_number': 0,
            'number_width': 4
        }
    )

    # Generate next number
    return series.get_next_number()


def get_system_ledger(organization, account_code):
    """
    Get a system ledger account by its code.
    Returns None if not found.
    """
    from .models import LedgerAccount

    return LedgerAccount.objects.filter(
        organization=organization,
        account_code=account_code,
        is_active=True
    ).first()


def get_client_ledger(organization, client):
    """
    Get the ledger account linked to a client (Sundry Debtor).
    """
    from .models import LedgerAccount

    return LedgerAccount.objects.filter(
        organization=organization,
        linked_client=client,
        is_active=True
    ).first()


def get_supplier_ledger(organization, supplier):
    """
    Get the ledger account linked to a supplier (Sundry Creditor).
    """
    from .models import LedgerAccount

    return LedgerAccount.objects.filter(
        organization=organization,
        linked_supplier=supplier,
        is_active=True
    ).first()


def create_sales_voucher(invoice, post_immediately=True):
    """
    Create a Sales Voucher for an invoice with proper GST entries.

    Double-Entry for Sales Invoice:
    Dr. Client A/c (Sundry Debtor)     - Grand Total
        Cr. Sales Account              - Subtotal (Taxable Value)
        Cr. Output CGST               - CGST Amount (if local)
        Cr. Output SGST               - SGST Amount (if local)
        Cr. Output IGST               - IGST Amount (if interstate)
        Cr/Dr. Round Off              - Round Off Amount

    Args:
        invoice: Invoice model instance
        post_immediately: If True, post the voucher and update ledger balances

    Returns:
        Voucher instance or None if creation failed
    """
    from .models import Voucher, VoucherEntry, LedgerAccount, AccountGroup

    # Skip if voucher already exists for this invoice
    if Voucher.objects.filter(invoice=invoice, voucher_type='sales').exists():
        logger.debug(f"Sales voucher already exists for invoice {invoice.invoice_number}")
        return None

    # Skip proforma invoices
    if invoice.invoice_type == 'proforma':
        logger.debug(f"Skipping proforma invoice {invoice.invoice_number}")
        return None

    org = invoice.organization

    # Get client's ledger account
    client_ledger = get_client_ledger(org, invoice.client)
    if not client_ledger:
        logger.warning(f"Client ledger not found for {invoice.client.name}, cannot create sales voucher")
        return None

    # Get system ledger accounts
    sales_ledger = get_system_ledger(org, 'SALES')
    output_cgst = get_system_ledger(org, 'OUTPUT_CGST')
    output_sgst = get_system_ledger(org, 'OUTPUT_SGST')
    output_igst = get_system_ledger(org, 'OUTPUT_IGST')
    round_off_ledger = get_system_ledger(org, 'ROUND_OFF')

    if not sales_ledger:
        logger.warning(f"Sales ledger not found for org {org.name}, cannot create sales voucher")
        return None

    try:
        with transaction.atomic():
            # Generate voucher number
            voucher_number = get_or_create_voucher_number(org, 'sales', invoice.invoice_date)

            # Create voucher
            voucher = Voucher.objects.create(
                organization=org,
                voucher_type='sales',
                voucher_number=voucher_number,
                voucher_date=invoice.invoice_date,
                invoice=invoice,
                narration=f"Sales Invoice {invoice.invoice_number} to {invoice.client.name}",
                status='draft'
            )

            entries = []
            sequence = 0

            # Debit: Client Account (Grand Total)
            grand_total = invoice.total_amount or Decimal('0')
            if grand_total > 0:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=client_ledger,
                    debit_amount=grand_total,
                    credit_amount=Decimal('0'),
                    bill_reference=invoice.invoice_number,
                    bill_date=invoice.invoice_date,
                    bill_type='New Ref',
                    particulars=f"Being sales to {invoice.client.name}",
                    sequence=sequence
                ))

            # Credit: Sales Account (Subtotal / Taxable Value)
            subtotal = invoice.subtotal or Decimal('0')
            if subtotal > 0 and sales_ledger:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=sales_ledger,
                    debit_amount=Decimal('0'),
                    credit_amount=subtotal,
                    particulars="Sales",
                    sequence=sequence
                ))

            # Determine GST amounts
            # If individual GST components are stored, use them
            # Otherwise, derive from tax_amount (split 50/50 for CGST+SGST, or full for IGST)
            cgst = Decimal(str(invoice.cgst_amount or 0))
            sgst = Decimal(str(invoice.sgst_amount or 0))
            igst = Decimal(str(invoice.igst_amount or 0))
            total_tax = Decimal(str(invoice.tax_amount or 0))

            if cgst == 0 and sgst == 0 and igst == 0 and total_tax > 0:
                # GST components not stored separately - derive from tax_amount
                is_interstate = getattr(invoice, 'is_interstate', False)
                if is_interstate:
                    igst = total_tax
                else:
                    # Local supply: split equally into CGST and SGST
                    cgst = (total_tax / 2).quantize(Decimal('0.01'))
                    sgst = total_tax - cgst  # Remainder to avoid rounding mismatch

            # Credit: Output CGST
            if cgst > 0 and output_cgst:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=output_cgst,
                    debit_amount=Decimal('0'),
                    credit_amount=cgst,
                    particulars="Output CGST",
                    sequence=sequence
                ))

            # Credit: Output SGST
            if sgst > 0 and output_sgst:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=output_sgst,
                    debit_amount=Decimal('0'),
                    credit_amount=sgst,
                    particulars="Output SGST",
                    sequence=sequence
                ))

            # Credit: Output IGST (for interstate)
            if igst > 0 and output_igst:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=output_igst,
                    debit_amount=Decimal('0'),
                    credit_amount=igst,
                    particulars="Output IGST",
                    sequence=sequence
                ))

            # Round Off (can be Dr or Cr)
            round_off = invoice.round_off or Decimal('0')
            if round_off != 0 and round_off_ledger:
                sequence += 1
                if round_off > 0:
                    # Round off increased the total (Dr. Client, Cr. Round Off)
                    entries.append(VoucherEntry(
                        voucher=voucher,
                        ledger_account=round_off_ledger,
                        debit_amount=Decimal('0'),
                        credit_amount=round_off,
                        particulars="Round Off",
                        sequence=sequence
                    ))
                else:
                    # Round off decreased the total (Dr. Round Off, Cr. Client)
                    entries.append(VoucherEntry(
                        voucher=voucher,
                        ledger_account=round_off_ledger,
                        debit_amount=abs(round_off),
                        credit_amount=Decimal('0'),
                        particulars="Round Off",
                        sequence=sequence
                    ))

            # Bulk create entries
            VoucherEntry.objects.bulk_create(entries)

            # Post voucher if requested and balanced
            if post_immediately and voucher.is_balanced:
                voucher.post()
                logger.info(f"Created and posted sales voucher {voucher_number} for invoice {invoice.invoice_number}")
            else:
                logger.info(f"Created sales voucher {voucher_number} for invoice {invoice.invoice_number} (not posted)")

            return voucher

    except Exception as e:
        logger.error(f"Error creating sales voucher for invoice {invoice.invoice_number}: {str(e)}")
        return None


def create_purchase_voucher(purchase, post_immediately=True):
    """
    Create a Purchase Voucher for a purchase with proper GST entries.

    Double-Entry for Purchase:
    Dr. Purchase Account              - Subtotal (Taxable Value)
    Dr. Input CGST                   - CGST Amount (if local)
    Dr. Input SGST                   - SGST Amount (if local)
    Dr. Input IGST                   - IGST Amount (if interstate)
    Dr/Cr. Round Off                 - Round Off Amount
        Cr. Supplier A/c (Sundry Creditor) - Total Amount

    Args:
        purchase: Purchase model instance
        post_immediately: If True, post the voucher and update ledger balances

    Returns:
        Voucher instance or None if creation failed
    """
    from .models import Voucher, VoucherEntry

    # Skip if voucher already exists for this purchase
    if Voucher.objects.filter(purchase=purchase, voucher_type='purchase').exists():
        logger.debug(f"Purchase voucher already exists for purchase {purchase.purchase_number}")
        return None

    org = purchase.organization

    # Get supplier's ledger account
    supplier_ledger = get_supplier_ledger(org, purchase.supplier)
    if not supplier_ledger:
        logger.warning(f"Supplier ledger not found for {purchase.supplier.name}, cannot create purchase voucher")
        return None

    # Get system ledger accounts
    purchase_ledger = get_system_ledger(org, 'PURCHASE')
    input_cgst = get_system_ledger(org, 'INPUT_CGST')
    input_sgst = get_system_ledger(org, 'INPUT_SGST')
    input_igst = get_system_ledger(org, 'INPUT_IGST')
    round_off_ledger = get_system_ledger(org, 'ROUND_OFF')

    if not purchase_ledger:
        logger.warning(f"Purchase ledger not found for org {org.name}, cannot create purchase voucher")
        return None

    try:
        with transaction.atomic():
            # Generate voucher number
            voucher_number = get_or_create_voucher_number(org, 'purchase', purchase.purchase_date)

            # Create voucher
            voucher = Voucher.objects.create(
                organization=org,
                voucher_type='purchase',
                voucher_number=voucher_number,
                voucher_date=purchase.purchase_date,
                purchase=purchase,
                narration=f"Purchase {purchase.purchase_number} from {purchase.supplier.name}",
                status='draft'
            )

            entries = []
            sequence = 0

            # Debit: Purchase Account (Subtotal / Taxable Value)
            subtotal = purchase.subtotal or Decimal('0')
            if subtotal > 0 and purchase_ledger:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=purchase_ledger,
                    debit_amount=subtotal,
                    credit_amount=Decimal('0'),
                    particulars="Purchase",
                    sequence=sequence
                ))

            # Debit: Input CGST
            cgst = purchase.cgst_amount or Decimal('0')
            if cgst > 0 and input_cgst:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=input_cgst,
                    debit_amount=cgst,
                    credit_amount=Decimal('0'),
                    particulars="Input CGST",
                    sequence=sequence
                ))

            # Debit: Input SGST
            sgst = purchase.sgst_amount or Decimal('0')
            if sgst > 0 and input_sgst:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=input_sgst,
                    debit_amount=sgst,
                    credit_amount=Decimal('0'),
                    particulars="Input SGST",
                    sequence=sequence
                ))

            # Debit: Input IGST (for interstate)
            igst = purchase.igst_amount or Decimal('0')
            if igst > 0 and input_igst:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=input_igst,
                    debit_amount=igst,
                    credit_amount=Decimal('0'),
                    particulars="Input IGST",
                    sequence=sequence
                ))

            # Round Off (can be Dr or Cr)
            round_off = getattr(purchase, 'round_off', None) or Decimal('0')
            if round_off != 0 and round_off_ledger:
                sequence += 1
                if round_off > 0:
                    # Round off increased the total (Dr. Supplier, Cr. Round Off)
                    entries.append(VoucherEntry(
                        voucher=voucher,
                        ledger_account=round_off_ledger,
                        debit_amount=round_off,
                        credit_amount=Decimal('0'),
                        particulars="Round Off",
                        sequence=sequence
                    ))
                else:
                    # Round off decreased the total
                    entries.append(VoucherEntry(
                        voucher=voucher,
                        ledger_account=round_off_ledger,
                        debit_amount=Decimal('0'),
                        credit_amount=abs(round_off),
                        particulars="Round Off",
                        sequence=sequence
                    ))

            # Credit: Supplier Account (Total Amount)
            # Use total_amount field (not grand_total)
            total_amount = purchase.total_amount or Decimal('0')
            if total_amount > 0:
                sequence += 1
                entries.append(VoucherEntry(
                    voucher=voucher,
                    ledger_account=supplier_ledger,
                    debit_amount=Decimal('0'),
                    credit_amount=total_amount,
                    bill_reference=purchase.purchase_number,
                    bill_date=purchase.purchase_date,
                    bill_type='New Ref',
                    particulars=f"Being purchase from {purchase.supplier.name}",
                    sequence=sequence
                ))

            # Bulk create entries
            VoucherEntry.objects.bulk_create(entries)

            # Post voucher if requested and balanced
            if post_immediately and voucher.is_balanced:
                voucher.post()
                logger.info(f"Created and posted purchase voucher {voucher_number} for purchase {purchase.purchase_number}")
            else:
                logger.info(f"Created purchase voucher {voucher_number} for purchase {purchase.purchase_number} (not posted)")

            return voucher

    except Exception as e:
        logger.error(f"Error creating purchase voucher for purchase {purchase.purchase_number}: {str(e)}")
        return None


def get_bank_cash_ledger_from_method(organization, payment_method):
    """
    Get appropriate bank/cash ledger based on payment method.
    Falls back to Cash account if no specific account found.
    """
    from .models import LedgerAccount

    # Map payment methods to account types
    if payment_method in ['cash']:
        return get_system_ledger(organization, 'CASH')
    elif payment_method in ['bank_transfer', 'cheque', 'upi', 'card']:
        # Try to find any bank account
        bank_account = LedgerAccount.objects.filter(
            organization=organization,
            account_type='bank',
            is_active=True
        ).first()
        if bank_account:
            return bank_account
        # Fall back to Cash
        return get_system_ledger(organization, 'CASH')
    else:
        return get_system_ledger(organization, 'CASH')


def create_receipt_voucher(payment, post_immediately=True):
    """
    Create a Receipt Voucher when payment is received against an invoice.

    Double-Entry for Receipt:
    Dr. Bank/Cash A/c                - Amount Received
        Cr. Client A/c (Sundry Debtor) - Amount Received

    Args:
        payment: Payment model instance (payment against invoice)
        post_immediately: If True, post the voucher and update ledger balances

    Returns:
        Voucher instance or None if creation failed
    """
    from .models import Voucher, VoucherEntry

    # Skip if voucher already exists for this payment
    if Voucher.objects.filter(payment_record=payment, voucher_type='receipt').exists():
        logger.debug(f"Receipt voucher already exists for payment")
        return None

    org = payment.organization
    invoice = payment.invoice

    # Get client's ledger account
    client_ledger = get_client_ledger(org, invoice.client)
    if not client_ledger:
        logger.warning(f"Client ledger not found for {invoice.client.name}, cannot create receipt voucher")
        return None

    # Get bank/cash ledger based on payment method
    bank_cash_ledger = get_bank_cash_ledger_from_method(org, payment.payment_method)

    if not bank_cash_ledger:
        logger.warning(f"No bank/cash ledger available for org {org.name}, cannot create receipt voucher")
        return None

    try:
        with transaction.atomic():
            # Generate voucher number
            voucher_number = get_or_create_voucher_number(org, 'receipt', payment.payment_date)

            # Create voucher
            voucher = Voucher.objects.create(
                organization=org,
                voucher_type='receipt',
                voucher_number=voucher_number,
                voucher_date=payment.payment_date,
                payment_record=payment,
                invoice=invoice,
                narration=f"Receipt from {invoice.client.name} against Invoice {invoice.invoice_number}",
                status='draft'
            )

            entries = []
            # Use amount_received (actual cash/bank receipt) instead of total amount
            amount = payment.amount_received or payment.amount or Decimal('0')

            # Debit: Bank/Cash Account
            entries.append(VoucherEntry(
                voucher=voucher,
                ledger_account=bank_cash_ledger,
                debit_amount=amount,
                credit_amount=Decimal('0'),
                particulars=f"Received from {invoice.client.name}",
                sequence=1
            ))

            # Credit: Client Account (full amount including TDS)
            total_amount = payment.amount or Decimal('0')
            entries.append(VoucherEntry(
                voucher=voucher,
                ledger_account=client_ledger,
                debit_amount=Decimal('0'),
                credit_amount=total_amount,
                bill_reference=invoice.invoice_number,
                bill_date=invoice.invoice_date,
                bill_type='Against Ref',
                particulars=f"Against Invoice {invoice.invoice_number}",
                sequence=2
            ))

            # Handle TDS if applicable (Dr. TDS Receivable)
            tds_amount = (payment.tds_amount or Decimal('0')) + (payment.gst_tds_amount or Decimal('0'))
            if tds_amount > 0:
                tds_ledger = get_system_ledger(org, 'TDS_RECEIVABLE')
                if tds_ledger:
                    entries.append(VoucherEntry(
                        voucher=voucher,
                        ledger_account=tds_ledger,
                        debit_amount=tds_amount,
                        credit_amount=Decimal('0'),
                        particulars="TDS Deducted",
                        sequence=3
                    ))

            # Bulk create entries
            VoucherEntry.objects.bulk_create(entries)

            # Post voucher if requested and balanced
            if post_immediately and voucher.is_balanced:
                voucher.post()
                logger.info(f"Created and posted receipt voucher {voucher_number}")
            else:
                logger.info(f"Created receipt voucher {voucher_number} (not posted)")

            return voucher

    except Exception as e:
        logger.error(f"Error creating receipt voucher: {str(e)}")
        return None


def get_expense_ledger_from_category(organization, category):
    """
    Get appropriate expense ledger based on expense category.
    Maps ExpensePayment categories to system ledger accounts.
    """
    from .models import LedgerAccount

    # Map categories to ledger names
    category_to_ledger = {
        'salary': 'Salary & Wages',
        'rent': 'Rent',
        'utilities': 'Electricity Charges',
        'office': 'Office Expenses',
        'travel': 'Travelling Expenses',
        'professional': 'Office Expenses',  # Map to Office Expenses
        'maintenance': 'Office Expenses',
        'communication': 'Telephone Charges',
        'insurance': 'Office Expenses',
        'taxes': 'Round Off',  # For misc taxes
        'bank_charges': 'Bank Charges',
        'general': 'Office Expenses',
        'other': 'Office Expenses',
    }

    ledger_name = category_to_ledger.get(category, 'Office Expenses')

    # Try to find the ledger by name
    ledger = LedgerAccount.objects.filter(
        organization=organization,
        name=ledger_name,
        is_active=True
    ).first()

    if not ledger:
        # Fall back to any expense type ledger in Indirect Expenses
        ledger = LedgerAccount.objects.filter(
            organization=organization,
            account_type='expense',
            is_active=True
        ).first()

    return ledger


def create_expense_payment_voucher(expense_payment, post_immediately=True):
    """
    Create a Payment Voucher for expense payments.

    Double-Entry for Payment:
    Dr. Expense A/c                  - Amount Paid
        Cr. Bank/Cash A/c            - Amount Paid

    Args:
        expense_payment: ExpensePayment model instance
        post_immediately: If True, post the voucher and update ledger balances

    Returns:
        Voucher instance or None if creation failed
    """
    from .models import Voucher, VoucherEntry

    # Skip if voucher already exists
    if Voucher.objects.filter(expense_payment=expense_payment, voucher_type='payment').exists():
        logger.debug(f"Payment voucher already exists for expense payment")
        return None

    org = expense_payment.organization

    # Get expense ledger based on category
    expense_ledger = get_expense_ledger_from_category(org, expense_payment.category)
    if not expense_ledger:
        logger.warning(f"No expense ledger found for category {expense_payment.category}, cannot create payment voucher")
        return None

    # Get bank/cash ledger based on payment method
    bank_cash_ledger = get_bank_cash_ledger_from_method(org, expense_payment.payment_method)
    if not bank_cash_ledger:
        logger.warning(f"No bank/cash ledger available for org {org.name}, cannot create payment voucher")
        return None

    try:
        with transaction.atomic():
            # Generate voucher number
            voucher_number = get_or_create_voucher_number(org, 'payment', expense_payment.payment_date)

            # Create voucher
            voucher = Voucher.objects.create(
                organization=org,
                voucher_type='payment',
                voucher_number=voucher_number,
                voucher_date=expense_payment.payment_date,
                expense_payment=expense_payment,
                narration=expense_payment.description or f"Payment to {expense_payment.payee_name}",
                status='draft'
            )

            entries = []
            amount = expense_payment.amount or Decimal('0')

            # Debit: Expense Account
            entries.append(VoucherEntry(
                voucher=voucher,
                ledger_account=expense_ledger,
                debit_amount=amount,
                credit_amount=Decimal('0'),
                particulars=expense_payment.description or f"Payment to {expense_payment.payee_name}",
                sequence=1
            ))

            # Credit: Bank/Cash Account
            entries.append(VoucherEntry(
                voucher=voucher,
                ledger_account=bank_cash_ledger,
                debit_amount=Decimal('0'),
                credit_amount=amount,
                particulars=f"Paid to {expense_payment.payee_name}",
                sequence=2
            ))

            # Bulk create entries
            VoucherEntry.objects.bulk_create(entries)

            # Post voucher if requested and balanced
            if post_immediately and voucher.is_balanced:
                voucher.post()
                logger.info(f"Created and posted payment voucher {voucher_number}")
            else:
                logger.info(f"Created payment voucher {voucher_number} (not posted)")

            return voucher

    except Exception as e:
        logger.error(f"Error creating payment voucher: {str(e)}")
        return None
