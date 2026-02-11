from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.contrib.auth.models import User
import logging

from .models import Organization, StaffProfile, Subscription
from .serializers import StaffProfileSerializer, StaffUserCreateSerializer

logger = logging.getLogger(__name__)


class StaffProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing staff profiles (Support Team and Sales Team).
    Only accessible by superadmins.
    """
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_superuser:
            return StaffProfile.objects.none()

        queryset = StaffProfile.objects.all().select_related('user', 'created_by')

        # Filter by staff_type if provided
        staff_type = self.request.query_params.get('staff_type')
        if staff_type:
            queryset = queryset.filter(staff_type=staff_type)

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can create staff users'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = StaffUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Check if user with email already exists
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'error': 'A user with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data.get('last_name', ''),
            is_staff=True  # Staff users get is_staff=True but not is_superuser
        )

        # Create staff profile
        staff_profile = StaffProfile.objects.create(
            user=user,
            staff_type=data['staff_type'],
            phone=data.get('phone', ''),
            department=data.get('department', ''),
            employee_id=data.get('employee_id', ''),
            created_by=request.user,
            # Set default permissions based on staff type
            can_view_all_organizations=True,
            can_view_subscriptions=True,
            can_manage_tickets=(data['staff_type'] == 'support'),
            can_view_revenue=(data['staff_type'] == 'sales'),
            can_manage_leads=(data['staff_type'] == 'sales'),
        )

        return Response(
            StaffProfileSerializer(staff_profile).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can update staff users'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can delete staff users'},
                status=status.HTTP_403_FORBIDDEN
            )

        staff_profile = self.get_object()
        user = staff_profile.user

        # Delete the staff profile and user
        staff_profile.delete()
        user.delete()

        return Response(
            {'message': 'Staff user deleted successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get staff statistics"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superadmins can view staff stats'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'total_support': StaffProfile.objects.filter(staff_type='support', is_active=True).count(),
            'total_sales': StaffProfile.objects.filter(staff_type='sales', is_active=True).count(),
            'total_staff': StaffProfile.objects.filter(is_active=True).count(),
        })

    @action(detail=False, methods=['get'])
    def sales_performance(self, request):
        """Get sales team performance metrics"""
        if not request.user.is_superuser:
            # If not superadmin, check if user is a sales staff and return only their data
            try:
                staff_profile = StaffProfile.objects.get(user=request.user, staff_type='sales')
                sales_users = [request.user]
            except StaffProfile.DoesNotExist:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            # Superadmin can see all sales performance
            sales_staff = StaffProfile.objects.filter(staff_type='sales', is_active=True).select_related('user')
            sales_users = [sp.user for sp in sales_staff]

        from django.db.models import Sum, Count
        from django.db.models.functions import TruncMonth

        performance_data = []
        for user in sales_users:
            acquired_orgs = Organization.objects.filter(acquired_by=user)

            # Get subscription revenue from acquired organizations
            total_revenue = Subscription.objects.filter(
                organization__in=acquired_orgs,
                status='active'
            ).aggregate(total=Sum('amount_paid'))['total'] or 0

            # Monthly breakdown
            monthly_data = acquired_orgs.annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                count=Count('id')
            ).order_by('-month')[:6]

            performance_data.append({
                'user_id': user.id,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'total_acquisitions': acquired_orgs.count(),
                'active_acquisitions': acquired_orgs.filter(is_active=True).count(),
                'total_revenue': float(total_revenue),
                'monthly_breakdown': list(monthly_data),
                'acquisition_by_source': {
                    'sales': acquired_orgs.filter(acquisition_source='sales').count(),
                    'referral': acquired_orgs.filter(acquisition_source='referral').count(),
                }
            })

        # Get overall stats
        overall_stats = {
            'total_sales_staff': len(sales_users),
            'total_acquisitions': Organization.objects.filter(acquisition_source='sales').count(),
            'acquisitions_by_source': {
                'organic': Organization.objects.filter(acquisition_source='organic').count(),
                'sales': Organization.objects.filter(acquisition_source='sales').count(),
                'advertisement': Organization.objects.filter(acquisition_source='advertisement').count(),
                'referral': Organization.objects.filter(acquisition_source='referral').count(),
                'partner': Organization.objects.filter(acquisition_source='partner').count(),
                'coupon': Organization.objects.filter(acquisition_source='coupon').count(),
                'other': Organization.objects.filter(acquisition_source='other').count(),
            }
        }

        return Response({
            'performance': performance_data,
            'overall_stats': overall_stats
        })

    @action(detail=False, methods=['get'])
    def my_performance(self, request):
        """Get current sales user's own performance (for sales dashboard)"""
        try:
            staff_profile = StaffProfile.objects.get(user=request.user, staff_type='sales')
        except StaffProfile.DoesNotExist:
            return Response(
                {'error': 'Only sales team members can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        from django.db.models import Sum
        user = request.user
        acquired_orgs = Organization.objects.filter(acquired_by=user)

        # Get subscription revenue
        total_revenue = Subscription.objects.filter(
            organization__in=acquired_orgs,
            status='active'
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        # Recent acquisitions
        recent_orgs = acquired_orgs.order_by('-created_at')[:10]

        return Response({
            'total_acquisitions': acquired_orgs.count(),
            'active_acquisitions': acquired_orgs.filter(is_active=True).count(),
            'total_revenue': float(total_revenue),
            'recent_acquisitions': [
                {
                    'id': str(org.id),
                    'name': org.name,
                    'plan': org.plan,
                    'created_at': org.created_at,
                    'is_active': org.is_active
                } for org in recent_orgs
            ]
        })
