from rest_framework import status, serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .throttles import LoginRateThrottle, PasswordResetRateThrottle, RegistrationRateThrottle
from django.http import HttpResponse
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
import logging
from .models import (
    Organization, OrganizationMembership, CompanySettings, InvoiceSettings,
    EmailSettings, InvoiceFormatSettings, EmailOTP, Client, Invoice, Payment,
    SubscriptionPlan, Subscription, StaffProfile
)

logger = logging.getLogger(__name__)


# Custom JWT Token Serializer to accept email as username
class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(required=False, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make username optional
        self.fields['username'].required = False

    def validate(self, attrs):
        # Check if email is provided instead of username
        email = attrs.get('email')
        username = attrs.get('username')

        # If email is provided, find the user and convert to username
        if email and not username:
            try:
                user = User.objects.get(email=email)
                attrs['username'] = user.username
            except User.DoesNotExist:
                raise serializers.ValidationError('No user found with this email address')

        # Ensure username is now present
        if not attrs.get('username'):
            raise serializers.ValidationError('Either email or username must be provided')

        # Remove email from attrs as parent class doesn't expect it
        attrs.pop('email', None)

        # Call parent validation with username
        return super().validate(attrs)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        from .models import UserSession
        from django.utils import timezone
        from datetime import timedelta
        import logging
        logger = logging.getLogger(__name__)

        # Check if force_login is requested
        force_login = request.data.get('force_login', False)

        # Get current device info and session token from request
        current_device_info = request.META.get('HTTP_USER_AGENT', '')[:255]
        current_session_token = request.headers.get('X-Session-Token', '')

        # Determine session type (Setu desktop connector vs web browser)
        # Check multiple ways to detect Setu client
        client_type_param = request.data.get('client_type', '')
        is_setu = (
            client_type_param == 'setu' or
            'Setu' in current_device_info or
            'setu' in current_device_info.lower() or
            'electron' in current_device_info.lower()
        )
        session_type = 'setu' if is_setu else 'web'

        logger.debug(f"[Login] client_type_param: '{client_type_param}', User-Agent: '{current_device_info[:50]}...', is_setu: {is_setu}, session_type: {session_type}")

        # First validate credentials without generating tokens
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response(
                {'detail': str(e.detail) if hasattr(e, 'detail') else 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = serializer.user

        # Check if user already has an active session of the SAME type
        # (web sessions and setu sessions can coexist)
        try:
            existing_session = UserSession.objects.get(user=user, session_type=session_type)

            # Session expiry check (24 hours)
            session_age = timezone.now() - existing_session.last_activity
            session_expired = session_age > timedelta(hours=24)

            # Check if it's the same device (matching session token or similar device info)
            is_same_session = (
                current_session_token and
                existing_session.session_token == current_session_token
            )
            is_same_device = (
                current_device_info and
                existing_session.device_info and
                current_device_info == existing_session.device_info
            )

            # Allow login if:
            # 1. force_login is requested
            # 2. Session has expired (older than 24 hours)
            # 3. It's the same session/device
        except UserSession.DoesNotExist:
            # No existing session of this type, proceed normally
            pass

        # Check subscription status for non-superusers
        if not user.is_superuser:
            from .models import OrganizationMembership, Subscription

            # Get user's organization
            membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
            if membership:
                organization = membership.organization

                # Check subscription status
                try:
                    subscription = Subscription.objects.get(organization=organization)

                    # Update status if needed (handles automatic status transitions)
                    subscription.update_status_if_needed()

                    # Check if subscription is fully expired (grace period also ended)
                    if subscription.is_fully_expired() and not user.is_superuser:
                        return Response({
                            'error': 'subscription_expired',
                            'detail': 'Your subscription has expired and the grace period has ended. Please contact your administrator to renew the subscription.',
                            'subscription_status': subscription.status,
                            'expired_on': subscription.end_date.strftime('%Y-%m-%d'),
                            'organization': organization.name
                        }, status=status.HTTP_403_FORBIDDEN)

                except Subscription.DoesNotExist:
                    # No subscription found - allow login but they'll see limited access
                    pass

        # Generate tokens (call parent's post logic)
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Create a new session token (only invalidates existing sessions of same type)
            device_info = current_device_info
            ip_address = request.META.get('REMOTE_ADDR')

            # Debug: Log sessions BEFORE creating new one
            existing_sessions = list(UserSession.objects.filter(user=user).values('session_token', 'session_type'))
            logger.debug(f"[Login] User {user.email} - BEFORE create_session - existing sessions: {[(s['session_token'][:16], s['session_type']) for s in existing_sessions]}")

            session_token = UserSession.create_session(user, device_info, ip_address, session_type)

            # Debug: Log sessions AFTER creating new one
            after_sessions = list(UserSession.objects.filter(user=user).values('session_token', 'session_type'))
            logger.debug(f"[Login] User {user.email} - AFTER create_session({session_type}) - sessions now: {[(s['session_token'][:16], s['session_type']) for s in after_sessions]}")

            # Add session token to response
            response.data['session_token'] = session_token

            # Add user data to response
            response.data['user'] = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }

            # Add organization data to response
            from .models import OrganizationMembership, Subscription
            membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
            if membership:
                response.data['organization'] = {
                    'id': membership.organization.id,
                    'name': membership.organization.name,
                }

                # Add subscription warning if in grace period
                if not user.is_superuser:
                    try:
                        subscription = Subscription.objects.get(organization=membership.organization)
                        if subscription.is_in_grace_period():
                            response.data['subscription_warning'] = {
                                'in_grace_period': True,
                                'days_remaining': subscription.grace_period_days_remaining(),
                                'message': f'Your subscription has expired. You have {subscription.grace_period_days_remaining()} days remaining to renew before access is blocked.',
                                'expired_on': subscription.end_date.strftime('%Y-%m-%d')
                            }
                    except Subscription.DoesNotExist:
                        pass
            else:
                # User without organization (superadmin or unassigned)
                response.data['organization'] = None

        return response


# =============================================================================
# LOGOUT VIEW - CLEAR USER SESSION
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout the current user by invalidating their session.
    This clears only the specific session (web or setu) that made the logout request,
    not all sessions for the user.
    """
    from .models import UserSession

    try:
        # Get the session token from header to identify which session to invalidate
        session_token = request.headers.get('X-Session-Token')

        if session_token:
            # Delete only the specific session making the logout request
            deleted_count = UserSession.objects.filter(
                user=request.user,
                session_token=session_token
            ).delete()[0]
            logger.info(f"[Logout] Session invalidated for user: {request.user.email} (token-based, deleted: {deleted_count})")
        else:
            # Fallback: If no session token, try to determine session type from user-agent
            user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
            if 'electron' in user_agent or 'setu' in user_agent:
                session_type = 'setu'
            else:
                session_type = 'web'
            UserSession.invalidate_session(request.user, session_type)
            logger.info(f"[Logout] Session invalidated for user: {request.user.email} (type: {session_type})")

        return Response({
            'success': True,
            'message': 'Logged out successfully'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"[Logout] Error during logout for {request.user.email}: {e}")
        # Even if there's an error, try to delete based on session token
        session_token = request.headers.get('X-Session-Token')
        if session_token:
            UserSession.objects.filter(user=request.user, session_token=session_token).delete()
        return Response({
            'success': True,
            'message': 'Logged out'
        }, status=status.HTTP_200_OK)


# =============================================================================
# EMAIL OTP VERIFICATION VIEWS
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegistrationRateThrottle])
def send_otp_view(request):
    """Send OTP to email for verification during registration"""
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Basic email validation
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return Response(
            {'error': 'Please enter a valid email address'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'An account with this email already exists. Please login instead.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Generate OTP
        otp = EmailOTP.generate_otp(email)

        # Send OTP via email
        from .email_utils import send_otp_email
        email_sent = send_otp_email(email, otp.otp_code)

        if email_sent:
            return Response({
                'success': True,
                'message': f'OTP sent to {email}. Please check your email.',
                'expires_in_minutes': 10
            })
        else:
            return Response(
                {'error': 'Failed to send OTP email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        return Response(
            {'error': f'Failed to send OTP: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """Verify OTP code entered by user"""
    email = request.data.get('email', '').strip().lower()
    otp_code = request.data.get('otp', '').strip()

    if not email or not otp_code:
        return Response(
            {'error': 'Email and OTP are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify OTP
    success, message = EmailOTP.verify_otp(email, otp_code)

    if success:
        return Response({
            'success': True,
            'message': message,
            'email_verified': True
        })
    else:
        return Response(
            {'error': message},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp_view(request):
    """Resend OTP to email (same as send_otp but with different messaging)"""
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'An account with this email already exists.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Generate new OTP (this will delete any existing OTP)
        otp = EmailOTP.generate_otp(email)

        # Send OTP via email
        from .email_utils import send_otp_email
        email_sent = send_otp_email(email, otp.otp_code)

        if email_sent:
            return Response({
                'success': True,
                'message': f'New OTP sent to {email}.',
                'expires_in_minutes': 10
            })
        else:
            return Response(
                {'error': 'Failed to send OTP email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        return Response(
            {'error': f'Failed to resend OTP: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# FORGOT PASSWORD VIEWS
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def forgot_password_send_otp_view(request):
    """Send OTP to email for password reset"""
    from .models import PasswordResetOTP

    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Basic email validation
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return Response(
            {'error': 'Please enter a valid email address'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user exists
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # For security, don't reveal if email exists or not
        return Response({
            'success': True,
            'message': f'If an account exists with {email}, you will receive an OTP.',
            'expires_in_minutes': 10
        })

    try:
        # Generate OTP
        otp = PasswordResetOTP.generate_otp(email)

        # Send OTP via email
        from .email_utils import send_password_reset_otp_email
        email_sent = send_password_reset_otp_email(email, otp.otp_code, user.first_name or 'User')

        if email_sent:
            return Response({
                'success': True,
                'message': f'OTP sent to {email}. Please check your email.',
                'expires_in_minutes': 10
            })
        else:
            return Response(
                {'error': 'Failed to send OTP email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        logger.error(f"Forgot password OTP error: {e}")
        return Response(
            {'error': f'Failed to send OTP: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def forgot_password_verify_otp_view(request):
    """Verify OTP for password reset"""
    from .models import PasswordResetOTP

    email = request.data.get('email', '').strip().lower()
    otp_code = request.data.get('otp', '').strip()

    if not email or not otp_code:
        return Response(
            {'error': 'Email and OTP are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify OTP
    success, message, otp_obj = PasswordResetOTP.verify_otp(email, otp_code)

    if success:
        return Response({
            'success': True,
            'message': message,
            'otp_verified': True
        })
    else:
        return Response(
            {'error': message},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def forgot_password_reset_view(request):
    """Reset password after OTP verification"""
    from .models import PasswordResetOTP

    email = request.data.get('email', '').strip().lower()
    otp_code = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not email or not otp_code or not new_password:
        return Response(
            {'error': 'Email, OTP, and new password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if new_password != confirm_password:
        return Response(
            {'error': 'Passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Password strength validation
    if len(new_password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check for verified OTP
    try:
        otp = PasswordResetOTP.objects.get(
            email=email,
            otp_code=otp_code,
            is_verified=True,
            is_used=False
        )

        # Check if not expired
        if otp.is_expired():
            return Response(
                {'error': 'OTP has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    except PasswordResetOTP.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired OTP. Please verify OTP first.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get user and update password
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()

        # Mark OTP as used
        otp.is_used = True
        otp.save()

        # Clear any existing sessions for this user (force re-login)
        from .models import UserSession
        UserSession.objects.filter(user=user).delete()

        return Response({
            'success': True,
            'message': 'Password reset successfully. Please login with your new password.'
        })

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        return Response(
            {'error': 'Failed to reset password. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# User Registration View
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegistrationRateThrottle])
def register_view(request):
    """Register a new user with email as username - requires email OTP verification"""
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    company_name = request.data.get('company_name', '')
    mobile_number = request.data.get('mobile_number', '').strip()
    business_type = request.data.get('business_type', 'services')  # Default to services

    # Validate business_type
    valid_business_types = ['services', 'goods', 'both']
    if business_type not in valid_business_types:
        business_type = 'services'  # Default to services if invalid

    # Validation
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Mobile number is mandatory
    if not mobile_number:
        return Response(
            {'error': 'Mobile number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate mobile number format (Indian: 10 digits, may start with +91)
    import re
    mobile_clean = mobile_number.replace(' ', '').replace('-', '')
    if mobile_clean.startswith('+91'):
        mobile_clean = mobile_clean[3:]
    elif mobile_clean.startswith('91') and len(mobile_clean) > 10:
        mobile_clean = mobile_clean[2:]

    if not re.match(r'^[6-9]\d{9}$', mobile_clean):
        return Response(
            {'error': 'Please enter a valid 10-digit Indian mobile number'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if email has been verified via OTP
    if not EmailOTP.is_email_verified(email):
        return Response(
            {'error': 'Please verify your email address first by entering the OTP sent to your email'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'User with this email already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate password
    try:
        validate_password(password)
    except ValidationError as e:
        return Response(
            {'error': list(e.messages)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create user with email as username
    try:
        user = User.objects.create_user(
            username=email,  # Use email as username
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=True  # Make sure user is active
        )

        # Create organization for the new user
        from django.utils.text import slugify
        import uuid
        org_name = company_name if company_name else f"{first_name} {last_name}".strip() or email
        base_slug = slugify(org_name)
        slug = base_slug
        counter = 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        organization = Organization.objects.create(
            id=uuid.uuid4(),
            name=org_name,
            slug=slug,
            business_type=business_type,  # Store business type
            plan='free_trial',  # Changed from 'free' to 'free_trial'
            is_active=True
        )

        # Create organization membership with owner role
        OrganizationMembership.objects.create(
            organization=organization,
            user=user,
            role='owner',
            is_active=True
        )

        # Create default settings for the organization
        CompanySettings.objects.create(organization=organization, companyName=org_name)
        InvoiceSettings.objects.create(organization=organization)
        EmailSettings.objects.create(organization=organization)
        InvoiceFormatSettings.objects.create(organization=organization)

        # Create automatic 1-month free trial subscription
        try:
            # Get or create Free Trial subscription plan
            free_trial_plan, created = SubscriptionPlan.objects.get_or_create(
                name='Free Trial',
                defaults={
                    'description': '1-month free trial with basic features',
                    'price': Decimal('0.00'),
                    'billing_cycle': 'monthly',
                    'trial_days': 0,  # No additional trial needed since it's already a trial plan
                    'max_users': 2,  # Maximum 2 users
                    'max_invoices_per_month': 50,
                    'max_storage_gb': 1,
                    'features': ['Basic invoicing', 'Up to 2 users', '50 invoices per month', '1GB storage'],
                    'is_active': True,
                    'is_visible': False,  # Not visible on pricing page
                    'highlight': False,
                    'sort_order': 0
                }
            )

            # Create subscription for 1 month
            from datetime import datetime
            start_date = datetime.now().date()
            end_date = start_date + timedelta(days=30)  # 1 month = 30 days

            Subscription.objects.create(
                organization=organization,
                plan=free_trial_plan,
                status='trial',
                start_date=start_date,
                end_date=end_date,
                trial_end_date=end_date,
                amount_paid=Decimal('0.00'),
                auto_renew=False
            )
        except Exception as subscription_error:
            # Log the error but don't fail registration
            logger.error(f"Failed to create free trial subscription: {subscription_error}")

        return Response({
            'message': 'User registered successfully',
            'email': email,
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """Get or update user profile information"""
    user = request.user

    if request.method == 'GET':
        # Get organization info including business_type
        organization = getattr(request, 'organization', None)
        org_info = {}
        if organization:
            org_info = {
                'organization_id': str(organization.id),
                'organization_name': organization.name,
                'business_type': organization.business_type,
                'business_type_display': organization.get_business_type_display(),
                'plan': organization.plan
            }

        # Check if user is a staff member
        staff_info = {}
        try:
            staff_profile = StaffProfile.objects.get(user=user)
            staff_info = {
                'staff_type': staff_profile.staff_type,
                'staff_type_display': staff_profile.get_staff_type_display(),
                'is_staff_member': True
            }
        except StaffProfile.DoesNotExist:
            staff_info = {
                'is_staff_member': False
            }

        return Response({
            'username': user.username,
            'email': user.email,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'is_superuser': user.is_superuser,
            **org_info,
            **staff_info
        })

    elif request.method == 'PUT':
        # Update user profile
        first_name = request.data.get('firstName', user.first_name)
        last_name = request.data.get('lastName', user.last_name)
        email = request.data.get('email', user.email)

        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.save()

        return Response({
            'message': 'Profile updated successfully',
            'username': user.username,
            'email': user.email,
            'firstName': user.first_name,
            'lastName': user.last_name
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change user password"""
    user = request.user

    old_password = request.data.get('oldPassword')
    new_password = request.data.get('newPassword')

    if not old_password or not new_password:
        return Response(
            {'error': 'Both old password and new password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if old password is correct
    if not user.check_password(old_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new password
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response(
            {'error': list(e.messages)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    user.set_password(new_password)
    user.save()

    # Update session to prevent logout
    update_session_auth_hash(request, user)

    return Response({'message': 'Password changed successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    """
    Delete user account and all associated data (DPDP Act - Right to Erasure).
    This is an irreversible action that deletes:
    - User account
    - All organizations where user is the sole owner
    - User's membership from shared organizations
    """
    user = request.user
    password = request.data.get('password')
    confirm = request.data.get('confirm', False)

    if not password:
        return Response(
            {'error': 'Password is required to delete account'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not confirm:
        return Response(
            {'error': 'Please confirm account deletion'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify password
    if not user.check_password(password):
        return Response(
            {'error': 'Incorrect password'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Prevent superadmin deletion through this endpoint
    if user.is_superuser:
        return Response(
            {'error': 'Superadmin accounts cannot be deleted through this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Get all organizations where user is owner
        owned_orgs = Organization.objects.filter(
            memberships__user=user,
            memberships__role='owner',
            memberships__is_active=True
        )

        # Delete organizations where user is sole owner
        for org in owned_orgs:
            other_owners = OrganizationMembership.objects.filter(
                organization=org,
                role='owner',
                is_active=True
            ).exclude(user=user).count()

            if other_owners == 0:
                # User is sole owner, delete the organization and all its data
                org.delete()
            else:
                # Transfer ownership or just remove membership
                OrganizationMembership.objects.filter(
                    organization=org,
                    user=user
                ).delete()

        # Remove user from any remaining organizations (where not owner)
        OrganizationMembership.objects.filter(user=user).delete()

        # Store email before deletion for logging
        deleted_email = user.email

        # Delete the user account
        user.delete()

        return Response({
            'message': 'Account deleted successfully',
            'detail': 'Your account and all associated data have been permanently deleted as per your request under the DPDP Act Right to Erasure.'
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to delete account: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_personal_data_view(request):
    """
    Export all personal data for the user (DPDP Act - Right to Data Portability).
    Returns a JSON file with all user data.
    """
    import json
    from django.http import HttpResponse

    user = request.user
    organization = request.organization

    try:
        # Gather all user data
        user_data = {
            'account_info': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            },
            'organizations': [],
            'export_date': timezone.now().isoformat(),
            'export_purpose': 'Data Portability as per DPDP Act 2023'
        }

        # Get all user's organizations
        memberships = OrganizationMembership.objects.filter(user=user, is_active=True)

        for membership in memberships:
            org = membership.organization
            org_data = {
                'name': org.name,
                'role': membership.role,
                'joined_at': membership.joined_at.isoformat(),
            }

            # Get company settings
            try:
                company = CompanySettings.objects.get(organization=org)
                org_data['company_settings'] = {
                    'company_name': company.companyName,
                    'trading_name': company.tradingName,
                    'address': company.address,
                    'city': company.city,
                    'state': company.state,
                    'pin_code': company.pinCode,
                    'gstin': company.gstin,
                    'pan': company.pan,
                    'phone': company.phone,
                    'email': company.email,
                }
            except CompanySettings.DoesNotExist:
                org_data['company_settings'] = None

            # Get clients
            clients = Client.objects.filter(organization=org)
            org_data['clients'] = [{
                'name': c.name,
                'code': c.code,
                'email': c.email,
                'phone': c.phone,
                'address': c.address,
                'city': c.city,
                'state': c.state,
                'gstin': c.gstin,
                'pan': c.pan,
            } for c in clients]

            # Get invoices
            invoices = Invoice.objects.filter(organization=org)
            org_data['invoices'] = [{
                'invoice_number': inv.invoice_number,
                'invoice_type': inv.invoice_type,
                'client': inv.client.name,
                'invoice_date': inv.invoice_date.isoformat(),
                'status': inv.status,
                'subtotal': str(inv.subtotal),
                'tax_amount': str(inv.tax_amount),
                'total_amount': str(inv.total_amount),
            } for inv in invoices]

            # Get payments
            payments = Payment.objects.filter(organization=org)
            org_data['payments'] = [{
                'invoice': p.invoice.invoice_number,
                'amount': str(p.amount),
                'payment_date': p.payment_date.isoformat(),
                'payment_method': p.payment_method,
            } for p in payments]

            user_data['organizations'].append(org_data)

        # Create JSON response
        response = HttpResponse(
            json.dumps(user_data, indent=2, ensure_ascii=False),
            content_type='application/json; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="nexinvo_personal_data_export_{timezone.now().strftime("%Y%m%d")}.json"'
        return response

    except Exception as e:
        return Response(
            {'error': f'Failed to export data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
