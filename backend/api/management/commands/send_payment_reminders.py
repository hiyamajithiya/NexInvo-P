from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from api.models import Invoice, InvoiceSettings, EmailSettings
from api.pdf_generator import generate_invoice_pdf
import io


class Command(BaseCommand):
    help = 'Send payment reminders for unpaid proforma invoices'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting payment reminder process...')

        # Get all users with active reminders
        users_with_reminders = InvoiceSettings.objects.filter(
            enablePaymentReminders=True
        )

        total_sent = 0
        total_skipped = 0

        for invoice_settings in users_with_reminders:
            user = invoice_settings.user
            frequency_days = invoice_settings.reminderFrequencyDays

            # Get unpaid proforma invoices for this user
            unpaid_proformas = Invoice.objects.filter(
                user=user,
                invoice_type='proforma',
                status__in=['draft', 'sent']  # Not paid or cancelled
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
                        self.send_reminder_email(invoice, invoice_settings, user)

                        # Update invoice reminder tracking
                        invoice.last_reminder_sent = timezone.now()
                        invoice.reminder_count += 1
                        invoice.save()

                        total_sent += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Sent reminder for {invoice.invoice_number} to {invoice.client.email}'
                            )
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f'✗ Failed to send reminder for {invoice.invoice_number}: {str(e)}'
                            )
                        )
                else:
                    total_skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {total_sent} reminders sent, {total_skipped} skipped'
            )
        )

    def send_reminder_email(self, invoice, invoice_settings, user):
        """Send payment reminder email with invoice PDF attachment"""

        # Get email settings
        try:
            email_settings = EmailSettings.objects.get(organization=invoice.organization)
        except EmailSettings.DoesNotExist:
            email_settings = None

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
        try:
            pdf_buffer = generate_invoice_pdf(invoice)
            pdf_content = pdf_buffer.getvalue()
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f'Warning: Could not generate PDF for {invoice.invoice_number}: {str(e)}'
                )
            )
            pdf_content = None

        # Send email
        from django.core.mail import EmailMessage

        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=from_email,
            to=[recipient_email],
        )

        if pdf_content:
            email.attach(
                f'{invoice.invoice_number}.pdf',
                pdf_content,
                'application/pdf'
            )

        email.send()
