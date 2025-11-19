from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import CompanySettings, InvoiceSettings, EmailSettings


class Command(BaseCommand):
    help = 'Fix user accounts: set email as username, activate users, create default settings'

    def handle(self, *args, **kwargs):
        self.stdout.write('Fixing user accounts...')

        fixed_count = 0
        activated_count = 0
        settings_created = 0

        for user in User.objects.all():
            modified = False

            # If user has email but username is different, update username to email
            if user.email and user.username != user.email:
                old_username = user.username
                user.username = user.email
                modified = True
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[OK] Updated username: {old_username} -> {user.email}'
                    )
                )
                fixed_count += 1

            # Activate user if not active
            if not user.is_active:
                user.is_active = True
                modified = True
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[OK] Activated user: {user.email or user.username}'
                    )
                )
                activated_count += 1

            if modified:
                user.save()

            # Create default settings if missing
            created_settings = []

            if not hasattr(user, 'company_settings'):
                CompanySettings.objects.create(
                    user=user,
                    companyName=f"{user.first_name} {user.last_name}".strip() or user.email or user.username
                )
                created_settings.append('CompanySettings')

            if not hasattr(user, 'invoice_settings'):
                InvoiceSettings.objects.create(user=user)
                created_settings.append('InvoiceSettings')

            if not hasattr(user, 'email_settings'):
                EmailSettings.objects.create(user=user)
                created_settings.append('EmailSettings')

            if created_settings:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[OK] Created settings for {user.email or user.username}: {", ".join(created_settings)}'
                    )
                )
                settings_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {fixed_count} usernames fixed, {activated_count} users activated, {settings_created} users got default settings'
            )
        )
