from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import CompanySettings, InvoiceSettings, EmailSettings


class Command(BaseCommand):
    help = 'Create a new user with email as username'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email address')
        parser.add_argument('password', type=str, help='User password')
        parser.add_argument('--first-name', type=str, default='', help='First name')
        parser.add_argument('--last-name', type=str, default='', help='Last name')
        parser.add_argument('--company', type=str, default='', help='Company name')

    def handle(self, *args, **kwargs):
        email = kwargs['email']
        password = kwargs['password']
        first_name = kwargs.get('first_name', '')
        last_name = kwargs.get('last_name', '')
        company_name = kwargs.get('company', '')

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.ERROR(f'User with email {email} already exists')
            )
            return

        # Create user with email as username
        user = User.objects.create_user(
            username=email,  # Use email as username
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=True
        )

        # Create default settings
        CompanySettings.objects.create(
            user=user,
            companyName=company_name if company_name else f"{first_name} {last_name}".strip() or email
        )
        InvoiceSettings.objects.create(user=user)
        EmailSettings.objects.create(user=user)

        self.stdout.write(
            self.style.SUCCESS(
                f'\n[OK] User created successfully!'
                f'\n    Email: {email}'
                f'\n    Username: {user.username}'
                f'\n    Password: (as provided)'
                f'\n    Active: {user.is_active}'
                f'\n\nYou can now login with:'
                f'\n    Email: {email}'
                f'\n    Password: {password}'
            )
        )
