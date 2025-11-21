"""
Management command to ensure all users have at least one organization.
This is useful for fixing users created before the multi-tenant system was implemented.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils.text import slugify
from api.models import Organization, OrganizationMembership, CompanySettings, InvoiceSettings, EmailSettings, InvoiceFormatSettings
import uuid


class Command(BaseCommand):
    help = 'Ensure all users have at least one organization'

    def handle(self, *args, **options):
        users_without_org = []
        users_fixed = []

        # Check all users (exclude superusers by default)
        for user in User.objects.filter(is_superuser=False):
            # Check if user has any active organization membership
            membership = OrganizationMembership.objects.filter(
                user=user,
                is_active=True,
                organization__is_active=True
            ).first()

            if not membership:
                users_without_org.append(user)
                self.stdout.write(
                    self.style.WARNING(f'User {user.email} ({user.id}) has no organization')
                )

                # Create organization for this user
                org_name = f"{user.first_name} {user.last_name}".strip() or user.email or f"User {user.id}"
                base_slug = slugify(org_name)
                slug = base_slug
                counter = 1
                while Organization.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1

                organization = Organization.objects.create(
                    id=uuid.uuid4(),
                    name=org_name,
                    slug=slug,
                    plan='free',
                    is_active=True
                )

                # Create organization membership with owner role
                OrganizationMembership.objects.create(
                    organization=organization,
                    user=user,
                    role='owner',
                    is_active=True
                )

                # Create default settings for the organization
                CompanySettings.objects.create(organization=organization, companyName=org_name)
                InvoiceSettings.objects.create(organization=organization)
                EmailSettings.objects.create(organization=organization)
                InvoiceFormatSettings.objects.create(organization=organization)

                users_fixed.append(user)
                self.stdout.write(
                    self.style.SUCCESS(f'Created organization "{org_name}" for user {user.email}')
                )

        # Summary
        self.stdout.write('\n' + '='*70)
        self.stdout.write(f'Total users checked: {User.objects.filter(is_superuser=False).count()}')
        self.stdout.write(f'Users without organization: {len(users_without_org)}')
        self.stdout.write(f'Users fixed: {len(users_fixed)}')

        if users_fixed:
            self.stdout.write('\nFixed users:')
            for user in users_fixed:
                org = OrganizationMembership.objects.filter(user=user).first().organization
                self.stdout.write(f'  - {user.email} -> {org.name} ({org.slug})')
        else:
            self.stdout.write(self.style.SUCCESS('\nAll users have organizations!'))

        self.stdout.write('='*70)
