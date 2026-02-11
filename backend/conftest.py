"""
Shared pytest fixtures for NexInvo backend tests.

Provides reusable fixtures for:
- API clients (anonymous, authenticated, superadmin)
- Users, organizations, memberships
- Settings objects (company, invoice)
- Sample data (clients, invoices with items)
"""

import pytest
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import (
    Organization,
    OrganizationMembership,
    CompanySettings,
    InvoiceSettings,
    EmailSettings,
    InvoiceFormatSettings,
    Client,
    Invoice,
    InvoiceItem,
)


# ---------------------------------------------------------------------------
# API Clients
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    """Return an unauthenticated DRF APIClient."""
    return APIClient()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    """
    Create and return a regular test user.

    email / username: test@example.com
    password: TestPass123!
    """
    return User.objects.create_user(
        username="test@example.com",
        email="test@example.com",
        password="TestPass123!",
        first_name="Test",
        last_name="User",
    )


@pytest.fixture
def superadmin(db):
    """
    Create and return a superuser / superadmin.

    email / username: admin@example.com
    password: AdminPass123!
    """
    return User.objects.create_superuser(
        username="admin@example.com",
        email="admin@example.com",
        password="AdminPass123!",
        first_name="Super",
        last_name="Admin",
    )


# ---------------------------------------------------------------------------
# Organization & Membership
# ---------------------------------------------------------------------------

@pytest.fixture
def organization(db):
    """Create and return a test Organization."""
    return Organization.objects.create(
        id=uuid.uuid4(),
        name="Test Org",
        slug="test-org",
        plan="free_trial",
        business_type="services",
        is_active=True,
    )


@pytest.fixture
def membership(user, organization):
    """Link the test user to the test organization as owner."""
    return OrganizationMembership.objects.create(
        organization=organization,
        user=user,
        role="owner",
        is_active=True,
    )


# ---------------------------------------------------------------------------
# Authenticated Clients
# ---------------------------------------------------------------------------

def _make_auth_client(user_obj):
    """Helper: return an APIClient authenticated via JWT for *user_obj*."""
    client = APIClient()
    refresh = RefreshToken.for_user(user_obj)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def auth_client(user, membership):
    """
    Return an APIClient authenticated as the regular test user.

    The membership fixture is pulled in so that the OrganizationMiddleware
    can resolve ``request.organization`` for the user.
    """
    return _make_auth_client(user)


@pytest.fixture
def superadmin_client(superadmin):
    """Return an APIClient authenticated as the superadmin."""
    return _make_auth_client(superadmin)


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@pytest.fixture
def company_settings(organization):
    """Create CompanySettings for the test organization."""
    return CompanySettings.objects.create(
        organization=organization,
        companyName="Test Org Pvt Ltd",
        tradingName="Test Org",
        address="123 Test Street",
        city="Mumbai",
        state="Maharashtra",
        pinCode="400001",
        stateCode="27",
        gstin="27AABCT1234F1ZH",
        pan="AABCT1234F",
        phone="9876543210",
        email="company@testorg.com",
    )


@pytest.fixture
def invoice_settings(organization):
    """Create InvoiceSettings for the test organization."""
    return InvoiceSettings.objects.create(
        organization=organization,
        invoicePrefix="INV-",
        startingNumber=1,
        proformaPrefix="PI-",
        proformaStartingNumber=1,
        gstEnabled=True,
        defaultGstRate=Decimal("18.00"),
        paymentDueDays=30,
    )


# ---------------------------------------------------------------------------
# Sample Business Objects
# ---------------------------------------------------------------------------

@pytest.fixture
def client_obj(organization):
    """Create and return a sample Client belonging to the test organization."""
    return Client.objects.create(
        organization=organization,
        name="Test Client",
        email="client@test.com",
        phone="9876543211",
        address="456 Client Road",
        city="Pune",
        state="Maharashtra",
        pinCode="411001",
        stateCode="27",
        gstin="27AABCC5678D1ZP",
    )


@pytest.fixture
def sample_invoice(organization, client_obj, user, invoice_settings):
    """
    Create a sample tax invoice with two line items.

    The invoice_settings fixture is pulled in so that auto-numbering
    resolves correctly.
    """
    invoice = Invoice.objects.create(
        organization=organization,
        created_by=user,
        client=client_obj,
        invoice_number="INV-0001",
        invoice_type="tax",
        invoice_date=date.today(),
        status="sent",
        subtotal=Decimal("10000.00"),
        tax_amount=Decimal("1800.00"),
        cgst_amount=Decimal("900.00"),
        sgst_amount=Decimal("900.00"),
        igst_amount=Decimal("0.00"),
        is_interstate=False,
        total_amount=Decimal("11800.00"),
    )

    InvoiceItem.objects.create(
        invoice=invoice,
        description="Web Development",
        hsn_sac="998314",
        quantity=Decimal("1.00"),
        rate=Decimal("8000.00"),
        gst_rate=Decimal("18.00"),
        taxable_amount=Decimal("8000.00"),
        cgst_amount=Decimal("720.00"),
        sgst_amount=Decimal("720.00"),
        igst_amount=Decimal("0.00"),
        total_amount=Decimal("9440.00"),
    )

    InvoiceItem.objects.create(
        invoice=invoice,
        description="Hosting (1 year)",
        hsn_sac="998315",
        quantity=Decimal("1.00"),
        rate=Decimal("2000.00"),
        gst_rate=Decimal("18.00"),
        taxable_amount=Decimal("2000.00"),
        cgst_amount=Decimal("180.00"),
        sgst_amount=Decimal("180.00"),
        igst_amount=Decimal("0.00"),
        total_amount=Decimal("2360.00"),
    )

    return invoice
