import os
import sys
import logging
import fcntl
from django.apps import AppConfig

logger = logging.getLogger(__name__)

class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """Import signal handlers and start scheduler when the app is ready"""
        import api.signals  # noqa

        from django.conf import settings
        scheduler_autostart = getattr(settings, 'SCHEDULER_AUTOSTART', True)

        is_management_command = len(sys.argv) > 1 and sys.argv[1] in [
            'migrate', 'makemigrations', 'collectstatic', 'shell',
            'createsuperuser', 'dbshell', 'test', 'check'
        ]

        if scheduler_autostart and not is_management_command:
            run_main = os.environ.get('RUN_MAIN')

            if run_main == 'true' or (run_main is None and 'gunicorn' in sys.modules):
                lock_file = '/tmp/nexinvo_scheduler.lock'
                try:
                    lock_fd = open(lock_file, 'w')
                    fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    from api.scheduler import start_scheduler
                    start_scheduler()
                    logger.info("Background scheduler started successfully (single instance)")
                    self._scheduler_lock = lock_fd
                except BlockingIOError:
                    logger.info("Scheduler already running in another worker - skipping")
                except Exception as e:
                    logger.error(f"Failed to start scheduler: {e}")
