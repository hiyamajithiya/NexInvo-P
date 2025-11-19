"""
Script to temporarily make organization fields nullable for migration.
"""

import re

# Read the current models.py
with open('api/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Make all organization ForeignKey and OneToOneField nullable (except OrganizationMembership itself)
replacements = [
    # CompanySettings
    (
        r'organization = models\.OneToOneField\(Organization, on_delete=models\.CASCADE, related_name=\'company_settings\'\)',
        'organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name=\'company_settings\', null=True, blank=True)'
    ),
    # InvoiceSettings
    (
        r'organization = models\.OneToOneField\(Organization, on_delete=models\.CASCADE, related_name=\'invoice_settings\'\)',
        'organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name=\'invoice_settings\', null=True, blank=True)'
    ),
    # Client
    (
        r'organization = models\.ForeignKey\(Organization, on_delete=models\.CASCADE, related_name=\'clients\'\)',
        'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'clients\', null=True, blank=True)'
    ),
    # Invoice (not the organization in line 154)
    (
        r'(class Invoice.*?organization = models\.ForeignKey\(Organization, on_delete=models\.CASCADE, related_name=\'invoices\'\))',
        lambda m: m.group(0).replace(
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'invoices\')',
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'invoices\', null=True, blank=True)'
        )
    ),
    # Payment
    (
        r'(class Payment.*?organization = models\.ForeignKey\(Organization, on_delete=models\.CASCADE, related_name=\'payments\'\))',
        lambda m: m.group(0).replace(
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'payments\')',
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'payments\', null=True, blank=True)'
        )
    ),
    # EmailSettings
    (
        r'organization = models\.OneToOneField\(Organization, on_delete=models\.CASCADE, related_name=\'email_settings\'\)',
        'organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name=\'email_settings\', null=True, blank=True)'
    ),
    # ServiceItem
    (
        r'(class ServiceItem.*?organization = models\.ForeignKey\(Organization, on_delete=models\.CASCADE, related_name=\'service_items\'\))',
        lambda m: m.group(0).replace(
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'service_items\')',
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'service_items\', null=True, blank=True)'
        )
    ),
    # PaymentTerm
    (
        r'(class PaymentTerm.*?organization = models\.ForeignKey\(Organization, on_delete=models\.CASCADE, related_name=\'payment_terms\'\))',
        lambda m: m.group(0).replace(
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'payment_terms\')',
            'organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name=\'payment_terms\', null=True, blank=True)'
        )
    ),
    # InvoiceFormatSettings
    (
        r'organization = models\.OneToOneField\(Organization, on_delete=models\.CASCADE, related_name=\'invoice_format_settings\'\)',
        'organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name=\'invoice_format_settings\', null=True, blank=True)'
    ),
]

# Apply simple replacements
for pattern, replacement in replacements[:3] + replacements[5:6] + replacements[8:]:
    content = re.sub(pattern, replacement, content)

# Apply complex replacements for Invoice, Payment, ServiceItem, PaymentTerm
for pattern, replacement in replacements[3:5] + replacements[6:8]:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back to file
with open('api/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Made organization fields nullable for migration!")
print("[OK] Updated models: CompanySettings, InvoiceSettings, Client, Invoice, Payment")
print("[OK] Updated models: EmailSettings, ServiceItem, PaymentTerm, InvoiceFormatSettings")
print("\nNext steps:")
print("1. Create migrations: python manage.py makemigrations")
print("2. Review the migration file")
print("3. Run migration: python manage.py migrate")
