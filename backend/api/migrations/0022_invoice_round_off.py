from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_auto_20251124_1740'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='round_off',
            field=models.DecimalField(decimal_places=2, default=0.00, max_digits=12),
        ),
    ]
