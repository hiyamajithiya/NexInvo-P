#!/usr/bin/env python
"""
Create default settings for all users who don't have them yet.
Run this script to initialize InvoiceSettings, EmailSettings, and InvoiceFormatSettings.
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import CompanySettings, InvoiceSettings, EmailSettings, InvoiceFormatSettings


def create_default_settings():
    """Create default settings for all users"""
    users = User.objects.all()

    if not users.exists():
        print("No users found. Please create a user first using create_user.py")
        return

    for user in users:
        print(f"\nProcessing user: {user.username}")

        # Create CompanySettings if not exists
        if not hasattr(user, 'company_settings'):
            CompanySettings.objects.create(
                user=user,
                companyName="Your Company Name",
                tradingName="",
                address="",
                city="",
                state="",
                pinCode="",
                stateCode="",
                gstin="",
                pan="",
                phone="",
                email=""
            )
            print("  ✓ Created CompanySettings")
        else:
            print("  - CompanySettings already exists")

        # Create InvoiceSettings if not exists
        if not hasattr(user, 'invoice_settings'):
            InvoiceSettings.objects.create(
                user=user,
                invoicePrefix="INV-",
                startingNumber=1,
                proformaPrefix="PI-",
                proformaStartingNumber=1,
                defaultGstRate=18.00,
                paymentDueDays=30,
                termsAndConditions="",
                notes=""
            )
            print("  ✓ Created InvoiceSettings")
        else:
            print("  - InvoiceSettings already exists")

        # Create EmailSettings if not exists
        if not hasattr(user, 'email_settings'):
            EmailSettings.objects.create(
                user=user,
                smtp_host="smtp.gmail.com",
                smtp_port=587,
                smtp_username="",
                smtp_password="",
                from_email="",
                from_name="",
                use_tls=True,
                email_signature=""
            )
            print("  ✓ Created EmailSettings")
        else:
            print("  - EmailSettings already exists")

        # Create InvoiceFormatSettings if not exists
        if not hasattr(user, 'invoice_format_settings'):
            InvoiceFormatSettings.objects.create(
                user=user,
                show_logo=True,
                logo_position='left',
                show_company_designation=True,
                company_designation_text='CHARTERED ACCOUNTANT',
                header_color='#1e3a8a',
                show_company_name=True,
                show_trading_name=True,
                show_address=True,
                show_gstin=True,
                show_pan=True,
                show_phone=True,
                show_email=True,
                show_invoice_number=True,
                show_invoice_date=True,
                show_due_date=False,
                show_client_gstin=True,
                show_client_pan=False,
                show_client_phone=False,
                show_client_email=False,
                table_header_bg_color='#1e3a8a',
                table_header_text_color='#ffffff',
                show_hsn_sac_column=False,
                show_serial_number=True,
                show_taxable_value=True,
                show_cgst_sgst_separate=True,
                show_igst=True,
                show_gst_percentage=False,
                show_subtotal=True,
                show_tax_breakup=True,
                show_grand_total_in_words=False,
                show_bank_details=True,
                bank_account_number="",
                bank_name="",
                bank_ifsc="",
                bank_branch="",
                show_signature=True,
                signature_label="Authorized Signatory",
                show_company_seal=False,
                show_payment_terms=True,
                show_notes=True,
                show_terms_conditions=True,
                show_computer_generated_note=True,
                show_page_numbers=True,
                font_size='medium'
            )
            print("  ✓ Created InvoiceFormatSettings")
        else:
            print("  - InvoiceFormatSettings already exists")

    print("\n" + "="*50)
    print("Default settings creation completed!")
    print("="*50)

    # Show summary
    print("\nSummary:")
    print(f"  Company Settings: {CompanySettings.objects.count()}")
    print(f"  Invoice Settings: {InvoiceSettings.objects.count()}")
    print(f"  Email Settings: {EmailSettings.objects.count()}")
    print(f"  Invoice Format Settings: {InvoiceFormatSettings.objects.count()}")


if __name__ == '__main__':
    try:
        create_default_settings()
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
