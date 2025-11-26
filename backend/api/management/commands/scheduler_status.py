from django.core.management.base import BaseCommand
from django_apscheduler.models import DjangoJob, DjangoJobExecution
from django.utils import timezone


class Command(BaseCommand):
    help = 'Check the status of scheduled jobs'

    def handle(self, *args, **kwargs):
        self.stdout.write('=' * 60)
        self.stdout.write('SCHEDULED JOBS STATUS')
        self.stdout.write('=' * 60)

        jobs = DjangoJob.objects.all()

        if not jobs:
            self.stdout.write(self.style.WARNING('No scheduled jobs found.'))
            self.stdout.write('Make sure the server is running to start the scheduler.')
            return

        for job in jobs:
            self.stdout.write(f'\nJob ID: {job.id}')
            self.stdout.write(f'  Next Run: {job.next_run_time}')

            # Get last execution
            last_exec = DjangoJobExecution.objects.filter(
                job_id=job.id
            ).order_by('-run_time').first()

            if last_exec:
                self.stdout.write(f'  Last Run: {last_exec.run_time}')
                self.stdout.write(f'  Status: {last_exec.status}')
                if last_exec.exception:
                    self.stdout.write(self.style.ERROR(f'  Error: {last_exec.exception}'))
            else:
                self.stdout.write('  Last Run: Never')

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('RECENT EXECUTIONS (Last 10)')
        self.stdout.write('=' * 60)

        recent_execs = DjangoJobExecution.objects.all().order_by('-run_time')[:10]

        if not recent_execs:
            self.stdout.write(self.style.WARNING('No job executions found yet.'))
        else:
            for exec in recent_execs:
                status_style = self.style.SUCCESS if exec.status == 'Executed' else self.style.ERROR
                self.stdout.write(f'{exec.run_time} - {exec.job_id} - {status_style(exec.status)}')
