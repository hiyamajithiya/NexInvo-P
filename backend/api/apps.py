import os
import sys
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """Import signal handlers and start scheduler when the app is ready"""
        import api.signals  # noqa

        # Start the scheduler only in the main process (not in migrations, shell, etc.)
        # RUN_MAIN is set by Django's auto-reloader
        from django.conf import settings

        scheduler_autostart = getattr(settings, 'SCHEDULER_AUTOSTART', True)

        # Check if we're running a management command that shouldn't start the scheduler
        is_management_command = len(sys.argv) > 1 and sys.argv[1] in [
            'migrate', 'makemigrations', 'collectstatic', 'shell',
            'createsuperuser', 'dbshell', 'test', 'check'
        ]

        # Only start scheduler if:
        # 1. SCHEDULER_AUTOSTART is True
        # 2. We're in the main process (RUN_MAIN=true) OR running with gunicorn/production
        # 3. Not running certain management commands
        if scheduler_autostart and not is_management_command:
            run_main = os.environ.get('RUN_MAIN')

            # Start scheduler in the reloaded process (RUN_MAIN=true)
            # or when running in production (no RUN_MAIN but using gunicorn)
            if run_main == 'true' or (run_main is None and 'gunicorn' in sys.modules):
                try:
                    from api.scheduler import start_scheduler
                    start_scheduler()
                    logger.info("Background scheduler started successfully")
                except Exception as e:
                    logger.error(f"Failed to start scheduler: {e}")
