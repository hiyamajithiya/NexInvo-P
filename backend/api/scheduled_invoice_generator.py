"""
Scheduled Invoice Generator Module

This module handles the automatic generation of invoices from scheduled invoice configurations.
It is called by the APScheduler job and can also be triggered manually.
"""

import logging
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.mail import EmailMessage
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_invoice_from_schedule(scheduled_invoice, manual=False):
    """
    Generate an invoice from a scheduled invoice configuration.

    Args:
        scheduled_invoice: ScheduledInvoice model instance
        manual: Boolean indicating if this is a manual generation

    Returns:
        tuple: (invoice, email_sent)
    """
    from .models import (
        Invoice, InvoiceItem, ScheduledInvoiceLog,
        EmailSettings, CompanySettings, InvoiceSettings
    )
    from .pdf_generator import generate_invoice_pdf

    organization = scheduled_invoice.organization
    today = date.today()

    log_entry = ScheduledInvoiceLog(
        scheduled_invoice=scheduled_invoice,
        generation_date=today
    )

    try:
        with transaction.atomic():
            # Check if GST should be applied
            should_apply_gst = True
            try:
                invoice_settings = InvoiceSettings.objects.get(organization=organization)
                company_settings = CompanySettings.objects.get(organization=organization)

                if not invoice_settings.gstEnabled:
                    should_apply_gst = False
                elif company_settings.gstRegistrationDate and today < company_settings.gstRegistrationDate:
                    should_apply_gst = False
            except (InvoiceSettings.DoesNotExist, CompanySettings.DoesNotExist):
                pass

            # Calculate totals from scheduled invoice items
            subtotal = Decimal('0.00')
            tax_amount = Decimal('0.00')

            for item in scheduled_invoice.items.all():
                subtotal += item.taxable_amount
                if should_apply_gst:
                    tax_amount += item.total_amount - item.taxable_amount

            total_before_round = subtotal + tax_amount

            # Round off to nearest rupee
            rounded_total = round(total_before_round)
            round_off = Decimal(str(rounded_total)) - total_before_round

            # Create the invoice
            invoice = Invoice(
                organization=organization,
                created_by=scheduled_invoice.created_by,
                client=scheduled_invoice.client,
                invoice_type=scheduled_invoice.invoice_type,
                invoice_date=today,
                status='draft',  # Will be set to 'sent' if email is successful
                subtotal=subtotal,
                tax_amount=tax_amount if should_apply_gst else Decimal('0.00'),
                round_off=round_off,
                total_amount=Decimal(str(rounded_total)),
                payment_term=scheduled_invoice.payment_term,
                notes=scheduled_invoice.notes
            )
            invoice.save()  # This will auto-generate invoice number

            # Create invoice items
            for scheduled_item in scheduled_invoice.items.all():
                if should_apply_gst:
                    item_total = scheduled_item.total_amount
                    item_gst = scheduled_item.gst_rate
                else:
                    item_total = scheduled_item.taxable_amount
                    item_gst = Decimal('0.00')

                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=scheduled_item.description,
                    hsn_sac=scheduled_item.hsn_sac,
                    gst_rate=item_gst,
                    taxable_amount=scheduled_item.taxable_amount,
                    total_amount=item_total
                )

            # Update scheduled invoice tracking
            scheduled_invoice.occurrences_generated += 1
            scheduled_invoice.last_generated_date = today
            scheduled_invoice.next_generation_date = scheduled_invoice.calculate_next_generation_date(today)

            # Check if max occurrences reached
            if scheduled_invoice.max_occurrences and scheduled_invoice.occurrences_generated >= scheduled_invoice.max_occurrences:
                scheduled_invoice.status = 'completed'

            # Check if end date passed
            if scheduled_invoice.end_date and today >= scheduled_invoice.end_date:
                scheduled_invoice.status = 'completed'

            scheduled_invoice.save()

            # Log successful creation
            log_entry.invoice = invoice
            log_entry.status = 'success'

            logger.info(f"Generated invoice {invoice.invoice_number} from scheduled invoice {scheduled_invoice.name}")

    except Exception as e:
        log_entry.status = 'failed'
        log_entry.error_message = str(e)
        log_entry.save()
        logger.error(f"Failed to generate invoice from {scheduled_invoice.name}: {str(e)}")
        raise

    # Send email if configured
    email_sent = False
    if scheduled_invoice.auto_send_email and scheduled_invoice.client.email:
        try:
            email_sent = send_scheduled_invoice_email(
                invoice,
                scheduled_invoice,
                organization
            )

            if email_sent:
                invoice.status = 'sent'
                invoice.is_emailed = True
                invoice.emailed_at = timezone.now()
                invoice.save()

                log_entry.email_sent = True
                log_entry.email_sent_at = timezone.now()

        except Exception as e:
            log_entry.status = 'email_failed'
            log_entry.email_error = str(e)
            logger.error(f"Failed to send email for invoice {invoice.invoice_number}: {str(e)}")

    log_entry.save()

    return invoice, email_sent


def send_scheduled_invoice_email(invoice, scheduled_invoice, organization):
    """
    Send email with generated invoice to client.

    Args:
        invoice: Invoice model instance
        scheduled_invoice: ScheduledInvoice model instance
        organization: Organization model instance

    Returns:
        bool: True if email sent successfully
    """
    from .models import EmailSettings, CompanySettings
    from .pdf_generator import generate_invoice_pdf
    from .email_templates import (
        get_base_email_template,
        format_greeting,
        format_paragraph,
        format_info_box,
        format_highlight_amount,
        format_alert_box,
        format_divider,
        format_signature,
    )

    # Get email settings
    try:
        email_settings = EmailSettings.objects.get(organization=organization)
    except EmailSettings.DoesNotExist:
        logger.warning(f"Email settings not found for organization {organization.id}")
        return False

    # Get company settings for PDF
    try:
        company_settings = CompanySettings.objects.get(organization=organization)
    except CompanySettings.DoesNotExist:
        logger.warning(f"Company settings not found for organization {organization.id}")
        return False

    # Validate required email settings
    if not email_settings.smtp_username or not email_settings.smtp_password:
        logger.warning(f"SMTP credentials not configured for organization {organization.id}")
        return False

    # Prepare email
    client = invoice.client
    company_name = company_settings.companyName or 'Our Company'

    # Subject
    if scheduled_invoice.email_subject:
        subject = scheduled_invoice.email_subject.format(
            invoice_number=invoice.invoice_number,
            client_name=client.name,
            company_name=company_name
        )
    else:
        invoice_type_display = 'Tax Invoice' if invoice.invoice_type == 'tax' else 'Proforma Invoice'
        subject = f'{invoice_type_display} {invoice.invoice_number} from {company_name}'

    # Build professional HTML email content
    content = format_greeting(client.name)

    # Custom message from scheduled invoice or default
    if scheduled_invoice.email_body:
        custom_message = scheduled_invoice.email_body.format(
            invoice_number=invoice.invoice_number,
            client_name=client.name,
            company_name=company_name,
            total_amount=f"Rs. {invoice.total_amount:,.2f}",
            invoice_date=invoice.invoice_date.strftime('%d %B %Y')
        )
        content += format_paragraph(custom_message, style="lead")
    else:
        invoice_type_display = 'Tax Invoice' if invoice.invoice_type == 'tax' else 'Proforma Invoice'
        content += format_paragraph(
            f"Please find attached your <strong>{invoice_type_display} {invoice.invoice_number}</strong> dated {invoice.invoice_date.strftime('%d %B %Y')}.",
            style="lead"
        )

    # Invoice details info box
    invoice_details = [
        ("Invoice Number", invoice.invoice_number),
        ("Invoice Date", invoice.invoice_date.strftime('%d %B %Y')),
        ("Due Date", invoice.due_date.strftime('%d %B %Y') if invoice.due_date else "On Receipt"),
    ]
    content += format_info_box("Invoice Details", invoice_details)

    # Amount highlight
    content += format_highlight_amount(float(invoice.total_amount), "Invoice Amount")

    content += format_alert_box(
        "This is an automatically generated invoice as per your recurring billing arrangement.",
        "info"
    )

    content += format_divider()
    content += format_paragraph("Thank you for your business! We appreciate your trust in our services.", style="normal")

    # Signature
    content += format_signature(
        name=email_settings.from_name if email_settings.from_name else company_name,
        company=company_name,
        phone=company_settings.phone if company_settings.phone else None,
        email=email_settings.from_email if email_settings.from_email else settings.DEFAULT_FROM_EMAIL
    )

    # Generate full HTML email with dual branding
    html_body = get_base_email_template(
        subject=subject,
        content=content,
        company_name="NexInvo",
        company_tagline="Invoice Management System",
        tenant_company_name=company_name if company_name != "NexInvo" else None,
        tenant_tagline=company_settings.tradingName if company_settings and company_settings.tradingName else None,
    )

    # From email
    if email_settings and email_settings.from_email:
        from_email = email_settings.from_email
    else:
        from_email = settings.DEFAULT_FROM_EMAIL

    # Create SMTP connection
    from django.core.mail import get_connection
    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=email_settings.smtp_host,
        port=email_settings.smtp_port,
        username=email_settings.smtp_username,
        password=email_settings.smtp_password,
        use_tls=email_settings.use_tls,
        timeout=30,
    )

    # Create email with HTML content
    email = EmailMessage(
        subject=subject,
        body=html_body,
        from_email=from_email,
        to=[client.email],
        connection=connection
    )
    email.content_subtype = "html"
    email.encoding = 'utf-8'

    # Generate and attach PDF
    if company_settings:
        try:
            pdf_buffer = generate_invoice_pdf(invoice, company_settings)
            pdf_content = pdf_buffer.getvalue()
            email.attach(
                f'{invoice.invoice_number}.pdf',
                pdf_content,
                'application/pdf'
            )
        except Exception as e:
            logger.warning(f"Could not generate PDF for {invoice.invoice_number}: {str(e)}")

    # Send email and verify success
    sent_count = email.send(fail_silently=False)

    # email.send() returns 1 if successful, 0 if failed
    return sent_count == 1


def process_scheduled_invoices():
    """
    Process all scheduled invoices that are due today.
    This function is called by the APScheduler job.

    Returns:
        dict: Statistics about the processing
    """
    from .models import ScheduledInvoice

    logger.info("Starting scheduled invoice processing...")

    stats = {
        'processed': 0,
        'generated': 0,
        'failed': 0,
        'skipped': 0,
        'emails_sent': 0
    }

    # Get all active scheduled invoices
    scheduled_invoices = ScheduledInvoice.objects.filter(
        status='active'
    ).select_related('client', 'organization', 'payment_term').prefetch_related('items')

    for scheduled_invoice in scheduled_invoices:
        stats['processed'] += 1

        # Check if should generate today
        if not scheduled_invoice.should_generate_today():
            stats['skipped'] += 1
            continue

        try:
            invoice, email_sent = generate_invoice_from_schedule(scheduled_invoice)
            stats['generated'] += 1

            if email_sent:
                stats['emails_sent'] += 1

            logger.info(f"[OK] Generated {invoice.invoice_number} for {scheduled_invoice.name}")

        except Exception as e:
            stats['failed'] += 1
            logger.error(f"[FAILED] {scheduled_invoice.name}: {str(e)}")

    logger.info(
        f"Scheduled invoice processing completed: "
        f"{stats['generated']} generated, {stats['skipped']} skipped, "
        f"{stats['failed']} failed, {stats['emails_sent']} emails sent"
    )

    return stats
