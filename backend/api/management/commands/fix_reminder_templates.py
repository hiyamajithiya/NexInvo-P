"""
Fix payment reminder email templates to use Rs. instead of ₹ symbol
for better email encoding compatibility.
"""
from django.core.management.base import BaseCommand
from api.models import InvoiceSettings


class Command(BaseCommand):
    help = 'Fix payment reminder email templates to use Rs. instead of Rupee symbol'

    def handle(self, *args, **options):
        # Find all InvoiceSettings with ₹ symbol in reminder templates
        settings_to_update = InvoiceSettings.objects.filter(
            reminderEmailBody__contains='₹'
        )

        count = settings_to_update.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No reminder templates need updating.'))
            return

        self.stdout.write(f'Found {count} reminder template(s) to update...')

        for invoice_settings in settings_to_update:
            old_body = invoice_settings.reminderEmailBody
            new_body = old_body.replace('₹', 'Rs. ')
            invoice_settings.reminderEmailBody = new_body

            old_subject = invoice_settings.reminderEmailSubject
            new_subject = old_subject.replace('₹', 'Rs. ')
            invoice_settings.reminderEmailSubject = new_subject

            invoice_settings.save()
            self.stdout.write(f'  Updated template for organization: {invoice_settings.organization.name}')

        self.stdout.write(self.style.SUCCESS(f'Successfully updated {count} reminder template(s).'))
