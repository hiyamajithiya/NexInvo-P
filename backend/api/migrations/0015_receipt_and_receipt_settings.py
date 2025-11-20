# Generated manually for Receipt model and receipt settings

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0014_migrate_existing_data_to_orgs'),
    ]

    operations = [
        # Add receipt settings to InvoiceSettings
        migrations.AddField(
            model_name='invoicesettings',
            name='receiptPrefix',
            field=models.CharField(default='RCPT-', max_length=20),
        ),
        migrations.AddField(
            model_name='invoicesettings',
            name='receiptStartingNumber',
            field=models.IntegerField(default=1),
        ),
        # Create Receipt model
        migrations.CreateModel(
            name='Receipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('receipt_number', models.CharField(max_length=50, unique=True)),
                ('receipt_date', models.DateField()),
                ('amount_received', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_method', models.CharField(max_length=20)),
                ('received_from', models.CharField(max_length=255)),
                ('towards', models.CharField(default='Payment against invoice', max_length=255)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_receipts', to=settings.AUTH_USER_MODEL)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='api.invoice')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='api.organization')),
                ('payment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='receipt', to='api.payment')),
            ],
            options={
                'verbose_name': 'Receipt',
                'verbose_name_plural': 'Receipts',
                'ordering': ['-receipt_date', '-created_at'],
            },
        ),
    ]
