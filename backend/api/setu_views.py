"""
Setu Connector API Views

These views handle sync requests that are forwarded to Setu desktop connectors
via WebSocket. They provide an alternative to direct Tally integration when
the web server cannot directly access the local Tally instance.
"""

import logging
from datetime import datetime
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Invoice, TallyMapping, TallySyncHistory

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_setu_connector(request):
    """
    Check if a Setu connector is online for the user's organization.
    """
    organization_id = request.headers.get('X-Organization-ID')

    if not organization_id:
        return Response({
            'error': 'Organization ID required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check cache for connector status
    connector_key = f"setu_connector_setu_{organization_id}_*"
    connectors = []

    # Get all connector keys for this organization
    # Note: This is a simplified approach. In production, use Redis SCAN
    for key in cache.keys(f"setu_connector_*"):
        if f"_{organization_id}_" in key:
            connector_info = cache.get(key)
            if connector_info:
                connectors.append({
                    'id': key.replace('setu_connector_', ''),
                    'connected_at': connector_info.get('connected_at'),
                    'tally_connected': connector_info.get('tally_connected', False),
                    'version': connector_info.get('version', 'unknown')
                })

    if connectors:
        return Response({
            'connected': True,
            'connectors': connectors,
            'message': f'{len(connectors)} Setu connector(s) online'
        })
    else:
        return Response({
            'connected': False,
            'connectors': [],
            'message': 'No Setu connector online. Please start the Setu desktop app.'
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_tally_connection_check(request):
    """
    Request Tally connection check via Setu connector.
    """
    organization_id = request.headers.get('X-Organization-ID')

    if not organization_id:
        return Response({
            'error': 'Organization ID required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        channel_layer = get_channel_layer()

        # Send check connection request to all connectors for this org
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{organization_id}",
            {
                'type': 'check_connection',
                'data': {
                    'request_id': f"conn_check_{datetime.now().timestamp()}"
                }
            }
        )

        return Response({
            'success': True,
            'message': 'Connection check request sent to Setu connector'
        })

    except Exception as e:
        logger.error(f"Error sending connection check: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_tally_ledgers(request):
    """
    Request ledgers list from Tally via Setu connector.
    """
    organization_id = request.headers.get('X-Organization-ID')

    if not organization_id:
        return Response({
            'error': 'Organization ID required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        channel_layer = get_channel_layer()

        # Send get ledgers request to connectors
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{organization_id}",
            {
                'type': 'get_ledgers',
                'data': {
                    'request_id': f"ledgers_{datetime.now().timestamp()}"
                }
            }
        )

        return Response({
            'success': True,
            'message': 'Ledgers request sent to Setu connector'
        })

    except Exception as e:
        logger.error(f"Error sending ledgers request: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_invoices_via_setu(request):
    """
    Sync invoices to Tally via Setu desktop connector.

    This endpoint prepares invoice data and sends it to the Setu connector
    via WebSocket for local Tally integration.
    """
    organization_id = request.headers.get('X-Organization-ID')

    if not organization_id:
        return Response({
            'error': 'Organization ID required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get request parameters
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    force_resync = request.data.get('force_resync', False)
    invoice_ids = request.data.get('invoice_ids', [])  # Optional: specific invoices

    if not start_date or not end_date:
        return Response({
            'error': 'start_date and end_date are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get mapping configuration
        try:
            mapping = TallyMapping.objects.get(organization_id=organization_id)
        except TallyMapping.DoesNotExist:
            return Response({
                'error': 'Tally mapping not configured. Please configure ledger mappings first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Build query for invoices
        invoices_query = Invoice.objects.filter(
            organization_id=organization_id,
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            invoice_type='tax'  # Only tax invoices
        ).select_related('client')

        if invoice_ids:
            invoices_query = invoices_query.filter(id__in=invoice_ids)

        if not force_resync:
            # Exclude already synced invoices
            invoices_query = invoices_query.filter(tally_sync__isnull=True)

        invoices = list(invoices_query)

        if not invoices:
            return Response({
                'success': True,
                'message': 'No invoices to sync',
                'total_count': 0
            })

        # Create sync history record
        sync_history = TallySyncHistory.objects.create(
            organization_id=organization_id,
            user=request.user,
            start_date=start_date,
            end_date=end_date,
            status='pending',
            invoices_synced=0,
            invoices_failed=0
        )

        # Prepare invoice data for Setu
        invoice_data = []
        for inv in invoices:
            invoice_data.append({
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date.isoformat(),
                'subtotal': str(inv.subtotal),
                'tax_amount': str(inv.tax_amount),
                'total_amount': str(inv.total_amount),
                'round_off': str(inv.round_off) if inv.round_off else '0',
                'notes': inv.notes or '',
                'client': {
                    'id': inv.client.id,
                    'name': inv.client.name,
                    'gstin': inv.client.gstin or '',
                    'state': inv.client.state or '',
                    'state_code': inv.client.gstin[:2] if inv.client.gstin else '',
                    'address': inv.client.address or '',
                    'city': inv.client.city or '',
                    'pinCode': inv.client.pin_code or ''
                }
            })

        # Prepare mapping data
        mapping_data = {
            'salesLedger': mapping.sales_ledger,
            'cgstLedger': mapping.cgst_ledger,
            'sgstLedger': mapping.sgst_ledger,
            'igstLedger': mapping.igst_ledger,
            'roundOffLedger': mapping.round_off_ledger or '',
            'discountLedger': mapping.discount_ledger or '',
            'defaultPartyGroup': mapping.default_party_group,
            'companyGstin': getattr(mapping.organization, 'gstin', '') if mapping.organization else ''
        }

        # Send sync request via WebSocket
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"setu_org_{organization_id}",
            {
                'type': 'sync_request',
                'data': {
                    'requestId': sync_history.id,
                    'invoices': invoice_data,
                    'mapping': mapping_data,
                    'forceResync': force_resync
                }
            }
        )

        return Response({
            'success': True,
            'message': f'Sync request sent for {len(invoices)} invoices',
            'sync_history_id': sync_history.id,
            'total_count': len(invoices)
        })

    except Exception as e:
        logger.error(f"Error initiating Setu sync: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_setu_sync_status(request, sync_id):
    """
    Get the status of a sync operation.
    """
    organization_id = request.headers.get('X-Organization-ID')

    try:
        sync_history = TallySyncHistory.objects.get(
            id=sync_id,
            organization_id=organization_id
        )

        return Response({
            'id': sync_history.id,
            'status': sync_history.status,
            'invoices_synced': sync_history.invoices_synced,
            'invoices_failed': sync_history.invoices_failed,
            'total_amount': str(sync_history.total_amount) if sync_history.total_amount else '0',
            'error_message': sync_history.error_message,
            'started_at': sync_history.sync_started_at.isoformat() if sync_history.sync_started_at else None,
            'completed_at': sync_history.sync_completed_at.isoformat() if sync_history.sync_completed_at else None
        })

    except TallySyncHistory.DoesNotExist:
        return Response({
            'error': 'Sync history not found'
        }, status=status.HTTP_404_NOT_FOUND)
