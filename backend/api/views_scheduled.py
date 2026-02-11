from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import ReadOnlyForViewer
from django.db.models import Sum
from datetime import date, timedelta
import logging

from .models import ScheduledInvoice
from .serializers import (
    ScheduledInvoiceSerializer, ScheduledInvoiceListSerializer,
    ScheduledInvoiceLogSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# SCHEDULED INVOICE VIEWS
# =============================================================================

class ScheduledInvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing scheduled/recurring invoices.
    """
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

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
