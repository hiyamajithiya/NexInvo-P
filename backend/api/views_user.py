from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.contrib.auth.models import User
import logging

from .models import OrganizationMembership, Subscription
from .serializers import UserSerializer

logger = logging.getLogger(__name__)


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
