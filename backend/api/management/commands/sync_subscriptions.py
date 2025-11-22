"""
Management command to sync subscriptions for organizations.
Creates Subscription records for organizations that have a plan but no subscription.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date, timedelta
from api.models import Organization, Subscription, SubscriptionPlan


class Command(BaseCommand):
    help = 'Sync subscriptions for organizations with plans but no subscription records'

    def handle(self, *args, **options):
        self.stdout.write('Syncing subscriptions...\n')

        organizations = Organization.objects.all()
        synced_count = 0
        skipped_count = 0
        error_count = 0

        for org in organizations:
            # Check if organization already has a subscription
            if Subscription.objects.filter(organization=org).exists():
                self.stdout.write(f'  [SKIP] {org.name}: Already has subscription')
                skipped_count += 1
                continue

            # Skip if organization has no plan or is on free plan
            if not org.plan or org.plan == 'free':
                self.stdout.write(f'  [SKIP] {org.name}: No plan or free plan')
                skipped_count += 1
                continue

            try:
                with transaction.atomic():
                    # Find matching subscription plan
                    subscription_plan = SubscriptionPlan.objects.get(
                        name__iexact=org.plan,
                        is_active=True
                    )

                    # Create subscription
                    end_date = date.today() + timedelta(
                        days=365 if subscription_plan.billing_cycle == 'yearly' else 30
                    )

                    subscription = Subscription.objects.create(
                        organization=org,
                        plan=subscription_plan,
                        start_date=date.today(),
                        end_date=end_date,
                        status='active',
                        amount_paid=subscription_plan.price,
                        auto_renew=False,
                        next_billing_date=end_date
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  [OK] {org.name}: Created subscription for {subscription_plan.name} plan'
                        )
                    )
                    synced_count += 1

            except SubscriptionPlan.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f'  [ERROR] {org.name}: No matching subscription plan found for "{org.plan}"'
                    )
                )
                error_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'  [ERROR] {org.name}: Error creating subscription: {str(e)}'
                    )
                )
                error_count += 1

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'Synced: {synced_count}'))
        self.stdout.write(f'Skipped: {skipped_count}')
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('='*60 + '\n')
