# Generated migration for Subscription Plans and Coupons

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0015_receipt_and_receipt_settings'),
    ]

    operations = [
        # Create SubscriptionPlan model
        migrations.CreateModel(
            name='SubscriptionPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('billing_cycle', models.CharField(choices=[('monthly', 'Monthly'), ('yearly', 'Yearly')], default='monthly', max_length=20)),
                ('trial_days', models.IntegerField(default=0)),
                ('max_users', models.IntegerField(default=1, help_text='Maximum users allowed')),
                ('max_invoices_per_month', models.IntegerField(default=100, help_text='Maximum invoices per month')),
                ('max_storage_gb', models.IntegerField(default=1, help_text='Maximum storage in GB')),
                ('features', models.JSONField(blank=True, default=dict, help_text='{"email_support": true, "api_access": false}')),
                ('is_active', models.BooleanField(default=True, help_text='Plan is available for subscription')),
                ('is_visible', models.BooleanField(default=True, help_text='Show on pricing page')),
                ('sort_order', models.IntegerField(default=0, help_text='Display order on pricing page')),
                ('highlight', models.BooleanField(default=False, help_text="Highlight as 'Most Popular'")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Subscription Plan',
                'verbose_name_plural': 'Subscription Plans',
                'ordering': ['sort_order', 'price'],
            },
        ),

        # Create Coupon model
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(help_text='Coupon code (e.g., WELCOME20)', max_length=50, unique=True)),
                ('name', models.CharField(help_text='Internal name for reference', max_length=100)),
                ('description', models.TextField(blank=True, help_text='Description of the offer')),
                ('discount_type', models.CharField(choices=[('percentage', 'Percentage Discount'), ('fixed', 'Fixed Amount Discount'), ('extended_period', 'Extended Period')], max_length=20)),
                ('discount_value', models.DecimalField(decimal_places=2, help_text='20 for 20%, 500 for ₹500, 30 for 30 days', max_digits=10)),
                ('valid_from', models.DateTimeField(help_text='Coupon valid from this date')),
                ('valid_until', models.DateTimeField(help_text='Coupon expires after this date')),
                ('max_total_uses', models.IntegerField(blank=True, help_text='Maximum total redemptions (leave empty for unlimited)', null=True)),
                ('max_uses_per_user', models.IntegerField(default=1, help_text='Maximum times one organization can use this')),
                ('current_usage_count', models.IntegerField(default=0, editable=False, help_text='Current total usage count')),
                ('is_active', models.BooleanField(default=True, help_text='Coupon is active and can be redeemed')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('applicable_plans', models.ManyToManyField(blank=True, help_text='Leave empty to apply to all plans', related_name='coupons', to='api.subscriptionplan')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_coupons', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Coupon',
                'verbose_name_plural': 'Coupons',
                'ordering': ['-created_at'],
            },
        ),

        # Create Subscription model
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('trial_end_date', models.DateField(blank=True, help_text='End of trial period', null=True)),
                ('status', models.CharField(choices=[('trial', 'Trial'), ('active', 'Active'), ('expired', 'Expired'), ('cancelled', 'Cancelled')], default='trial', max_length=20)),
                ('auto_renew', models.BooleanField(default=True, help_text='Automatically renew subscription')),
                ('last_payment_date', models.DateField(blank=True, null=True)),
                ('next_billing_date', models.DateField(blank=True, null=True)),
                ('amount_paid', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('coupon_applied', models.ForeignKey(blank=True, help_text='Coupon used for this subscription', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='applied_subscriptions', to='api.coupon')),
                ('organization', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_detail', to='api.organization')),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='subscriptions', to='api.subscriptionplan')),
            ],
            options={
                'verbose_name': 'Subscription',
                'verbose_name_plural': 'Subscriptions',
                'ordering': ['-created_at'],
            },
        ),

        # Create CouponUsage model
        migrations.CreateModel(
            name='CouponUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, help_text='Actual discount amount applied', max_digits=10)),
                ('extended_days', models.IntegerField(default=0, help_text='Extra days added to subscription')),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('coupon', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usages', to='api.coupon')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='coupon_usages', to='api.organization')),
                ('subscription', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='coupon_usages', to='api.subscription')),
                ('user', models.ForeignKey(help_text='User who redeemed the coupon', on_delete=django.db.models.deletion.CASCADE, related_name='coupon_usages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Coupon Usage',
                'verbose_name_plural': 'Coupon Usages',
                'ordering': ['-used_at'],
            },
        ),
    ]
