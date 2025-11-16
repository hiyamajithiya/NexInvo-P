from django.core.mail import EmailMessage, get_connection
from django.conf import settings
from .pdf_generator import generate_invoice_pdf
from .models import EmailSettings, InvoiceFormatSettings
from datetime import datetime


def send_invoice_email(invoice, company_settings):
    """
    Send invoice email to client with PDF attachment

    Args:
        invoice: Invoice model instance
        company_settings: CompanySettings model instance

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get user's email settings
        try:
            email_settings = EmailSettings.objects.get(user=invoice.user)
        except EmailSettings.DoesNotExist:
            print("Email settings not configured for this user")
            return False

        # Validate email settings
        if not email_settings.smtp_username or not email_settings.smtp_password:
            print("SMTP username or password not configured")
            return False

        if not email_settings.from_email:
            print("From email not configured")
            return False

        # Get invoice format settings
        try:
            format_settings = InvoiceFormatSettings.objects.get(user=invoice.user)
        except InvoiceFormatSettings.DoesNotExist:
            format_settings = None

        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice, company_settings, format_settings)

        # Prepare email
        subject = f"{invoice.get_invoice_type_display()} - {invoice.invoice_number}"

        # Email body
        invoice_type_name = "Proforma Invoice" if invoice.invoice_type == 'proforma' else "Tax Invoice"

        # Include email signature if available
        signature = f"\n\n{email_settings.email_signature}" if email_settings.email_signature else ""

        body = f"""
Dear {invoice.client.name},

Please find attached {invoice_type_name} {invoice.invoice_number} dated {invoice.invoice_date.strftime('%d-%b-%Y')}.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Invoice Date: {invoice.invoice_date.strftime('%d-%b-%Y')}
- Total Amount: ₹{invoice.total_amount}

{invoice.payment_terms if invoice.payment_terms else ''}

{invoice.notes if invoice.notes else ''}

Thank you for your business!

Best Regards,
{email_settings.from_name if email_settings.from_name else company_settings.companyName}
{company_settings.phone if company_settings.phone else ''}
{email_settings.from_email}
{signature}
        """.strip()

        # Configure SMTP connection
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=email_settings.smtp_host,
            port=email_settings.smtp_port,
            username=email_settings.smtp_username,
            password=email_settings.smtp_password,
            use_tls=email_settings.use_tls,
        )

        # Create email
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=email_settings.from_email,
            to=[invoice.client.email] if invoice.client.email else [],
            reply_to=[company_settings.email] if company_settings.email else [],
            connection=connection
        )

        # Attach PDF
        email.attach(
            filename=f"Invoice_{invoice.invoice_number}.pdf",
            content=pdf_buffer.getvalue(),
            mimetype='application/pdf'
        )

        # Send email
        if invoice.client.email:
            email.send(fail_silently=False)

            # Update invoice email status
            invoice.is_emailed = True
            invoice.emailed_at = datetime.now()
            invoice.save()

            return True
        else:
            print("Client email not configured")
            return False

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def send_proforma_invoice(invoice, company_settings):
    """
    Send proforma invoice to client

    Args:
        invoice: Proforma Invoice model instance
        company_settings: CompanySettings model instance

    Returns:
        bool: True if email sent successfully
    """
    if invoice.invoice_type != 'proforma':
        raise ValueError("Invoice must be a proforma invoice")

    return send_invoice_email(invoice, company_settings)


def send_tax_invoice(invoice, company_settings):
    """
    Send tax invoice to client (after conversion from proforma)

    Args:
        invoice: Tax Invoice model instance
        company_settings: CompanySettings model instance

    Returns:
        bool: True if email sent successfully
    """
    if invoice.invoice_type != 'tax':
        raise ValueError("Invoice must be a tax invoice")

    return send_invoice_email(invoice, company_settings)
