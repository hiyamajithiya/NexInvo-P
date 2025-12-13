#!/usr/bin/env python
"""
Quick test script to verify due_date property is working on server.
Run with: python test_due_date.py
"""

import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
    django.setup()

from api.models import Invoice, PaymentTerm
from django.utils import timezone

def test_due_date():
    """Test if due_date property works."""

    print("\n" + "="*70)
    print("TESTING DUE_DATE PROPERTY")
    print("="*70)

    # Get first invoice
    invoice = Invoice.objects.first()

    if not invoice:
        print("\n❌ No invoices found in database")
        return

    print(f"\n📄 Testing Invoice: {invoice.invoice_number}")
    print(f"   Organization: {invoice.organization.name}")
    print(f"   Client: {invoice.client.name}")
    print(f"   Invoice Date: {invoice.invoice_date}")

    # Test if payment_term exists
    if invoice.payment_term:
        print(f"   Payment Term: {invoice.payment_term.term_name} ({invoice.payment_term.days} days)")
    else:
        print(f"   Payment Term: None (will use default)")

    # THE CRITICAL TEST - Try to access due_date property
    print("\n🔍 Testing due_date property...")

    try:
        due_date = invoice.due_date
        print(f"✅ SUCCESS! due_date property is working!")
        print(f"   Due Date: {due_date}")
        print(f"   Days until due: {(due_date - timezone.now().date()).days}")

        # Test a few more invoices
        print("\n🔍 Testing 5 more invoices...")
        test_invoices = Invoice.objects.all()[:5]
        success_count = 0

        for inv in test_invoices:
            try:
                _ = inv.due_date
                success_count += 1
                print(f"   ✅ {inv.invoice_number} - OK")
            except AttributeError as e:
                print(f"   ❌ {inv.invoice_number} - FAILED: {e}")
            except Exception as e:
                print(f"   ⚠️  {inv.invoice_number} - ERROR: {e}")

        print(f"\n📊 Result: {success_count}/{len(test_invoices)} invoices passed")

        if success_count == len(test_invoices):
            print("\n✅ ALL TESTS PASSED!")
            print("   The due_date property fix is working correctly.")
            print("   Payment reminders should now work.")
        else:
            print("\n⚠️  SOME TESTS FAILED!")
            print("   There may be an issue with some invoices.")

    except AttributeError as e:
        print(f"\n❌ FAILED! due_date property not found!")
        print(f"   Error: {e}")
        print("\n   This means the Django application is still running OLD code.")
        print("   You MUST restart the Django application:")
        print("   → sudo systemctl restart nexinvo")
        print("   → OR: sudo systemctl restart gunicorn")
        print("   → OR: sudo supervisorctl restart nexinvo")
        return False

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        return False

    print("\n" + "="*70)
    return True


if __name__ == "__main__":
    print("\n🚀 Starting due_date property test...\n")
    success = test_due_date()

    if success:
        print("\n✅ Test completed successfully!")
        print("   Next step: Run 'python check_payment_reminders.py'")
    else:
        print("\n❌ Test failed!")
        print("   Please restart Django application and try again.")

    print()
