#!/usr/bin/env python
"""
Diagnostic script to check why payment reminders aren't being sent.
Run with: python check_payment_reminders.py
"""

import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
    django.setup()

from api.models import Invoice, InvoiceSettings, EmailSettings, Organization
from django.utils import timezone
from datetime import timedelta

def check_reminder_config():
    """Check payment reminder configuration and eligible invoices."""

    print("\n" + "="*80)
    print("PAYMENT REMINDER DIAGNOSTIC REPORT")
    print("="*80)

    # Check organizations and their settings
    print("\n📋 INVOICE SETTINGS BY ORGANIZATION")
    print("-"*80)

    orgs = Organization.objects.all()
    if not orgs.exists():
        print("⚠️  No organizations found!")
        return

    for org in orgs:
        print(f"\n🏢 Organization: {org.name}")

        # Check invoice settings
        try:
            inv_settings = InvoiceSettings.objects.get(organization=org)
            print(f"   ✓ Invoice Settings Found")
            print(f"   📧 Reminders Enabled: {inv_settings.enablePaymentReminders}")
            print(f"   ⏰ Frequency: Every {inv_settings.reminderFrequencyDays} days")
            print(f"   💰 Payment Due Days: {inv_settings.paymentDueDays} days")

            if not inv_settings.enablePaymentReminders:
                print(f"   ⚠️  PAYMENT REMINDERS ARE DISABLED FOR THIS ORG!")
        except InvoiceSettings.DoesNotExist:
            print(f"   ❌ No invoice settings found!")
            continue

        # Check email settings
        try:
            email_settings = EmailSettings.objects.get(organization=org)
            print(f"   ✓ Email Settings Found")
            print(f"   📧 SMTP: {email_settings.smtp_host}:{email_settings.smtp_port}")
            print(f"   📧 From: {email_settings.from_email}")
            print(f"   🔒 TLS: {email_settings.use_tls}")
        except EmailSettings.DoesNotExist:
            print(f"   ❌ No email settings found!")

    # Check invoices that need reminders
    print("\n" + "="*80)
    print("INVOICES ELIGIBLE FOR REMINDERS")
    print("="*80)

    # Proforma invoices that are pending payment
    pending_invoices = Invoice.objects.filter(
        invoice_type='proforma',
        status__in=['draft', 'sent']
    ).exclude(status='paid').order_by('-created_at')

    print(f"\nTotal Pending Proforma Invoices: {pending_invoices.count()}")

    if pending_invoices.count() == 0:
        print("\n⚠️  NO PENDING PROFORMA INVOICES FOUND!")
        print("   This is why no reminders are being sent.")
        print("\n   Reminders are only sent for:")
        print("   - Invoice Type: Proforma")
        print("   - Status: 'draft' or 'sent' (not 'paid')")
        return

    print("\n📊 Breakdown by Organization:")
    for org in orgs:
        org_invoices = pending_invoices.filter(organization=org)
        print(f"\n🏢 {org.name}: {org_invoices.count()} invoices")

    # Detailed invoice analysis
    print("\n" + "-"*80)
    print("DETAILED INVOICE ANALYSIS (Last 10 pending)")
    print("-"*80)

    now = timezone.now()

    for invoice in pending_invoices[:10]:
        print(f"\n📄 {invoice.invoice_number}")
        print(f"   Organization: {invoice.organization.name}")
        print(f"   Client: {invoice.client.name}")
        print(f"   Email: {invoice.client.email or 'NO EMAIL!'}")
        print(f"   Amount: ₹{invoice.total_amount:,.2f}")
        print(f"   Status: {invoice.status}")
        print(f"   Created: {invoice.invoice_date}")
        print(f"   Due Date: {invoice.due_date}")

        # Check if overdue
        if invoice.due_date < now.date():
            days_overdue = (now.date() - invoice.due_date).days
            print(f"   ⚠️  OVERDUE by {days_overdue} days!")
        else:
            days_until_due = (invoice.due_date - now.date()).days
            print(f"   ⏰ Due in {days_until_due} days")

        # Check reminder history
        print(f"   Last Reminder: {invoice.last_reminder_sent or 'Never'}")
        print(f"   Reminder Count: {invoice.reminder_count}")

        # Check if eligible for reminder now
        try:
            inv_settings = InvoiceSettings.objects.get(organization=invoice.organization)

            if not inv_settings.enablePaymentReminders:
                print(f"   ❌ Reminders disabled for organization")
                continue

            if not invoice.client.email:
                print(f"   ❌ Client has no email address!")
                continue

            if invoice.last_reminder_sent:
                days_since_last = (now - invoice.last_reminder_sent).days
                if days_since_last < inv_settings.reminderFrequencyDays:
                    print(f"   ⏳ Next reminder in {inv_settings.reminderFrequencyDays - days_since_last} days")
                else:
                    print(f"   ✅ ELIGIBLE FOR REMINDER NOW!")
            else:
                # Check if invoice is old enough for first reminder
                days_old = (now.date() - invoice.invoice_date).days
                if days_old >= inv_settings.reminderFrequencyDays:
                    print(f"   ✅ ELIGIBLE FOR FIRST REMINDER NOW!")
                else:
                    print(f"   ⏳ First reminder in {inv_settings.reminderFrequencyDays - days_old} days")

        except InvoiceSettings.DoesNotExist:
            print(f"   ❌ No settings for organization")

    # Summary
    print("\n" + "="*80)
    print("SUMMARY & RECOMMENDATIONS")
    print("="*80)

    # Count eligible invoices
    eligible_count = 0
    for invoice in pending_invoices:
        try:
            inv_settings = InvoiceSettings.objects.get(organization=invoice.organization)
            if not inv_settings.enablePaymentReminders:
                continue
            if not invoice.client.email:
                continue

            if invoice.last_reminder_sent:
                days_since_last = (now - invoice.last_reminder_sent).days
                if days_since_last >= inv_settings.reminderFrequencyDays:
                    eligible_count += 1
            else:
                days_old = (now.date() - invoice.invoice_date).days
                if days_old >= inv_settings.reminderFrequencyDays:
                    eligible_count += 1
        except:
            pass

    print(f"\n📊 Total Pending Invoices: {pending_invoices.count()}")
    print(f"✅ Eligible for Reminder NOW: {eligible_count}")
    print(f"⏰ Next Scheduled Run: Check with 'python check_scheduled_jobs.py'")

    if eligible_count == 0:
        print("\n💡 WHY NO REMINDERS?")
        print("   Possible reasons:")
        print("   1. All invoices received reminders recently (within frequency period)")
        print("   2. Invoices are too new (not old enough for first reminder)")
        print("   3. Reminders are disabled at organization level")
        print("   4. Clients have no email addresses")
        print("   5. All invoices are already paid")

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    print("\n🔍 Checking Payment Reminder Configuration...\n")
    check_reminder_config()
    print("✅ Check complete!\n")
