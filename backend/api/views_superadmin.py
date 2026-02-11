from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import IsSuperAdmin
from django.core.cache import cache
from django.db.models import Sum, Q, Count
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
import logging

from .models import (
    Organization, OrganizationMembership, Subscription, SubscriptionPlan,
    CouponUsage, SuperAdminNotification, SystemEmailSettings,
    BulkEmailTemplate, BulkEmailCampaign, BulkEmailRecipient
)
from .serializers import SystemEmailSettingsSerializer

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def superadmin_stats(request):
    """Get system-wide statistics for superadmin"""
    # Check if user is superadmin
    if not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Superadmin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check cache first (60 second TTL, no org key - superadmin is system-wide)
    cache_key = 'superadmin_stats'
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

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

    data = {
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
    }
    cache.set(cache_key, data, 60)  # Cache for 60 seconds
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
        logger.error(f"Test email failed: {str(e)}")
        return Response(
            {'error': f'Failed to send test email: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# SuperAdmin Notifications API
# =====================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
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

    queryset = SuperAdminNotification.objects.select_related('organization', 'user').all()

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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
    campaign.status = 'completed'
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
@permission_classes([IsAuthenticated, IsSuperAdmin])
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
