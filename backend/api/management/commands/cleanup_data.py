"""
Data Cleanup Management Command for IT Act & DPDP Act Compliance.

This command handles:
1. Cleanup of old audit logs (configurable retention period)
2. Cleanup of old failed login attempts
3. Data retention enforcement for financial records
4. Processing of data deletion requests

Usage:
    python manage.py cleanup_data --dry-run  # Preview what would be deleted
    python manage.py cleanup_data            # Execute cleanup
    python manage.py cleanup_data --audit-logs-days=365  # Custom retention for audit logs
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from django.db import transaction


class Command(BaseCommand):
    help = 'Cleanup old data for IT Act & DPDP Act compliance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--audit-logs-days',
            type=int,
            default=365,
            help='Number of days to keep audit logs (default: 365)',
        )
        parser.add_argument(
            '--failed-login-days',
            type=int,
            default=30,
            help='Number of days to keep failed login attempts (default: 30)',
        )
        parser.add_argument(
            '--process-deletion-requests',
            action='store_true',
            help='Process pending data deletion requests',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        audit_logs_days = options['audit_logs_days']
        failed_login_days = options['failed_login_days']
        process_deletions = options['process_deletion_requests']

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN MODE - No data will be deleted ===\n'))

        # 1. Cleanup old audit logs
        self.cleanup_audit_logs(audit_logs_days, dry_run)

        # 2. Cleanup old failed login attempts
        self.cleanup_failed_logins(failed_login_days, dry_run)

        # 3. Process data deletion requests
        if process_deletions:
            self.process_deletion_requests(dry_run)

        # 4. Report on data retention status
        self.report_retention_status()

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN COMPLETE - Run without --dry-run to execute ===\n'))
        else:
            self.stdout.write(self.style.SUCCESS('\n=== Data cleanup completed successfully ===\n'))

    def cleanup_audit_logs(self, days, dry_run):
        """Clean up audit logs older than specified days."""
        try:
            from api.models import AuditLog

            cutoff_date = timezone.now() - timedelta(days=days)
            old_logs = AuditLog.objects.filter(created_at__lt=cutoff_date)
            count = old_logs.count()

            self.stdout.write(f'\nAudit Logs:')
            self.stdout.write(f'  - Found {count} logs older than {days} days')

            if count > 0 and not dry_run:
                with transaction.atomic():
                    old_logs.delete()
                self.stdout.write(self.style.SUCCESS(f'  - Deleted {count} old audit logs'))
            elif count > 0:
                self.stdout.write(self.style.WARNING(f'  - Would delete {count} old audit logs'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  - Error cleaning audit logs: {str(e)}'))

    def cleanup_failed_logins(self, days, dry_run):
        """Clean up failed login attempts older than specified days."""
        try:
            from api.models import FailedLoginAttempt

            cutoff_date = timezone.now() - timedelta(days=days)
            old_attempts = FailedLoginAttempt.objects.filter(created_at__lt=cutoff_date)
            count = old_attempts.count()

            self.stdout.write(f'\nFailed Login Attempts:')
            self.stdout.write(f'  - Found {count} records older than {days} days')

            if count > 0 and not dry_run:
                with transaction.atomic():
                    old_attempts.delete()
                self.stdout.write(self.style.SUCCESS(f'  - Deleted {count} old failed login records'))
            elif count > 0:
                self.stdout.write(self.style.WARNING(f'  - Would delete {count} old failed login records'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  - Error cleaning failed logins: {str(e)}'))

    def process_deletion_requests(self, dry_run):
        """Process pending data deletion requests (DPDP Act compliance)."""
        try:
            from api.models import DataDeletionRequest

            pending_requests = DataDeletionRequest.objects.filter(
                status='pending',
                legal_hold=False
            ).select_related('user', 'organization')

            count = pending_requests.count()

            self.stdout.write(f'\nData Deletion Requests:')
            self.stdout.write(f'  - Found {count} pending requests')

            for request in pending_requests:
                # Check retention period
                retention_years = getattr(settings, 'DATA_RETENTION_YEARS', 8)
                if request.retention_end_date and request.retention_end_date > timezone.now().date():
                    self.stdout.write(
                        self.style.WARNING(
                            f'  - Request {request.id} for {request.email}: Under retention until {request.retention_end_date}'
                        )
                    )
                    continue

                if not dry_run:
                    # Process the deletion
                    self._execute_deletion(request)
                    self.stdout.write(
                        self.style.SUCCESS(f'  - Processed deletion request {request.id} for {request.email}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  - Would process deletion request {request.id} for {request.email}')
                    )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  - Error processing deletion requests: {str(e)}'))

    def _execute_deletion(self, deletion_request):
        """Execute a data deletion request."""
        from api.models import DataDeletionRequest
        from django.contrib.auth.models import User

        with transaction.atomic():
            user = deletion_request.user

            if user:
                # Anonymize user data instead of hard delete (for audit trail)
                user.email = f'deleted_{user.id}@deleted.com'
                user.first_name = 'Deleted'
                user.last_name = 'User'
                user.is_active = False
                user.save()

            # Update deletion request status
            deletion_request.status = 'completed'
            deletion_request.processed_at = timezone.now()
            deletion_request.save()

    def report_retention_status(self):
        """Report on data retention status."""
        try:
            from api.models import Invoice, AuditLog, UserConsent

            retention_years = getattr(settings, 'DATA_RETENTION_YEARS', 8)
            retention_date = timezone.now() - timedelta(days=retention_years * 365)

            self.stdout.write(f'\nData Retention Status (Retention Period: {retention_years} years):')

            # Invoices under retention
            try:
                old_invoices = Invoice.objects.filter(created_at__lt=retention_date).count()
                total_invoices = Invoice.objects.count()
                self.stdout.write(f'  - Invoices: {total_invoices} total, {old_invoices} past retention period')
            except Exception:
                pass

            # Audit logs
            try:
                total_logs = AuditLog.objects.count()
                self.stdout.write(f'  - Audit Logs: {total_logs} total')
            except Exception:
                pass

            # User consents
            try:
                active_consents = UserConsent.objects.filter(consent_given=True).count()
                withdrawn_consents = UserConsent.objects.filter(consent_given=False).count()
                self.stdout.write(f'  - User Consents: {active_consents} active, {withdrawn_consents} withdrawn')
            except Exception:
                pass

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  - Error generating report: {str(e)}'))
