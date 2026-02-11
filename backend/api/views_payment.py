from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import ReadOnlyForViewer
from api.pagination import StandardPagination
from django.http import HttpResponse
from django.db.models import Sum
from django.db import transaction
import logging

from .models import (
    Payment, Receipt, Invoice, InvoiceItem,
    CompanySettings, InvoiceSettings,
    Voucher, VoucherEntry, LedgerAccount, FinancialYear, VoucherNumberSeries,
)
from .serializers import (
    PaymentSerializer, ReceiptSerializer
)
from .email_service import send_receipt_email

logger = logging.getLogger(__name__)


def _generate_receipt_number(organization):
    """Generate the next receipt number for an organization."""
    invoice_settings = InvoiceSettings.objects.get(organization=organization)
    receipt_prefix = invoice_settings.receiptPrefix or 'RCPT-'

    # Get the last receipt number for this organization
    last_receipt = Receipt.objects.filter(
        organization=organization
    ).order_by('-created_at').first()

    if last_receipt and last_receipt.receipt_number.startswith(receipt_prefix):
        try:
            last_number = int(last_receipt.receipt_number.replace(receipt_prefix, ''))
            next_number = last_number + 1
        except ValueError:
            next_number = invoice_settings.receiptStartingNumber
    else:
        next_number = invoice_settings.receiptStartingNumber

    return f"{receipt_prefix}{next_number}"


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Payment.objects.filter(
            organization=self.request.organization
        ).select_related('invoice', 'invoice__client', 'organization', 'created_by')

    def perform_create(self, serializer):
        # Extract accounting fields from request data (already popped by serializer)
        cash_bank_account_id = self.request.data.get('cash_bank_account')
        post_to_ledger = self.request.data.get('post_to_ledger', False)
        if isinstance(post_to_ledger, str):
            post_to_ledger = post_to_ledger.lower() in ('true', '1')

        # Pop write-only fields from validated_data if present
        validated_data = serializer.validated_data
        validated_data.pop('cash_bank_account', None)
        validated_data.pop('post_to_ledger', None)

        payment = serializer.save(organization=self.request.organization, created_by=self.request.user)

        # Update invoice status based on payment
        invoice = payment.invoice

        # Calculate total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Auto-convert Proforma Invoice to Tax Invoice when payment is received
        if invoice.invoice_type == 'proforma' and total_paid >= invoice.total_amount:
            # Check if already converted
            if not hasattr(invoice, 'converted_tax_invoice') or not invoice.converted_tax_invoice.exists():
                # Use atomic transaction to prevent race conditions
                with transaction.atomic():
                    # Create tax invoice with payment date (invoice_number will be auto-generated)
                    tax_invoice = Invoice.objects.create(
                        organization=self.request.organization,
                        created_by=self.request.user,
                        client=invoice.client,
                        invoice_type='tax',
                        invoice_date=payment.payment_date,  # Use payment date as invoice date
                        status='paid',
                        subtotal=invoice.subtotal,
                        tax_amount=invoice.tax_amount,
                        total_amount=invoice.total_amount,
                        payment_term=invoice.payment_term,
                        payment_terms=invoice.payment_terms,
                        notes=invoice.notes,
                        parent_proforma=invoice
                    )

                    # Copy invoice items
                    for item in invoice.items.all():
                        InvoiceItem.objects.create(
                            invoice=tax_invoice,
                            description=item.description,
                            hsn_sac=item.hsn_sac,
                            gst_rate=item.gst_rate,
                            taxable_amount=item.taxable_amount,
                            total_amount=item.total_amount
                        )

                    # Transfer payment to tax invoice
                    payment.invoice = tax_invoice
                    payment.save()

                    # Generate Receipt Number
                    receipt_number = _generate_receipt_number(self.request.organization)

                    # Create Receipt with TDS details (Income Tax TDS + GST TDS)
                    receipt = Receipt.objects.create(
                        organization=self.request.organization,
                        created_by=self.request.user,
                        payment=payment,
                        invoice=tax_invoice,
                        receipt_number=receipt_number,
                        receipt_date=payment.payment_date,
                        amount_received=payment.amount_received or (payment.amount - payment.tds_amount - payment.gst_tds_amount),
                        tds_amount=payment.tds_amount,
                        gst_tds_amount=payment.gst_tds_amount,
                        total_amount=payment.amount,
                        payment_method=payment.payment_method,
                        received_from=tax_invoice.client.name,
                        towards=f"Payment against invoice {tax_invoice.invoice_number}",
                        notes=payment.notes
                    )

                    # Mark proforma as paid
                    invoice.status = 'paid'
                    invoice.save()

                # Auto-send tax invoice and receipt email (outside transaction)
                try:
                    company_settings = CompanySettings.objects.get(organization=self.request.organization)
                    if tax_invoice.client.email:
                        send_receipt_email(receipt, tax_invoice, company_settings)
                except Exception as e:
                    logger.error(f"Error sending tax invoice and receipt email: {str(e)}")
            else:
                # Already converted, just update status
                invoice.status = 'paid'
                invoice.save()
        elif invoice.invoice_type == 'tax':
            # Payment against Tax Invoice - Create Receipt and send email automatically
            receipt = None
            with transaction.atomic():
                # Generate Receipt Number
                receipt_number = _generate_receipt_number(self.request.organization)

                # Create Receipt for Tax Invoice payment with TDS details (Income Tax TDS + GST TDS)
                receipt = Receipt.objects.create(
                    organization=self.request.organization,
                    created_by=self.request.user,
                    payment=payment,
                    invoice=invoice,
                    receipt_number=receipt_number,
                    receipt_date=payment.payment_date,
                    amount_received=payment.amount_received or (payment.amount - payment.tds_amount - payment.gst_tds_amount),
                    tds_amount=payment.tds_amount,
                    gst_tds_amount=payment.gst_tds_amount,
                    total_amount=payment.amount,
                    payment_method=payment.payment_method,
                    received_from=invoice.client.name,
                    towards=f"Payment against invoice {invoice.invoice_number}",
                    notes=payment.notes
                )

                # Update invoice status
                if total_paid >= invoice.total_amount:
                    invoice.status = 'paid'
                elif total_paid > 0 and invoice.status == 'draft':
                    invoice.status = 'sent'
                invoice.save()

            # Auto-send receipt and tax invoice email (outside transaction)
            if receipt and invoice.client.email:
                try:
                    company_settings = CompanySettings.objects.get(organization=self.request.organization)
                    send_receipt_email(receipt, invoice, company_settings)
                except Exception as e:
                    logger.error(f"Error sending receipt email for tax invoice payment: {str(e)}")
        else:
            # Update invoice status for other invoice types
            if total_paid >= invoice.total_amount:
                invoice.status = 'paid'
            elif total_paid > 0 and invoice.status == 'draft':
                invoice.status = 'sent'
            invoice.save()

        # Auto-create receipt voucher if accounting fields are provided
        if post_to_ledger and cash_bank_account_id:
            try:
                self._create_receipt_voucher(payment, int(cash_bank_account_id))
            except Exception as e:
                logger.error(f"Failed to create receipt voucher for payment #{payment.id}: {e}")

    def _create_receipt_voucher(self, payment, cash_bank_account_id):
        """Create a double-entry receipt voucher for an invoice payment."""
        from decimal import Decimal

        organization = self.request.organization
        invoice = payment.invoice

        # Find the party (client) ledger
        party_ledger = LedgerAccount.objects.filter(
            organization=organization,
            linked_client=invoice.client
        ).first()

        if not party_ledger:
            logger.warning(f"No party ledger found for client {invoice.client.name}, skipping voucher")
            return

        # Get financial year
        fy = FinancialYear.get_fy_for_date(organization, payment.payment_date)

        # Generate voucher number
        if fy:
            series = VoucherNumberSeries.get_or_create_series(organization, 'receipt', fy.name)
            voucher_number = series.get_next_number()
        else:
            voucher_number = f"RCP-{payment.id}"

        amount_received = payment.amount_received or (
            payment.amount - (payment.tds_amount or Decimal('0')) - (payment.gst_tds_amount or Decimal('0'))
        )

        with transaction.atomic():
            voucher = Voucher.objects.create(
                organization=organization,
                voucher_type='receipt',
                voucher_number=voucher_number,
                voucher_date=payment.payment_date,
                payment_record=payment,
                party_ledger=party_ledger,
                total_amount=payment.amount,
                narration=f"Receipt against Invoice {invoice.invoice_number} - {invoice.client.name}",
                reference_number=payment.reference_number or '',
                status='posted',
                created_by=self.request.user,
            )

            seq = 1

            # Debit: Cash/Bank account (amount actually received)
            VoucherEntry.objects.create(
                voucher=voucher,
                ledger_account_id=cash_bank_account_id,
                debit_amount=amount_received,
                credit_amount=Decimal('0.00'),
                particulars=f"Received from {invoice.client.name}",
                sequence=seq,
            )
            seq += 1

            # Debit: TDS Receivable (if IT TDS deducted)
            if payment.tds_amount and payment.tds_amount > 0:
                tds_ledger = LedgerAccount.objects.filter(
                    organization=organization,
                    name__icontains='TDS Receivable'
                ).first()
                if tds_ledger:
                    VoucherEntry.objects.create(
                        voucher=voucher,
                        ledger_account=tds_ledger,
                        debit_amount=payment.tds_amount,
                        credit_amount=Decimal('0.00'),
                        particulars='Income Tax TDS deducted',
                        sequence=seq,
                    )
                    seq += 1

            # Debit: GST TDS Receivable (if GST TDS deducted)
            if payment.gst_tds_amount and payment.gst_tds_amount > 0:
                gst_tds_ledger = LedgerAccount.objects.filter(
                    organization=organization,
                    name__icontains='GST TDS'
                ).first()
                if gst_tds_ledger:
                    VoucherEntry.objects.create(
                        voucher=voucher,
                        ledger_account=gst_tds_ledger,
                        debit_amount=payment.gst_tds_amount,
                        credit_amount=Decimal('0.00'),
                        particulars='GST TDS deducted',
                        sequence=seq,
                    )
                    seq += 1

            # Credit: Party (client) ledger for full amount
            VoucherEntry.objects.create(
                voucher=voucher,
                ledger_account=party_ledger,
                debit_amount=Decimal('0.00'),
                credit_amount=payment.amount,
                particulars=f"Payment for Invoice {invoice.invoice_number}",
                sequence=seq,
            )

            # Post voucher to update ledger balances
            voucher.post()

    def perform_update(self, serializer):
        payment = serializer.save()

        # Update invoice status based on updated payment
        invoice = payment.invoice

        # Calculate total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Update invoice status
        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0 and total_paid < invoice.total_amount:
            if invoice.status == 'paid':
                invoice.status = 'sent'  # Downgrade from paid if payment was reduced

        invoice.save()

    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()

        # Recalculate invoice status after payment deletion
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'sent'
        else:
            invoice.status = 'draft'

        invoice.save()

        # If this is a tax invoice converted from proforma, also update the parent proforma status
        if invoice.parent_proforma:
            parent_proforma = invoice.parent_proforma
            # If no payments remain on the tax invoice, revert proforma status to 'sent'
            if total_paid == 0:
                parent_proforma.status = 'sent'
            elif total_paid >= parent_proforma.total_amount:
                parent_proforma.status = 'paid'
            else:
                parent_proforma.status = 'sent'
            parent_proforma.save()


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing receipts.
    Receipts are auto-generated and should not be manually created/edited.
    """
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Receipt.objects.filter(
            organization=self.request.organization
        ).select_related(
            'invoice', 'invoice__client', 'payment', 'organization', 'created_by'
        )

        # Filter by invoice if specified
        invoice_id = self.request.query_params.get('invoice', None)
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        # Filter by payment if specified
        payment_id = self.request.query_params.get('payment', None)
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)

        return queryset.order_by('-receipt_date', '-created_at')

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download receipt as PDF"""
        from .pdf_generator import generate_receipt_pdf

        receipt = self.get_object()
        company_settings = CompanySettings.objects.get(organization=request.organization)

        # Generate PDF
        pdf_data = generate_receipt_pdf(receipt, company_settings)

        # Return PDF response
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{receipt.receipt_number}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def resend_email(self, request, pk=None):
        """Resend receipt email to client"""
        receipt = self.get_object()

        try:
            company_settings = CompanySettings.objects.get(organization=request.organization)
            tax_invoice = receipt.invoice

            if not tax_invoice.client.email:
                return Response(
                    {'error': 'Client has no email address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = send_receipt_email(receipt, tax_invoice, company_settings)

            if success:
                return Response({'message': 'Receipt and invoice sent successfully'})
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
