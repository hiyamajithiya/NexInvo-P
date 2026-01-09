# Migration to add session_type to UserSession for multi-session support

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0042_merge_20251230_1456"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # First, drop the existing unique constraint on user (OneToOne)
        # by removing and recreating the model with ForeignKey
        migrations.AlterField(
            model_name="usersession",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sessions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Add session_type field
        migrations.AddField(
            model_name="usersession",
            name="session_type",
            field=models.CharField(
                choices=[("web", "Web Browser"), ("setu", "Setu Desktop Connector")],
                default="web",
                max_length=20,
            ),
        ),
        # Add unique constraint for user + session_type combination
        migrations.AlterUniqueTogether(
            name="usersession",
            unique_together={("user", "session_type")},
        ),
    ]
