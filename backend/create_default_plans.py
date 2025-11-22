import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
django.setup()

from api.models import SubscriptionPlan

# Create default subscription plans
plans_data = [
    {
        'name': 'Free Trial',
        'description': '1-month free trial with basic features',
        'price': 0,
        'billing_cycle': 'monthly',
        'trial_days': 30,
        'max_users': 2,
        'max_invoices_per_month': 50,
        'max_storage_gb': 1,
        'features': ['Basic Features', 'Email Support', '50 Invoices/month', '2 Users'],
        'is_active': True,
        'is_visible': True,
        'sort_order': 0,
        'highlight': False
    },
    {
        'name': 'Basic',
        'description': 'Single User Plan',
        'price': 499,
        'billing_cycle': 'monthly',
        'trial_days': 0,
        'max_users': 1,
        'max_invoices_per_month': 100,
        'max_storage_gb': 1,
        'features': ['100 Invoices/month', '1 User', '1GB Storage', 'Email Support'],
        'is_active': True,
        'is_visible': True,
        'sort_order': 1,
        'highlight': False
    },
    {
        'name': 'Professional',
        'description': 'For growing businesses',
        'price': 1499,
        'billing_cycle': 'monthly',
        'trial_days': 0,
        'max_users': 5,
        'max_invoices_per_month': 500,
        'max_storage_gb': 5,
        'features': ['500 Invoices/month', '5 Users', '5GB Storage', 'Priority Support', 'Custom Branding'],
        'is_active': True,
        'is_visible': True,
        'sort_order': 2,
        'highlight': True
    },
    {
        'name': 'Enterprise',
        'description': 'For large organizations',
        'price': 4999,
        'billing_cycle': 'monthly',
        'trial_days': 0,
        'max_users': 50,
        'max_invoices_per_month': 5000,
        'max_storage_gb': 50,
        'features': ['Unlimited Invoices', '50 Users', '50GB Storage', 'Dedicated Support', 'Custom Branding', 'API Access', 'Advanced Analytics'],
        'is_active': True,
        'is_visible': True,
        'sort_order': 3,
        'highlight': False
    }
]

print("Creating subscription plans...")
for plan_data in plans_data:
    plan, created = SubscriptionPlan.objects.update_or_create(
        name=plan_data['name'],
        defaults=plan_data
    )
    if created:
        print(f"Created: {plan.name}")
    else:
        print(f"Updated: {plan.name}")

print(f"\nTotal plans in database: {SubscriptionPlan.objects.count()}")
