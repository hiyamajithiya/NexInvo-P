from django.core.mail import EmailMessage
from django.conf import settings
from .pdf_generator import generate_invoice_pdf
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
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice, company_settings)

        # Prepare email
        subject = f"{invoice.get_invoice_type_display()} - {invoice.invoice_number}"

        # Email body
        invoice_type_name = "Proforma Invoice" if invoice.invoice_type == 'proforma' else "Tax Invoice"

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
{company_settings.companyName}
{company_settings.phone if company_settings.phone else ''}
{company_settings.email if company_settings.email else ''}
        """.strip()

        # Create email
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[invoice.client.email] if invoice.client.email else [],
            reply_to=[company_settings.email] if company_settings.email else []
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
            return False

    except Exception as e:
        print(f"Error sending email: {str(e)}")
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
