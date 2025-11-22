# Generated manually for adding GST registration date tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_add_gst_enabled_flag'),
    ]

    operations = [
        migrations.AddField(
            model_name='companysettings',
            name='gstRegistrationDate',
            field=models.DateField(
                blank=True,
                null=True,
                help_text='Date when organization was registered under GST (leave blank if not registered or GST not applicable)'
            ),
        ),
    ]
