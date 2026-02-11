from django.core.mail import EmailMessage, get_connection
from django.conf import settings
from .pdf_generator import generate_invoice_pdf, generate_receipt_pdf
from .models import EmailSettings, InvoiceFormatSettings
from .email_templates import (
    get_base_email_template,
    format_greeting,
    format_paragraph,
    format_info_box,
    format_highlight_amount,
    format_signature,
    format_alert_box,
    format_divider,
)
from datetime import datetime
import threading


# Thread-local storage for SMTP connection caching
_thread_local = threading.local()


def get_cached_connection(email_settings):
    """
    Get or create a cached SMTP connection for the current thread.
    Connections are reused within the same thread for better performance.
    """
    cache_key = f"{email_settings.smtp_host}_{email_settings.smtp_port}_{email_settings.smtp_username}"

    if not hasattr(_thread_local, 'connections'):
        _thread_local.connections = {}

    # Check if we have a cached connection
    if cache_key in _thread_local.connections:
        conn = _thread_local.connections[cache_key]
        try:
            # Test if connection is still alive
            conn.noop()
            return conn
        except Exception:
            # Connection is dead, remove it
            del _thread_local.connections[cache_key]

    # Create new connection with timeout
    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=email_settings.smtp_host,
        port=email_settings.smtp_port,
        username=email_settings.smtp_username,
        password=email_settings.smtp_password,
        use_tls=email_settings.use_tls,
        timeout=30,  # 30 second timeout for faster failure detection
    )

    # Cache the connection
    _thread_local.connections[cache_key] = connection

    return connection


def clear_cached_connections():
    """Clear all cached SMTP connections for the current thread."""
    if hasattr(_thread_local, 'connections'):
        for conn in _thread_local.connections.values():
            try:
                conn.close()
            except Exception:
                pass
        _thread_local.connections = {}


def send_invoice_email(invoice, company_settings, connection=None):
    """
    Send invoice email to client with PDF attachment

    Args:
        invoice: Invoice model instance
        company_settings: CompanySettings model instance
        connection: Optional existing SMTP connection for reuse (bulk sending)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get user's email settings
        try:
            email_settings = EmailSettings.objects.get(organization=invoice.organization)
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

        # Check client email first before doing expensive operations
        if not invoice.client.email:
            print("Client email not configured")
            return False

        # Get invoice format settings
        try:
            format_settings = InvoiceFormatSettings.objects.get(organization=invoice.organization)
        except InvoiceFormatSettings.DoesNotExist:
            format_settings = None

        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice, company_settings, format_settings)

        # Prepare email
        subject = f"{invoice.get_invoice_type_display()} - {invoice.invoice_number}"

        # Email body
        invoice_type_name = "Proforma Invoice" if invoice.invoice_type == 'proforma' else "Tax Invoice"

        # Build professional HTML email content
        content = format_greeting(invoice.client.name)
        content += format_paragraph(
            f"Please find attached <strong>{invoice_type_name} {invoice.invoice_number}</strong> dated {invoice.invoice_date.strftime('%d/%m/%Y')}.",
            style="lead"
        )

        # Invoice details info box
        invoice_details = [
            ("Invoice Number", invoice.invoice_number),
            ("Invoice Date", invoice.invoice_date.strftime('%d/%m/%Y')),
            ("Due Date", invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else "On Receipt"),
        ]
        content += format_info_box("Invoice Details", invoice_details)

        # Amount highlight
        content += format_highlight_amount(invoice.total_amount, "Total Amount")

        # Payment terms if available
        if invoice.payment_terms:
            content += format_alert_box(f"<strong>Payment Terms:</strong> {invoice.payment_terms}", "info")

        # Notes if available
        if invoice.notes:
            content += format_paragraph(f"<em>Notes:</em> {invoice.notes}", style="small")

        content += format_divider()
        content += format_paragraph("Thank you for your business! We appreciate your trust in our services.", style="normal")

        # Signature
        content += format_signature(
            name=email_settings.from_name if email_settings.from_name else company_settings.companyName,
            company=company_settings.companyName,
            phone=company_settings.phone if company_settings.phone else None,
            email=email_settings.from_email
        )

        # Include custom email signature if available
        if email_settings.email_signature:
            content += format_paragraph(email_settings.email_signature, style="small")

        # Generate full HTML email with dual branding
        html_body = get_base_email_template(
            subject=invoice_type_name,
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
            tenant_company_name=company_settings.companyName if company_settings else None,
            tenant_tagline=company_settings.tradingName if company_settings and company_settings.tradingName else None,
        )

        # Plain text fallback
        plain_body = f"""
Dear {invoice.client.name},

Please find attached {invoice_type_name} {invoice.invoice_number} dated {invoice.invoice_date.strftime('%d/%m/%Y')}.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Invoice Date: {invoice.invoice_date.strftime('%d/%m/%Y')}
- Total Amount: Rs. {invoice.total_amount:,.2f}

{invoice.payment_terms if invoice.payment_terms else ''}
{invoice.notes if invoice.notes else ''}

Thank you for your business!

Best Regards,
{email_settings.from_name if email_settings.from_name else company_settings.companyName}
{company_settings.phone if company_settings.phone else ''}
{email_settings.from_email}
{email_settings.email_signature if email_settings.email_signature else ''}
        """.strip()

        # Use provided connection or create new one with timeout
        if connection is None:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=email_settings.smtp_host,
                port=email_settings.smtp_port,
                username=email_settings.smtp_username,
                password=email_settings.smtp_password,
                use_tls=email_settings.use_tls,
                timeout=30,  # 30 second timeout
            )

        # Create email with HTML content and UTF-8 encoding
        email = EmailMessage(
            subject=subject,
            body=html_body,
            from_email=email_settings.from_email,
            to=[invoice.client.email],
            reply_to=[company_settings.email] if company_settings.email else [],
            connection=connection
        )
        email.content_subtype = "html"
        email.encoding = 'utf-8'

        # Attach PDF
        email.attach(
            filename=f"Invoice_{invoice.invoice_number}.pdf",
            content=pdf_buffer.getvalue(),
            mimetype='application/pdf'
        )

        # Send email
        try:
            email.send(fail_silently=False)

            # Update invoice email status
            invoice.is_emailed = True
            invoice.emailed_at = datetime.now()
            invoice.save(update_fields=['is_emailed', 'emailed_at'])  # Only update specific fields for speed

            return True

        except Exception as send_error:
            raise  # Re-raise to be caught by outer exception handler

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def send_bulk_invoice_emails(invoices, company_settings):
    """
    Send emails for multiple invoices using a single SMTP connection.
    Much faster than sending one by one.

    Args:
        invoices: List of Invoice model instances
        company_settings: CompanySettings model instance

    Returns:
        dict: {'success': count, 'failed': count, 'errors': [list of errors]}
    """
    result = {'success': 0, 'failed': 0, 'errors': []}

    if not invoices:
        return result

    # Get email settings from first invoice
    try:
        email_settings = EmailSettings.objects.get(organization=invoices[0].organization)
    except EmailSettings.DoesNotExist:
        result['errors'].append('Email settings not configured')
        result['failed'] = len(invoices)
        return result

    # Validate email settings
    if not email_settings.smtp_username or not email_settings.smtp_password or not email_settings.from_email:
        result['errors'].append('SMTP settings incomplete')
        result['failed'] = len(invoices)
        return result

    # Create single connection for all emails
    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=email_settings.smtp_host,
        port=email_settings.smtp_port,
        username=email_settings.smtp_username,
        password=email_settings.smtp_password,
        use_tls=email_settings.use_tls,
        timeout=30,
    )

    try:
        # Open connection once
        connection.open()

        for invoice in invoices:
            try:
                success = send_invoice_email(invoice, company_settings, connection)
                if success:
                    result['success'] += 1
                else:
                    result['failed'] += 1
                    result['errors'].append(f"Invoice {invoice.invoice_number}: Failed to send")
            except Exception as e:
                result['failed'] += 1
                result['errors'].append(f"Invoice {invoice.invoice_number}: {str(e)}")

    finally:
        # Always close connection
        try:
            connection.close()
        except Exception:
            pass

    return result


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


def send_receipt_email(receipt, tax_invoice, company_settings):
    """
    Send receipt along with tax invoice to client via email

    Args:
        receipt: Receipt model instance
        tax_invoice: Tax Invoice model instance
        company_settings: CompanySettings model instance

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get email settings using organization
        try:
            email_settings = EmailSettings.objects.get(organization=receipt.organization)
        except EmailSettings.DoesNotExist:
            print("Email settings not configured for this organization")
            return False

        # Validate email settings
        if not email_settings.smtp_username or not email_settings.smtp_password:
            print("SMTP username or password not configured")
            return False

        if not email_settings.from_email:
            print("From email not configured")
            return False

        client = receipt.invoice.client
        if not client.email:
            print(f"Client {client.name} has no email address")
            return False

        # Get invoice format settings
        try:
            format_settings = InvoiceFormatSettings.objects.get(organization=receipt.organization)
        except InvoiceFormatSettings.DoesNotExist:
            format_settings = None

        # Generate PDFs
        tax_invoice_buffer = generate_invoice_pdf(tax_invoice, company_settings, format_settings)
        receipt_pdf = generate_receipt_pdf(receipt, company_settings)

        # Email subject and body
        subject = f"Tax Invoice & Receipt - {tax_invoice.invoice_number}"

        # Build professional HTML email content
        content = format_greeting(client.name)
        content += format_paragraph(
            "Thank you for your payment! We have received your payment and are pleased to provide you with the following documents.",
            style="lead"
        )

        # Attachments info
        content += format_info_box("Attached Documents", [
            ("Tax Invoice", tax_invoice.invoice_number),
            ("Payment Receipt", receipt.receipt_number),
        ], bg_color="#f0fdf4", border_color="#10b981", title_color="#065f46")

        # Payment details
        payment_details = [
            ("Amount Received", f"Rs. {receipt.amount_received:,.2f}"),
            ("Payment Date", receipt.receipt_date.strftime('%d/%m/%Y')),
            ("Payment Method", receipt.payment.get_payment_method_display()),
        ]
        content += format_info_box("Payment Details", payment_details)

        # Amount highlight
        content += format_highlight_amount(receipt.amount_received, "Payment Confirmed")

        content += format_alert_box(
            "Your payment has been successfully processed. Thank you for your prompt payment!",
            "success"
        )

        content += format_divider()
        content += format_paragraph(
            "If you have any questions regarding this transaction, please don't hesitate to contact us.",
            style="normal"
        )

        # Signature
        content += format_signature(
            name=company_settings.companyName,
            phone=company_settings.phone,
            email=company_settings.email
        )

        # Include custom email signature if available
        if email_settings.email_signature:
            content += format_paragraph(email_settings.email_signature, style="small")

        # Generate full HTML email with dual branding
        html_body = get_base_email_template(
            subject="Payment Confirmation",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
            tenant_company_name=company_settings.companyName if company_settings else None,
            tenant_tagline=company_settings.tradingName if company_settings and company_settings.tradingName else None,
        )

        # Plain text fallback
        plain_body = f"""Dear {client.name},

Thank you for your payment.

Please find attached:
1. Tax Invoice: {tax_invoice.invoice_number}
2. Payment Receipt: {receipt.receipt_number}

Payment Details:
- Amount Received: Rs. {receipt.amount_received:,.2f}
- Payment Date: {receipt.receipt_date.strftime('%d/%m/%Y')}
- Payment Method: {receipt.payment.get_payment_method_display()}

If you have any questions, please don't hesitate to contact us.

Best regards,
{company_settings.companyName}
{company_settings.email}
{company_settings.phone}
{email_settings.email_signature if email_settings.email_signature else ''}
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

        # Create email with HTML content
        email = EmailMessage(
            subject=subject,
            body=html_body,
            from_email=f"{email_settings.from_name} <{email_settings.from_email}>" if email_settings.from_name else email_settings.from_email,
            to=[client.email],
            reply_to=[email_settings.from_email],
            connection=connection
        )
        email.content_subtype = "html"
        email.encoding = 'utf-8'

        # Attach PDFs
        email.attach(
            filename=f"{tax_invoice.invoice_number}.pdf",
            content=tax_invoice_buffer.getvalue(),
            mimetype='application/pdf'
        )
        email.attach(
            filename=f"{receipt.receipt_number}.pdf",
            content=receipt_pdf,
            mimetype='application/pdf'
        )

        # Send email
        try:
            email.send(fail_silently=False)


            print(f"Receipt and Tax Invoice sent to {client.email}")
            return True

        except Exception as send_error:
            raise  # Re-raise to be caught by outer exception handler

    except Exception as e:
        print(f"Error sending receipt email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
