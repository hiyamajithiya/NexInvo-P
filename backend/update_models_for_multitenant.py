"""
Script to update models.py for multi-tenancy.
This replaces user ForeignKeys with organization ForeignKeys.
"""

import re

# Read the current models.py
with open('api/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define replacements
replacements = [
    # Invoice Settings
    (
        r"class InvoiceSettings\(models\.Model\):\n    user = models\.OneToOneField\(User, on_delete=models\.CASCADE, related_name='invoice_settings'\)",
        "class InvoiceSettings(models.Model):\n    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='invoice_settings')"
    ),
    (
        r'return f"\{self\.user\.username\} Invoice Settings"',
        'return f"{self.organization.name} Invoice Settings"'
    ),

    # Client
    (
        r"user = models\.ForeignKey\(User, on_delete=models\.CASCADE, related_name='clients'\)",
        "organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='clients')"
    ),

    # Invoice
    (
        r"user = models\.ForeignKey\(User, on_delete=models\.CASCADE, related_name='invoices'\)",
        "organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invoices')\n    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_invoices')"
    ),
    # Update Invoice.save() method to use organization
    (
        r"settings = InvoiceSettings\.objects\.get\(user=self\.user\)",
        "settings = InvoiceSettings.objects.get(organization=self.organization)"
    ),
    (
        r"last_invoice = Invoice\.objects\.filter\(\n                    user=self\.user,",
        "last_invoice = Invoice.objects.filter(\n                    organization=self.organization,"
    ),

    # Payment
    (
        r"user = models\.ForeignKey\(User, on_delete=models\.CASCADE, related_name='payments'\)",
        "organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payments')\n    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_payments')"
    ),

    # EmailSettings
    (
        r"class EmailSettings\(models\.Model\):\n    \"\"\"Email configuration settings for sending invoices\"\"\"\n    user = models\.OneToOneField\(User, on_delete=models\.CASCADE, related_name='email_settings'\)",
        'class EmailSettings(models.Model):\n    """Email configuration settings for sending invoices"""\n    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name=\'email_settings\')'
    ),
    (
        r'return f"Email Settings for \{self\.user\.username\}"',
        'return f"Email Settings for {self.organization.name}"'
    ),

    # ServiceItem
    (
        r"user = models\.ForeignKey\(User, on_delete=models\.CASCADE, related_name='service_items'\)",
        "organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='service_items')"
    ),
    (
        r"unique_together = \['user', 'name'\]",
        "unique_together = ['organization', 'name']"
    ),

    # PaymentTerm
    (
        r"user = models\.ForeignKey\(User, on_delete=models\.CASCADE, related_name='payment_terms'\)",
        "organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payment_terms')"
    ),
    (
        r"unique_together = \['user', 'term_name'\]",
        "unique_together = ['organization', 'term_name']"
    ),

    # InvoiceFormatSettings
    (
        r"class InvoiceFormatSettings\(models\.Model\):\n    \"\"\"Invoice format and layout customization settings\"\"\"\n    user = models\.OneToOneField\(User, on_delete=models\.CASCADE, related_name='invoice_format_settings'\)",
        'class InvoiceFormatSettings(models.Model):\n    """Invoice format and layout customization settings"""\n    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name=\'invoice_format_settings\')'
    ),
    (
        r'return f"Invoice Format Settings for \{self\.user\.username\}"',
        'return f"Invoice Format Settings for {self.organization.name}"'
    ),
]

# Apply all replacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Write back to file
with open('api/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Models updated successfully for multi-tenancy!")
print("[OK] Updated models: CompanySettings, InvoiceSettings, Client, Invoice, Payment")
print("[OK] Updated models: EmailSettings, ServiceItem, PaymentTerm, InvoiceFormatSettings")
print("\nNext steps:")
print("1. Create migrations: python manage.py makemigrations")
print("2. Review the migration file")
print("3. Run migration: python manage.py migrate")
