"""
Management command to check organization membership for a specific user.
Usage: python manage.py check_user_org <email>
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Organization, OrganizationMembership


class Command(BaseCommand):
    help = 'Check organization membership for a specific user'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email to check')

    def handle(self, *args, **options):
        email = options['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email "{email}" not found'))
            return

        self.stdout.write('='*70)
        self.stdout.write(f'User Information:')
        self.stdout.write(f'  Email: {user.email}')
        self.stdout.write(f'  Username: {user.username}')
        self.stdout.write(f'  Name: {user.first_name} {user.last_name}')
        self.stdout.write(f'  ID: {user.id}')
        self.stdout.write(f'  Is Active: {user.is_active}')
        self.stdout.write(f'  Is Superuser: {user.is_superuser}')
        self.stdout.write('='*70)

        # Get all organization memberships
        memberships = OrganizationMembership.objects.filter(user=user).select_related('organization')

        if not memberships.exists():
            self.stdout.write(self.style.ERROR('\nNo organization memberships found for this user!'))
            self.stdout.write('\nTo fix this, run:')
            self.stdout.write(f'  python manage.py ensure_user_organizations')
            return

        self.stdout.write(f'\nOrganization Memberships ({memberships.count()}):')
        for i, membership in enumerate(memberships, 1):
            org = membership.organization
            self.stdout.write(f'\n{i}. {org.name}')
            self.stdout.write(f'   Organization ID: {org.id}')
            self.stdout.write(f'   Slug: {org.slug}')
            self.stdout.write(f'   Plan: {org.plan}')
            self.stdout.write(f'   Organization Active: {org.is_active}')
            self.stdout.write(f'   Membership Role: {membership.role}')
            self.stdout.write(f'   Membership Active: {membership.is_active}')
            self.stdout.write(f'   Joined: {membership.joined_at}')

            # Check if this would be the default organization (most recently joined active one)
            active_memberships = OrganizationMembership.objects.filter(
                user=user,
                is_active=True,
                organization__is_active=True
            ).order_by('-joined_at')

            if active_memberships.exists() and active_memberships.first().id == membership.id:
                self.stdout.write(self.style.SUCCESS('   >>> DEFAULT ORGANIZATION (most recent active)'))

        # Show which organization would be set by the middleware
        active_membership = OrganizationMembership.objects.filter(
            user=user,
            is_active=True,
            organization__is_active=True
        ).order_by('-joined_at').first()

        self.stdout.write('\n' + '='*70)
        if active_membership:
            self.stdout.write(self.style.SUCCESS(
                f'Middleware would set organization: {active_membership.organization.name} ({active_membership.organization.id})'
            ))
        else:
            self.stdout.write(self.style.ERROR(
                'Middleware would set organization to None (user has no active memberships)'
            ))
        self.stdout.write('='*70)
