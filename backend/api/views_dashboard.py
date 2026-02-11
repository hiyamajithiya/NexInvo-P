from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.db.models import Sum, F, DecimalField, Subquery, OuterRef
from django.db.models.functions import Coalesce
from datetime import date, timedelta
import logging

from .models import (
    Invoice, Payment, Client,
    OrganizationMembership, Subscription
)

logger = logging.getLogger(__name__)


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

    # Check cache first (60 second TTL, keyed by organization)
    cache_key = f'dashboard_stats_{organization.id}'
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    # Total invoices (all types)
    total_invoices = Invoice.objects.filter(organization=organization).count()

    # Total revenue - Sum of all payments received
    revenue = Payment.objects.filter(organization=organization).aggregate(
        total=Sum('amount')
    )['total'] or 0

    # Calculate pending amount - single query with annotation instead of N+1
    from django.db.models import Subquery, OuterRef, DecimalField
    from django.db.models.functions import Coalesce

    pending_result = Invoice.objects.filter(
        organization=organization
    ).exclude(
        status='cancelled'
    ).annotate(
        total_paid=Coalesce(
            Subquery(
                Payment.objects.filter(
                    invoice=OuterRef('pk')
                ).values('invoice').annotate(
                    total=Sum('amount')
                ).values('total'),
                output_field=DecimalField()
            ),
            0,
            output_field=DecimalField()
        )
    ).annotate(
        balance_due=F('total_amount') - F('total_paid')
    ).filter(
        balance_due__gt=0
    ).aggregate(
        total_pending=Sum('balance_due')
    )
    pending = pending_result['total_pending'] or 0

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

    data = {
        'totalInvoices': total_invoices,
        'revenue': float(revenue),
        'pending': float(pending),
        'clients': clients,
        'subscription': subscription_info
    }
    cache.set(cache_key, data, 60)  # Cache for 60 seconds
    return Response(data)
