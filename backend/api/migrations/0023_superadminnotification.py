from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_invoice_round_off'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SuperAdminNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(
                    choices=[
                        ('upgrade_request', 'Subscription Upgrade Request'),
                        ('new_registration', 'New Organization Registration'),
                        ('payment_received', 'Payment Received'),
                        ('subscription_expiring', 'Subscription Expiring'),
                        ('other', 'Other'),
                    ],
                    max_length=30
                )),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('related_object_type', models.CharField(blank=True, help_text="e.g., 'upgrade_request', 'subscription'", max_length=50)),
                ('related_object_id', models.IntegerField(blank=True, help_text='ID of the related object', null=True)),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('action_url', models.CharField(blank=True, help_text='URL/route to navigate to for action', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='superadmin_notifications',
                    to='api.organization'
                )),
                ('user', models.ForeignKey(
                    blank=True,
                    help_text='User who triggered this notification',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='triggered_notifications',
                    to=settings.AUTH_USER_MODEL
                )),
                ('read_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='read_notifications',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'verbose_name': 'Super Admin Notification',
                'verbose_name_plural': 'Super Admin Notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
