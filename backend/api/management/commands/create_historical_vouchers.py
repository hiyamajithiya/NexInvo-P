"""
Management command to create accounting vouchers for existing historical data.

This command creates vouchers for:
1. Existing invoices (Sales Vouchers)
2. Existing purchases (Purchase Vouchers)
3. Existing payments received (Receipt Vouchers)
4. Existing expense payments (Payment Vouchers)

Usage:
    python manage.py create_historical_vouchers                    # All organizations
    python manage.py create_historical_vouchers --org-id <uuid>    # Specific organization
    python manage.py create_historical_vouchers --dry-run          # Preview without changes
    python manage.py create_historical_vouchers --type invoices    # Only invoices
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import (
    Organization, Invoice, Purchase, Payment, ExpensePayment, Voucher
)
from api.accounting_utils import (
    create_sales_voucher, create_purchase_voucher,
    create_receipt_voucher, create_expense_payment_voucher
)


class Command(BaseCommand):
    help = 'Create accounting vouchers for existing historical data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-id',
            type=str,
            help='Organization UUID (optional, processes all orgs if not provided)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without making them'
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['invoices', 'purchases', 'payments', 'expenses', 'all'],
            default='all',
            help='Type of vouchers to create (default: all)'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            default=True,
            help='Skip records that already have vouchers (default: True)'
        )

    def handle(self, *args, **kwargs):
        org_id = kwargs.get('org_id')
        dry_run = kwargs.get('dry_run', False)
        voucher_type = kwargs.get('type', 'all')
        skip_existing = kwargs.get('skip_existing', True)

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
            'invoices_processed': 0,
            'purchases_processed': 0,
            'payments_processed': 0,
            'expenses_processed': 0,
            'vouchers_created': 0,
            'errors': 0
        }

        for org in organizations:
            self.stdout.write(self.style.HTTP_INFO(f'\n{"="*60}'))
            self.stdout.write(self.style.HTTP_INFO(f'Organization: {org.name}'))
            self.stdout.write(self.style.HTTP_INFO(f'{"="*60}'))

            org_stats = self._process_organization(
                org, dry_run, voucher_type, skip_existing
            )

            total_stats['orgs_processed'] += 1
            total_stats['invoices_processed'] += org_stats.get('invoices', 0)
            total_stats['purchases_processed'] += org_stats.get('purchases', 0)
            total_stats['payments_processed'] += org_stats.get('payments', 0)
            total_stats['expenses_processed'] += org_stats.get('expenses', 0)
            total_stats['vouchers_created'] += org_stats.get('vouchers_created', 0)
            total_stats['errors'] += org_stats.get('errors', 0)

        # Print summary
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('MIGRATION SUMMARY'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}'))
        self.stdout.write(f'  Organizations processed: {total_stats["orgs_processed"]}')
        self.stdout.write(f'  Invoices processed: {total_stats["invoices_processed"]}')
        self.stdout.write(f'  Purchases processed: {total_stats["purchases_processed"]}')
        self.stdout.write(f'  Payments processed: {total_stats["payments_processed"]}')
        self.stdout.write(f'  Expenses processed: {total_stats["expenses_processed"]}')
        self.stdout.write(f'  Vouchers created: {total_stats["vouchers_created"]}')
        if total_stats['errors'] > 0:
            self.stdout.write(self.style.ERROR(f'  Errors: {total_stats["errors"]}'))

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN COMPLETE - No changes were made ==='))
        else:
            self.stdout.write(self.style.SUCCESS('\n=== MIGRATION COMPLETE ==='))

    def _process_organization(self, org, dry_run, voucher_type, skip_existing):
        """Process a single organization"""
        stats = {
            'invoices': 0,
            'purchases': 0,
            'payments': 0,
            'expenses': 0,
            'vouchers_created': 0,
            'errors': 0
        }

        try:
            if dry_run:
                # In dry run, just count what would be processed
                if voucher_type in ['all', 'invoices']:
                    stats['invoices'] = self._count_invoices_to_process(org, skip_existing)
                    self.stdout.write(f'  [INVOICES] Would create {stats["invoices"]} sales vouchers')

                if voucher_type in ['all', 'purchases']:
                    stats['purchases'] = self._count_purchases_to_process(org, skip_existing)
                    self.stdout.write(f'  [PURCHASES] Would create {stats["purchases"]} purchase vouchers')

                if voucher_type in ['all', 'payments']:
                    stats['payments'] = self._count_payments_to_process(org, skip_existing)
                    self.stdout.write(f'  [PAYMENTS] Would create {stats["payments"]} receipt vouchers')

                if voucher_type in ['all', 'expenses']:
                    stats['expenses'] = self._count_expenses_to_process(org, skip_existing)
                    self.stdout.write(f'  [EXPENSES] Would create {stats["expenses"]} payment vouchers')

                stats['vouchers_created'] = (
                    stats['invoices'] + stats['purchases'] +
                    stats['payments'] + stats['expenses']
                )
            else:
                # Actually create vouchers
                if voucher_type in ['all', 'invoices']:
                    result = self._create_invoice_vouchers(org, skip_existing)
                    stats['invoices'] = result['processed']
                    stats['vouchers_created'] += result['created']
                    stats['errors'] += result['errors']

                if voucher_type in ['all', 'purchases']:
                    result = self._create_purchase_vouchers(org, skip_existing)
                    stats['purchases'] = result['processed']
                    stats['vouchers_created'] += result['created']
                    stats['errors'] += result['errors']

                if voucher_type in ['all', 'payments']:
                    result = self._create_payment_vouchers(org, skip_existing)
                    stats['payments'] = result['processed']
                    stats['vouchers_created'] += result['created']
                    stats['errors'] += result['errors']

                if voucher_type in ['all', 'expenses']:
                    result = self._create_expense_vouchers(org, skip_existing)
                    stats['expenses'] = result['processed']
                    stats['vouchers_created'] += result['created']
                    stats['errors'] += result['errors']

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  Error: {str(e)}'))
            stats['errors'] += 1

        return stats

    def _count_invoices_to_process(self, org, skip_existing):
        """Count invoices that need vouchers"""
        invoices = Invoice.objects.filter(
            organization=org,
            invoice_type='tax'  # Only tax invoices, not proforma
        ).exclude(status='draft')

        if skip_existing:
            # Exclude invoices that already have sales vouchers
            existing_voucher_invoice_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='sales',
                invoice__isnull=False
            ).values_list('invoice_id', flat=True)
            invoices = invoices.exclude(id__in=existing_voucher_invoice_ids)

        return invoices.count()

    def _count_purchases_to_process(self, org, skip_existing):
        """Count purchases that need vouchers"""
        purchases = Purchase.objects.filter(organization=org)

        if skip_existing:
            existing_voucher_purchase_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='purchase',
                purchase__isnull=False
            ).values_list('purchase_id', flat=True)
            purchases = purchases.exclude(id__in=existing_voucher_purchase_ids)

        return purchases.count()

    def _count_payments_to_process(self, org, skip_existing):
        """Count payments that need vouchers"""
        payments = Payment.objects.filter(organization=org)

        if skip_existing:
            existing_voucher_payment_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='receipt',
                payment_record__isnull=False
            ).values_list('payment_record_id', flat=True)
            payments = payments.exclude(id__in=existing_voucher_payment_ids)

        return payments.count()

    def _count_expenses_to_process(self, org, skip_existing):
        """Count expense payments that need vouchers"""
        expenses = ExpensePayment.objects.filter(organization=org)

        if skip_existing:
            existing_voucher_expense_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='payment',
                expense_payment__isnull=False
            ).values_list('expense_payment_id', flat=True)
            expenses = expenses.exclude(id__in=existing_voucher_expense_ids)

        return expenses.count()

    def _create_invoice_vouchers(self, org, skip_existing):
        """Create sales vouchers for existing invoices"""
        result = {'processed': 0, 'created': 0, 'errors': 0}

        invoices = Invoice.objects.filter(
            organization=org,
            invoice_type='tax'
        ).exclude(status='draft').select_related('client')

        if skip_existing:
            existing_voucher_invoice_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='sales',
                invoice__isnull=False
            ).values_list('invoice_id', flat=True)
            invoices = invoices.exclude(id__in=existing_voucher_invoice_ids)

        self.stdout.write(f'  [INVOICES] Processing {invoices.count()} invoices...')

        for invoice in invoices:
            result['processed'] += 1
            try:
                voucher = create_sales_voucher(invoice, post_immediately=True)
                if voucher:
                    result['created'] += 1
                    self.stdout.write(f'    - Created {voucher.voucher_number} for Invoice {invoice.invoice_number}')
            except Exception as e:
                result['errors'] += 1
                self.stdout.write(self.style.ERROR(f'    - Error for Invoice {invoice.invoice_number}: {str(e)}'))

        self.stdout.write(f'  [INVOICES] Created {result["created"]} vouchers, {result["errors"]} errors')
        return result

    def _create_purchase_vouchers(self, org, skip_existing):
        """Create purchase vouchers for existing purchases"""
        result = {'processed': 0, 'created': 0, 'errors': 0}

        purchases = Purchase.objects.filter(organization=org).select_related('supplier')

        if skip_existing:
            existing_voucher_purchase_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='purchase',
                purchase__isnull=False
            ).values_list('purchase_id', flat=True)
            purchases = purchases.exclude(id__in=existing_voucher_purchase_ids)

        self.stdout.write(f'  [PURCHASES] Processing {purchases.count()} purchases...')

        for purchase in purchases:
            result['processed'] += 1
            try:
                voucher = create_purchase_voucher(purchase, post_immediately=True)
                if voucher:
                    result['created'] += 1
                    self.stdout.write(f'    - Created {voucher.voucher_number} for Purchase {purchase.purchase_number}')
            except Exception as e:
                result['errors'] += 1
                self.stdout.write(self.style.ERROR(f'    - Error for Purchase {purchase.purchase_number}: {str(e)}'))

        self.stdout.write(f'  [PURCHASES] Created {result["created"]} vouchers, {result["errors"]} errors')
        return result

    def _create_payment_vouchers(self, org, skip_existing):
        """Create receipt vouchers for existing payments"""
        result = {'processed': 0, 'created': 0, 'errors': 0}

        payments = Payment.objects.filter(organization=org).select_related('invoice', 'invoice__client')

        if skip_existing:
            existing_voucher_payment_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='receipt',
                payment_record__isnull=False
            ).values_list('payment_record_id', flat=True)
            payments = payments.exclude(id__in=existing_voucher_payment_ids)

        self.stdout.write(f'  [PAYMENTS] Processing {payments.count()} payments...')

        for payment in payments:
            result['processed'] += 1
            try:
                voucher = create_receipt_voucher(payment, post_immediately=True)
                if voucher:
                    result['created'] += 1
                    self.stdout.write(f'    - Created {voucher.voucher_number} for Payment against Invoice {payment.invoice.invoice_number}')
            except Exception as e:
                result['errors'] += 1
                self.stdout.write(self.style.ERROR(f'    - Error for Payment: {str(e)}'))

        self.stdout.write(f'  [PAYMENTS] Created {result["created"]} vouchers, {result["errors"]} errors')
        return result

    def _create_expense_vouchers(self, org, skip_existing):
        """Create payment vouchers for existing expense payments"""
        result = {'processed': 0, 'created': 0, 'errors': 0}

        expenses = ExpensePayment.objects.filter(organization=org)

        if skip_existing:
            existing_voucher_expense_ids = Voucher.objects.filter(
                organization=org,
                voucher_type='payment',
                expense_payment__isnull=False
            ).values_list('expense_payment_id', flat=True)
            expenses = expenses.exclude(id__in=existing_voucher_expense_ids)

        self.stdout.write(f'  [EXPENSES] Processing {expenses.count()} expense payments...')

        for expense in expenses:
            result['processed'] += 1
            try:
                voucher = create_expense_payment_voucher(expense, post_immediately=True)
                if voucher:
                    result['created'] += 1
                    self.stdout.write(f'    - Created {voucher.voucher_number} for Expense to {expense.payee_name}')
            except Exception as e:
                result['errors'] += 1
                self.stdout.write(self.style.ERROR(f'    - Error for Expense to {expense.payee_name}: {str(e)}'))

        self.stdout.write(f'  [EXPENSES] Created {result["created"]} vouchers, {result["errors"]} errors')
        return result
