from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_superadminnotification'),
    ]

    operations = [
        # Add TDS fields to Payment model
        migrations.AddField(
            model_name='payment',
            name='tds_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='TDS deducted amount', max_digits=12),
        ),
        migrations.AddField(
            model_name='payment',
            name='amount_received',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Actual amount received in bank/cash', max_digits=12),
        ),
        # Update amount field help_text
        migrations.AlterField(
            model_name='payment',
            name='amount',
            field=models.DecimalField(decimal_places=2, help_text='Total payment amount (received + TDS)', max_digits=12),
        ),
        # Add TDS fields to Receipt model
        migrations.AddField(
            model_name='receipt',
            name='tds_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='TDS deducted amount', max_digits=12),
        ),
        migrations.AddField(
            model_name='receipt',
            name='total_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Total payment (received + TDS)', max_digits=12),
        ),
        # Update amount_received field help_text
        migrations.AlterField(
            model_name='receipt',
            name='amount_received',
            field=models.DecimalField(decimal_places=2, help_text='Actual amount received (after TDS)', max_digits=12),
        ),
    ]
