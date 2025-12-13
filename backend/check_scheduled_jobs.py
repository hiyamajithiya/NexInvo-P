#!/usr/bin/env python
"""
Script to check scheduled jobs status on the server.
Run with: python manage.py shell < check_scheduled_jobs.py
Or: python check_scheduled_jobs.py
"""

import os
import sys
import django

# Setup Django environment if running standalone
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
    django.setup()

from django_apscheduler.models import DjangoJob, DjangoJobExecution
from django.utils import timezone
from datetime import datetime

def check_jobs():
    """Check and display all scheduled jobs and their status."""

    print("\n" + "="*70)
    print("SCHEDULED JOBS STATUS")
    print("="*70)

    jobs = DjangoJob.objects.all()

    if not jobs.exists():
        print("\n⚠️  No scheduled jobs found in database!")
        print("   The scheduler may not have initialized yet.")
        print("   Try restarting the Django server.")
        return

    print(f"\nTotal Jobs: {jobs.count()}")
    print("-"*70)

    for job in jobs:
        print(f"\n📋 Job ID: {job.id}")

        if job.next_run_time:
            next_run = job.next_run_time
            now = timezone.now()

            if next_run > now:
                time_until = next_run - now
                hours = int(time_until.total_seconds() // 3600)
                minutes = int((time_until.total_seconds() % 3600) // 60)
                print(f"   ✅ Status: Active")
                print(f"   ⏰ Next Run: {next_run.strftime('%Y-%m-%d %H:%M:%S %Z')}")
                print(f"   ⏳ Time Until: {hours}h {minutes}m")
            else:
                print(f"   ⚠️  Status: Overdue")
                print(f"   ⏰ Next Run: {next_run.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        else:
            print(f"   ❌ Status: Inactive (No next run time)")

    print("\n" + "="*70)
    print("RECENT JOB EXECUTIONS (Last 10)")
    print("="*70)

    executions = DjangoJobExecution.objects.order_by('-run_time')[:10]

    if not executions.exists():
        print("\n⚠️  No job executions found yet.")
        return

    for execution in executions:
        print(f"\n📊 Execution #{execution.id}")
        print(f"   Job ID: {execution.job.id}")
        print(f"   Run Time: {execution.run_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")

        # Status with emoji
        if execution.status == 'Executed':
            status_icon = "✅"
        elif execution.status == 'Error':
            status_icon = "❌"
        else:
            status_icon = "⚠️"

        print(f"   {status_icon} Status: {execution.status}")

        if execution.duration:
            print(f"   ⏱️  Duration: {execution.duration}")

        if execution.exception:
            print(f"   ❌ Exception: {execution.exception[:150]}...")

    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total Jobs: {jobs.count()}")
    print(f"Active Jobs: {jobs.filter(next_run_time__isnull=False).count()}")
    print(f"Total Executions: {DjangoJobExecution.objects.count()}")
    print(f"Successful Executions: {DjangoJobExecution.objects.filter(status='Executed').count()}")
    print(f"Failed Executions: {DjangoJobExecution.objects.filter(status='Error').count()}")
    print("="*70 + "\n")


def check_scheduler_jobs():
    """Check jobs from the APScheduler instance (if accessible)."""
    try:
        from api.scheduler import scheduler

        print("\n" + "="*70)
        print("APSCHEDULER JOBS (FROM SCHEDULER INSTANCE)")
        print("="*70)

        scheduler_jobs = scheduler.get_jobs()

        if not scheduler_jobs:
            print("\n⚠️  No jobs found in scheduler instance.")
            return

        for job in scheduler_jobs:
            print(f"\n📋 Job: {job.name}")
            print(f"   ID: {job.id}")
            print(f"   Next Run: {job.next_run_time.strftime('%Y-%m-%d %H:%M:%S %Z') if job.next_run_time else 'Not scheduled'}")
            print(f"   Trigger: {job.trigger}")

        print("\n" + "="*70 + "\n")

    except Exception as e:
        print(f"\n⚠️  Could not access scheduler instance: {e}")


if __name__ == "__main__":
    print("\n🔍 Checking Scheduled Jobs...\n")
    check_jobs()
    check_scheduler_jobs()
    print("✅ Check complete!\n")
