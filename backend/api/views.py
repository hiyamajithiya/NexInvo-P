from rest_framework import viewsets, status, serializers
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
from .models import (Organization, OrganizationMembership, CompanySettings, InvoiceSettings, Client, Invoice, InvoiceItem, Payment, Receipt, EmailSettings, InvoiceFormatSettings, ServiceItem, PaymentTerm, SubscriptionPlan, Coupon, CouponUsage, Subscription)
from .serializers import (
    OrganizationSerializer, OrganizationMembershipSerializer,
    CompanySettingsSerializer, InvoiceSettingsSerializer, ClientSerializer,
    InvoiceSerializer, PaymentSerializer, ReceiptSerializer, EmailSettingsSerializer, InvoiceFormatSettingsSerializer, ServiceItemSerializer, PaymentTermSerializer, UserSerializer,
    SubscriptionPlanSerializer, CouponSerializer, CouponUsageSerializer, SubscriptionSerializer
)
from .pdf_generator import generate_invoice_pdf
from .email_service import send_invoice_email, send_receipt_email
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


# User Registration View
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new user with email as username"""
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    company_name = request.data.get('company_name', '')

    # Validation
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
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
    """Get or update invoice format settings for the authenticated user"""
    if request.method == 'GET':
        # Get or create invoice format settings with defaults
        settings, created = InvoiceFormatSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'show_logo': True,
                'logo_position': 'left',
                'show_company_designation': True,
                'company_designation_text': 'CHARTERED ACCOUNTANT',
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
        """Only superadmin can create organizations"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmin can create organizations'},
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
                            'auto_renew': True,
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
        return Client.objects.filter(organization=self.request.organization)

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
        queryset = Invoice.objects.filter(organization=self.request.organization)

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
        return Payment.objects.filter(organization=self.request.organization)

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

                    # Create Receipt
                    receipt = Receipt.objects.create(
                        organization=self.request.organization,
                        created_by=self.request.user,
                        payment=payment,
                        invoice=tax_invoice,
                        receipt_number=receipt_number,
                        receipt_date=payment.payment_date,
                        amount_received=payment.amount,
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
        else:
            # Update invoice status for non-proforma or partially paid invoices
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


class ReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing receipts.
    Receipts are auto-generated and should not be manually created/edited.
    """
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Receipt.objects.filter(organization=self.request.organization)

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
    """Get dashboard statistics"""
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

    return Response({
        'totalInvoices': total_invoices,
        'revenue': float(revenue),
        'pending': float(pending),
        'clients': clients
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

    # Organizations by plan
    plan_breakdown = {}
    for plan_choice in Organization._meta.get_field('plan').choices:
        plan_code = plan_choice[0]
        count = Organization.objects.filter(plan=plan_code, is_active=True).count()
        plan_breakdown[plan_code] = count

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
        top_organizations.append({
            'id': str(org.id),
            'name': org.name,
            'slug': org.slug,
            'plan': org.plan,
            'user_count': org.user_count or 0,
            'created_at': org.created_at.isoformat() if org.created_at else None
        })

    # Monthly recurring revenue calculation (from subscriptions only, not invoices)
    from .models import Subscription
    total_subscription_revenue = Subscription.objects.filter(
        status='active',
        auto_renew=True
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
        if self.request.user.is_superuser:
            return SubscriptionPlan.objects.all()
        # Other users see only active and visible plans
        return SubscriptionPlan.objects.filter(is_active=True, is_visible=True)

    def get_permissions(self):
        # Only superadmins can create, update, delete
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()

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
                    'auto_renew': True,
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
                auto_renew=True,
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
