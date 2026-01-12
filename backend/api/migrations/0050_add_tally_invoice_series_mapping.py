# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0049_update_reminder_template_with_payment_placeholders'),
    ]

    operations = [
        migrations.AddField(
            model_name='tallymapping',
            name='invoice_number_mode',
            field=models.CharField(
                choices=[
                    ('keep', 'Keep Tally Number'),
                    ('nexinvo', 'Use NexInvo Series'),
                    ('custom', 'Custom Prefix')
                ],
                default='keep',
                max_length=20,
                help_text='How to handle invoice numbers when importing from Tally'
            ),
        ),
        migrations.AddField(
            model_name='tallymapping',
            name='tally_invoice_prefix',
            field=models.CharField(
                blank=True,
                default='',
                max_length=50,
                help_text='Custom prefix for Tally imports (e.g., TALLY-)'
            ),
        ),
        migrations.AddField(
            model_name='tallymapping',
            name='auto_detect_series',
            field=models.BooleanField(
                default=True,
                help_text='Auto-detect Tally invoice series during import'
            ),
        ),
        migrations.AddField(
            model_name='tallymapping',
            name='detected_tally_prefix',
            field=models.CharField(
                blank=True,
                default='',
                max_length=50,
                help_text='Detected Tally invoice prefix pattern'
            ),
        ),
    ]
