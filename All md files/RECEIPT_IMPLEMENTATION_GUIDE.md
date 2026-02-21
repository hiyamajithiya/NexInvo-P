# Receipt Generation Implementation Guide

## Overview
This guide contains the remaining code to complete the receipt generation feature.
When a payment is recorded against a Proforma Invoice, the system will:
1. Convert Proforma to Tax Invoice
2. Generate a Receipt
3. Email both Tax Invoice and Receipt to the client

## Files Already Modified:
✅ models.py - Added Receipt model and receipt settings
✅ serializers.py - Added ReceiptSerializer
✅ Migration created and applied

## Remaining Steps:

### 1. Add Receipt PDF Generation to pdf_generator.py

Add this function at the end of `backend/api/pdf_generator.py`:

```python
def generate_receipt_pdf(receipt, company_settings):
    """Generate a professional receipt PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)

    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=6
    )

    # Title
    elements.append(Paragraph("PAYMENT RECEIPT", title_style))
    elements.append(Spacer(1, 20))

    # Company Info and Receipt Details Side by Side
    company_data = [
        [
            Paragraph(f"<b>{company_settings.companyName}</b><br/>"
                     f"{company_settings.address}<br/>"
                     f"{company_settings.city}, {company_settings.state} - {company_settings.pinCode}<br/>"
                     f"GSTIN: {company_settings.gstin}<br/>"
                     f"Phone: {company_settings.phone}<br/>"
                     f"Email: {company_settings.email}", normal_style),
            Paragraph(f"<b>Receipt No:</b> {receipt.receipt_number}<br/>"
                     f"<b>Receipt Date:</b> {receipt.receipt_date.strftime('%d-%b-%Y')}<br/>"
                     f"<b>Invoice No:</b> {receipt.invoice.invoice_number}", normal_style)
        ]
    ]

    company_table = Table(company_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
    company_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 20))

    # Received From Section
    elements.append(Paragraph(f"<b>Received From:</b>", heading_style))
    elements.append(Paragraph(f"{receipt.received_from}", normal_style))
    elements.append(Spacer(1, 10))

    # Payment Details
    payment_data = [
        ['Description', 'Amount'],
        [receipt.towards, f"₹ {receipt.amount_received:,.2f}"]
    ]

    payment_table = Table(payment_data, colWidths=[doc.width * 0.7, doc.width * 0.3])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ecf0f1')]),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 15))

    # Amount in Words
    amount_words = number_to_words(receipt.amount_received)
    elements.append(Paragraph(f"<b>Amount in Words:</b> {amount_words} Only", normal_style))
    elements.append(Spacer(1, 15))

    # Payment Method
    elements.append(Paragraph(f"<b>Payment Method:</b> {receipt.get_payment_method_display()}", normal_style))
    if receipt.payment.reference_number:
        elements.append(Paragraph(f"<b>Reference Number:</b> {receipt.payment.reference_number}", normal_style))
    elements.append(Spacer(1, 20))

    # Notes
    if receipt.notes:
        elements.append(Paragraph(f"<b>Notes:</b>", heading_style))
        elements.append(Paragraph(receipt.notes, normal_style))
        elements.append(Spacer(1, 20))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey, spaceBefore=10, spaceAfter=10))
    elements.append(Paragraph(
        f"<i>This is a computer-generated receipt and does not require a signature.</i><br/>"
        f"<i>For any queries, please contact: {company_settings.email}</i>",
        ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))

    # Build PDF
    doc.build(elements)
    pdf_data = buffer.getvalue()
    buffer.close()

    return pdf_data
```

### 2. Add Receipt Email Function

Add this to `backend/api/email_service.py` or `backend/api/views.py`:

```python
def send_receipt_email(receipt, tax_invoice, company_settings):
    """
    Send receipt along with tax invoice to client via email
    """
    from django.core.mail import EmailMessage
    from django.conf import settings
    import smtplib
    from .models import EmailSettings
    from .pdf_generator import generate_receipt_pdf, generate_invoice_pdf

    try:
        # Get email settings
        email_settings = EmailSettings.objects.get(organization=receipt.organization)

        client = receipt.invoice.client
        if not client.email:
            print(f"Client {client.name} has no email address")
            return False

        # Generate PDFs
        tax_invoice_pdf = generate_invoice_pdf(tax_invoice, company_settings)
        receipt_pdf = generate_receipt_pdf(receipt, company_settings)

        # Email subject and body
        subject = f"Tax Invoice & Receipt - {tax_invoice.invoice_number}"

        body = f"""Dear {client.name},

Thank you for your payment.

Please find attached:
1. Tax Invoice: {tax_invoice.invoice_number}
2. Payment Receipt: {receipt.receipt_number}

Payment Details:
- Amount Received: ₹{receipt.amount_received:,.2f}
- Payment Date: {receipt.receipt_date.strftime('%d %B %Y')}
- Payment Method: {receipt.get_payment_method_display()}

If you have any questions, please don't hesitate to contact us.

Best regards,
{company_settings.companyName}
{company_settings.email}
{company_settings.phone}
"""

        if email_settings.email_signature:
            body += f"\n\n{email_settings.email_signature}"

        # Create email
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=f"{email_settings.from_name} <{email_settings.from_email}>" if email_settings.from_name else email_settings.from_email,
            to=[client.email],
            reply_to=[email_settings.from_email]
        )

        # Attach PDFs
        email.attach(f"{tax_invoice.invoice_number}.pdf", tax_invoice_pdf, 'application/pdf')
        email.attach(f"{receipt.receipt_number}.pdf", receipt_pdf, 'application/pdf')

        # Configure SMTP
        backend = email.get_connection()
        backend.host = email_settings.smtp_host
        backend.port = email_settings.smtp_port
        backend.username = email_settings.smtp_username
        backend.password = email_settings.smtp_password
        backend.use_tls = email_settings.use_tls

        # Send email
        email.send()

        print(f"Receipt and Tax Invoice sent to {client.email}")
        return True

    except EmailSettings.DoesNotExist:
        print("Email settings not configured")
        return False
    except Exception as e:
        print(f"Error sending receipt email: {str(e)}")
        return False
```

### 3. Update PaymentViewSet in views.py

Replace the existing `perform_create` method in `PaymentViewSet` (around line 829-898):

```python
def perform_create(self, serializer):
    from .models import Receipt, InvoiceSettings
    from .pdf_generator import generate_receipt_pdf

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
                # Create tax invoice with payment date
                tax_invoice = Invoice.objects.create(
                    organization=self.request.organization,
                    created_by=self.request.user,
                    client=invoice.client,
                    invoice_type='tax',
                    invoice_date=payment.payment_date,
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
                invoice_settings = InvoiceSettings.objects.get(organization=self.request.organization)
                receipt_prefix = invoice_settings.receiptPrefix or 'RCPT-'

                # Get the last receipt number for this organization
                last_receipt = Receipt.objects.filter(
                    organization=self.request.organization
                ).order_by('-created_at').first()

                if last_receipt and last_receipt.receipt_number.startswith(receipt_prefix):
                    try:
                        last_number = int(last_receipt.receipt_number.replace(receipt_prefix, ''))
                        next_number = last_number + 1
                    except ValueError:
                        next_number = invoice_settings.receiptStartingNumber
                else:
                    next_number = invoice_settings.receiptStartingNumber

                receipt_number = f"{receipt_prefix}{next_number}"

                # Create Receipt
                receipt = Receipt.objects.create(
                    organization=self.request.organization,
                    created_by=self.request.user,
                    payment=payment,
                    invoice=tax_invoice,
                    receipt_number=receipt_number,
                    receipt_date=payment.payment_date,
                    amount_received=payment.amount,
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
                print(f"Error sending tax invoice and receipt email: {str(e)}")
        else:
            # Already converted, just update status
            invoice.status = 'paid'
            invoice.save()
    else:
        # Update invoice status for non-proforma or partially paid invoices
        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0 and invoice.status == 'draft':
            invoice.status = 'sent'
        invoice.save()
```

### 4. Add ReceiptViewSet to views.py

Add this after PaymentViewSet:

```python
class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing receipts.
    Receipts are auto-generated and should not be manually created/edited.
    """
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Receipt.objects.filter(organization=self.request.organization)

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
        from django.http import HttpResponse
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
```

### 5. Add Receipt Routes to urls.py

Add this to the router in `backend/api/urls.py`:

```python
router.register(r'receipts', views.ReceiptViewSet, basename='receipt')
```

### 6. Update Admin Panel (Optional)

Add to `backend/api/admin.py`:

```python
@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'organization', 'received_from', 'amount_received', 'receipt_date', 'payment_method']
    list_filter = ['organization', 'receipt_date', 'payment_method']
    search_fields = ['receipt_number', 'received_from', 'notes']
    readonly_fields = ['receipt_number', 'created_at', 'updated_at']
    ordering = ['-receipt_date', '-created_at']
```

## Testing the Implementation:

1. Start the backend server
2. Login as a tenant admin
3. Create a Proforma Invoice for a client
4. Record a payment against the Proforma Invoice
5. The system should:
   - Convert Proforma to Tax Invoice
   - Generate a Receipt automatically
   - Email both Tax Invoice and Receipt to the client

## API Endpoints Available:

- `GET /api/receipts/` - List all receipts
- `GET /api/receipts/{id}/` - Get specific receipt
- `GET /api/receipts/{id}/download/` - Download receipt PDF
- `POST /api/receipts/{id}/resend_email/` - Resend receipt email
- `GET /api/receipts/?invoice={invoice_id}` - Filter by invoice
- `GET /api/receipts/?payment={payment_id}` - Filter by payment

## Notes:

- Receipts are automatically generated when payments are recorded
- Receipt numbers are auto-generated using the pattern: RCPT-1, RCPT-2, etc.
- Both Tax Invoice and Receipt are attached to the email sent to the client
- Receipts are read-only through the API (auto-generated only)
