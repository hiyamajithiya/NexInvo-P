# Subscription and Coupon ViewSets
# Add these to the end of views.py (after line 1545)

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from .models import SubscriptionPlan, Coupon, CouponUsage, Subscription
from .serializers import (
    SubscriptionPlanSerializer, CouponSerializer,
    CouponUsageSerializer, SubscriptionSerializer
)


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
