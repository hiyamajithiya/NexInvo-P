"""
Script to update views.py for multi-tenancy.
This updates all ViewSets and views to use organization instead of user.
"""

import re

# Read the current views.py
with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define replacements
replacements = [
    # Update imports to include Organization and OrganizationMembership
    (
        r'from \.models import CompanySettings, InvoiceSettings, Client, Invoice, InvoiceItem, Payment, EmailSettings, InvoiceFormatSettings, ServiceItem, PaymentTerm',
        'from .models import (Organization, OrganizationMembership, CompanySettings, InvoiceSettings, Client, Invoice, InvoiceItem, Payment, EmailSettings, InvoiceFormatSettings, ServiceItem, PaymentTerm)'
    ),
    (
        r'from \.serializers import \(\n    CompanySettingsSerializer, InvoiceSettingsSerializer, ClientSerializer,\n    InvoiceSerializer, PaymentSerializer, EmailSettingsSerializer, InvoiceFormatSettingsSerializer, ServiceItemSerializer, PaymentTermSerializer, UserSerializer\n\)',
        'from .serializers import (\n    OrganizationSerializer, OrganizationMembershipSerializer,\n    CompanySettingsSerializer, InvoiceSettingsSerializer, ClientSerializer,\n    InvoiceSerializer, PaymentSerializer, EmailSettingsSerializer, InvoiceFormatSettingsSerializer, ServiceItemSerializer, PaymentTermSerializer, UserSerializer\n)'
    ),
    # Update register_view to create organization
    (
        r"# Create default settings for the user\n        CompanySettings\.objects\.create\(\n            user=user,\n            companyName=company_name if company_name else f\"\{first_name\} \{last_name\}\"\.strip\(\) or email\n        \)\n        InvoiceSettings\.objects\.create\(user=user\)\n        EmailSettings\.objects\.create\(user=user\)",
        '# Create organization for the new user\n        from django.utils.text import slugify\n        import uuid\n        org_name = company_name if company_name else f"{first_name} {last_name}".strip() or email\n        base_slug = slugify(org_name)\n        slug = base_slug\n        counter = 1\n        while Organization.objects.filter(slug=slug).exists():\n            slug = f"{base_slug}-{counter}"\n            counter += 1\n\n        organization = Organization.objects.create(\n            id=uuid.uuid4(),\n            name=org_name,\n            slug=slug,\n            plan=\'free\',\n            is_active=True\n        )\n\n        # Create organization membership with owner role\n        OrganizationMembership.objects.create(\n            organization=organization,\n            user=user,\n            role=\'owner\',\n            is_active=True\n        )\n\n        # Create default settings for the organization\n        CompanySettings.objects.create(organization=organization, companyName=org_name)\n        InvoiceSettings.objects.create(organization=organization)\n        EmailSettings.objects.create(organization=organization)\n        InvoiceFormatSettings.objects.create(organization=organization)'
    ),
    # Update all user= to organization= in settings views
    (
        r'CompanySettings\.objects\.get\(user=request\.user\)',
        'CompanySettings.objects.get(organization=request.organization)'
    ),
    (
        r'CompanySettings\.objects\.get_or_create\(user=request\.user',
        'CompanySettings.objects.get_or_create(organization=request.organization'
    ),
    (
        r'serializer\.save\(user=request\.user\)',
        'serializer.save(organization=request.organization)'
    ),
    (
        r'InvoiceSettings\.objects\.get\(user=request\.user\)',
        'InvoiceSettings.objects.get(organization=request.organization)'
    ),
    (
        r'InvoiceSettings\.objects\.get_or_create\(user=request\.user',
        'InvoiceSettings.objects.get_or_create(organization=request.organization'
    ),
    (
        r'EmailSettings\.objects\.get\(user=request\.user\)',
        'EmailSettings.objects.get(organization=request.organization)'
    ),
    (
        r'EmailSettings\.objects\.get_or_create\(\n            user=request\.user,',
        'EmailSettings.objects.get_or_create(\n            organization=request.organization,'
    ),
    (
        r'InvoiceFormatSettings\.objects\.get\(user=request\.user\)',
        'InvoiceFormatSettings.objects.get(organization=request.organization)'
    ),
    (
        r'InvoiceFormatSettings\.objects\.get_or_create\(user=request\.user',
        'InvoiceFormatSettings.objects.get_or_create(organization=request.organization'
    ),
]

# Apply all replacements
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Write back to file
with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Views updated successfully for multi-tenancy!")
print("[OK] Updated: register_view, company_settings_view, invoice_settings_view")
print("[OK] Updated: email_settings_view, invoice_format_settings_view")
print("\nNext steps:")
print("1. Add Organization and OrganizationMembership ViewSets")
print("2. Update all existing ViewSets to filter by organization")
print("3. Add organization URLs")
