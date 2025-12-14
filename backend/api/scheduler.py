"""
Background Job Scheduler for NexInvo

This module handles automated background tasks like payment reminders.
It runs automatically when the Django server starts.
"""

import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.core.mail import EmailMessage

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
from django_apscheduler import util

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

logger = logging.getLogger(__name__)


def send_payment_reminders():
    """
    Send payment reminders for all organizations with active reminder settings.
    This function is called automatically by the scheduler.
    """
    from api.models import Invoice, InvoiceSettings, EmailSettings, CompanySettings
    from api.pdf_generator import generate_invoice_pdf

    logger.info("Starting automated payment reminder process...")

    # Get all organizations with active reminders
    orgs_with_reminders = InvoiceSettings.objects.filter(
        enablePaymentReminders=True
    )

    total_sent = 0
    total_skipped = 0
    total_failed = 0

    for invoice_settings in orgs_with_reminders:
        # Skip if no organization is linked (legacy data)
        if not invoice_settings.organization_id:
            logger.warning(f'Skipping InvoiceSettings {invoice_settings.id} - no organization linked')
            continue

        organization = invoice_settings.organization
        frequency_days = invoice_settings.reminderFrequencyDays

        # Get unpaid proforma invoices for this organization
        unpaid_proformas = Invoice.objects.filter(
            organization=organization,
            invoice_type='proforma',
            status__in=['draft', 'sent']
        ).exclude(
            status='paid'
        ).exclude(
            status='cancelled'
        )

        for invoice in unpaid_proformas:
            # Check if reminder should be sent based on frequency
            should_send = False
            skip_reason = None

            if invoice.last_reminder_sent is None:
                # Never sent a reminder, check if invoice is old enough
                days_since_invoice = (timezone.now().date() - invoice.invoice_date).days
                if days_since_invoice >= frequency_days:
                    should_send = True
                else:
                    skip_reason = f"Invoice only {days_since_invoice} days old (needs {frequency_days} days)"
            else:
                # Check if enough days have passed since last reminder
                days_since_last_reminder = (timezone.now() - invoice.last_reminder_sent).days
                if days_since_last_reminder >= frequency_days:
                    should_send = True
                else:
                    skip_reason = f"Last reminder {days_since_last_reminder} days ago (needs {frequency_days} days)"

            # Check if client has email
            if should_send and not invoice.client.email:
                should_send = False
                skip_reason = f"Client {invoice.client.name} has no email address"

            if should_send:
                try:
                    # Send reminder email
                    send_reminder_email(invoice, invoice_settings, organization)

                    # Update invoice reminder tracking
                    invoice.last_reminder_sent = timezone.now()
                    invoice.reminder_count += 1
                    invoice.save()

                    total_sent += 1
                    logger.info(f'[SENT] Reminder for {invoice.invoice_number} to {invoice.client.email}')
                except Exception as e:
                    total_failed += 1
                    logger.error(f'[FAILED] {invoice.invoice_number}: {str(e)}')
            else:
                total_skipped += 1
                logger.debug(f'[SKIP] {invoice.invoice_number}: {skip_reason}')

    logger.info(f'Payment reminders completed: {total_sent} sent, {total_skipped} skipped, {total_failed} failed')
    return f"Sent: {total_sent}, Skipped: {total_skipped}, Failed: {total_failed}"


def send_reminder_email(invoice, invoice_settings, organization):
    """Send payment reminder email with invoice PDF attachment"""
    from api.models import EmailSettings, CompanySettings
    from api.pdf_generator import generate_invoice_pdf
    from django.core.mail import get_connection

    # Get email settings
    try:
        email_settings = EmailSettings.objects.get(organization=organization)
    except EmailSettings.DoesNotExist:
        raise ValueError(f"Email settings not configured for organization {organization.name}")

    # Validate SMTP credentials
    if not email_settings.smtp_username or not email_settings.smtp_password:
        raise ValueError(f"SMTP credentials not configured for organization {organization.name}")

    # Get company settings for PDF generation
    try:
        company_settings = CompanySettings.objects.get(organization=organization)
    except CompanySettings.DoesNotExist:
        company_settings = None

    # Prepare email subject with placeholders (use Rs. instead of rupee symbol for better compatibility)
    subject = invoice_settings.reminderEmailSubject.format(
        invoice_number=invoice.invoice_number,
        client_name=invoice.client.name,
        invoice_date=invoice.invoice_date.strftime('%d/%m/%Y'),
        total_amount=f"Rs. {invoice.total_amount:,.2f}"
    )

    # Get recipient email
    recipient_email = invoice.client.email
    if not recipient_email:
        raise ValueError(f"Client {invoice.client.name} has no email address")

    # Determine from email and company name
    if email_settings and email_settings.from_email:
        from_email = email_settings.from_email
    else:
        from_email = settings.DEFAULT_FROM_EMAIL

    company_name = company_settings.companyName if company_settings else "NexInvo"

    # Build professional HTML email content
    content = format_greeting(invoice.client.name)

    # Custom message from invoice settings
    custom_message = invoice_settings.reminderEmailBody.format(
        invoice_number=invoice.invoice_number,
        client_name=invoice.client.name,
        invoice_date=invoice.invoice_date.strftime('%d/%m/%Y'),
        total_amount=f"Rs. {invoice.total_amount:,.2f}",
        reminder_count=invoice.reminder_count + 1
    )
    content += format_paragraph(custom_message, style="lead")

    # Invoice details info box
    invoice_details = [
        ("Invoice Number", invoice.invoice_number),
        ("Invoice Date", invoice.invoice_date.strftime('%d/%m/%Y')),
        ("Due Date", invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else "On Receipt"),
        ("Reminder #", str(invoice.reminder_count + 1)),
    ]
    content += format_info_box("Invoice Details", invoice_details)

    # Amount highlight
    content += format_highlight_amount(invoice.total_amount, "Amount Due")

    content += format_alert_box(
        "Please make the payment at your earliest convenience. The invoice PDF is attached for your reference.",
        "warning"
    )

    content += format_divider()
    content += format_paragraph(
        "Thank you for your business! If you have already made the payment, please disregard this reminder.",
        style="normal"
    )

    # Signature
    content += format_signature(
        name=email_settings.from_name if email_settings and email_settings.from_name else company_name,
        company=company_name,
        phone=company_settings.phone if company_settings and company_settings.phone else None,
        email=from_email
    )

    # Generate full HTML email with dual branding
    html_body = get_base_email_template(
        subject="Payment Reminder",
        content=content,
        company_name="NexInvo",
        company_tagline="Invoice Management System",
        tenant_company_name=company_name if company_name != "NexInvo" else None,
        tenant_tagline=None,
    )

    # Plain text fallback
    plain_body = f"""
Dear {invoice.client.name},

{custom_message}

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Invoice Date: {invoice.invoice_date.strftime('%d/%m/%Y')}
- Amount Due: Rs. {invoice.total_amount:,.2f}
- Reminder #: {invoice.reminder_count + 1}

Please make the payment at your earliest convenience.

Thank you for your business!

Best Regards,
{company_name}
{from_email}
    """.strip()

    # Generate PDF attachment
    pdf_content = None
    if company_settings:
        try:
            pdf_buffer = generate_invoice_pdf(invoice, company_settings)
            # pdf_buffer is a BytesIO object, get the bytes
            pdf_content = pdf_buffer.getvalue()
        except Exception as e:
            logger.warning(f'Warning: Could not generate PDF for {invoice.invoice_number}: {str(e)}')

    # Create explicit SMTP connection using organization's email settings
    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=email_settings.smtp_host,
        port=email_settings.smtp_port,
        username=email_settings.smtp_username,
        password=email_settings.smtp_password,
        use_tls=email_settings.use_tls,
        timeout=30,
    )

    # Send email with HTML content
    email = EmailMessage(
        subject=subject,
        body=html_body,
        from_email=from_email,
        to=[recipient_email],
        connection=connection,
    )
    email.content_subtype = "html"
    email.encoding = 'utf-8'

    if pdf_content:
        email.attach(
            f'{invoice.invoice_number}.pdf',
            pdf_content,
            'application/pdf'
        )

    email.send(fail_silently=False)


@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
    """
    Delete job execution entries older than `max_age` seconds (default: 7 days).
    This helps prevent the database from filling up with old execution logs.
    """
    DjangoJobExecution.objects.delete_old_job_executions(max_age)


def process_scheduled_invoices_job():
    """
    Process all scheduled invoices that are due today.
    This is called automatically by the scheduler.
    """
    from api.scheduled_invoice_generator import process_scheduled_invoices
    return process_scheduled_invoices()


def check_and_send_pending_reminders():
    """
    Check if there are any pending payment reminders that are due and send them.
    This is called on server startup to catch any missed reminders.
    """
    from api.models import Invoice, InvoiceSettings
    import threading

    def _send_pending():
        try:
            # Check if there are any due reminders
            orgs_with_reminders = InvoiceSettings.objects.filter(enablePaymentReminders=True)
            pending_count = 0

            for invoice_settings in orgs_with_reminders:
                if not invoice_settings.organization_id:
                    continue

                organization = invoice_settings.organization
                frequency_days = invoice_settings.reminderFrequencyDays

                # Get unpaid proforma invoices
                unpaid_proformas = Invoice.objects.filter(
                    organization=organization,
                    invoice_type='proforma',
                    status__in=['draft', 'sent']
                ).exclude(status='paid').exclude(status='cancelled')

                for invoice in unpaid_proformas:
                    should_send = False
                    if invoice.last_reminder_sent is None:
                        days_since_invoice = (timezone.now().date() - invoice.invoice_date).days
                        if days_since_invoice >= frequency_days:
                            should_send = True
                    else:
                        days_since_last = (timezone.now() - invoice.last_reminder_sent).days
                        if days_since_last >= frequency_days:
                            should_send = True

                    if should_send:
                        pending_count += 1

            if pending_count > 0:
                logger.info(f"Found {pending_count} pending payment reminders on startup. Sending now...")
                send_payment_reminders()
            else:
                logger.info("No pending payment reminders found on startup.")

        except Exception as e:
            logger.error(f"Error checking pending reminders on startup: {str(e)}")

    # Run in a separate thread to not block server startup
    thread = threading.Thread(target=_send_pending, daemon=True)
    thread.start()


def start_scheduler():
    """
    Start the background scheduler with payment reminder job.
    This is called when Django server starts.
    """
    scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # Get scheduled time from settings
    reminder_hour = getattr(settings, 'PAYMENT_REMINDER_HOUR', 9)
    reminder_minute = getattr(settings, 'PAYMENT_REMINDER_MINUTE', 0)

    # Schedule payment reminders to run daily at the configured time
    scheduler.add_job(
        send_payment_reminders,
        trigger=CronTrigger(hour=reminder_hour, minute=reminder_minute),
        id="send_payment_reminders",
        max_instances=1,
        replace_existing=True,
    )
    logger.info(f"Payment reminder job scheduled to run daily at {reminder_hour:02d}:{reminder_minute:02d}")

    # Schedule cleanup of old job executions - runs weekly on Sunday at midnight
    scheduler.add_job(
        delete_old_job_executions,
        trigger=CronTrigger(day_of_week="sun", hour="00", minute="00"),
        id="delete_old_job_executions",
        max_instances=1,
        replace_existing=True,
    )
    logger.info("Job execution cleanup scheduled for weekly on Sunday at midnight")

    # Schedule invoice generation - runs daily at configured time (same as payment reminders)
    scheduled_invoice_hour = getattr(settings, 'SCHEDULED_INVOICE_HOUR', reminder_hour)
    scheduled_invoice_minute = getattr(settings, 'SCHEDULED_INVOICE_MINUTE', reminder_minute + 5)

    scheduler.add_job(
        process_scheduled_invoices_job,
        trigger=CronTrigger(hour=scheduled_invoice_hour, minute=scheduled_invoice_minute),
        id="process_scheduled_invoices",
        max_instances=1,
        replace_existing=True,
    )
    logger.info(f"Scheduled invoice job set to run daily at {scheduled_invoice_hour:02d}:{scheduled_invoice_minute:02d}")

    try:
        logger.info("Starting background scheduler...")
        scheduler.start()

        # Check and send any pending reminders on startup
        # This runs after scheduler starts to catch any missed reminders after deployment
        check_and_send_pending_reminders()

    except KeyboardInterrupt:
        logger.info("Stopping scheduler...")
        scheduler.shutdown()
        logger.info("Scheduler stopped successfully!")
