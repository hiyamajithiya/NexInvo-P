from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import ReadOnlyForViewer
from django.db.models import Q, Count
from django.db import transaction
from django.contrib.auth.models import User
from datetime import date, timedelta
import logging

from .models import (
    Organization, OrganizationMembership, CompanySettings,
    InvoiceSettings, EmailSettings, InvoiceFormatSettings,
    Subscription, SubscriptionPlan
)
from .serializers import (
    OrganizationSerializer, OrganizationMembershipSerializer
)

logger = logging.getLogger(__name__)


# ========== Organization Management ViewSets ==========

class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizations.
    Users can only see organizations they belong to.
    Superadmins can see all organizations.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        # Superadmins can see all organizations
        if self.request.user.is_superuser:
            return Organization.objects.select_related(
                'acquired_by', 'referred_by', 'acquisition_coupon'
            ).prefetch_related(
                'memberships__user'
            ).annotate(
                member_count=Count('memberships', filter=Q(memberships__is_active=True))
            ).order_by('-created_at')

        # Regular users can only see organizations they belong to
        return Organization.objects.select_related(
            'acquired_by', 'referred_by', 'acquisition_coupon'
        ).prefetch_related(
            'memberships__user'
        ).filter(
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

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get detailed organization information including owner and subscription"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can view full organization details'},
                status=status.HTTP_403_FORBIDDEN
            )

        organization = self.get_object()
        from .serializers import OrganizationDetailSerializer
        serializer = OrganizationDetailSerializer(organization)
        return Response(serializer.data)

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
                logger.error(f"Error syncing subscription: {e}")


    def destroy(self, request, *args, **kwargs):
        """
        Delete an organization.
        Only superadmins can delete organizations.
        Requires confirmation parameter to prevent accidental deletion.
        """
        organization = self.get_object()

        # Only superadmin can delete organizations
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can delete organizations'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Require confirmation parameter
        confirm = request.query_params.get('confirm', '').lower()
        if confirm != 'true':
            return Response(
                {
                    'error': 'Deletion requires confirmation',
                    'message': f'Are you sure you want to delete organization "{organization.name}"? This will permanently delete all associated data including invoices, clients, and user memberships.',
                    'confirm_url': f'/api/organizations/{organization.id}/?confirm=true',
                    'organization': {
                        'id': organization.id,
                        'name': organization.name
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        org_name = organization.name

        # Delete the organization (cascade will handle related data)
        organization.delete()

        return Response(
            {'message': f'Organization "{org_name}" has been permanently deleted'},
            status=status.HTTP_200_OK
        )
