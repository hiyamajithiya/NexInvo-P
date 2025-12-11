"""
Send a test email to verify email template design.
Usage: python manage.py send_test_email recipient@email.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import EmailMessage
from django.conf import settings
from api.email_templates import (
    get_base_email_template,
    format_greeting,
    format_paragraph,
    format_info_box,
    format_highlight_amount,
    format_alert_box,
    format_cta_button,
    format_divider,
    format_signature,
    format_list,
)


class Command(BaseCommand):
    help = 'Send a test email to verify email template design with dual branding'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Recipient email address')
        parser.add_argument(
            '--tenant',
            type=str,
            default='Chinmay Technosoft',
            help='Tenant company name (default: Chinmay Technosoft)'
        )

    def handle(self, *args, **options):
        recipient_email = options['email']
        tenant_name = options['tenant']

        self.stdout.write(f'Sending test email to {recipient_email}...')

        # Build test email content
        content = format_greeting("Test User")
        content += format_paragraph(
            "This is a <strong>test email</strong> to demonstrate the professional email template design with dual branding.",
            style="lead"
        )

        # Sample invoice details
        content += format_info_box("Sample Invoice Details", [
            ("Invoice Number", "INV-2025-001"),
            ("Invoice Date", "11 December 2025"),
            ("Due Date", "25 December 2025"),
            ("Client", "Sample Client Pvt Ltd"),
        ])

        # Amount highlight
        content += format_highlight_amount(25000.00, "Total Amount")

        # Alert boxes showcase
        content += format_alert_box("This is an <strong>info</strong> alert box for important notices.", "info")
        content += format_alert_box("This is a <strong>success</strong> alert box for confirmations.", "success")
        content += format_alert_box("This is a <strong>warning</strong> alert box for cautions.", "warning")

        # CTA Button
        content += format_cta_button("View Invoice", "https://www.nexinvo.chinmaytechnosoft.com")

        content += format_divider()

        # Features list
        content += format_paragraph("<strong>Email Template Features:</strong>", style="normal")
        content += format_list([
            "Professional DocMold theme (Indigo/Purple gradient)",
            "Dual branding - Tenant company in header",
            "Powered by NexInvo badge in footer",
            "Responsive design for all devices",
            "Outlook VML support",
            "UTF-8 encoding for special characters",
        ])

        content += format_divider()
        content += format_paragraph(
            "This email demonstrates the professional template design used for all NexInvo communications.",
            style="muted"
        )

        # Signature
        content += format_signature(
            name="NexInvo Team",
            company=tenant_name,
            email="support@nexinvo.com"
        )

        # Generate HTML with dual branding
        html_body = get_base_email_template(
            subject="Test Email - Template Demo",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
            tenant_company_name=tenant_name,
            tenant_tagline="Your Trusted Business Partner",
        )

        # Get system email settings
        try:
            from api.models import SystemEmailSettings
            system_settings = SystemEmailSettings.objects.first()
            if system_settings and system_settings.smtp_host:
                from django.core.mail import get_connection
                connection = get_connection(
                    backend='django.core.mail.backends.smtp.EmailBackend',
                    host=system_settings.smtp_host,
                    port=system_settings.smtp_port,
                    username=system_settings.smtp_username,
                    password=system_settings.smtp_password,
                    use_tls=system_settings.use_tls,
                )
                from_email = system_settings.from_email or system_settings.smtp_username
                self.stdout.write(f'Using system email settings: {system_settings.smtp_host}')
            else:
                connection = None
                from_email = settings.DEFAULT_FROM_EMAIL
                self.stdout.write('Using Django default email settings')
        except Exception as e:
            connection = None
            from_email = settings.DEFAULT_FROM_EMAIL
            self.stdout.write(f'Warning: Could not load system settings: {e}')

        # Send email
        try:
            email = EmailMessage(
                subject=f'[NexInvo Test] Professional Email Template Demo - {tenant_name}',
                body=html_body,
                from_email=from_email,
                to=[recipient_email],
                connection=connection,
            )
            email.content_subtype = "html"
            email.encoding = 'utf-8'
            email.send()

            self.stdout.write(self.style.SUCCESS(f'Test email sent successfully to {recipient_email}'))
            self.stdout.write(self.style.SUCCESS(f'Tenant branding: {tenant_name}'))
            self.stdout.write(self.style.SUCCESS('Check the email for dual branding (Tenant + Powered by NexInvo)'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send test email: {str(e)}'))
            import traceback
            traceback.print_exc()
