from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.pagination import StandardPagination
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import logging

from .models import (
    SubscriptionPlan, Coupon, CouponUsage, Subscription,
    SubscriptionUpgradeRequest, SuperAdminNotification
)
from .serializers import (
    SubscriptionPlanSerializer, CouponSerializer, CouponUsageSerializer,
    SubscriptionSerializer, SubscriptionUpgradeRequestSerializer
)

logger = logging.getLogger(__name__)


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
            return Coupon.objects.select_related('created_by').prefetch_related('applicable_plans').all()
        # Non-superadmins can only view active coupons
        return Coupon.objects.select_related('created_by').prefetch_related('applicable_plans').filter(is_active=True)

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
            return CouponUsage.objects.select_related('coupon', 'organization', 'user').all()
        # Organizations see only their own usage
        return CouponUsage.objects.select_related('coupon', 'organization', 'user').filter(organization=self.request.organization)


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for subscriptions.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Subscription.objects.select_related('organization', 'plan', 'coupon_applied').all()
        # Organizations see only their own subscription
        return Subscription.objects.select_related('organization', 'plan', 'coupon_applied').filter(organization=self.request.organization)

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
    pagination_class = StandardPagination

    def get_queryset(self):
        if self.request.user.is_superuser:
            # Superadmins see all upgrade requests
            return SubscriptionUpgradeRequest.objects.select_related(
                'organization', 'requested_by', 'current_plan', 'requested_plan', 'approved_by'
            ).all()
        # Organizations see only their own requests
        return SubscriptionUpgradeRequest.objects.select_related(
            'organization', 'requested_by', 'current_plan', 'requested_plan', 'approved_by'
        ).filter(organization=self.request.organization)

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
                    f'Amount to be paid: \u20b9{amount:.2f}. Please verify payment and approve.',
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
