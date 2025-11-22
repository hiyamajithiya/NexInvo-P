# Generated manually for subscription upgrade request feature

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0019_add_gst_registration_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='SubscriptionUpgradeRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('coupon_code', models.CharField(blank=True, help_text='Coupon code user wants to apply', max_length=50)),
                ('payment_method', models.CharField(blank=True, help_text="User's intended payment method", max_length=100)),
                ('payment_reference', models.CharField(blank=True, help_text='Payment reference/transaction ID after payment', max_length=200)),
                ('amount', models.DecimalField(decimal_places=2, default=0, help_text='Amount user will pay', max_digits=10)),
                ('status', models.CharField(choices=[('pending', 'Pending Approval'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('cancelled', 'Cancelled by User')], default='pending', max_length=20)),
                ('user_notes', models.TextField(blank=True, help_text="User's message/notes")),
                ('admin_notes', models.TextField(blank=True, help_text="Superadmin's notes")),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_requests', to=settings.AUTH_USER_MODEL)),
                ('current_plan', models.ForeignKey(blank=True, help_text='Current plan (if any)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='upgrade_from_requests', to='api.subscriptionplan')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='upgrade_requests', to='api.organization')),
                ('requested_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subscription_requests', to=settings.AUTH_USER_MODEL)),
                ('requested_plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='upgrade_to_requests', to='api.subscriptionplan')),
            ],
            options={
                'verbose_name': 'Subscription Upgrade Request',
                'verbose_name_plural': 'Subscription Upgrade Requests',
                'ordering': ['-created_at'],
            },
        ),
    ]
