from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum
from datetime import timedelta
from api.models import Invoice, InvoiceSettings, EmailSettings, CompanySettings, Payment
from api.pdf_generator import generate_invoice_pdf
import io


class Command(BaseCommand):
    help = 'Send payment reminders for unpaid proforma invoices'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting payment reminder process...')

        # Get all organizations with active reminders
        orgs_with_reminders = InvoiceSettings.objects.filter(
            enablePaymentReminders=True
        )

        total_sent = 0
        total_skipped = 0

        for invoice_settings in orgs_with_reminders:
            # Skip if no organization is linked (legacy data)
            if not invoice_settings.organization_id:
                self.stdout.write(
                    self.style.WARNING(
                        f'Skipping InvoiceSettings {invoice_settings.id} - no organization linked'
                    )
                )
                continue

            organization = invoice_settings.organization
            frequency_days = invoice_settings.reminderFrequencyDays

            # Get unpaid invoices (both proforma and tax) for this organization
            unpaid_invoices = Invoice.objects.filter(
                organization=organization,
                invoice_type__in=['proforma', 'tax'],
                status__in=['draft', 'sent']  # Not paid or cancelled
            ).exclude(
                status='paid'
            ).exclude(
                status='cancelled'
            )

            for invoice in unpaid_invoices:
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
                        self.send_reminder_email(invoice, invoice_settings, organization)

                        # Update invoice reminder tracking
                        invoice.last_reminder_sent = timezone.now()
                        invoice.reminder_count += 1
                        invoice.save()

                        total_sent += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'[OK] Sent reminder for {invoice.invoice_number} to {invoice.client.email}'
                            )
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f'[FAILED] Failed to send reminder for {invoice.invoice_number}: {str(e)}'
                            )
                        )
                else:
                    total_skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {total_sent} reminders sent, {total_skipped} skipped'
            )
        )

    def send_reminder_email(self, invoice, invoice_settings, organization):
        """Send payment reminder email with invoice PDF attachment"""

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

        # Calculate payment amounts for placeholders
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0
        balance_amount = float(invoice.total_amount) - float(total_paid)

        # Prepare email subject with placeholders
        subject = invoice_settings.reminderEmailSubject.format(
            invoice_number=invoice.invoice_number,
            client_name=invoice.client.name,
            invoice_date=invoice.invoice_date.strftime('%d/%m/%Y'),
            total_amount=f"{invoice.total_amount:,.2f}",
            paid_amount=f"{total_paid:,.2f}",
            pending_amount=f"{balance_amount:,.2f}",
            balance_amount=f"{balance_amount:,.2f}"
        )

        # Prepare email body with placeholders
        message = invoice_settings.reminderEmailBody.format(
            invoice_number=invoice.invoice_number,
            client_name=invoice.client.name,
            invoice_date=invoice.invoice_date.strftime('%d/%m/%Y'),
            total_amount=f"{invoice.total_amount:,.2f}",
            paid_amount=f"{total_paid:,.2f}",
            pending_amount=f"{balance_amount:,.2f}",
            balance_amount=f"{balance_amount:,.2f}",
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
                self.stdout.write(
                    self.style.WARNING(
                        f'Warning: Could not generate PDF for {invoice.invoice_number}: {str(e)}'
                    )
                )

        # Send email
        from django.core.mail import EmailMessage

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
