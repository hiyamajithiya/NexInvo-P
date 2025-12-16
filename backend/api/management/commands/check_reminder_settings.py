"""
Management command to check and display payment reminder settings for all organizations.
Also creates missing InvoiceSettings for organizations that don't have them.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Organization, InvoiceSettings, Invoice


class Command(BaseCommand):
    help = 'Check payment reminder settings for all organizations and optionally fix missing settings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Create missing InvoiceSettings for organizations',
        )

    def handle(self, *args, **options):
        self.stdout.write('=' * 70)
        self.stdout.write('PAYMENT REMINDER SETTINGS CHECK')
        self.stdout.write('=' * 70)
        self.stdout.write('')

        organizations = Organization.objects.all()
        orgs_without_settings = []
        orgs_with_reminders_enabled = 0
        orgs_with_reminders_disabled = 0

        for org in organizations:
            self.stdout.write(f'\nOrganization: {org.name}')
            self.stdout.write('-' * 50)

            try:
                settings = InvoiceSettings.objects.get(organization=org)
                self.stdout.write(f'  Reminders Enabled: {settings.enablePaymentReminders}')
                self.stdout.write(f'  Frequency (days): {settings.reminderFrequencyDays}')
                self.stdout.write(f'  Email Subject: {settings.reminderEmailSubject[:50]}...' if len(settings.reminderEmailSubject) > 50 else f'  Email Subject: {settings.reminderEmailSubject}')

                if settings.enablePaymentReminders:
                    orgs_with_reminders_enabled += 1
                else:
                    orgs_with_reminders_disabled += 1

                # Count pending invoices for this organization
                pending_invoices = Invoice.objects.filter(
                    organization=org,
                    invoice_type='proforma',
                    status__in=['draft', 'sent']
                ).exclude(status='paid').exclude(status='cancelled')

                self.stdout.write(f'  Pending Proforma Invoices: {pending_invoices.count()}')

                # Count invoices that need reminders
                due_for_reminder = 0
                for invoice in pending_invoices:
                    if invoice.last_reminder_sent is None:
                        days_since = (timezone.now().date() - invoice.invoice_date).days
                        if days_since >= settings.reminderFrequencyDays:
                            due_for_reminder += 1
                    else:
                        days_since_reminder = (timezone.now() - invoice.last_reminder_sent).days
                        if days_since_reminder >= settings.reminderFrequencyDays:
                            due_for_reminder += 1

                self.stdout.write(f'  Due for Reminder: {due_for_reminder}')

            except InvoiceSettings.DoesNotExist:
                self.stdout.write(self.style.WARNING('  InvoiceSettings: NOT FOUND'))
                orgs_without_settings.append(org)

        self.stdout.write('\n' + '=' * 70)
        self.stdout.write('SUMMARY')
        self.stdout.write('=' * 70)
        self.stdout.write(f'Total Organizations: {organizations.count()}')
        self.stdout.write(f'With Reminders Enabled: {orgs_with_reminders_enabled}')
        self.stdout.write(f'With Reminders Disabled: {orgs_with_reminders_disabled}')
        self.stdout.write(f'Missing InvoiceSettings: {len(orgs_without_settings)}')

        if orgs_without_settings:
            self.stdout.write('\n' + '=' * 70)
            self.stdout.write('ORGANIZATIONS WITHOUT INVOICE SETTINGS')
            self.stdout.write('=' * 70)
            for org in orgs_without_settings:
                self.stdout.write(f'  - {org.name} (ID: {org.id})')

            if options['fix']:
                self.stdout.write('\n' + self.style.WARNING('Creating missing InvoiceSettings...'))
                for org in orgs_without_settings:
                    InvoiceSettings.objects.create(
                        organization=org,
                        enablePaymentReminders=True,
                        reminderFrequencyDays=3
                    )
                    self.stdout.write(self.style.SUCCESS(f'  Created InvoiceSettings for: {org.name}'))
                self.stdout.write(self.style.SUCCESS(f'\nCreated {len(orgs_without_settings)} InvoiceSettings records.'))
            else:
                self.stdout.write('\nRun with --fix flag to create missing InvoiceSettings:')
                self.stdout.write('  python manage.py check_reminder_settings --fix')

        self.stdout.write('\n' + '=' * 70)
