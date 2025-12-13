#!/usr/bin/env python
"""
Quick verification script to check if payment reminders are working after server restart.
Run with: python verify_server_fix.py
"""

import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
    django.setup()

from api.models import Invoice, InvoiceSettings, EmailSettings
from django.utils import timezone

def verify_fix():
    """Verify that the due_date property fix is working."""

    print("\n" + "="*70)
    print("SERVER FIX VERIFICATION")
    print("="*70)

    # Test 1: Check if due_date property works
    print("\n✓ TEST 1: Verify due_date property exists")
    print("-"*70)

    try:
        invoice = Invoice.objects.first()
        if invoice:
            due_date = invoice.due_date  # This will fail if property not loaded
            print(f"✅ SUCCESS: due_date property is working!")
            print(f"   Sample Invoice: {invoice.invoice_number}")
            print(f"   Invoice Date: {invoice.invoice_date}")
            print(f"   Due Date: {due_date}")
            print(f"   Days until due: {(due_date - timezone.now().date()).days}")
        else:
            print("⚠️  No invoices found in database")
            return
    except AttributeError as e:
        print(f"❌ FAILED: due_date property not found!")
        print(f"   Error: {e}")
        print(f"   👉 Server needs restart: sudo systemctl restart nexinvo")
        return
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        return

    # Test 2: Check all invoices can calculate due_date
    print("\n✓ TEST 2: Verify all invoices can calculate due_date")
    print("-"*70)

    try:
        all_invoices = Invoice.objects.all()[:5]
        success_count = 0

        for inv in all_invoices:
            try:
                _ = inv.due_date
                success_count += 1
            except Exception as e:
                print(f"   ❌ Failed for {inv.invoice_number}: {e}")

        print(f"✅ {success_count}/{len(all_invoices)} invoices can calculate due_date")

    except Exception as e:
        print(f"❌ FAILED: {e}")

    # Test 3: Check reminder settings
    print("\n✓ TEST 3: Check payment reminder settings")
    print("-"*70)

    try:
        settings = InvoiceSettings.objects.all()
        enabled_count = 0

        for setting in settings:
            if setting.enablePaymentReminders:
                enabled_count += 1
                print(f"✅ {setting.organization.name}: Reminders ENABLED")
                print(f"   Frequency: Every {setting.reminderFrequencyDays} days")
            else:
                print(f"⚠️  {setting.organization.name}: Reminders DISABLED")

        if enabled_count == 0:
            print("\n⚠️  WARNING: No organizations have reminders enabled!")

    except Exception as e:
        print(f"❌ FAILED: {e}")

    # Test 4: Check email settings
    print("\n✓ TEST 4: Check email configuration")
    print("-"*70)

    try:
        email_settings = EmailSettings.objects.all()

        if email_settings.count() == 0:
            print("❌ No email settings configured!")
        else:
            for setting in email_settings:
                print(f"✅ {setting.organization.name}:")
                print(f"   SMTP: {setting.smtp_host}:{setting.smtp_port}")
                print(f"   From: {setting.from_email}")

    except Exception as e:
        print(f"❌ FAILED: {e}")

    # Test 5: Count eligible invoices for reminders
    print("\n✓ TEST 5: Count invoices eligible for reminders")
    print("-"*70)

    try:
        pending = Invoice.objects.filter(
            invoice_type='proforma',
            status__in=['draft', 'sent']
        ).exclude(status='paid')

        print(f"📊 Total pending proforma invoices: {pending.count()}")

        now = timezone.now()
        eligible_count = 0

        for invoice in pending:
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

        print(f"✅ Invoices eligible for reminder NOW: {eligible_count}")

    except Exception as e:
        print(f"❌ FAILED: {e}")

    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print("\n✅ If all tests passed, the server is ready to send reminders!")
    print("⏰ Next automatic run: Check with 'python check_scheduled_jobs.py'")
    print("🧪 Manual test: Run 'python manage.py send_payment_reminders'")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    print("\n🔍 Verifying Server Fix...\n")
    verify_fix()
    print("✅ Verification complete!\n")
