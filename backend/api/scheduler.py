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

            if invoice.last_reminder_sent is None:
                # Never sent a reminder, check if invoice is old enough
                days_since_invoice = (timezone.now().date() - invoice.invoice_date).days
                if days_since_invoice >= frequency_days:
                    should_send = True
            else:
                # Check if enough days have passed since last reminder
                days_since_last_reminder = (timezone.now() - invoice.last_reminder_sent).days
                if days_since_last_reminder >= frequency_days:
                    should_send = True

            if should_send:
                try:
                    # Send reminder email
                    send_reminder_email(invoice, invoice_settings, organization)

                    # Update invoice reminder tracking
                    invoice.last_reminder_sent = timezone.now()
                    invoice.reminder_count += 1
                    invoice.save()

                    total_sent += 1
                    logger.info(f'[OK] Sent reminder for {invoice.invoice_number} to {invoice.client.email}')
                except Exception as e:
                    total_failed += 1
                    logger.error(f'[FAILED] Failed to send reminder for {invoice.invoice_number}: {str(e)}')
            else:
                total_skipped += 1

    logger.info(f'Payment reminders completed: {total_sent} sent, {total_skipped} skipped, {total_failed} failed')
    return f"Sent: {total_sent}, Skipped: {total_skipped}, Failed: {total_failed}"


def send_reminder_email(invoice, invoice_settings, organization):
    """Send payment reminder email with invoice PDF attachment"""
    from api.models import EmailSettings, CompanySettings
    from api.pdf_generator import generate_invoice_pdf

    # Get email settings
    try:
        email_settings = EmailSettings.objects.get(organization=organization)
    except EmailSettings.DoesNotExist:
        email_settings = None

    # Get company settings for PDF generation
    try:
        company_settings = CompanySettings.objects.get(organization=organization)
    except CompanySettings.DoesNotExist:
        company_settings = None

    # Prepare email subject with placeholders
    subject = invoice_settings.reminderEmailSubject.format(
        invoice_number=invoice.invoice_number,
        client_name=invoice.client.name,
        invoice_date=invoice.invoice_date.strftime('%d-%m-%Y'),
        total_amount=f"{invoice.total_amount:,.2f}"
    )

    # Prepare email body with placeholders
    message = invoice_settings.reminderEmailBody.format(
        invoice_number=invoice.invoice_number,
        client_name=invoice.client.name,
        invoice_date=invoice.invoice_date.strftime('%d-%m-%Y'),
        total_amount=f"{invoice.total_amount:,.2f}",
        reminder_count=invoice.reminder_count + 1
    )

    # Get recipient email
    recipient_email = invoice.client.email
    if not recipient_email:
        raise ValueError(f"Client {invoice.client.name} has no email address")

    # Determine from email
    if email_settings and email_settings.from_email:
        from_email = email_settings.from_email
    else:
        from_email = settings.DEFAULT_FROM_EMAIL

    # Generate PDF attachment
    pdf_content = None
    if company_settings:
        try:
            pdf_buffer = generate_invoice_pdf(invoice, company_settings)
            # pdf_buffer is a BytesIO object, get the bytes
            pdf_content = pdf_buffer.getvalue()
        except Exception as e:
            logger.warning(f'Warning: Could not generate PDF for {invoice.invoice_number}: {str(e)}')

    # Send email
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=from_email,
        to=[recipient_email],
    )
    # Set encoding to UTF-8 for proper Unicode support (rupee symbol, etc.)
    email.encoding = 'utf-8'

    if pdf_content:
        email.attach(
            f'{invoice.invoice_number}.pdf',
            pdf_content,
            'application/pdf'
        )

    email.send()


@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
    """
    Delete job execution entries older than `max_age` seconds (default: 7 days).
    This helps prevent the database from filling up with old execution logs.
    """
    DjangoJobExecution.objects.delete_old_job_executions(max_age)


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

    try:
        logger.info("Starting background scheduler...")
        scheduler.start()
    except KeyboardInterrupt:
        logger.info("Stopping scheduler...")
        scheduler.shutdown()
        logger.info("Scheduler stopped successfully!")
