from rest_framework import viewsets, status, serializers, filters
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.http import HttpResponse
from django.db.models import Sum, Q, Count
from django.db import transaction
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import os
import tempfile
from .models import (Organization, OrganizationMembership, CompanySettings, InvoiceSettings, Client, Invoice, InvoiceItem, Payment, Receipt, EmailSettings, SystemEmailSettings, InvoiceFormatSettings, ServiceItem, PaymentTerm, SubscriptionPlan, Coupon, CouponUsage, Subscription, SubscriptionUpgradeRequest, SuperAdminNotification, BulkEmailTemplate, BulkEmailCampaign, BulkEmailRecipient, EmailOTP, ScheduledInvoice, ScheduledInvoiceItem, ScheduledInvoiceLog)
from .serializers import (
    OrganizationSerializer, OrganizationMembershipSerializer,
    CompanySettingsSerializer, InvoiceSettingsSerializer, ClientSerializer,
    InvoiceSerializer, PaymentSerializer, ReceiptSerializer, EmailSettingsSerializer,
    SystemEmailSettingsSerializer, InvoiceFormatSettingsSerializer, ServiceItemSerializer,
    PaymentTermSerializer, UserSerializer, SubscriptionPlanSerializer, CouponSerializer,
    CouponUsageSerializer, SubscriptionSerializer, SubscriptionUpgradeRequestSerializer,
    ScheduledInvoiceSerializer, ScheduledInvoiceListSerializer, ScheduledInvoiceLogSerializer
)
from .pdf_generator import generate_invoice_pdf
from .email_service import send_invoice_email, send_receipt_email, send_bulk_invoice_emails
from .invoice_importer import InvoiceImporter, generate_excel_template


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

    def post(self, request, *args, **kwargs):
        from .models import UserSession
        from django.utils import timezone
        from datetime import timedelta
        
        # Check if force_login is requested
        force_login = request.data.get('force_login', False)
        
        # Get current device info and session token from request
        current_device_info = request.META.get('HTTP_USER_AGENT', '')[:255]
        current_session_token = request.headers.get('X-Session-Token', '')
        
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
        
        # Check if user already has an active session
        try:
            existing_session = UserSession.objects.get(user=user)
            
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
            if not force_login and not session_expired and not is_same_session and not is_same_device:
                # Different device and session is still active - ask for confirmation
                return Response({
                    'error': 'already_logged_in',
                    'detail': 'You are currently logged in on another device.',
                    'device_info': existing_session.device_info[:100] if existing_session.device_info else 'Unknown device',
                    'last_activity': existing_session.last_activity.strftime('%Y-%m-%d %H:%M:%S') if existing_session.last_activity else None
                }, status=status.HTTP_409_CONFLICT)
                
        except UserSession.DoesNotExist:
            # No existing session, proceed normally
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
                    if subscription.is_fully_expired():
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
            # Create a new session token (invalidates any existing session)
            device_info = current_device_info
            ip_address = request.META.get('REMOTE_ADDR')
            session_token = UserSession.create_session(user, device_info, ip_address)

            # Add session token to response
            response.data['session_token'] = session_token

            # Add subscription warning if in grace period
            if not user.is_superuser:
                from .models import OrganizationMembership, Subscription
                membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
                if membership:
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

        return response


# =============================================================================
# EMAIL OTP VERIFICATION VIEWS
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
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


# User Registration View
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new user with email as username - requires email OTP verification"""
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    company_name = request.data.get('company_name', '')
    mobile_number = request.data.get('mobile_number', '').strip()

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
            print(f"Failed to create free trial subscription: {subscription_error}")

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
def company_settings_view(request):
    """Get or update company settings for the authenticated user"""
    if request.method == 'GET':
        try:
            settings = CompanySettings.objects.get(organization=request.organization)
            serializer = CompanySettingsSerializer(settings)
            return Response(serializer.data)
        except CompanySettings.DoesNotExist:
            return Response({'message': 'No settings found'}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'PUT':
        try:
            settings = CompanySettings.objects.get(organization=request.organization)
            serializer = CompanySettingsSerializer(settings, data=request.data, partial=True)
        except CompanySettings.DoesNotExist:
            serializer = CompanySettingsSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def invoice_settings_view(request):
    """Get or update invoice settings for the authenticated user"""
    if request.method == 'GET':
        try:
            settings = InvoiceSettings.objects.get(organization=request.organization)
            serializer = InvoiceSettingsSerializer(settings)
            return Response(serializer.data)
        except InvoiceSettings.DoesNotExist:
            return Response({'message': 'No settings found'}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'PUT':
        try:
            settings = InvoiceSettings.objects.get(organization=request.organization)
            serializer = InvoiceSettingsSerializer(settings, data=request.data, partial=True)
        except InvoiceSettings.DoesNotExist:
            serializer = InvoiceSettingsSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def email_settings_view(request):
    """Get or update email settings for the authenticated user"""
    # Check if user has an organization
    if not request.organization:
        return Response(
            {'error': 'No organization associated with this user. Superadmin users cannot configure email settings as they are not associated with any organization.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'GET':
        # Get or create email settings with defaults
        settings, created = EmailSettings.objects.get_or_create(
            organization=request.organization,
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'smtp_username': '',
                'smtp_password': '',
                'from_email': '',
                'from_name': '',
                'use_tls': True,
                'email_signature': ''
            }
        )
        serializer = EmailSettingsSerializer(settings)
        return Response(serializer.data)

    elif request.method == 'PUT':
        settings, created = EmailSettings.objects.get_or_create(
            organization=request.organization,
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'use_tls': True
            }
        )
        serializer = EmailSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_email_view(request):
    """Send a test email to verify SMTP configuration"""
    # Check if user has an organization
    if not request.organization:
        return Response(
            {'error': 'No organization associated with this user. Superadmin users cannot test email settings as they are not associated with any organization.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from django.core.mail import send_mail
        from django.conf import settings as django_settings

        email_settings = EmailSettings.objects.get(organization=request.organization)

        # Validate email settings
        if not email_settings.smtp_username or not email_settings.smtp_password:
            return Response(
                {'error': 'Please configure SMTP username and password in Email Settings'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email_settings.from_email:
            return Response(
                {'error': 'Please configure From Email address in Email Settings'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Configure email backend temporarily
        from django.core.mail import get_connection

        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=email_settings.smtp_host,
            port=email_settings.smtp_port,
            username=email_settings.smtp_username,
            password=email_settings.smtp_password,
            use_tls=email_settings.use_tls,
        )

        # Send test email
        send_mail(
            subject='NexInvo - Test Email',
            message='This is a test email from NexInvo. Your email configuration is working correctly!',
            from_email=email_settings.from_email,
            recipient_list=[email_settings.from_email],
            connection=connection,
            fail_silently=False
        )

        return Response({'message': 'Test email sent successfully!'}, status=status.HTTP_200_OK)

    except EmailSettings.DoesNotExist:
        return Response({'error': 'Email settings not configured'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Failed to send test email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def invoice_format_settings_view(request):
    """Get or update invoice format settings for the organization"""
    if request.method == 'GET':
        # Get or create invoice format settings with defaults
        settings, created = InvoiceFormatSettings.objects.get_or_create(
            organization=request.organization,
            defaults={
                'show_logo': True,
                'logo_position': 'left',
                'show_company_designation': True,
                'company_designation_text': 'Professional Services',
                'header_color': '#1e3a8a',
                'show_company_name': True,
                'show_trading_name': True,
                'show_address': True,
                'show_gstin': True,
                'show_pan': True,
                'show_phone': True,
                'show_email': True,
                'show_invoice_number': True,
                'show_invoice_date': True,
                'show_due_date': False,
                'show_client_gstin': True,
                'show_client_pan': False,
                'show_client_phone': False,
                'show_client_email': False,
                'table_header_bg_color': '#1e3a8a',
                'table_header_text_color': '#ffffff',
                'show_hsn_sac_column': False,
                'show_serial_number': True,
                'show_taxable_value': True,
                'show_cgst_sgst_separate': True,
                'show_igst': True,
                'show_gst_percentage': False,
                'show_subtotal': True,
                'show_tax_breakup': True,
                'show_grand_total_in_words': False,
                'show_bank_details': True,
                'show_signature': True,
                'signature_label': 'Authorized Signatory',
                'show_company_seal': False,
                'show_payment_terms': True,
                'show_notes': True,
                'show_terms_conditions': True,
                'show_computer_generated_note': True,
                'show_page_numbers': True,
                'font_size': 'medium'
            }
        )
        serializer = InvoiceFormatSettingsSerializer(settings)
        return Response(serializer.data)

    elif request.method == 'PUT':
        settings, created = InvoiceFormatSettings.objects.get_or_create(organization=request.organization)
        serializer = InvoiceFormatSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_report_email(request):
    """
    Send a report via email to specified recipient.
    Expects: report_name, report_data (list of dicts), recipient_email, date_filter
    """
    report_name = request.data.get('report_name')
    report_data = request.data.get('report_data', [])
    recipient_email = request.data.get('recipient_email')
    date_filter = request.data.get('date_filter', 'All Time')

    if not report_name or not recipient_email:
        return Response({'error': 'Report name and recipient email are required'}, status=status.HTTP_400_BAD_REQUEST)

    if not report_data:
        return Response({'error': 'No report data to send'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get email settings for the organization
        email_settings = EmailSettings.objects.get(organization=request.organization)
    except EmailSettings.DoesNotExist:
        return Response({'error': 'Email settings not configured. Please configure email settings first.'}, status=status.HTTP_400_BAD_REQUEST)

    if not email_settings.smtp_username or not email_settings.smtp_password or not email_settings.from_email:
        return Response({'error': 'SMTP settings incomplete. Please configure email settings.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get company settings for company name
        try:
            company_settings = CompanySettings.objects.get(organization=request.organization)
            company_name = company_settings.companyName
        except CompanySettings.DoesNotExist:
            company_name = request.organization.name

        # Generate CSV content
        if report_data:
            headers = list(report_data[0].keys())
            csv_rows = [','.join(headers)]
            for row in report_data:
                values = []
                for h in headers:
                    val = row.get(h, '')
                    if isinstance(val, (int, float)):
                        values.append(str(round(val, 2)))
                    else:
                        values.append(str(val).replace(',', ' '))
                csv_rows.append(','.join(values))
            csv_content = '\n'.join(csv_rows)
        else:
            csv_content = 'No data available'

        # Create email
        from django.core.mail import EmailMessage, get_connection

        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=email_settings.smtp_host,
            port=email_settings.smtp_port,
            username=email_settings.smtp_username,
            password=email_settings.smtp_password,
            use_tls=email_settings.use_tls,
            timeout=30,
        )

        subject = f'{report_name} - {company_name}'
        signature = f"\n\n{email_settings.email_signature}" if email_settings.email_signature else ""

        body = f"""Dear User,

Please find attached the {report_name} for the period: {date_filter}.

Report Summary:
- Report Type: {report_name}
- Period: {date_filter}
- Total Records: {len(report_data)}
- Generated on: {datetime.now().strftime('%d/%m/%Y %H:%M')}

This report was generated from {company_name}'s NexInvo system.

Best Regards,
{company_name}
{email_settings.from_email}
{signature}
        """.strip()

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=email_settings.from_email,
            to=[recipient_email],
            connection=connection
        )
        email.content_subtype = "plain"
        email.encoding = 'utf-8'

        # Attach CSV report
        filename = f"{report_name.replace(' ', '_')}_{date_filter.replace(' ', '_')}.csv"
        email.attach(filename, csv_content, 'text/csv')

        email.send(fail_silently=False)

        return Response({'message': f'Report sent successfully to {recipient_email}'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== Organization Management ViewSets ==========

class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizations.
    Users can only see organizations they belong to.
    Superadmins can see all organizations.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Superadmins can see all organizations
        if self.request.user.is_superuser:
            return Organization.objects.all().annotate(
                member_count=Count('memberships', filter=Q(memberships__is_active=True))
            ).order_by('-created_at')

        # Regular users can only see organizations they belong to
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
            is_active=True
        ).distinct()

    def create(self, request, *args, **kwargs):
        """
        Create a new organization.
        - Superadmin can always create organizations
        - Tenant admins (owners) can create organizations based on their subscription plan limits
        """
        if request.user.is_superuser:
            return super().create(request, *args, **kwargs)

        # Check if user is an owner of any organization
        owner_memberships = OrganizationMembership.objects.filter(
            user=request.user,
            role='owner',
            is_active=True
        ).select_related('organization')

        if not owner_memberships.exists():
            return Response(
                {'error': 'Only organization owners can create new organizations'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user's current organizations count
        user_org_count = owner_memberships.count()

        # Get the subscription plan from any of the user's organizations
        # Use the highest plan limit among all organizations the user owns
        max_org_limit = 1  # Default limit

        for membership in owner_memberships:
            org = membership.organization
            try:
                # Get the organization's subscription
                subscription = Subscription.objects.filter(
                    organization=org,
                    status='active'
                ).select_related('plan').first()

                if subscription and subscription.plan:
                    plan_limit = subscription.plan.max_organizations or 1
                    if plan_limit > max_org_limit:
                        max_org_limit = plan_limit
                else:
                    # Fallback to organization's plan field
                    plan = SubscriptionPlan.objects.filter(
                        name__iexact=org.plan,
                        is_active=True
                    ).first()
                    if plan:
                        plan_limit = plan.max_organizations or 1
                        if plan_limit > max_org_limit:
                            max_org_limit = plan_limit
            except Exception:
                pass

        # Check if user has reached their limit
        if user_org_count >= max_org_limit:
            return Response(
                {
                    'error': f'Organization limit reached. Your plan allows maximum {max_org_limit} organization(s). Please upgrade your subscription to create more organizations.',
                    'current_count': user_org_count,
                    'max_allowed': max_org_limit
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Create organization and make the creator an owner
        organization = serializer.save()
        OrganizationMembership.objects.create(
            organization=organization,
            user=self.request.user,
            role='owner',
            is_active=True
        )

    def update(self, request, *args, **kwargs):
        """Override update to create/update subscription when plan changes"""
        from datetime import date, timedelta
        from django.db import transaction

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_plan = instance.plan

        # Check if plan is being changed
        new_plan = request.data.get('plan')
        if new_plan and new_plan != old_plan:
            # Only superadmin can change plans
            if not request.user.is_superuser:
                return Response(
                    {'error': 'Only superadmin can change organization plans'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Validate that the plan exists in SubscriptionPlan model
            try:
                subscription_plan = SubscriptionPlan.objects.get(
                    name__iexact=new_plan,
                    is_active=True
                )
            except SubscriptionPlan.DoesNotExist:
                # Check if there's a plan with exact name match
                available_plans = list(SubscriptionPlan.objects.filter(is_active=True).values_list('name', flat=True))
                return Response(
                    {'error': f'Invalid plan "{new_plan}". Available plans: {", ".join(available_plans)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update Organization.plan field (legacy field for compatibility)
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            # Create or update the Subscription record
            with transaction.atomic():
                subscription, created = Subscription.objects.get_or_create(
                    organization=instance,
                    defaults={
                        'plan': subscription_plan,
                        'start_date': date.today(),
                        'end_date': date.today() + timedelta(days=365 if subscription_plan.billing_cycle == 'yearly' else 30),
                        'status': 'active',
                        'amount_paid': subscription_plan.price,
                        'auto_renew': False,
                        'next_billing_date': date.today() + timedelta(days=365 if subscription_plan.billing_cycle == 'yearly' else 30)
                    }
                )

                if not created:
                    # Update existing subscription to the new plan
                    subscription.plan = subscription_plan
                    subscription.status = 'active'
                    subscription.save()

            return Response(serializer.data)

        # Normal update without plan change
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def switch(self, request, pk=None):
        """Switch to this organization (sets it as current in response)"""
        organization = self.get_object()
        # Verify user has access
        try:
            membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            return Response({
                'organization_id': str(organization.id),
                'organization_name': organization.name,
                'role': membership.role,
                'message': f'Switched to {organization.name}'
            })
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=False, methods=['get'])
    def limits(self, request):
        """Get the user's organization creation limits based on their subscription plan"""
        user = request.user

        # Superadmins have unlimited organizations
        if user.is_superuser:
            return Response({
                'current_count': Organization.objects.count(),
                'max_allowed': -1,  # -1 means unlimited
                'can_create': True,
                'is_owner': True
            })

        # Get user's organizations where they are owner
        owner_memberships = OrganizationMembership.objects.filter(
            user=user,
            role='owner',
            is_active=True
        ).select_related('organization')

        if not owner_memberships.exists():
            return Response({
                'current_count': 0,
                'max_allowed': 0,
                'can_create': False,
                'is_owner': False
            })

        user_org_count = owner_memberships.count()
        max_org_limit = 1  # Default limit

        for membership in owner_memberships:
            org = membership.organization
            try:
                # Get the organization's subscription
                subscription = Subscription.objects.filter(
                    organization=org,
                    status='active'
                ).select_related('plan').first()

                if subscription and subscription.plan:
                    plan_limit = subscription.plan.max_organizations or 1
                    if plan_limit > max_org_limit:
                        max_org_limit = plan_limit
                else:
                    # Fallback to organization's plan field
                    plan = SubscriptionPlan.objects.filter(
                        name__iexact=org.plan,
                        is_active=True
                    ).first()
                    if plan:
                        plan_limit = plan.max_organizations or 1
                        if plan_limit > max_org_limit:
                            max_org_limit = plan_limit
            except Exception:
                pass

        return Response({
            'current_count': user_org_count,
            'max_allowed': max_org_limit,
            'can_create': user_org_count < max_org_limit,
            'is_owner': True
        })

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List all members of the organization"""
        organization = self.get_object()
        memberships = OrganizationMembership.objects.filter(
            organization=organization,
            is_active=True
        ).select_related('user')
        serializer = OrganizationMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the organization"""
        organization = self.get_object()

        # Check if requester is owner or admin
        try:
            requester_membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only owners and admins can invite users'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user email from request
        email = request.data.get('email')
        role = request.data.get('role', 'user')

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'User with this email not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is already a member
        if OrganizationMembership.objects.filter(
            organization=organization,
            user=user
        ).exists():
            return Response(
                {'error': 'User is already a member of this organization'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create membership
        membership = OrganizationMembership.objects.create(
            organization=organization,
            user=user,
            role=role,
            is_active=True
        )

        serializer = OrganizationMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put'], url_path='members/(?P<user_id>[^/.]+)')
    def update_member(self, request, pk=None, user_id=None):
        """Update a member's role or status"""
        organization = self.get_object()

        # Check if requester is owner or admin
        try:
            requester_membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only owners and admins can update members'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the membership to update
        try:
            membership = OrganizationMembership.objects.get(
                organization=organization,
                user_id=user_id
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update role and/or status
        role = request.data.get('role')
        is_active = request.data.get('is_active')

        if role:
            membership.role = role
        if is_active is not None:
            membership.is_active = is_active

        membership.save()
        serializer = OrganizationMembershipSerializer(membership)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a member from the organization"""
        organization = self.get_object()

        # Check if requester is owner or admin
        try:
            requester_membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only owners and admins can remove members'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the membership to remove
        try:
            membership = OrganizationMembership.objects.get(
                organization=organization,
                user_id=user_id
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Don't allow removing the last owner
        if membership.role == 'owner':
            owner_count = OrganizationMembership.objects.filter(
                organization=organization,
                role='owner',
                is_active=True
            ).count()
            if owner_count <= 1:
                return Response(
                    {'error': 'Cannot remove the last owner'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_update(self, serializer):
        """Sync organization plan changes with Subscription model"""
        from datetime import date, timedelta
        from .models import SubscriptionPlan, Subscription

        # Get the old plan before updating
        old_plan = self.get_object().plan
        organization = serializer.save()
        new_plan = organization.plan

        # If plan changed and user is superadmin, update/create subscription
        if old_plan != new_plan and self.request.user.is_superuser:
            try:
                # Find the subscription plan by name
                plan = SubscriptionPlan.objects.filter(
                    name__iexact=new_plan
                ).first()

                if plan:
                    # Calculate subscription dates
                    start_date = date.today()
                    if plan.billing_cycle == 'monthly':
                        end_date = start_date + timedelta(days=30)
                    else:
                        end_date = start_date + timedelta(days=365)

                    trial_end_date = None
                    if plan.trial_days > 0:
                        trial_end_date = start_date + timedelta(days=plan.trial_days)

                    # Update or create subscription
                    Subscription.objects.update_or_create(
                        organization=organization,
                        defaults={
                            'plan': plan,
                            'start_date': start_date,
                            'end_date': end_date,
                            'trial_end_date': trial_end_date,
                            'status': 'trial' if plan.trial_days > 0 else 'active',
                            'amount_paid': plan.price,
                            'auto_renew': False,
                            'next_billing_date': end_date
                        }
                    )
            except Exception as e:
                # Log error but don't fail the organization update
                print(f"Error syncing subscription: {e}")


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Client.objects.filter(
            organization=self.request.organization
        ).select_related('organization').prefetch_related('invoices')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """Bulk upload clients from CSV/Excel file"""
        import csv
        import io
        from datetime import datetime

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Read file content
            file_content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(file_content))

            # Validate CSV headers
            expected_headers = {'Client Name*', 'Email*'}  # Required headers
            optional_headers = {'Client Code', 'Phone', 'Mobile', 'Address', 'City', 'State',
                              'PIN Code', 'State Code', 'GSTIN', 'PAN', 'Date of Birth', 'Date of Incorporation'}

            if csv_reader.fieldnames is None:
                return Response({'error': 'CSV file is empty or invalid'}, status=status.HTTP_400_BAD_REQUEST)

            file_headers = set(csv_reader.fieldnames)
            missing_required = expected_headers - file_headers

            if missing_required:
                return Response({
                    'error': f'Missing required columns: {", ".join(missing_required)}. Please use the provided template.'
                }, status=status.HTTP_400_BAD_REQUEST)

            created_count = 0
            errors = []

            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    # Parse date fields if provided
                    date_of_birth = None
                    date_of_incorporation = None

                    if row.get('Date of Birth'):
                        try:
                            date_of_birth = datetime.strptime(row['Date of Birth'], '%Y-%m-%d').date()
                        except ValueError:
                            pass

                    if row.get('Date of Incorporation'):
                        try:
                            date_of_incorporation = datetime.strptime(row['Date of Incorporation'], '%Y-%m-%d').date()
                        except ValueError:
                            pass

                    # Create client data
                    client_data = {
                        'name': row.get('Client Name*', '').strip(),
                        'code': row.get('Client Code', '').strip(),
                        'email': row.get('Email*', '').strip(),
                        'phone': row.get('Phone', '').strip(),
                        'mobile': row.get('Mobile', '').strip(),
                        'address': row.get('Address', '').strip(),
                        'city': row.get('City', '').strip(),
                        'state': row.get('State', '').strip(),
                        'pinCode': row.get('PIN Code', '').strip(),
                        'stateCode': row.get('State Code', '').strip(),
                        'gstin': row.get('GSTIN', '').strip(),
                        'pan': row.get('PAN', '').strip(),
                        'date_of_birth': date_of_birth,
                        'date_of_incorporation': date_of_incorporation,
                    }

                    # Validate required fields
                    if not client_data['name']:
                        errors.append(f"Row {row_num}: Client name is required")
                        continue

                    # Create client
                    serializer = ClientSerializer(data=client_data)
                    if serializer.is_valid():
                        serializer.save(organization=request.organization)
                        created_count += 1
                    else:
                        errors.append(f"Row {row_num}: {serializer.errors}")

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                'success': True,
                'created_count': created_count,
                'errors': errors
            }, status=status.HTTP_201_CREATED)

        except UnicodeDecodeError:
            return Response({
                'error': 'Unable to read the file. Please ensure it is saved as UTF-8 CSV format.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': f'Failed to process file: {str(e)}. Please ensure the file matches the template format.'
            }, status=status.HTTP_400_BAD_REQUEST)


class ServiceItemViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ServiceItem.objects.filter(organization=self.request.organization, is_active=True)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class PaymentTermViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentTermSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentTerm.objects.filter(organization=self.request.organization, is_active=True)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.filter(
            organization=self.request.organization
        ).select_related(
            'client', 'organization', 'created_by', 'payment_term', 'parent_proforma'
        ).prefetch_related('items', 'payments')

        # Filter by search term
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(client__name__icontains=search)
            )

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by invoice type
        invoice_type = self.request.query_params.get('invoice_type', None)
        if invoice_type:
            queryset = queryset.filter(invoice_type=invoice_type)

        # Filter for unpaid invoices (for payment dropdown)
        unpaid_only = self.request.query_params.get('unpaid_only', None)
        if unpaid_only == 'true':
            # Exclude invoices that are already fully paid
            queryset = queryset.exclude(status='paid')

        return queryset

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization, created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for an invoice"""
        try:
            invoice = self.get_object()

            # Get company settings for the user
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                # Create default company settings if not exists
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Get format settings for the user
            try:
                format_settings = InvoiceFormatSettings.objects.get(organization=request.organization)
            except InvoiceFormatSettings.DoesNotExist:
                format_settings = None

            # Generate PDF
            pdf_buffer = generate_invoice_pdf(invoice, company_settings, format_settings)

            # Create HTTP response with PDF
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'

            return response

        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send invoice email to client"""
        try:
            invoice = self.get_object()

            # Check if client has email
            if not invoice.client.email:
                return Response(
                    {'error': 'Client does not have an email address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get company settings
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Send email
            success = send_invoice_email(invoice, company_settings)

            if success:
                # Update invoice status to 'sent' if it was 'draft'
                if invoice.status == 'draft':
                    invoice.status = 'sent'
                    invoice.save()

                return Response({
                    'message': 'Invoice email sent successfully',
                    'invoice': InvoiceSerializer(invoice).data
                })
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_send_email(self, request):
        """Send emails for multiple invoices at once - optimized for speed"""
        try:
            invoice_ids = request.data.get('invoice_ids', [])

            if not invoice_ids:
                return Response(
                    {'error': 'No invoice IDs provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get invoices
            invoices = Invoice.objects.filter(
                id__in=invoice_ids,
                organization=request.organization
            ).select_related('client')

            if not invoices.exists():
                return Response(
                    {'error': 'No valid invoices found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get company settings
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Send bulk emails using optimized function
            result = send_bulk_invoice_emails(list(invoices), company_settings)

            # Update status for successfully sent invoices
            Invoice.objects.filter(
                id__in=invoice_ids,
                organization=request.organization,
                status='draft',
                is_emailed=True
            ).update(status='sent')

            return Response({
                'message': f'Emails sent: {result["success"]} successful, {result["failed"]} failed',
                'success_count': result['success'],
                'failed_count': result['failed'],
                'errors': result['errors'][:10] if result['errors'] else []  # Return only first 10 errors
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def convert_to_tax_invoice(self, request, pk=None):
        """Convert proforma invoice to tax invoice after payment received"""
        try:
            proforma_invoice = self.get_object()

            # Validate that it's a proforma invoice
            if proforma_invoice.invoice_type != 'proforma':
                return Response(
                    {'error': 'Only proforma invoices can be converted to tax invoices'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if already converted
            if hasattr(proforma_invoice, 'converted_tax_invoice') and proforma_invoice.converted_tax_invoice.exists():
                return Response(
                    {'error': 'This proforma invoice has already been converted to a tax invoice'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create new tax invoice
            tax_invoice = Invoice.objects.create(
                user=proforma_invoice.user,
                client=proforma_invoice.client,
                invoice_type='tax',
                invoice_date=date.today(),
                status='paid',  # Mark as paid since payment has been received
                subtotal=proforma_invoice.subtotal,
                tax_amount=proforma_invoice.tax_amount,
                total_amount=proforma_invoice.total_amount,
                payment_terms=proforma_invoice.payment_terms,
                notes=proforma_invoice.notes,
                parent_proforma=proforma_invoice
            )

            # Copy invoice items
            for item in proforma_invoice.items.all():
                InvoiceItem.objects.create(
                    invoice=tax_invoice,
                    description=item.description,
                    hsn_sac=item.hsn_sac,
                    quantity=item.quantity,
                    rate=item.rate,
                    gst_rate=item.gst_rate,
                    taxable_amount=item.taxable_amount,
                    total_amount=item.total_amount
                )

            # Update proforma invoice status
            proforma_invoice.status = 'paid'
            proforma_invoice.save()

            # Get company settings
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Auto-send tax invoice email if client has email
            if tax_invoice.client.email:
                send_invoice_email(tax_invoice, company_settings)

            return Response({
                'message': 'Proforma invoice converted to tax invoice successfully',
                'proforma_invoice': InvoiceSerializer(proforma_invoice).data,
                'tax_invoice': InvoiceSerializer(tax_invoice).data
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            organization=self.request.organization
        ).select_related('invoice', 'invoice__client', 'organization', 'created_by')

    def perform_create(self, serializer):
        payment = serializer.save(organization=self.request.organization, created_by=self.request.user)

        # Update invoice status based on payment
        invoice = payment.invoice

        # Calculate total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Auto-convert Proforma Invoice to Tax Invoice when payment is received
        if invoice.invoice_type == 'proforma' and total_paid >= invoice.total_amount:
            # Check if already converted
            if not hasattr(invoice, 'converted_tax_invoice') or not invoice.converted_tax_invoice.exists():
                # Use atomic transaction to prevent race conditions
                with transaction.atomic():
                    # Create tax invoice with payment date (invoice_number will be auto-generated)
                    tax_invoice = Invoice.objects.create(
                        organization=self.request.organization,
                        created_by=self.request.user,
                        client=invoice.client,
                        invoice_type='tax',
                        invoice_date=payment.payment_date,  # Use payment date as invoice date
                        status='paid',
                        subtotal=invoice.subtotal,
                        tax_amount=invoice.tax_amount,
                        total_amount=invoice.total_amount,
                        payment_term=invoice.payment_term,
                        payment_terms=invoice.payment_terms,
                        notes=invoice.notes,
                        parent_proforma=invoice
                    )

                    # Copy invoice items
                    for item in invoice.items.all():
                        InvoiceItem.objects.create(
                            invoice=tax_invoice,
                            description=item.description,
                            hsn_sac=item.hsn_sac,
                            gst_rate=item.gst_rate,
                            taxable_amount=item.taxable_amount,
                            total_amount=item.total_amount
                        )

                    # Transfer payment to tax invoice
                    payment.invoice = tax_invoice
                    payment.save()

                    # Generate Receipt Number
                    invoice_settings = InvoiceSettings.objects.get(organization=self.request.organization)
                    receipt_prefix = invoice_settings.receiptPrefix or 'RCPT-'

                    # Get the last receipt number for this organization
                    last_receipt = Receipt.objects.filter(
                        organization=self.request.organization
                    ).order_by('-created_at').first()

                    if last_receipt and last_receipt.receipt_number.startswith(receipt_prefix):
                        try:
                            last_number = int(last_receipt.receipt_number.replace(receipt_prefix, ''))
                            next_number = last_number + 1
                        except ValueError:
                            next_number = invoice_settings.receiptStartingNumber
                    else:
                        next_number = invoice_settings.receiptStartingNumber

                    receipt_number = f"{receipt_prefix}{next_number}"

                    # Create Receipt with TDS details (Income Tax TDS + GST TDS)
                    receipt = Receipt.objects.create(
                        organization=self.request.organization,
                        created_by=self.request.user,
                        payment=payment,
                        invoice=tax_invoice,
                        receipt_number=receipt_number,
                        receipt_date=payment.payment_date,
                        amount_received=payment.amount_received or (payment.amount - payment.tds_amount - payment.gst_tds_amount),
                        tds_amount=payment.tds_amount,
                        gst_tds_amount=payment.gst_tds_amount,
                        total_amount=payment.amount,
                        payment_method=payment.payment_method,
                        received_from=tax_invoice.client.name,
                        towards=f"Payment against invoice {tax_invoice.invoice_number}",
                        notes=payment.notes
                    )

                    # Mark proforma as paid
                    invoice.status = 'paid'
                    invoice.save()

                # Auto-send tax invoice and receipt email (outside transaction)
                try:
                    company_settings = CompanySettings.objects.get(organization=self.request.organization)
                    if tax_invoice.client.email:
                        send_receipt_email(receipt, tax_invoice, company_settings)
                except Exception as e:
                    print(f"Error sending tax invoice and receipt email: {str(e)}")
            else:
                # Already converted, just update status
                invoice.status = 'paid'
                invoice.save()
        elif invoice.invoice_type == 'tax':
            # Payment against Tax Invoice - Create Receipt but NO automatic email
            with transaction.atomic():
                # Generate Receipt Number
                invoice_settings = InvoiceSettings.objects.get(organization=self.request.organization)
                receipt_prefix = invoice_settings.receiptPrefix or 'RCPT-'

                # Get the last receipt number for this organization
                last_receipt = Receipt.objects.filter(
                    organization=self.request.organization
                ).order_by('-created_at').first()

                if last_receipt and last_receipt.receipt_number.startswith(receipt_prefix):
                    try:
                        last_number = int(last_receipt.receipt_number.replace(receipt_prefix, ''))
                        next_number = last_number + 1
                    except ValueError:
                        next_number = invoice_settings.receiptStartingNumber
                else:
                    next_number = invoice_settings.receiptStartingNumber

                receipt_number = f"{receipt_prefix}{next_number}"

                # Create Receipt for Tax Invoice payment with TDS details (Income Tax TDS + GST TDS)
                Receipt.objects.create(
                    organization=self.request.organization,
                    created_by=self.request.user,
                    payment=payment,
                    invoice=invoice,
                    receipt_number=receipt_number,
                    receipt_date=payment.payment_date,
                    amount_received=payment.amount_received or (payment.amount - payment.tds_amount - payment.gst_tds_amount),
                    tds_amount=payment.tds_amount,
                    gst_tds_amount=payment.gst_tds_amount,
                    total_amount=payment.amount,
                    payment_method=payment.payment_method,
                    received_from=invoice.client.name,
                    towards=f"Payment against invoice {invoice.invoice_number}",
                    notes=payment.notes
                )

                # Update invoice status
                if total_paid >= invoice.total_amount:
                    invoice.status = 'paid'
                elif total_paid > 0 and invoice.status == 'draft':
                    invoice.status = 'sent'
                invoice.save()

            # NO automatic email for Tax Invoice payments
            # User can manually download or email the receipt from the Receipts section
        else:
            # Update invoice status for other invoice types
            if total_paid >= invoice.total_amount:
                invoice.status = 'paid'
            elif total_paid > 0 and invoice.status == 'draft':
                invoice.status = 'sent'
            invoice.save()

    def perform_update(self, serializer):
        payment = serializer.save()

        # Update invoice status based on updated payment
        invoice = payment.invoice

        # Calculate total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Update invoice status
        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0 and total_paid < invoice.total_amount:
            if invoice.status == 'paid':
                invoice.status = 'sent'  # Downgrade from paid if payment was reduced

        invoice.save()

    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()

        # Recalculate invoice status after payment deletion
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'sent'
        else:
            invoice.status = 'draft'

        invoice.save()

        # If this is a tax invoice converted from proforma, also update the parent proforma status
        if invoice.parent_proforma:
            parent_proforma = invoice.parent_proforma
            # If no payments remain on the tax invoice, revert proforma status to 'sent'
            if total_paid == 0:
                parent_proforma.status = 'sent'
            elif total_paid >= parent_proforma.total_amount:
                parent_proforma.status = 'paid'
            else:
                parent_proforma.status = 'sent'
            parent_proforma.save()


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing receipts.
    Receipts are auto-generated and should not be manually created/edited.
    """
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Receipt.objects.filter(
            organization=self.request.organization
        ).select_related(
            'invoice', 'invoice__client', 'payment', 'organization', 'created_by'
        )

        # Filter by invoice if specified
        invoice_id = self.request.query_params.get('invoice', None)
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        # Filter by payment if specified
        payment_id = self.request.query_params.get('payment', None)
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)

        return queryset.order_by('-receipt_date', '-created_at')

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download receipt as PDF"""
        from .pdf_generator import generate_receipt_pdf

        receipt = self.get_object()
        company_settings = CompanySettings.objects.get(organization=request.organization)

        # Generate PDF
        pdf_data = generate_receipt_pdf(receipt, company_settings)

        # Return PDF response
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{receipt.receipt_number}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def resend_email(self, request, pk=None):
        """Resend receipt email to client"""
        receipt = self.get_object()

        try:
            company_settings = CompanySettings.objects.get(organization=request.organization)
            tax_invoice = receipt.invoice

            if not tax_invoice.client.email:
                return Response(
                    {'error': 'Client has no email address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = send_receipt_email(receipt, tax_invoice, company_settings)

            if success:
                return Response({'message': 'Receipt and invoice sent successfully'})
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics with subscription info"""
    from datetime import date, timedelta
    organization = request.organization

    # Check if user has an organization
    if not organization:
        return Response({
            'error': 'No organization found for user'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Total invoices (all types)
    total_invoices = Invoice.objects.filter(organization=organization).count()

    # Total revenue - Sum of all payments received
    revenue = Payment.objects.filter(organization=organization).aggregate(
        total=Sum('amount')
    )['total'] or 0

    # Calculate pending amount - invoices with unpaid balance
    all_invoices = Invoice.objects.filter(organization=organization).exclude(status='cancelled')
    pending = 0

    for invoice in all_invoices:
        # Get total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Calculate remaining balance
        balance = invoice.total_amount - total_paid
        if balance > 0:
            pending += balance

    # Total clients
    clients = Client.objects.filter(organization=organization).count()

    # Get subscription details
    subscription_info = None
    try:
        subscription = Subscription.objects.get(organization=organization)
        plan = subscription.plan

        # Calculate total days (from start to end)
        total_days = (subscription.end_date - subscription.start_date).days

        # Calculate days remaining
        days_remaining = subscription.days_remaining()

        # Calculate days elapsed
        days_elapsed = total_days - days_remaining

        # Count active users in organization
        current_users = OrganizationMembership.objects.filter(
            organization=organization,
            is_active=True
        ).count()

        # Get invoices this month for usage tracking
        current_month_start = date.today().replace(day=1)
        invoices_this_month = Invoice.objects.filter(
            organization=organization,
            invoice_date__gte=current_month_start
        ).count()

        subscription_info = {
            'plan_name': plan.name,
            'status': subscription.status,
            'is_active': subscription.is_active(),

            # Days information
            'total_days': total_days,
            'days_remaining': days_remaining,
            'days_elapsed': days_elapsed,
            'start_date': subscription.start_date.strftime('%Y-%m-%d'),
            'end_date': subscription.end_date.strftime('%Y-%m-%d'),

            # Users information
            'current_users': current_users,
            'max_users': plan.max_users,
            'users_remaining': max(0, plan.max_users - current_users),

            # Invoices information
            'invoices_this_month': invoices_this_month,
            'max_invoices_per_month': plan.max_invoices_per_month,
            'invoices_remaining': max(0, plan.max_invoices_per_month - invoices_this_month),

            # Storage information
            'max_storage_gb': plan.max_storage_gb,

            # Billing
            'next_billing_date': subscription.next_billing_date.strftime('%Y-%m-%d') if subscription.next_billing_date else None,
            'auto_renew': subscription.auto_renew,
        }
    except Subscription.DoesNotExist:
        # No subscription found
        subscription_info = None

    return Response({
        'totalInvoices': total_invoices,
        'revenue': float(revenue),
        'pending': float(pending),
        'clients': clients,
        'subscription': subscription_info
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_stats(request):
    """Get system-wide statistics for superadmin"""
    # Check if user is superadmin
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    from datetime import datetime, timedelta
    from django.db.models import Count, Sum, Avg, Q
    from django.db.models.functions import TruncMonth
    import platform
    import psutil
    from django.db import connection

    # Total organizations
    total_organizations = Organization.objects.filter(is_active=True).count()

    # Total users across all organizations
    total_users = User.objects.filter(is_active=True).count()

    # Active organizations (logged in within last 30 days)
    # Note: Removed invoice-based activity tracking as invoices are confidential
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    sixty_days_ago = datetime.now().date() - timedelta(days=60)

    # Count organizations with recent user activity instead of invoice activity
    active_orgs = Organization.objects.filter(
        is_active=True,
        memberships__user__last_login__gte=thirty_days_ago
    ).distinct().count()

    # Organizations by plan - use SubscriptionPlan model for accurate counts
    from .models import SubscriptionPlan, Subscription
    plan_breakdown = {}

    # Get counts from actual Subscription records (the proper way)
    subscription_plans = SubscriptionPlan.objects.filter(is_active=True)
    for plan in subscription_plans:
        # Count organizations with active subscriptions to this plan
        count = Subscription.objects.filter(
            plan=plan,
            status__in=['active', 'trial']
        ).count()
        plan_breakdown[plan.name.lower()] = count

    # Also include organizations without subscriptions (legacy 'free' plan)
    orgs_without_subscription = Organization.objects.filter(
        is_active=True
    ).exclude(
        subscription_detail__isnull=False
    ).count()
    if orgs_without_subscription > 0:
        plan_breakdown['free'] = plan_breakdown.get('free', 0) + orgs_without_subscription

    # Recent organizations (last 7 days)
    seven_days_ago = datetime.now().date() - timedelta(days=7)
    recent_orgs = Organization.objects.filter(
        created_at__gte=seven_days_ago
    ).count()

    # Subscription revenue trends (last 6 months) - only from subscription payments, not invoices
    six_months_ago = datetime.now().date() - timedelta(days=180)
    from .models import Subscription

    # Get subscription payments by month (not invoice payments - those are confidential)
    subscription_by_month = Subscription.objects.filter(
        last_payment_date__gte=six_months_ago,
        amount_paid__gt=0
    ).annotate(
        month=TruncMonth('last_payment_date')
    ).values('month').annotate(
        revenue=Sum('amount_paid'),
        count=Count('id')
    ).order_by('month')

    revenue_trends = []
    for item in subscription_by_month:
        # Get new user registrations for the month (public data)
        user_count = User.objects.filter(
            date_joined__year=item['month'].year,
            date_joined__month=item['month'].month
        ).count()

        # Get new organizations for the month (public data)
        org_count = Organization.objects.filter(
            created_at__year=item['month'].year,
            created_at__month=item['month'].month
        ).count()

        revenue_trends.append({
            'month': item['month'].strftime('%b'),
            'revenue': float(item['revenue'] or 0),  # Only subscription revenue, not invoice revenue
            'users': user_count,
            'organizations': org_count
        })

    # User statistics
    active_users = User.objects.filter(is_active=True).count()
    org_admins = OrganizationMembership.objects.filter(
        role__in=['admin', 'owner'],
        is_active=True
    ).values('user').distinct().count()
    superadmins = User.objects.filter(is_superuser=True, is_active=True).count()

    # Top organizations by subscription plan and user count (no invoice/revenue data)
    # Note: Removed invoice and revenue metrics as they are confidential tenant data
    top_orgs = Organization.objects.filter(
        is_active=True
    ).annotate(
        user_count=Count('memberships', filter=Q(memberships__is_active=True))
    ).order_by('-created_at')[:10]  # Show most recent organizations instead

    top_organizations = []
    for org in top_orgs:
        # Get plan from Subscription record if exists, otherwise use legacy field
        plan_name = org.plan  # Default to legacy field
        try:
            if hasattr(org, 'subscription_detail') and org.subscription_detail:
                plan_name = org.subscription_detail.plan.name.lower()
        except (Subscription.DoesNotExist, AttributeError):
            pass

        top_organizations.append({
            'id': str(org.id),
            'name': org.name,
            'slug': org.slug,
            'plan': plan_name,
            'user_count': org.user_count or 0,
            'created_at': org.created_at.isoformat() if org.created_at else None
        })

    # Monthly recurring revenue calculation (from subscriptions only, not invoices)
    from .models import Subscription
    total_subscription_revenue = Subscription.objects.filter(
        status='active',
        auto_renew=False
    ).aggregate(total=Sum('amount_paid'))['total'] or 0

    # Recent transactions (last 10)
    from .models import Subscription, CouponUsage
    recent_transactions = []

    # Get recent subscription payments
    recent_subscriptions = Subscription.objects.filter(
        amount_paid__gt=0
    ).select_related('organization', 'plan').order_by('-last_payment_date')[:10]

    for sub in recent_subscriptions:
        if sub.last_payment_date:
            recent_transactions.append({
                'id': str(sub.id),
                'organization': sub.organization.name,
                'plan': sub.plan.name if sub.plan else 'N/A',
                'amount': float(sub.amount_paid),
                'date': sub.last_payment_date.isoformat(),
                'status': 'completed',
                'type': 'subscription'
            })

    # Sort by date
    recent_transactions.sort(key=lambda x: x['date'], reverse=True)
    recent_transactions = recent_transactions[:10]

    # System information
    try:
        # Get database size
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_database_size(current_database());")
            db_size_bytes = cursor.fetchone()[0]
            db_size_gb = round(db_size_bytes / (1024 ** 3), 2)
    except:
        db_size_gb = 0

    # Get system uptime (using psutil)
    try:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime_delta = datetime.now() - boot_time
        uptime_days = uptime_delta.days
        uptime_hours = uptime_delta.seconds // 3600
        uptime_str = f"{uptime_days} days, {uptime_hours} hours"
    except:
        uptime_str = "Unknown"

    # Application version (from Django settings or hardcoded)
    from django.conf import settings
    import django
    app_version = getattr(settings, 'APP_VERSION', 'v1.0.0')
    environment = getattr(settings, 'ENVIRONMENT', 'Development' if settings.DEBUG else 'Production')

    system_info = {
        'appVersion': app_version,
        'databaseSize': f"{db_size_gb:.2f} GB",
        'serverUptime': uptime_str,
        'environment': environment,
        'pythonVersion': platform.python_version(),
        'djangoVersion': django.get_version()
    }

    # Feature flags - reflecting actual system capabilities
    feature_flags = {
        'organizationInvites': True,  # Users can invite members to organizations
        'apiAccess': True,  # REST API is enabled
        'trialPeriod': True,  # Free trial subscription plan exists
        'analyticsTracking': False,  # Google Analytics not integrated
        'emailNotifications': False,  # Email system not configured by default
        'autoBackup': False  # Automatic backups not configured
    }

    # Average processing/response time (simplified calculation)
    # In production, this should come from a monitoring service
    avg_processing_time = 0.8  # seconds (placeholder - would need actual monitoring)

    # Count paid subscriptions
    paid_subscriptions = Subscription.objects.filter(
        status='active',
        amount_paid__gt=0
    ).count()

    return Response({
        'totalOrganizations': total_organizations,
        'totalUsers': total_users,
        # Invoice data removed - confidential tenant information
        'activeOrganizations': active_orgs,
        'planBreakdown': plan_breakdown,
        'recentOrganizations': recent_orgs,
        'revenueTrends': revenue_trends,  # Subscription revenue only
        'activeUsers': active_users,
        'orgAdmins': org_admins,
        'superAdmins': superadmins,
        'topOrganizations': top_organizations,  # User count only, no invoice/revenue data
        'paidSubscriptions': paid_subscriptions,
        'monthlyRecurringRevenue': float(total_subscription_revenue),
        'recentTransactions': recent_transactions,  # Subscription payments only
        'systemInfo': system_info,
        'featureFlags': feature_flags,
        'avgProcessingTime': avg_processing_time
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_invoices(request):
    """
    Import invoices from Excel or JSON file
    Supports custom Excel template and GST Portal exports
    """
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = request.FILES['file']
    file_extension = os.path.splitext(uploaded_file.name)[1].lower()

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
        for chunk in uploaded_file.chunks():
            tmp_file.write(chunk)
        tmp_file_path = tmp_file.name

    try:
        importer = InvoiceImporter(
            organization=request.organization,
            created_by=request.user
        )

        if file_extension in ['.xlsx', '.xls']:
            result = importer.import_from_excel(tmp_file_path)
        elif file_extension == '.json':
            result = importer.import_from_gst_json(tmp_file_path)
        else:
            return Response(
                {'error': 'Unsupported file format. Please upload .xlsx, .xls, or .json file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clean up temp file
        os.unlink(tmp_file_path)

        if result.get('success'):
            return Response({
                'message': 'Import completed',
                'success_count': result.get('success_count', 0),
                'failed_count': result.get('failed_count', 0),
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', []),
                'created_clients': result.get('created_clients', []),
                'created_services': result.get('created_services', [])
            })
        else:
            return Response(
                {
                    'error': result.get('error', 'Import failed'),
                    'errors': result.get('errors', []),
                    'warnings': result.get('warnings', [])
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_import_template(request):
    """
    Download Excel template for invoice import
    """
    try:
        # Generate template
        df = generate_excel_template()

        # Create HTTP response with Excel file
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="invoice_import_template.xlsx"'

        # Write to response
        df.to_excel(response, index=False, engine='openpyxl')

        return response

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    """
    Export organization data (invoices, clients, payments) to Excel or CSV
    """
    import pandas as pd
    from io import BytesIO

    export_format = request.GET.get('format', 'excel')  # excel or csv
    data_type = request.GET.get('type', 'all')  # all, invoices, clients, payments

    organization = request.organization

    try:
        # Prepare data based on type
        if data_type in ['all', 'invoices']:
            invoices = Invoice.objects.filter(organization=organization).select_related('client')
            invoices_data = []
            for inv in invoices:
                invoices_data.append({
                    'Invoice Number': inv.invoice_number,
                    'Type': inv.invoice_type.upper(),
                    'Client': inv.client.name if inv.client else '',
                    'Invoice Date': inv.invoice_date.strftime('%d/%m/%Y') if inv.invoice_date else '',
                    'Due Date': inv.due_date.strftime('%d/%m/%Y') if inv.due_date else '',
                    'Subtotal': float(inv.subtotal or 0),
                    'Tax Amount': float(inv.tax_amount or 0),
                    'Total Amount': float(inv.total_amount or 0),
                    'Status': inv.status.upper(),
                    'Created': inv.created_at.strftime('%d/%m/%Y %H:%M') if inv.created_at else ''
                })
            df_invoices = pd.DataFrame(invoices_data)

        if data_type in ['all', 'clients']:
            clients = Client.objects.filter(organization=organization)
            clients_data = []
            for client in clients:
                clients_data.append({
                    'Name': client.name,
                    'Email': client.email or '',
                    'Phone': client.phone or '',
                    'GSTIN': client.gstin or '',
                    'PAN': client.pan or '',
                    'Address': client.address or '',
                    'City': client.city or '',
                    'State': client.state or '',
                    'PIN Code': client.pin_code or '',
                    'Created': client.created_at.strftime('%d/%m/%Y') if client.created_at else ''
                })
            df_clients = pd.DataFrame(clients_data)

        if data_type in ['all', 'payments']:
            payments = Payment.objects.filter(invoice__organization=organization).select_related('invoice', 'invoice__client')
            payments_data = []
            for payment in payments:
                payments_data.append({
                    'Payment ID': payment.id,
                    'Invoice Number': payment.invoice.invoice_number if payment.invoice else '',
                    'Client': payment.invoice.client.name if payment.invoice and payment.invoice.client else '',
                    'Payment Date': payment.payment_date.strftime('%d/%m/%Y') if payment.payment_date else '',
                    'Amount': float(payment.amount or 0),
                    'TDS Deducted': float(payment.tds_amount or 0),
                    'Amount Received': float(payment.amount_received or 0),
                    'Payment Method': payment.get_payment_method_display() if payment.payment_method else '',
                    'Reference': payment.reference_number or '',
                    'Notes': payment.notes or ''
                })
            df_payments = pd.DataFrame(payments_data)

        # Generate file based on format
        if export_format == 'csv':
            # For CSV, export only the requested type (or invoices if all)
            if data_type == 'invoices' or data_type == 'all':
                df = df_invoices
                filename = 'invoices_export.csv'
            elif data_type == 'clients':
                df = df_clients
                filename = 'clients_export.csv'
            elif data_type == 'payments':
                df = df_payments
                filename = 'payments_export.csv'

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            df.to_csv(response, index=False, encoding='utf-8-sig')
            return response

        else:  # Excel format
            output = BytesIO()

            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                if data_type in ['all', 'invoices']:
                    df_invoices.to_excel(writer, sheet_name='Invoices', index=False)
                if data_type in ['all', 'clients']:
                    df_clients.to_excel(writer, sheet_name='Clients', index=False)
                if data_type in ['all', 'payments']:
                    df_payments.to_excel(writer, sheet_name='Payments', index=False)

            output.seek(0)

            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="nexinvo_data_export.xlsx"'
            return response

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """Get or update user profile information"""
    user = request.user

    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'firstName': user.first_name,
            'lastName': user.last_name
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


# User Management ViewSet
class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    Only admin users can access this.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        """Pass organization to serializer context"""
        context = super().get_serializer_context()
        context['organization'] = getattr(self.request, 'organization', None)
        return context

    def get_queryset(self):
        # Superadmin can see all users with organization count
        if self.request.user.is_superuser:
            return User.objects.annotate(
                organization_count=Count('organization_memberships', filter=Q(organization_memberships__is_active=True))
            ).order_by('-date_joined')

        # Check if user is admin/owner of their organization
        try:
            membership = OrganizationMembership.objects.get(
                user=self.request.user,
                organization=self.request.organization,
                is_active=True
            )

            if membership.role in ['owner', 'admin']:
                # Tenant admins can see users in their organization
                org_user_ids = OrganizationMembership.objects.filter(
                    organization=self.request.organization,
                    is_active=True
                ).values_list('user_id', flat=True)
                return User.objects.filter(id__in=org_user_ids).annotate(
                    organization_count=Count('organization_memberships', filter=Q(organization_memberships__is_active=True))
                ).order_by('-date_joined')
        except OrganizationMembership.DoesNotExist:
            pass

        # Regular users can only see themselves
        return User.objects.filter(id=self.request.user.id).annotate(
            organization_count=Count('organization_memberships', filter=Q(organization_memberships__is_active=True))
        )
    
    def destroy(self, request, *args, **kwargs):
        """Prevent users from deleting themselves"""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Superadmin can delete any user
        if request.user.is_superuser:
            return super().destroy(request, *args, **kwargs)

        # Tenant admins can only delete users in their organization
        try:
            membership = OrganizationMembership.objects.get(
                user=request.user,
                organization=request.organization,
                is_active=True
            )

            if membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only organization owners and admins can delete users'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if the user being deleted is in the same organization
            user_membership = OrganizationMembership.objects.filter(
                user=user,
                organization=request.organization,
                is_active=True
            ).first()

            if not user_membership:
                return Response(
                    {'error': 'You can only delete users within your organization'},
                    status=status.HTTP_403_FORBIDDEN
                )

        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'Only organization owners and admins can delete users'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().destroy(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """Tenant admins can create users within their organization"""
        # Check if user is superadmin
        if request.user.is_superuser:
            # Superadmin can create users for any organization
            return super().create(request, *args, **kwargs)

        # Check if user is admin/owner of their organization
        try:
            membership = OrganizationMembership.objects.get(
                user=request.user,
                organization=request.organization,
                is_active=True
            )

            if membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only organization owners and admins can create users'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Proceed with user creation - the new user will be added to the same organization
            response = super().create(request, *args, **kwargs)

            # If user creation was successful, add them to the organization
            if response.status_code == 201:
                new_user = User.objects.get(id=response.data['id'])
                role = request.data.get('role', 'user')

                # Create organization membership for the new user
                OrganizationMembership.objects.create(
                    organization=request.organization,
                    user=new_user,
                    role=role,
                    is_active=True
                )

            return response

        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You must be a member of an organization to create users'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def update(self, request, *args, **kwargs):
        """Users can update themselves, tenant admins can update users in their organization"""
        user = self.get_object()

        # Users can always update themselves
        if user == request.user:
            return super().update(request, *args, **kwargs)

        # Superadmin can update any user
        if request.user.is_superuser:
            return super().update(request, *args, **kwargs)

        # Tenant admins can update users in their organization
        try:
            membership = OrganizationMembership.objects.get(
                user=request.user,
                organization=request.organization,
                is_active=True
            )

            if membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'You can only update your own profile'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if the user being updated is in the same organization
            user_membership = OrganizationMembership.objects.filter(
                user=user,
                organization=request.organization,
                is_active=True
            ).first()

            if not user_membership:
                return Response(
                    {'error': 'You can only update users within your organization'},
                    status=status.HTTP_403_FORBIDDEN
                )

        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You can only update your own profile'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def organizations(self, request, pk=None):
        """Get all organizations a user belongs to"""
        user = self.get_object()

        # Superadmin can view any user's organizations
        if not request.user.is_superuser and user != request.user:
            return Response(
                {'error': 'You can only view your own organizations'},
                status=status.HTTP_403_FORBIDDEN
            )

        memberships = OrganizationMembership.objects.filter(
            user=user,
            is_active=True
        ).select_related('organization')

        # Add subscription details to each organization
        org_data = []
        for membership in memberships:
            org = membership.organization

            # Get active subscription for this organization
            subscription = Subscription.objects.filter(
                organization=org,
                status__in=['active', 'trial']
            ).select_related('plan').first()

            org_data.append({
                'id': str(org.id),
                'name': org.name,
                'plan': org.plan,
                'role': membership.role,
                'is_active': org.is_active,
                'joined_at': membership.joined_at,
                'subscription': {
                    'plan_name': subscription.plan.name if subscription else 'No Plan',
                    'status': subscription.status if subscription else 'No Subscription',
                    'end_date': subscription.end_date if subscription else None
                } if subscription else None
            })

        return Response(org_data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Send password reset email to user"""
        # Only superadmin can trigger password reset for other users
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can reset passwords'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()

        # Check if email is configured
        from django.conf import settings

        if not getattr(settings, 'EMAIL_HOST', None):
            return Response(
                {'error': 'Email configuration is missing. Please configure email settings in the admin panel first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate password reset token (Django's built-in mechanism)
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail

        try:
            # Generate token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Create reset link (you'll need to configure this URL based on your frontend)
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

            # Send email
            subject = 'Password Reset Request'
            message = f"""
Hello {user.get_full_name() or user.username},

You have requested to reset your password. Please click the link below to reset your password:

{reset_link}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email.

Best regards,
NexInvo Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

            return Response({
                'message': f'Password reset email sent to {user.email}',
                'success': True
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to send password reset email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# SUBSCRIPTION & COUPON ViewSets
# ============================================================================

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for subscription plans.
    Only superadmins can create/edit/delete plans.
    Public endpoint available for viewing active plans.
    """
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Superadmins see all plans
        if self.request.user.is_authenticated and self.request.user.is_superuser:
            return SubscriptionPlan.objects.all()
        # Public/other users see only active and visible plans
        return SubscriptionPlan.objects.filter(is_active=True, is_visible=True)

    def get_permissions(self):
        # Allow public access to list and retrieve (for landing page)
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # Only authenticated users for other actions
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can create subscription plans'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can update subscription plans'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can delete subscription plans'},
                status=status.HTTP_403_FORBIDDEN
            )

        plan = self.get_object()

        # Check if there are active subscriptions linked to this plan
        active_subscriptions = plan.subscriptions.filter(status__in=['active', 'trial'])
        if active_subscriptions.exists():
            org_names = [sub.organization.name for sub in active_subscriptions[:5]]
            org_list = ', '.join(org_names)
            if active_subscriptions.count() > 5:
                org_list += f' and {active_subscriptions.count() - 5} more'
            return Response(
                {'error': f'Cannot delete plan "{plan.name}" because it has {active_subscriptions.count()} active subscription(s): {org_list}. Please reassign these organizations to a different plan first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for expired/cancelled subscriptions (less critical but still linked)
        inactive_subscriptions = plan.subscriptions.exclude(status__in=['active', 'trial'])
        if inactive_subscriptions.exists():
            # These can be reassigned or the user can force delete
            org_names = [sub.organization.name for sub in inactive_subscriptions[:5]]
            org_list = ', '.join(org_names)
            return Response(
                {'error': f'Cannot delete plan "{plan.name}" because {inactive_subscriptions.count()} organization(s) have subscription history with this plan: {org_list}. Please reassign these subscriptions to a different plan first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if there are pending upgrade requests for this plan (as target plan)
        if hasattr(plan, 'upgrade_to_requests') and plan.upgrade_to_requests.filter(status='pending').exists():
            return Response(
                {'error': f'Cannot delete plan "{plan.name}" because it has pending upgrade requests targeting this plan.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if this plan is referenced as current_plan in any upgrade request
        if hasattr(plan, 'upgrade_from_requests') and plan.upgrade_from_requests.filter(status='pending').exists():
            return Response(
                {'error': f'Cannot delete plan "{plan.name}" because it is referenced as the current plan in pending upgrade requests.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def public(self, request):
        """Get all active and visible plans for public viewing"""
        plans = SubscriptionPlan.objects.filter(is_active=True, is_visible=True).order_by('sort_order', 'price')
        serializer = self.get_serializer(plans, many=True)
        return Response(serializer.data)


class CouponViewSet(viewsets.ModelViewSet):
    """
    ViewSet for coupons.
    Only superadmins can create/edit/delete coupons.
    """
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Coupon.objects.all()
        # Non-superadmins can only view active coupons
        return Coupon.objects.filter(is_active=True)

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can create coupons'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can update coupons'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can delete coupons'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a coupon"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can deactivate coupons'},
                status=status.HTTP_403_FORBIDDEN
            )

        coupon = self.get_object()
        coupon.is_active = False
        coupon.save()
        return Response({'message': 'Coupon deactivated successfully'})

    @action(detail=False, methods=['post'])
    def validate(self, request):
        """
        Validate a coupon code.
        POST data: {"code": "WELCOME20", "plan_id": 2}
        """
        code = request.data.get('code', '').upper()
        plan_id = request.data.get('plan_id')

        if not code:
            return Response({'error': 'Coupon code is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid coupon code'}, status=status.HTTP_404_NOT_FOUND)

        # Check if coupon is valid
        is_valid, message = coupon.is_valid()
        if not is_valid:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        # Check if organization can redeem this coupon
        can_redeem, message = coupon.can_redeem(request.organization)
        if not can_redeem:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        # Check if coupon applies to the selected plan
        if plan_id:
            try:
                plan = SubscriptionPlan.objects.get(id=plan_id)
                if coupon.applicable_plans.exists() and plan not in coupon.applicable_plans.all():
                    return Response(
                        {'error': f'This coupon is not applicable to the {plan.name} plan'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Calculate discount
                discount_info = calculate_discount(coupon, plan)
                return Response({
                    'valid': True,
                    'coupon': CouponSerializer(coupon).data,
                    'discount': discount_info
                })
            except SubscriptionPlan.DoesNotExist:
                return Response({'error': 'Invalid plan ID'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'valid': True,
            'coupon': CouponSerializer(coupon).data
        })

    @action(detail=False, methods=['post'])
    def redeem(self, request):
        """
        Redeem a coupon.
        POST data: {"code": "WELCOME20", "plan_id": 2}
        """
        code = request.data.get('code', '').upper()
        plan_id = request.data.get('plan_id')

        if not code or not plan_id:
            return Response(
                {'error': 'Coupon code and plan ID are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            coupon = Coupon.objects.get(code__iexact=code)
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid coupon code'}, status=status.HTTP_404_NOT_FOUND)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Invalid plan ID'}, status=status.HTTP_404_NOT_FOUND)

        # Validate coupon
        is_valid, message = coupon.is_valid()
        if not is_valid:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        can_redeem, message = coupon.can_redeem(request.organization)
        if not can_redeem:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        # Check plan applicability
        if coupon.applicable_plans.exists() and plan not in coupon.applicable_plans.all():
            return Response(
                {'error': f'This coupon is not applicable to the {plan.name} plan'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate discount
        discount_info = calculate_discount(coupon, plan)

        # Create or update subscription with coupon
        with transaction.atomic():
            # Calculate subscription period
            start_date = date.today()
            if plan.billing_cycle == 'monthly':
                end_date = start_date + timedelta(days=30)
            else:  # yearly
                end_date = start_date + timedelta(days=365)

            # Add extended days if applicable
            if coupon.discount_type == 'extended_period':
                end_date = end_date + timedelta(days=int(coupon.discount_value))

            # Calculate trial end date
            trial_end_date = None
            if plan.trial_days > 0:
                trial_end_date = start_date + timedelta(days=plan.trial_days)

            # Create or update subscription
            subscription, created = Subscription.objects.update_or_create(
                organization=request.organization,
                defaults={
                    'plan': plan,
                    'start_date': start_date,
                    'end_date': end_date,
                    'trial_end_date': trial_end_date,
                    'status': 'trial' if plan.trial_days > 0 else 'active',
                    'amount_paid': discount_info['final_price'],
                    'coupon_applied': coupon,
                    'auto_renew': False,
                    'next_billing_date': end_date
                }
            )

            # Record coupon usage
            usage = CouponUsage.objects.create(
                coupon=coupon,
                organization=request.organization,
                user=request.user,
                subscription=subscription,
                discount_amount=discount_info['discount_amount'],
                extended_days=discount_info['extended_days']
            )

            # Increment coupon usage count
            coupon.current_usage_count += 1
            coupon.save()

            # Update organization plan
            request.organization.plan = plan.name.lower()
            request.organization.save()

        return Response({
            'message': 'Coupon redeemed successfully',
            'subscription': SubscriptionSerializer(subscription).data,
            'discount_applied': discount_info['discount_amount'],
            'extended_days': discount_info['extended_days']
        })


class CouponUsageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for coupon usage records.
    Read-only for all users.
    """
    serializer_class = CouponUsageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            # Superadmins see all usage records
            return CouponUsage.objects.all()
        # Organizations see only their own usage
        return CouponUsage.objects.filter(organization=self.request.organization)


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for subscriptions.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Subscription.objects.all()
        # Organizations see only their own subscription
        return Subscription.objects.filter(organization=self.request.organization)

    @action(detail=False, methods=['get'])
    def my_subscription(self, request):
        """Get current organization's subscription"""
        try:
            subscription = Subscription.objects.get(organization=request.organization)
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Subscribe to a plan"""
        plan_id = request.data.get('plan_id')
        coupon_code = request.data.get('coupon_code', '').upper()

        if not plan_id:
            return Response({'error': 'Plan ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Invalid plan'}, status=status.HTTP_404_NOT_FOUND)

        # Check if subscription already exists
        if Subscription.objects.filter(organization=request.organization).exists():
            return Response(
                {'error': 'Subscription already exists. Use upgrade endpoint to change plans.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        coupon = None
        discount_info = {'final_price': plan.price, 'discount_amount': 0, 'extended_days': 0}

        # Apply coupon if provided
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code__iexact=coupon_code)
                is_valid, message = coupon.is_valid()
                if not is_valid:
                    return Response({'error': f'Coupon error: {message}'}, status=status.HTTP_400_BAD_REQUEST)

                can_redeem, message = coupon.can_redeem(request.organization)
                if not can_redeem:
                    return Response({'error': f'Coupon error: {message}'}, status=status.HTTP_400_BAD_REQUEST)

                # Check plan applicability
                if coupon.applicable_plans.exists() and plan not in coupon.applicable_plans.all():
                    return Response(
                        {'error': f'This coupon is not applicable to the {plan.name} plan'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                discount_info = calculate_discount(coupon, plan)
            except Coupon.DoesNotExist:
                return Response({'error': 'Invalid coupon code'}, status=status.HTTP_404_NOT_FOUND)

        # Create subscription
        with transaction.atomic():
            start_date = date.today()
            if plan.billing_cycle == 'monthly':
                end_date = start_date + timedelta(days=30)
            else:
                end_date = start_date + timedelta(days=365)

            # Add extended days
            if discount_info['extended_days'] > 0:
                end_date = end_date + timedelta(days=discount_info['extended_days'])

            trial_end_date = None
            if plan.trial_days > 0:
                trial_end_date = start_date + timedelta(days=plan.trial_days)

            subscription = Subscription.objects.create(
                organization=request.organization,
                plan=plan,
                start_date=start_date,
                end_date=end_date,
                trial_end_date=trial_end_date,
                status='trial' if plan.trial_days > 0 else 'active',
                amount_paid=discount_info['final_price'],
                coupon_applied=coupon,
                auto_renew=False,
                next_billing_date=end_date
            )

            # Record coupon usage if coupon applied
            if coupon:
                CouponUsage.objects.create(
                    coupon=coupon,
                    organization=request.organization,
                    user=request.user,
                    subscription=subscription,
                    discount_amount=discount_info['discount_amount'],
                    extended_days=discount_info['extended_days']
                )
                coupon.current_usage_count += 1
                coupon.save()

            # Update organization plan
            request.organization.plan = plan.name.lower()
            request.organization.save()

        return Response({
            'message': 'Subscription created successfully',
            'subscription': SubscriptionSerializer(subscription).data
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription"""
        subscription = self.get_object()

        if subscription.organization != request.organization and not request.user.is_superuser:
            return Response(
                {'error': 'You can only cancel your own subscription'},
                status=status.HTTP_403_FORBIDDEN
            )

        subscription.status = 'cancelled'
        subscription.auto_renew = False
        subscription.save()

        return Response({'message': 'Subscription cancelled successfully'})


class SubscriptionUpgradeRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for subscription upgrade requests.
    Users can request upgrades, superadmins can approve/reject.
    """
    serializer_class = SubscriptionUpgradeRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            # Superadmins see all upgrade requests
            return SubscriptionUpgradeRequest.objects.all()
        # Organizations see only their own requests
        return SubscriptionUpgradeRequest.objects.filter(organization=self.request.organization)

    def create(self, request, *args, **kwargs):
        """Override create to handle auto-upgrade case with proper response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Store original perform_create result
        self.perform_create(serializer)

        # Check if auto-upgrade happened
        if hasattr(serializer, 'instance') and hasattr(serializer.instance, '_auto_upgraded') and serializer.instance._auto_upgraded:
            # Return success message indicating immediate upgrade
            return Response({
                'message': 'Your subscription has been upgraded immediately! No payment required.',
                'auto_upgraded': True,
                'upgrade_request': self.get_serializer(serializer.instance).data
            }, status=status.HTTP_201_CREATED)

        # Normal case - request created, awaiting payment confirmation
        headers = self.get_success_headers(serializer.data)
        return Response({
            'message': 'Upgrade request submitted successfully. Please complete the payment and wait for approval.',
            'auto_upgraded': False,
            'upgrade_request': serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """Create an upgrade request - auto-upgrade if no payment needed, or notify superadmin"""
        from .email_utils import send_upgrade_request_notification_to_superadmin
        from .models import SuperAdminNotification

        # Get current subscription
        current_subscription = None
        try:
            current_subscription = Subscription.objects.get(organization=self.request.organization)
            current_plan = current_subscription.plan
        except Subscription.DoesNotExist:
            current_plan = None

        # Get requested plan
        requested_plan = serializer.validated_data.get('requested_plan')

        # Calculate amount (with coupon if provided)
        amount = requested_plan.price
        coupon_code = serializer.validated_data.get('coupon_code', '')
        coupon_obj = None

        if coupon_code:
            try:
                coupon_obj = Coupon.objects.get(code__iexact=coupon_code)
                is_valid, message = coupon_obj.is_valid()
                if is_valid:
                    can_redeem, message = coupon_obj.can_redeem(self.request.organization)
                    if can_redeem:
                        # Check plan applicability
                        if not coupon_obj.applicable_plans.exists() or requested_plan in coupon_obj.applicable_plans.all():
                            discount_info = calculate_discount(coupon_obj, requested_plan)
                            amount = Decimal(str(discount_info['final_price']))
            except Coupon.DoesNotExist:
                coupon_obj = None

        # If amount is 0 (100% discount), auto-upgrade immediately
        if amount == 0:
            # Auto-approve the upgrade
            upgrade_request = serializer.save(
                organization=self.request.organization,
                requested_by=self.request.user,
                current_plan=current_plan,
                amount=amount,
                status='approved',
                approved_at=timezone.now()
            )

            # Update or create subscription
            with transaction.atomic():
                try:
                    subscription = Subscription.objects.get(organization=self.request.organization)
                    subscription.plan = requested_plan
                    subscription.status = 'active'
                    subscription.amount_paid = amount
                    subscription.last_payment_date = date.today()

                    start_date = date.today()
                    if requested_plan.billing_cycle == 'monthly':
                        subscription.end_date = start_date + timedelta(days=30)
                    else:
                        subscription.end_date = start_date + timedelta(days=365)

                    subscription.next_billing_date = subscription.end_date

                    if coupon_obj:
                        subscription.coupon_applied = coupon_obj
                        CouponUsage.objects.create(
                            coupon=coupon_obj,
                            organization=self.request.organization,
                            user=self.request.user,
                            subscription=subscription,
                            discount_amount=requested_plan.price - amount
                        )
                        coupon_obj.current_usage_count += 1
                        coupon_obj.save()

                    subscription.save()

                except Subscription.DoesNotExist:
                    start_date = date.today()
                    if requested_plan.billing_cycle == 'monthly':
                        end_date = start_date + timedelta(days=30)
                    else:
                        end_date = start_date + timedelta(days=365)

                    subscription = Subscription.objects.create(
                        organization=self.request.organization,
                        plan=requested_plan,
                        start_date=start_date,
                        end_date=end_date,
                        status='active',
                        amount_paid=amount,
                        coupon_applied=coupon_obj,
                        auto_renew=False,
                        next_billing_date=end_date,
                        last_payment_date=date.today()
                    )

                    if coupon_obj:
                        CouponUsage.objects.create(
                            coupon=coupon_obj,
                            organization=self.request.organization,
                            user=self.request.user,
                            subscription=subscription,
                            discount_amount=requested_plan.price - amount
                        )
                        coupon_obj.current_usage_count += 1
                        coupon_obj.save()

                # Update organization plan
                self.request.organization.plan = requested_plan.name.lower()
                self.request.organization.save()

            # Set a flag to indicate auto-upgrade happened
            upgrade_request._auto_upgraded = True
            return

        # Payment required - save as pending and notify superadmin
        upgrade_request = serializer.save(
            organization=self.request.organization,
            requested_by=self.request.user,
            current_plan=current_plan,
            amount=amount,
            status='pending'
        )

        # Create in-app notification for superadmin
        SuperAdminNotification.objects.create(
            notification_type='upgrade_request',
            title=f'Subscription Upgrade Request - {self.request.organization.name}',
            message=f'{self.request.user.get_full_name() or self.request.user.username} from {self.request.organization.name} '
                    f'has requested to upgrade to {requested_plan.name} plan. '
                    f'Amount to be paid: ₹{amount:.2f}. Please verify payment and approve.',
            organization=self.request.organization,
            user=self.request.user,
            related_object_type='upgrade_request',
            related_object_id=upgrade_request.id,
            action_url=f'/superadmin/upgrade-requests/{upgrade_request.id}'
        )

        # Send email notification to superadmin
        send_upgrade_request_notification_to_superadmin(upgrade_request)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        Approve an upgrade request and update the subscription.
        Only superadmins can approve.
        """
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can approve upgrade requests'},
                status=status.HTTP_403_FORBIDDEN
            )

        upgrade_request = self.get_object()

        if upgrade_request.status != 'pending':
            return Response(
                {'error': f'Request is already {upgrade_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update upgrade request
        admin_notes = request.data.get('admin_notes', '')
        payment_reference = request.data.get('payment_reference', '')

        upgrade_request.status = 'approved'
        upgrade_request.approved_by = request.user
        upgrade_request.approved_at = timezone.now()
        upgrade_request.admin_notes = admin_notes

        if payment_reference:
            upgrade_request.payment_reference = payment_reference

        upgrade_request.save()

        # Update or create subscription
        with transaction.atomic():
            try:
                subscription = Subscription.objects.get(organization=upgrade_request.organization)
                # Update existing subscription
                subscription.plan = upgrade_request.requested_plan
                subscription.status = 'active'
                subscription.amount_paid = upgrade_request.amount
                subscription.last_payment_date = date.today()

                # Extend the subscription period
                start_date = date.today()
                if upgrade_request.requested_plan.billing_cycle == 'monthly':
                    subscription.end_date = start_date + timedelta(days=30)
                else:
                    subscription.end_date = start_date + timedelta(days=365)

                subscription.next_billing_date = subscription.end_date

                # Apply coupon if provided
                if upgrade_request.coupon_code:
                    try:
                        coupon = Coupon.objects.get(code__iexact=upgrade_request.coupon_code)
                        subscription.coupon_applied = coupon

                        # Record coupon usage
                        CouponUsage.objects.create(
                            coupon=coupon,
                            organization=upgrade_request.organization,
                            subscription=subscription,
                            discount_applied=subscription.plan.price - upgrade_request.amount
                        )
                    except Coupon.DoesNotExist:
                        pass

                subscription.save()

            except Subscription.DoesNotExist:
                # Create new subscription
                start_date = date.today()
                if upgrade_request.requested_plan.billing_cycle == 'monthly':
                    end_date = start_date + timedelta(days=30)
                else:
                    end_date = start_date + timedelta(days=365)

                coupon_obj = None
                if upgrade_request.coupon_code:
                    try:
                        coupon_obj = Coupon.objects.get(code__iexact=upgrade_request.coupon_code)
                    except Coupon.DoesNotExist:
                        pass

                subscription = Subscription.objects.create(
                    organization=upgrade_request.organization,
                    plan=upgrade_request.requested_plan,
                    start_date=start_date,
                    end_date=end_date,
                    status='active',
                    amount_paid=upgrade_request.amount,
                    coupon_applied=coupon_obj,
                    auto_renew=False,
                    next_billing_date=end_date,
                    last_payment_date=date.today()
                )

                # Record coupon usage
                if coupon_obj:
                    CouponUsage.objects.create(
                        coupon=coupon_obj,
                        organization=upgrade_request.organization,
                        subscription=subscription,
                        discount_applied=subscription.plan.price - upgrade_request.amount
                    )

            # Update organization plan
            upgrade_request.organization.plan = upgrade_request.requested_plan.name.lower()
            upgrade_request.organization.save()

        return Response({
            'message': 'Upgrade request approved and subscription updated successfully',
            'subscription': SubscriptionSerializer(subscription).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        Reject an upgrade request.
        Only superadmins can reject.
        """
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can reject upgrade requests'},
                status=status.HTTP_403_FORBIDDEN
            )

        upgrade_request = self.get_object()

        if upgrade_request.status != 'pending':
            return Response(
                {'error': f'Request is already {upgrade_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update upgrade request
        admin_notes = request.data.get('admin_notes', 'Request rejected by admin')

        upgrade_request.status = 'rejected'
        upgrade_request.approved_by = request.user
        upgrade_request.approved_at = timezone.now()
        upgrade_request.admin_notes = admin_notes
        upgrade_request.save()

        return Response({
            'message': 'Upgrade request rejected',
            'upgrade_request': self.get_serializer(upgrade_request).data
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an upgrade request by the user who created it.
        """
        upgrade_request = self.get_object()

        # Only the requesting organization can cancel their own request
        if upgrade_request.organization != request.organization and not request.user.is_superuser:
            return Response(
                {'error': 'You can only cancel your own upgrade requests'},
                status=status.HTTP_403_FORBIDDEN
            )

        if upgrade_request.status != 'pending':
            return Response(
                {'error': f'Cannot cancel a request that is already {upgrade_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        upgrade_request.status = 'cancelled'
        upgrade_request.save()

        return Response({
            'message': 'Upgrade request cancelled successfully'
        })


# Helper function
def calculate_discount(coupon, plan):
    """Calculate discount for a coupon and plan"""
    discount_amount = Decimal('0.00')
    extended_days = 0
    final_price = plan.price

    if coupon.discount_type == 'percentage':
        discount_amount = (plan.price * coupon.discount_value) / Decimal('100')
        final_price = max(Decimal('0.00'), plan.price - discount_amount)

    elif coupon.discount_type == 'fixed':
        discount_amount = min(coupon.discount_value, plan.price)
        final_price = max(Decimal('0.00'), plan.price - discount_amount)

    elif coupon.discount_type == 'extended_period':
        extended_days = int(coupon.discount_value)
        final_price = plan.price

    return {
        'final_price': float(final_price),
        'discount_amount': float(discount_amount),
        'extended_days': extended_days,
        'original_price': float(plan.price)
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def superadmin_email_config_view(request):
    """Get or update system-level email settings for superadmin"""
    # Check if user is superadmin
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        # Get or create system email settings with defaults
        settings, created = SystemEmailSettings.objects.get_or_create(
            id=1,  # Singleton pattern - only one system email settings record
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'smtp_username': '',
                'smtp_password': '',
                'from_email': '',
                'use_tls': True
            }
        )
        serializer = SystemEmailSettingsSerializer(settings)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Get or create the singleton settings record
        settings, created = SystemEmailSettings.objects.get_or_create(
            id=1,
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'use_tls': True
            }
        )

        # Map frontend field names to backend field names
        data = {
            'smtp_host': request.data.get('host', settings.smtp_host),
            'smtp_port': request.data.get('port', settings.smtp_port),
            'smtp_username': request.data.get('username', settings.smtp_username),
            'smtp_password': request.data.get('password', settings.smtp_password),
            'from_email': request.data.get('from_email', settings.from_email),
            'use_tls': request.data.get('use_tls', settings.use_tls)
        }

        serializer = SystemEmailSettingsSerializer(settings, data=data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_test_email_view(request):
    """Send a test email using the system email settings"""
    # Check if user is superadmin
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    recipient_email = request.data.get('recipient_email', request.user.email)

    if not recipient_email:
        return Response(
            {'error': 'Recipient email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Get system email settings
        system_settings = SystemEmailSettings.objects.first()

        if not system_settings or not system_settings.smtp_host or not system_settings.smtp_username:
            return Response(
                {'error': 'Email settings not configured. Please save email configuration first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create email connection with system settings
        from django.core.mail import get_connection, send_mail

        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=system_settings.smtp_host,
            port=system_settings.smtp_port,
            username=system_settings.smtp_username,
            password=system_settings.smtp_password,
            use_tls=system_settings.use_tls,
            fail_silently=False,
        )

        from_email = system_settings.from_email or system_settings.smtp_username

        # Send test email
        subject = 'NexInvo - Test Email'
        plain_message = '''
This is a test email from NexInvo.

If you received this email, your email configuration is working correctly.

SMTP Host: {smtp_host}
SMTP Port: {smtp_port}
From Email: {from_email}

Best regards,
NexInvo System
        '''.format(
            smtp_host=system_settings.smtp_host,
            smtp_port=system_settings.smtp_port,
            from_email=from_email
        )

        html_message = '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">NexInvo</h1>
            <p style="color: rgba(255,255,255,0.9); text-align: center; margin: 10px 0 0 0;">Test Email</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #065f46; margin-top: 0;">Email Configuration Successful!</h2>
            <p>If you received this email, your email configuration is working correctly.</p>

            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <h3 style="margin-top: 0; color: #374151;">Configuration Details:</h3>
                <p style="margin: 5px 0;"><strong>SMTP Host:</strong> {smtp_host}</p>
                <p style="margin: 5px 0;"><strong>SMTP Port:</strong> {smtp_port}</p>
                <p style="margin: 5px 0;"><strong>From Email:</strong> {from_email}</p>
                <p style="margin: 5px 0;"><strong>TLS:</strong> {use_tls}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">This is an automated test email from NexInvo system.</p>
        </div>
    </div>
</body>
</html>
        '''.format(
            smtp_host=system_settings.smtp_host,
            smtp_port=system_settings.smtp_port,
            from_email=from_email,
            use_tls='Enabled' if system_settings.use_tls else 'Disabled'
        )

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
            connection=connection,
        )

        return Response({
            'message': f'Test email sent successfully to {recipient_email}',
            'recipient': recipient_email
        })

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Test email failed: {str(e)}")
        return Response(
            {'error': f'Failed to send test email: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# SuperAdmin Notifications API
# =====================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_notifications_list(request):
    """
    Get list of notifications for superadmin.
    Supports filtering by is_read status.
    """
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    from .serializers import SuperAdminNotificationSerializer

    # Get filter parameters
    is_read = request.query_params.get('is_read', None)
    notification_type = request.query_params.get('type', None)
    limit = request.query_params.get('limit', 50)

    try:
        limit = int(limit)
    except ValueError:
        limit = 50

    queryset = SuperAdminNotification.objects.all()

    if is_read is not None:
        queryset = queryset.filter(is_read=is_read.lower() == 'true')

    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)

    notifications = queryset[:limit]
    serializer = SuperAdminNotificationSerializer(notifications, many=True)

    # Also get unread count
    unread_count = SuperAdminNotification.objects.filter(is_read=False).count()

    return Response({
        'notifications': serializer.data,
        'unread_count': unread_count,
        'total_count': queryset.count()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_notifications_unread_count(request):
    """Get count of unread notifications for superadmin"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    unread_count = SuperAdminNotification.objects.filter(is_read=False).count()
    return Response({'unread_count': unread_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_notification_mark_read(request, notification_id):
    """Mark a specific notification as read"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        notification = SuperAdminNotification.objects.get(id=notification_id)
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.read_by = request.user
        notification.save()

        return Response({'message': 'Notification marked as read'})
    except SuperAdminNotification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_notifications_mark_all_read(request):
    """Mark all notifications as read"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    updated_count = SuperAdminNotification.objects.filter(is_read=False).update(
        is_read=True,
        read_at=timezone.now(),
        read_by=request.user
    )

    return Response({
        'message': f'{updated_count} notifications marked as read',
        'count': updated_count
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def superadmin_notification_delete(request, notification_id):
    """Delete a specific notification"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        notification = SuperAdminNotification.objects.get(id=notification_id)
        notification.delete()
        return Response({'message': 'Notification deleted'})
    except SuperAdminNotification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# =============================================================================
# SUPER ADMIN BULK EMAIL MANAGEMENT
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def superadmin_email_templates(request):
    """List all email templates or create a new one"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        templates = BulkEmailTemplate.objects.filter(is_active=True)
        data = [{
            'id': t.id,
            'name': t.name,
            'template_type': t.template_type,
            'template_type_display': t.get_template_type_display(),
            'subject': t.subject,
            'body': t.body,
            'available_placeholders': t.available_placeholders,
            'created_at': t.created_at,
        } for t in templates]
        return Response(data)

    elif request.method == 'POST':
        template = BulkEmailTemplate.objects.create(
            name=request.data.get('name', ''),
            template_type=request.data.get('template_type', 'announcement'),
            subject=request.data.get('subject', ''),
            body=request.data.get('body', ''),
            available_placeholders=request.data.get('available_placeholders', '{{user_name}}, {{organization_name}}, {{email}}'),
            created_by=request.user
        )
        return Response({
            'id': template.id,
            'name': template.name,
            'message': 'Template created successfully'
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def superadmin_email_template_detail(request, template_id):
    """Get, update or delete a specific email template"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        template = BulkEmailTemplate.objects.get(id=template_id)
    except BulkEmailTemplate.DoesNotExist:
        return Response(
            {'error': 'Template not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        return Response({
            'id': template.id,
            'name': template.name,
            'template_type': template.template_type,
            'template_type_display': template.get_template_type_display(),
            'subject': template.subject,
            'body': template.body,
            'available_placeholders': template.available_placeholders,
            'created_at': template.created_at,
            'updated_at': template.updated_at,
        })

    elif request.method == 'PUT':
        template.name = request.data.get('name', template.name)
        template.template_type = request.data.get('template_type', template.template_type)
        template.subject = request.data.get('subject', template.subject)
        template.body = request.data.get('body', template.body)
        template.available_placeholders = request.data.get('available_placeholders', template.available_placeholders)
        template.save()
        return Response({'message': 'Template updated successfully'})

    elif request.method == 'DELETE':
        template.is_active = False
        template.save()
        return Response({'message': 'Template deleted successfully'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def superadmin_email_campaigns(request):
    """List all email campaigns or create a new one"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        campaigns = BulkEmailCampaign.objects.all().order_by('-created_at')
        data = [{
            'id': c.id,
            'name': c.name,
            'subject': c.subject,
            'recipient_type': c.recipient_type,
            'recipient_type_display': c.get_recipient_type_display(),
            'status': c.status,
            'status_display': c.get_status_display(),
            'total_recipients': c.total_recipients,
            'sent_count': c.sent_count,
            'failed_count': c.failed_count,
            'created_at': c.created_at,
            'completed_at': c.completed_at,
        } for c in campaigns]
        return Response(data)

    elif request.method == 'POST':
        campaign = BulkEmailCampaign.objects.create(
            name=request.data.get('name', ''),
            subject=request.data.get('subject', ''),
            body=request.data.get('body', ''),
            recipient_type=request.data.get('recipient_type', 'all_users'),
            created_by=request.user
        )

        # If template_id is provided, copy from template
        template_id = request.data.get('template_id')
        if template_id:
            try:
                template = BulkEmailTemplate.objects.get(id=template_id)
                campaign.template = template
                campaign.subject = template.subject
                campaign.body = template.body
                campaign.save()
            except BulkEmailTemplate.DoesNotExist:
                pass

        return Response({
            'id': campaign.id,
            'name': campaign.name,
            'message': 'Campaign created successfully'
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def superadmin_email_campaign_detail(request, campaign_id):
    """Get, update or delete a specific email campaign"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        campaign = BulkEmailCampaign.objects.get(id=campaign_id)
    except BulkEmailCampaign.DoesNotExist:
        return Response(
            {'error': 'Campaign not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        recipients = campaign.recipients.all()[:100]  # Limit to first 100
        return Response({
            'id': campaign.id,
            'name': campaign.name,
            'subject': campaign.subject,
            'body': campaign.body,
            'recipient_type': campaign.recipient_type,
            'recipient_type_display': campaign.get_recipient_type_display(),
            'status': campaign.status,
            'status_display': campaign.get_status_display(),
            'total_recipients': campaign.total_recipients,
            'sent_count': campaign.sent_count,
            'failed_count': campaign.failed_count,
            'created_at': campaign.created_at,
            'started_at': campaign.started_at,
            'completed_at': campaign.completed_at,
            'error_message': campaign.error_message,
            'recipients': [{
                'email': r.email,
                'user_name': r.user_name,
                'status': r.status,
                'sent_at': r.sent_at,
                'error_message': r.error_message
            } for r in recipients]
        })

    elif request.method == 'PUT':
        if campaign.status not in ['draft', 'failed']:
            return Response(
                {'error': 'Cannot edit campaign that is already sending or completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        campaign.name = request.data.get('name', campaign.name)
        campaign.subject = request.data.get('subject', campaign.subject)
        campaign.body = request.data.get('body', campaign.body)
        campaign.recipient_type = request.data.get('recipient_type', campaign.recipient_type)
        campaign.save()
        return Response({'message': 'Campaign updated successfully'})

    elif request.method == 'DELETE':
        if campaign.status == 'sending':
            return Response(
                {'error': 'Cannot delete campaign that is currently sending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        campaign.delete()
        return Response({'message': 'Campaign deleted successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_email_preview_recipients(request):
    """Preview recipients based on selected recipient type"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    recipient_type = request.query_params.get('recipient_type', 'all_users')
    plan_id = request.query_params.get('plan_id')

    users = User.objects.filter(is_superuser=False)

    if recipient_type == 'all_users':
        # All non-superuser users
        pass
    elif recipient_type == 'all_admins':
        # Only organization owners and admins
        admin_user_ids = OrganizationMembership.objects.filter(
            role__in=['owner', 'admin'],
            is_active=True
        ).values_list('user_id', flat=True)
        users = users.filter(id__in=admin_user_ids)
    elif recipient_type == 'specific_plan':
        if plan_id:
            # Users whose organizations are on a specific plan
            org_ids = Subscription.objects.filter(
                plan_id=plan_id,
                status__in=['active', 'trial']
            ).values_list('organization_id', flat=True)
            user_ids = OrganizationMembership.objects.filter(
                organization_id__in=org_ids,
                is_active=True
            ).values_list('user_id', flat=True)
            users = users.filter(id__in=user_ids)
    elif recipient_type == 'active_users':
        users = users.filter(is_active=True)
    elif recipient_type == 'inactive_users':
        users = users.filter(is_active=False)

    # Get user details with organization info
    recipients = []
    for user in users[:100]:  # Limit preview to 100
        membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
        recipients.append({
            'id': user.id,
            'email': user.email,
            'name': user.get_full_name() or user.username,
            'organization': membership.organization.name if membership else 'N/A',
            'is_active': user.is_active
        })

    return Response({
        'total_count': users.count(),
        'preview': recipients,
        'showing': min(100, users.count())
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_email_send_campaign(request, campaign_id):
    """Send a bulk email campaign"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        campaign = BulkEmailCampaign.objects.get(id=campaign_id)
    except BulkEmailCampaign.DoesNotExist:
        return Response(
            {'error': 'Campaign not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if campaign.status not in ['draft', 'failed']:
        return Response(
            {'error': f'Campaign cannot be sent. Current status: {campaign.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get system email settings
    try:
        system_email = SystemEmailSettings.objects.first()
        if not system_email or not system_email.smtp_username:
            return Response(
                {'error': 'System email settings not configured. Please configure email settings first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except SystemEmailSettings.DoesNotExist:
        return Response(
            {'error': 'System email settings not configured'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get recipients based on recipient_type
    users = User.objects.filter(is_superuser=False)
    recipient_type = campaign.recipient_type

    if recipient_type == 'all_admins':
        admin_user_ids = OrganizationMembership.objects.filter(
            role__in=['owner', 'admin'],
            is_active=True
        ).values_list('user_id', flat=True)
        users = users.filter(id__in=admin_user_ids)
    elif recipient_type == 'specific_plan' and campaign.target_plan:
        org_ids = Subscription.objects.filter(
            plan=campaign.target_plan,
            status__in=['active', 'trial']
        ).values_list('organization_id', flat=True)
        user_ids = OrganizationMembership.objects.filter(
            organization_id__in=org_ids,
            is_active=True
        ).values_list('user_id', flat=True)
        users = users.filter(id__in=user_ids)
    elif recipient_type == 'active_users':
        users = users.filter(is_active=True)
    elif recipient_type == 'inactive_users':
        users = users.filter(is_active=False)

    # Clear existing recipients and add new ones
    campaign.recipients.all().delete()

    recipients_to_create = []
    for user in users:
        membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
        recipients_to_create.append(BulkEmailRecipient(
            campaign=campaign,
            user=user,
            organization=membership.organization if membership else None,
            email=user.email,
            user_name=user.get_full_name() or user.username,
            status='pending'
        ))

    BulkEmailRecipient.objects.bulk_create(recipients_to_create)

    # Update campaign status
    campaign.status = 'sending'
    campaign.total_recipients = len(recipients_to_create)
    campaign.started_at = timezone.now()
    campaign.save()

    # Send emails
    from django.core.mail import EmailMessage
    from django.conf import settings
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from .email_templates import get_base_email_template, format_paragraph, format_greeting, format_signature, format_divider

    sent_count = 0
    failed_count = 0
    error_messages = []

    for recipient in campaign.recipients.filter(status='pending'):
        try:
            # Replace placeholders in body
            body_content = campaign.body
            body_content = body_content.replace('{{user_name}}', recipient.user_name)
            body_content = body_content.replace('{{email}}', recipient.email)
            if recipient.organization:
                body_content = body_content.replace('{{organization_name}}', recipient.organization.name)
            else:
                body_content = body_content.replace('{{organization_name}}', 'N/A')

            # Build professional HTML email content with NexInvo branding
            email_content = format_greeting(recipient.user_name)
            email_content += format_paragraph(body_content, style="normal")
            email_content += format_divider()
            email_content += format_signature(
                name="NexInvo Team",
                company="NexInvo",
                email=system_email.from_email or system_email.smtp_username
            )

            # Wrap with NexInvo branded template
            branded_body = get_base_email_template(
                subject=campaign.subject,
                content=email_content,
                company_name="NexInvo",
                company_tagline="Invoice Management System",
            )

            # Send email using system email settings
            msg = MIMEMultipart('alternative')
            msg['Subject'] = campaign.subject
            msg['From'] = system_email.from_email or system_email.smtp_username
            msg['To'] = recipient.email

            # Add HTML content with NexInvo branding
            html_part = MIMEText(branded_body, 'html', 'utf-8')
            msg.attach(html_part)

            # Connect and send
            if system_email.use_tls:
                server = smtplib.SMTP(system_email.smtp_host, system_email.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(system_email.smtp_host, system_email.smtp_port)

            server.login(system_email.smtp_username, system_email.smtp_password)
            server.sendmail(msg['From'], [recipient.email], msg.as_string())
            server.quit()

            # Update recipient status
            recipient.status = 'sent'
            recipient.sent_at = timezone.now()
            recipient.save()
            sent_count += 1

        except Exception as e:
            recipient.status = 'failed'
            recipient.error_message = str(e)[:500]
            recipient.save()
            failed_count += 1
            error_messages.append(f"{recipient.email}: {str(e)[:100]}")

    # Update campaign status
    campaign.sent_count = sent_count
    campaign.failed_count = failed_count
    campaign.status = 'completed' if failed_count == 0 else 'completed'  # Still mark completed even with some failures
    campaign.completed_at = timezone.now()
    if error_messages:
        campaign.error_message = '\n'.join(error_messages[:10])  # Store first 10 errors
    campaign.save()

    return Response({
        'message': f'Campaign sent successfully',
        'total_recipients': campaign.total_recipients,
        'sent_count': sent_count,
        'failed_count': failed_count,
        'status': campaign.status
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_email_send_quick(request):
    """Send a quick email without creating a campaign"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    subject = request.data.get('subject', '')
    body = request.data.get('body', '')
    recipient_type = request.data.get('recipient_type', 'all_users')

    if not subject or not body:
        return Response(
            {'error': 'Subject and body are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create a campaign and send immediately
    campaign = BulkEmailCampaign.objects.create(
        name=f"Quick Email - {subject[:50]}",
        subject=subject,
        body=body,
        recipient_type=recipient_type,
        created_by=request.user
    )

    # Reuse the send campaign logic
    from django.test import RequestFactory
    factory = RequestFactory()
    fake_request = factory.post(f'/api/superadmin/bulk-email/campaigns/{campaign.id}/send/')
    fake_request.user = request.user

    return superadmin_email_send_campaign(fake_request, campaign.id)


# =============================================================================
# TALLY SYNC API ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_check_connection(request):
    """Check connection to Tally"""
    from .tally_sync import TallyConnector
    from .models import TallyMapping

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get Tally settings
    host = request.data.get('host', 'localhost')
    port = request.data.get('port', 9000)

    connector = TallyConnector(host=host, port=port)
    result = connector.check_connection()

    # Save connection info if successful
    if result['connected']:
        mapping, created = TallyMapping.objects.get_or_create(
            organization=org,
            defaults={
                'tally_host': host,
                'tally_port': port
            }
        )
        if not created:
            mapping.tally_host = host
            mapping.tally_port = port

        mapping.tally_company_name = result.get('company_name', '')
        mapping.tally_version = result.get('tally_version', '')
        mapping.save()

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_ledgers(request):
    """Get list of ledgers from Tally"""
    from .tally_sync import TallyConnector
    from .models import TallyMapping

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Try to get mapping for host/port, use defaults if not exists
    try:
        mapping = TallyMapping.objects.get(organization=org)
        host = mapping.tally_host
        port = mapping.tally_port
    except TallyMapping.DoesNotExist:
        # Use defaults - Tally typically runs on localhost:9000
        host = 'localhost'
        port = 9000

    connector = TallyConnector(host=host, port=port)
    ledgers = connector.get_ledgers()

    return Response({'ledgers': ledgers})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tally_mappings(request):
    """Get or save Tally ledger mappings"""
    from .models import TallyMapping

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        try:
            mapping = TallyMapping.objects.get(organization=org)
            return Response({
                'mappings': {
                    'salesLedger': mapping.sales_ledger,
                    'cgstLedger': mapping.cgst_ledger,
                    'sgstLedger': mapping.sgst_ledger,
                    'igstLedger': mapping.igst_ledger,
                    'roundOffLedger': mapping.round_off_ledger,
                    'discountLedger': mapping.discount_ledger,
                    'defaultPartyGroup': mapping.default_party_group,
                }
            })
        except TallyMapping.DoesNotExist:
            return Response({'mappings': None})

    elif request.method == 'POST':
        data = request.data
        mapping, created = TallyMapping.objects.get_or_create(
            organization=org,
            defaults={
                'sales_ledger': data.get('salesLedger', 'Sales'),
                'cgst_ledger': data.get('cgstLedger', 'CGST'),
                'sgst_ledger': data.get('sgstLedger', 'SGST'),
                'igst_ledger': data.get('igstLedger', 'IGST'),
                'round_off_ledger': data.get('roundOffLedger', 'Round Off'),
                'discount_ledger': data.get('discountLedger', 'Discount Allowed'),
                'default_party_group': data.get('defaultPartyGroup', 'Sundry Debtors'),
            }
        )

        if not created:
            mapping.sales_ledger = data.get('salesLedger', mapping.sales_ledger)
            mapping.cgst_ledger = data.get('cgstLedger', mapping.cgst_ledger)
            mapping.sgst_ledger = data.get('sgstLedger', mapping.sgst_ledger)
            mapping.igst_ledger = data.get('igstLedger', mapping.igst_ledger)
            mapping.round_off_ledger = data.get('roundOffLedger', mapping.round_off_ledger)
            mapping.discount_ledger = data.get('discountLedger', mapping.discount_ledger)
            mapping.default_party_group = data.get('defaultPartyGroup', mapping.default_party_group)
            mapping.save()

        return Response({'success': True, 'message': 'Mappings saved successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_sync_invoices(request):
    """Sync invoices to Tally"""
    from .tally_sync import sync_invoices_to_tally
    from .models import TallyMapping

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
        mapping = TallyMapping.objects.get(organization=org)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except TallyMapping.DoesNotExist:
        return Response(
            {'error': 'Please configure Tally mappings first'},
            status=status.HTTP_400_BAD_REQUEST
        )

    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')

    if not start_date or not end_date:
        return Response(
            {'error': 'Start date and end date are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Convert string dates to date objects
    try:
        from datetime import datetime
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check for force_resync parameter (for re-syncing deleted vouchers from Tally)
    force_resync = request.data.get('force_resync', False)

    # Perform sync
    result = sync_invoices_to_tally(
        organization=org,
        user=request.user,
        start_date=start_date,
        end_date=end_date,
        mapping=mapping,
        force_resync=force_resync
    )

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_sync_history(request):
    """Get Tally sync history"""
    from .models import TallySyncHistory

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    history = TallySyncHistory.objects.filter(organization=org).order_by('-sync_started_at')[:50]

    history_data = []
    for record in history:
        history_data.append({
            'sync_date': record.sync_started_at.isoformat(),
            'start_date': record.start_date.strftime('%Y-%m-%d'),
            'end_date': record.end_date.strftime('%Y-%m-%d'),
            'invoices_synced': record.invoices_synced,
            'invoices_failed': record.invoices_failed,
            'total_amount': str(record.total_amount),
            'status': record.status,
            'user': record.user.username if record.user else 'Unknown',
        })

    return Response({'history': history_data})


# =============================================================================
# SCHEDULED INVOICE VIEWS
# =============================================================================

class ScheduledInvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing scheduled/recurring invoices.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organization = getattr(self.request, 'organization', None)
        if organization:
            return ScheduledInvoice.objects.filter(organization=organization).select_related(
                'client', 'payment_term', 'created_by'
            ).prefetch_related('items')
        return ScheduledInvoice.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return ScheduledInvoiceListSerializer
        return ScheduledInvoiceSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a scheduled invoice"""
        scheduled_invoice = self.get_object()
        if scheduled_invoice.status == 'active':
            scheduled_invoice.status = 'paused'
            scheduled_invoice.save()
            return Response({'status': 'paused', 'message': 'Scheduled invoice paused successfully'})
        return Response(
            {'error': 'Can only pause active scheduled invoices'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused scheduled invoice"""
        scheduled_invoice = self.get_object()
        if scheduled_invoice.status == 'paused':
            scheduled_invoice.status = 'active'
            # Recalculate next generation date
            scheduled_invoice.next_generation_date = scheduled_invoice.calculate_next_generation_date()
            scheduled_invoice.save()
            return Response({'status': 'active', 'message': 'Scheduled invoice resumed successfully'})
        return Response(
            {'error': 'Can only resume paused scheduled invoices'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a scheduled invoice"""
        scheduled_invoice = self.get_object()
        if scheduled_invoice.status in ['active', 'paused']:
            scheduled_invoice.status = 'cancelled'
            scheduled_invoice.next_generation_date = None
            scheduled_invoice.save()
            return Response({'status': 'cancelled', 'message': 'Scheduled invoice cancelled successfully'})
        return Response(
            {'error': 'Cannot cancel this scheduled invoice'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get generation logs for a scheduled invoice"""
        scheduled_invoice = self.get_object()
        logs = scheduled_invoice.generation_logs.all().order_by('-created_at')[:50]
        serializer = ScheduledInvoiceLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def generate_now(self, request, pk=None):
        """Manually generate an invoice from this scheduled invoice"""
        scheduled_invoice = self.get_object()

        if scheduled_invoice.status not in ['active', 'paused']:
            return Response(
                {'error': 'Cannot generate invoice from cancelled or completed schedule'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Import the generation function
            from .scheduled_invoice_generator import generate_invoice_from_schedule

            invoice, email_sent = generate_invoice_from_schedule(scheduled_invoice, manual=True)

            return Response({
                'success': True,
                'message': 'Invoice generated successfully',
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'email_sent': email_sent
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scheduled_invoice_stats(request):
    """Get statistics for scheduled invoices"""
    organization = getattr(request, 'organization', None)
    if not organization:
        return Response({'error': 'Organization not found'}, status=status.HTTP_400_BAD_REQUEST)

    scheduled_invoices = ScheduledInvoice.objects.filter(organization=organization)

    stats = {
        'total': scheduled_invoices.count(),
        'active': scheduled_invoices.filter(status='active').count(),
        'paused': scheduled_invoices.filter(status='paused').count(),
        'completed': scheduled_invoices.filter(status='completed').count(),
        'cancelled': scheduled_invoices.filter(status='cancelled').count(),
        'total_generated': scheduled_invoices.aggregate(total=Sum('occurrences_generated'))['total'] or 0,
        'upcoming_this_week': scheduled_invoices.filter(
            status='active',
            next_generation_date__lte=date.today() + timedelta(days=7),
            next_generation_date__gte=date.today()
        ).count()
    }

    return Response(stats)


# =============================================================================
# EMAIL LOGS
# =============================================================================


def email_log_stats(request):
    """
    Get email log statistics for the dashboard.
    """
    user = request.user

    # Get email logs for the user's organization
    if user.is_superuser:
        email_logs = EmailLog.objects.all()
    elif hasattr(request, 'organization') and request.organization:
        email_logs = EmailLog.objects.filter(organization=request.organization)
    else:
        return Response({'error': 'No organization found'}, status=400)

    # Calculate stats
    total = email_logs.count()
    success = email_logs.filter(status='success').count()
    failed = email_logs.filter(status='failed').count()
    pending = email_logs.filter(status='pending').count()

    # Last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    last_30_days = email_logs.filter(created_at__gte=thirty_days_ago).count()

    # By email type
    by_type = {}
    for email_type, label in EmailLog.EMAIL_TYPE_CHOICES:
        count = email_logs.filter(email_type=email_type).count()
        if count > 0:
            by_type[email_type] = {'label': label, 'count': count}

    stats = {
        'total': total,
        'success': success,
        'failed': failed,
        'pending': pending,
        'success_rate': round((success / total * 100) if total > 0 else 0, 1),
        'last_30_days': last_30_days,
        'by_type': by_type
    }

    return Response(stats)

