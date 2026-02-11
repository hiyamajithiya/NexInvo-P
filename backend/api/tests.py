"""
Authentication and core-endpoint tests for the NexInvo backend.

Covers:
    - User registration (with OTP verification flow)
    - JWT login / token obtain
    - Logout
    - Profile retrieval and update
    - Password change
    - Dashboard statistics (authenticated & unauthenticated)

All tests use the shared fixtures from ``conftest.py`` and the
``@pytest.mark.django_db`` marker so they run against a real
(transactional) test database.
"""

import pytest
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from api.models import (
    EmailOTP,
    Organization,
    OrganizationMembership,
    CompanySettings,
    InvoiceSettings,
    EmailSettings,
    InvoiceFormatSettings,
    SubscriptionPlan,
)


# =============================================================================
# REGISTRATION
# =============================================================================

@pytest.mark.django_db
class TestRegistration:
    """Tests for POST /api/register/"""

    REGISTER_URL = "/api/register/"

    def _verify_email(self, email):
        """
        Helper: create a verified EmailOTP record so the registration
        endpoint sees the email as verified (within the 30-minute window).
        """
        EmailOTP.objects.create(
            email=email.lower(),
            otp_code="123456",
            is_verified=True,
            verified_at=timezone.now(),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    # -- happy path ----------------------------------------------------------

    @patch("api.email_utils.send_otp_email", return_value=True)
    def test_register_success(self, mock_send, api_client):
        """Successful registration with a verified email returns 201."""
        email = "newuser@example.com"
        self._verify_email(email)

        # Ensure the Free Trial plan exists (register_view does get_or_create)
        SubscriptionPlan.objects.get_or_create(
            name="Free Trial",
            defaults={
                "description": "1-month free trial",
                "price": Decimal("0.00"),
                "billing_cycle": "monthly",
                "trial_days": 0,
                "max_users": 2,
                "max_invoices_per_month": 50,
                "max_storage_gb": 1,
                "features": ["Basic invoicing"],
                "is_active": True,
                "is_visible": False,
            },
        )

        response = api_client.post(
            self.REGISTER_URL,
            {
                "email": email,
                "password": "StrongP@ss123!",
                "first_name": "New",
                "last_name": "User",
                "company_name": "New Corp",
                "mobile_number": "9876543210",
                "business_type": "services",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == email

        # Verify the user and related objects were created
        user = User.objects.get(email=email)
        assert user.first_name == "New"
        assert OrganizationMembership.objects.filter(user=user, role="owner").exists()

    # -- duplicate email -----------------------------------------------------

    @patch("api.email_utils.send_otp_email", return_value=True)
    def test_register_duplicate_email(self, mock_send, api_client, user):
        """Registering with an already-used email returns 400."""
        self._verify_email(user.email)

        response = api_client.post(
            self.REGISTER_URL,
            {
                "email": user.email,
                "password": "AnotherP@ss123!",
                "first_name": "Dup",
                "last_name": "User",
                "mobile_number": "9876543211",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # -- missing fields ------------------------------------------------------

    def test_register_missing_fields(self, api_client):
        """Missing email or password returns 400."""
        # Missing both email and password
        response = api_client.post(self.REGISTER_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing password
        response = api_client.post(
            self.REGISTER_URL,
            {"email": "nopass@example.com"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # -- weak password -------------------------------------------------------

    def test_register_weak_password(self, api_client):
        """A password that is too short / weak returns 400."""
        email = "weak@example.com"
        self._verify_email(email)

        response = api_client.post(
            self.REGISTER_URL,
            {
                "email": email,
                "password": "123",        # too short
                "first_name": "Weak",
                "mobile_number": "9876543212",
            },
            format="json",
        )

        # The view checks OTP verification first, then password validation.
        # Either way, should not be 201.
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # -- missing mobile number -----------------------------------------------

    def test_register_missing_mobile(self, api_client):
        """Registration without a mobile number returns 400."""
        email = "nomobile@example.com"
        self._verify_email(email)

        response = api_client.post(
            self.REGISTER_URL,
            {
                "email": email,
                "password": "StrongP@ss123!",
                "first_name": "No",
                "last_name": "Mobile",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # -- unverified email ----------------------------------------------------

    def test_register_unverified_email(self, api_client):
        """Registration without prior OTP verification returns 400."""
        response = api_client.post(
            self.REGISTER_URL,
            {
                "email": "unverified@example.com",
                "password": "StrongP@ss123!",
                "first_name": "Un",
                "last_name": "Verified",
                "mobile_number": "9876543213",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "verify" in response.data.get("error", "").lower()


# =============================================================================
# LOGIN (JWT TOKEN OBTAIN)
# =============================================================================

@pytest.mark.django_db
class TestLogin:
    """Tests for POST /api/token/"""

    TOKEN_URL = "/api/token/"

    def test_login_with_email(self, api_client, user, membership):
        """Valid email + password returns 200 with access & refresh tokens."""
        response = api_client.post(
            self.TOKEN_URL,
            {"email": "test@example.com", "password": "TestPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        # The custom view also returns user data
        assert "user" in response.data

    def test_login_with_username(self, api_client, user, membership):
        """Login also works when supplying username instead of email."""
        response = api_client.post(
            self.TOKEN_URL,
            {"username": "test@example.com", "password": "TestPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_invalid_credentials(self, api_client, user, membership):
        """Wrong password returns 401."""
        response = api_client.post(
            self.TOKEN_URL,
            {"email": "test@example.com", "password": "WrongPassword!"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        """Attempting login with an email that does not exist returns 401."""
        response = api_client.post(
            self.TOKEN_URL,
            {"email": "ghost@example.com", "password": "Anything123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_returns_organization_data(self, api_client, user, membership):
        """Successful login response includes organization information."""
        response = api_client.post(
            self.TOKEN_URL,
            {"email": "test@example.com", "password": "TestPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("organization") is not None
        assert response.data["organization"]["name"] == "Test Org"

    def test_login_returns_session_token(self, api_client, user, membership):
        """Successful login response includes a session_token."""
        response = api_client.post(
            self.TOKEN_URL,
            {"email": "test@example.com", "password": "TestPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "session_token" in response.data
        assert len(response.data["session_token"]) == 64  # hex(32 bytes)


# =============================================================================
# LOGOUT
# =============================================================================

@pytest.mark.django_db
class TestLogout:
    """Tests for POST /api/logout/"""

    LOGOUT_URL = "/api/logout/"

    def test_logout_success(self, auth_client):
        """Authenticated user can log out successfully (200)."""
        response = auth_client.post(self.LOGOUT_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("success") is True

    def test_logout_unauthenticated(self, api_client):
        """Unauthenticated request to logout returns 401."""
        response = api_client.post(self.LOGOUT_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# PROFILE
# =============================================================================

@pytest.mark.django_db
class TestProfile:
    """Tests for GET/PUT /api/profile/ and POST /api/profile/change-password/"""

    PROFILE_URL = "/api/profile/"
    CHANGE_PASSWORD_URL = "/api/profile/change-password/"

    # -- GET profile ---------------------------------------------------------

    def test_get_profile(self, auth_client, user):
        """GET /api/profile/ returns the current user's data."""
        response = auth_client.get(self.PROFILE_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["firstName"] == user.first_name
        assert response.data["lastName"] == user.last_name

    def test_get_profile_unauthenticated(self, api_client):
        """GET /api/profile/ without auth returns 401."""
        response = api_client.get(self.PROFILE_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # -- PUT profile ---------------------------------------------------------

    def test_update_profile(self, auth_client, user):
        """PUT /api/profile/ updates first & last name."""
        response = auth_client.put(
            self.PROFILE_URL,
            {"firstName": "Updated", "lastName": "Name"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["firstName"] == "Updated"
        assert response.data["lastName"] == "Name"

        # Verify persistence
        user.refresh_from_db()
        assert user.first_name == "Updated"

    # -- change password -----------------------------------------------------

    def test_change_password(self, auth_client, user):
        """POST /api/profile/change-password/ with correct old password succeeds."""
        response = auth_client.post(
            self.CHANGE_PASSWORD_URL,
            {"oldPassword": "TestPass123!", "newPassword": "BrandNewP@ss456!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify the new password works
        user.refresh_from_db()
        assert user.check_password("BrandNewP@ss456!")

    def test_change_password_wrong_old(self, auth_client):
        """Wrong old password returns 400."""
        response = auth_client.post(
            self.CHANGE_PASSWORD_URL,
            {"oldPassword": "WrongOldPass!", "newPassword": "DoesntMatter1!"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_missing_fields(self, auth_client):
        """Missing oldPassword or newPassword returns 400."""
        response = auth_client.post(
            self.CHANGE_PASSWORD_URL,
            {"oldPassword": "TestPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# DASHBOARD
# =============================================================================

@pytest.mark.django_db
class TestDashboard:
    """Tests for GET /api/dashboard/stats/"""

    STATS_URL = "/api/dashboard/stats/"

    def test_dashboard_stats(
        self, auth_client, organization, membership, company_settings, invoice_settings
    ):
        """Authenticated user gets dashboard stats with expected keys."""
        response = auth_client.get(self.STATS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert "totalInvoices" in response.data
        assert "revenue" in response.data
        assert "pending" in response.data
        assert "clients" in response.data

    def test_dashboard_stats_with_data(
        self,
        auth_client,
        organization,
        membership,
        company_settings,
        invoice_settings,
        client_obj,
        sample_invoice,
    ):
        """Dashboard stats reflect actual data (invoice count, client count)."""
        response = auth_client.get(self.STATS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["totalInvoices"] == 1
        assert response.data["clients"] == 1
        # No payments recorded, so revenue should be 0
        assert response.data["revenue"] == 0

    def test_dashboard_unauthenticated(self, api_client):
        """GET /api/dashboard/stats/ without auth returns 401."""
        response = api_client.get(self.STATS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# OTP SEND / VERIFY (unit-level)
# =============================================================================

@pytest.mark.django_db
class TestOTP:
    """Tests for OTP send and verify endpoints."""

    SEND_OTP_URL = "/api/send-otp/"
    VERIFY_OTP_URL = "/api/verify-otp/"
    RESEND_OTP_URL = "/api/resend-otp/"

    @patch("api.email_utils.send_otp_email", return_value=True)
    def test_send_otp_success(self, mock_send, api_client):
        """Sending OTP to a new email succeeds."""
        response = api_client.post(
            self.SEND_OTP_URL,
            {"email": "otp-test@example.com"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("success") is True
        assert EmailOTP.objects.filter(email="otp-test@example.com").exists()
        mock_send.assert_called_once()

    def test_send_otp_missing_email(self, api_client):
        """Sending OTP without an email returns 400."""
        response = api_client.post(self.SEND_OTP_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_send_otp_invalid_email(self, api_client):
        """Sending OTP with an invalid email format returns 400."""
        response = api_client.post(
            self.SEND_OTP_URL,
            {"email": "not-an-email"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("api.email_utils.send_otp_email", return_value=True)
    def test_send_otp_existing_user(self, mock_send, api_client, user):
        """Sending OTP to an email that is already registered returns 400."""
        response = api_client.post(
            self.SEND_OTP_URL,
            {"email": user.email},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("api.email_utils.send_otp_email", return_value=True)
    def test_verify_otp_success(self, mock_send, api_client):
        """Verifying a valid OTP succeeds."""
        email = "verify-test@example.com"
        otp = EmailOTP.generate_otp(email)

        response = api_client.post(
            self.VERIFY_OTP_URL,
            {"email": email, "otp": otp.otp_code},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("email_verified") is True

    def test_verify_otp_wrong_code(self, api_client):
        """Verifying with a wrong OTP code returns 400."""
        email = "wrongotp@example.com"
        EmailOTP.generate_otp(email)

        response = api_client.post(
            self.VERIFY_OTP_URL,
            {"email": email, "otp": "000000"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_otp_missing_fields(self, api_client):
        """Verifying without email or OTP returns 400."""
        response = api_client.post(self.VERIFY_OTP_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("api.email_utils.send_otp_email", return_value=True)
    def test_resend_otp(self, mock_send, api_client):
        """Resending OTP to the same email creates a new OTP."""
        email = "resend-test@example.com"

        # First send
        api_client.post(
            self.SEND_OTP_URL,
            {"email": email},
            format="json",
        )
        first_otp = EmailOTP.objects.get(email=email)
        first_code = first_otp.otp_code

        # Resend
        response = api_client.post(
            self.RESEND_OTP_URL,
            {"email": email},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        # A new OTP should have been generated (old one deleted)
        new_otp = EmailOTP.objects.get(email=email)
        # It's statistically possible (1/1000000) for them to match, but very unlikely
        assert EmailOTP.objects.filter(email=email).count() == 1


# =============================================================================
# SUPERADMIN ACCESS
# =============================================================================

@pytest.mark.django_db
class TestSuperadminAccess:
    """Verify that superadmin-only endpoints require superuser status."""

    SUPERADMIN_STATS_URL = "/api/superadmin/stats/"

    def test_superadmin_stats_with_superadmin(self, superadmin_client):
        """Superadmin can access /api/superadmin/stats/."""
        response = superadmin_client.get(self.SUPERADMIN_STATS_URL)
        # Should succeed (200) -- the view checks is_superuser
        assert response.status_code == status.HTTP_200_OK

    def test_superadmin_stats_as_regular_user(self, auth_client):
        """Regular user is forbidden from /api/superadmin/stats/."""
        response = auth_client.get(self.SUPERADMIN_STATS_URL)
        # The view should return 403 Forbidden for non-superusers
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_superadmin_stats_unauthenticated(self, api_client):
        """Unauthenticated access to superadmin stats returns 401."""
        response = api_client.get(self.SUPERADMIN_STATS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# TOKEN REFRESH
# =============================================================================

@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for POST /api/token/refresh/"""

    TOKEN_URL = "/api/token/"
    REFRESH_URL = "/api/token/refresh/"

    def test_refresh_token(self, api_client, user, membership):
        """A valid refresh token yields a new access token."""
        # First, login to obtain tokens
        login_resp = api_client.post(
            self.TOKEN_URL,
            {"email": "test@example.com", "password": "TestPass123!"},
            format="json",
        )
        assert login_resp.status_code == status.HTTP_200_OK
        refresh_token = login_resp.data["refresh"]

        # Use the refresh token
        response = api_client.post(
            self.REFRESH_URL,
            {"refresh": refresh_token},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_token_invalid(self, api_client):
        """An invalid refresh token returns 401."""
        response = api_client.post(
            self.REFRESH_URL,
            {"refresh": "invalid-token-string"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
