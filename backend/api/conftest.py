"""
Shared pytest fixtures for API tests.

Provides authenticated clients, organizations, and sample data objects
for testing the NexInvo invoice and payment APIs.
"""

import pytest
from decimal import Decimal
from datetime import date
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import (
    Organization,
    OrganizationMembership,
    Client,
    Invoice,
    InvoiceItem,
    InvoiceSettings,
    CompanySettings,
    Payment,
    Receipt,
)


@pytest.fixture
def organization(db):
    """Create a test organization."""
    org = Organization.objects.create(
        name="Test Organization",
        slug="test-org",
        business_type="services",
        plan="professional",
        is_active=True,
    )
    # Create InvoiceSettings (required for invoice number generation and receipt numbers)
    InvoiceSettings.objects.create(
        organization=org,
        invoicePrefix="INV-",
        startingNumber=1,
        proformaPrefix="PI-",
        proformaStartingNumber=1,
        receiptPrefix="RCPT-",
        receiptStartingNumber=1,
        gstEnabled=True,
        defaultGstRate=Decimal("18.00"),
        paymentDueDays=30,
    )
    # Create CompanySettings (required for PDF generation and GST logic)
    CompanySettings.objects.create(
        organization=org,
        companyName="Test Company Pvt Ltd",
        state="Maharashtra",
        stateCode="27",
    )
    return org


@pytest.fixture
def user(db, organization):
    """Create a test user with membership in the test organization."""
    user = User.objects.create_user(
        username="testuser@example.com",
        email="testuser@example.com",
        password="TestPass123!",
    )
    OrganizationMembership.objects.create(
        organization=organization,
        user=user,
        role="owner",
        is_active=True,
    )
    return user


@pytest.fixture
def api_client():
    """Return a plain (unauthenticated) DRF APIClient."""
    return APIClient()


@pytest.fixture
def auth_client(api_client, user, organization):
    """
    Return an authenticated APIClient.

    Uses JWT token authentication and sets the X-Organization-ID header
    so the OrganizationMiddleware resolves the correct tenant context.
    """
    refresh = RefreshToken.for_user(user)
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}",
        HTTP_X_ORGANIZATION_ID=str(organization.id),
    )
    return api_client


@pytest.fixture
def client_obj(db, organization):
    """Create a sample Client record belonging to the test organization."""
    return Client.objects.create(
        organization=organization,
        name="Acme Corp",
        code="ACME01",
        email="billing@acme.com",
        phone="9876543210",
        address="123 Main Street",
        city="Mumbai",
        state="Maharashtra",
        stateCode="27",
    )


@pytest.fixture
def sample_invoice(db, organization, user, client_obj):
    """
    Create a sample tax invoice with one line item.

    The invoice has:
      - subtotal = 1000.00
      - gst_rate = 18% -> tax = 180.00
      - total_amount = 1180.00
      - status = 'sent' (so payments can be tested against it)
    """
    invoice = Invoice.objects.create(
        organization=organization,
        created_by=user,
        client=client_obj,
        invoice_type="tax",
        invoice_date=date(2025, 1, 15),
        status="sent",
        subtotal=Decimal("1000.00"),
        tax_amount=Decimal("180.00"),
        total_amount=Decimal("1180.00"),
    )
    InvoiceItem.objects.create(
        invoice=invoice,
        description="Consulting Service",
        quantity=Decimal("1"),
        rate=Decimal("1000.00"),
        gst_rate=Decimal("18.00"),
        taxable_amount=Decimal("1000.00"),
        total_amount=Decimal("1180.00"),
    )
    return invoice


# ---------------------------------------------------------------------------
# Fixtures for multi-org / isolation tests
# ---------------------------------------------------------------------------

@pytest.fixture
def other_organization(db):
    """Create a second organization for isolation tests."""
    org = Organization.objects.create(
        name="Other Organization",
        slug="other-org",
        business_type="goods",
        plan="basic",
        is_active=True,
    )
    InvoiceSettings.objects.create(
        organization=org,
        invoicePrefix="INV-",
        startingNumber=1,
        proformaPrefix="PI-",
        proformaStartingNumber=1,
        receiptPrefix="RCPT-",
        receiptStartingNumber=1,
    )
    CompanySettings.objects.create(
        organization=org,
        companyName="Other Company Ltd",
        state="Karnataka",
        stateCode="29",
    )
    return org


@pytest.fixture
def superadmin_user(db, other_organization):
    """Create a user in the *other* organization (for isolation tests)."""
    user = User.objects.create_user(
        username="superadmin@other.com",
        email="superadmin@other.com",
        password="AdminPass123!",
    )
    OrganizationMembership.objects.create(
        organization=other_organization,
        user=user,
        role="owner",
        is_active=True,
    )
    return user


@pytest.fixture
def superadmin_client(api_client, superadmin_user, other_organization):
    """
    Return an authenticated APIClient for the *other* organization.
    Useful for verifying data isolation between tenants.
    """
    client = APIClient()
    refresh = RefreshToken.for_user(superadmin_user)
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}",
        HTTP_X_ORGANIZATION_ID=str(other_organization.id),
    )
    return client
