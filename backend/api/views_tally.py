from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta, datetime
from decimal import Decimal
import logging

from .models import Organization

logger = logging.getLogger(__name__)


# =============================================================================
# TALLY SYNC API ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_check_connection(request):
    """Check connection to Tally"""
    from .tally_sync import TallyConnector
    from .models import TallyMapping
    import socket

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get Tally settings
    host = request.data.get('host', 'localhost')
    port = int(request.data.get('port', 9000))

    logger.info(f"Tally connection check: host={host}, port={port}")

    # First do a quick socket check to see if port is open
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        socket_result = sock.connect_ex((host, port))
        sock.close()

        if socket_result != 0:
            return Response({
                'connected': False,
                'message': f'Cannot reach Tally at {host}:{port}. Port is not open. Please ensure:\n1. Tally is running\n2. ODBC Server is enabled in Tally (F12 > Features > Enable ODBC Server)\n3. The port {port} is correct',
                'company_name': '',
                'tally_version': '',
                'debug_info': {
                    'host': host,
                    'port': port,
                    'socket_error_code': socket_result
                }
            })
    except socket.timeout:
        return Response({
            'connected': False,
            'message': f'Connection timeout to {host}:{port}. Tally server is not responding.',
            'company_name': '',
            'tally_version': ''
        })
    except Exception as sock_err:
        logger.error(f"Socket check error: {sock_err}")

    # Port is open, try Tally XML communication
    connector = TallyConnector(host=host, port=port)
    result = connector.check_connection()

    # Add debug info
    result['debug_info'] = {
        'host': host,
        'port': port,
        'url': f'http://{host}:{port}'
    }

    # Save connection info if successful
    if result['connected']:
        mapping, created = TallyMapping.objects.get_or_create(
            organization=org,
            defaults={
                'tally_host': host,
                'tally_port': port
            }
        )
        if not created:
            mapping.tally_host = host
            mapping.tally_port = port

        mapping.tally_company_name = result.get('company_name', '')
        mapping.tally_version = result.get('tally_version', '')
        mapping.save()

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_ledgers(request):
    """Get list of ledgers from Tally via Setu connector"""
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    from .models import OrganizationMembership
    import time
    import uuid

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if Setu connector is online
    connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
    connector_info = cache.get(connector_key)

    if not connector_info:
        return Response(
            {'error': 'Setu connector is offline. Please start the Setu desktop app.', 'ledgers': []},
            status=status.HTTP_200_OK
        )

    if not connector_info.get('tally_connected'):
        return Response(
            {'error': 'Tally is not connected. Please check Tally in the Setu app.', 'ledgers': []},
            status=status.HTTP_200_OK
        )

    # Generate unique request ID
    request_id = f"ledgers_{uuid.uuid4().hex[:8]}"
    cache_key = f"ledgers_response_{org_id}_{request_id}"

    # Clear any previous response
    cache.delete(cache_key)

    try:
        channel_layer = get_channel_layer()

        # Send get ledgers request to Setu connector
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'get_ledgers',
                'data': {
                    'request_id': request_id
                }
            }
        )

        # Wait for response (poll cache with timeout)
        timeout = 15  # seconds
        start_time = time.time()

        while time.time() - start_time < timeout:
            response_data = cache.get(cache_key)
            if response_data is not None:
                # Clean up cache
                cache.delete(cache_key)

                if response_data.get('error'):
                    return Response({
                        'error': response_data['error'],
                        'ledgers': []
                    })

                return Response({
                    'ledgers': response_data.get('ledgers', [])
                })

            time.sleep(0.3)  # Poll every 300ms

        # Timeout
        return Response({
            'error': 'Timeout waiting for Tally response. Please try again.',
            'ledgers': []
        })

    except Exception as e:
        logger.error(f"[tally_get_ledgers] Error: {e}")
        return Response({
            'error': f'Failed to request ledgers: {str(e)}',
            'ledgers': []
        })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tally_mappings(request):
    """Get or save Tally ledger mappings"""
    from .models import TallyMapping

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        try:
            mapping = TallyMapping.objects.get(organization=org)
            response_data = {
                'mappings': {
                    'salesLedger': mapping.sales_ledger,
                    'cgstLedger': mapping.cgst_ledger,
                    'sgstLedger': mapping.sgst_ledger,
                    'igstLedger': mapping.igst_ledger,
                    'roundOffLedger': mapping.round_off_ledger,
                    'discountLedger': mapping.discount_ledger,
                    'defaultPartyGroup': mapping.default_party_group,
                }
            }
            # Invoice Number Series Mapping (graceful fallback if migration not applied)
            try:
                response_data['mappings']['invoiceNumberMode'] = mapping.invoice_number_mode
                response_data['mappings']['tallyInvoicePrefix'] = mapping.tally_invoice_prefix
                response_data['mappings']['autoDetectSeries'] = mapping.auto_detect_series
                response_data['mappings']['detectedTallyPrefix'] = mapping.detected_tally_prefix
            except AttributeError:
                # Migration not applied yet - use defaults
                response_data['mappings']['invoiceNumberMode'] = 'keep'
                response_data['mappings']['tallyInvoicePrefix'] = ''
                response_data['mappings']['autoDetectSeries'] = True
                response_data['mappings']['detectedTallyPrefix'] = ''
            return Response(response_data)
        except TallyMapping.DoesNotExist:
            return Response({'mappings': None})

    elif request.method == 'POST':
        data = request.data

        # Base defaults for ledger mappings
        defaults = {
            'sales_ledger': data.get('salesLedger', 'Sales'),
            'cgst_ledger': data.get('cgstLedger', 'CGST'),
            'sgst_ledger': data.get('sgstLedger', 'SGST'),
            'igst_ledger': data.get('igstLedger', 'IGST'),
            'round_off_ledger': data.get('roundOffLedger', 'Round Off'),
            'discount_ledger': data.get('discountLedger', 'Discount Allowed'),
            'default_party_group': data.get('defaultPartyGroup', 'Sundry Debtors'),
        }

        # Try to add invoice series fields if migration is applied
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'api_tallymapping' AND column_name = 'invoice_number_mode'")
                has_invoice_series_fields = cursor.fetchone() is not None
        except Exception:
            has_invoice_series_fields = False

        if has_invoice_series_fields:
            defaults['invoice_number_mode'] = data.get('invoiceNumberMode', 'keep')
            defaults['tally_invoice_prefix'] = data.get('tallyInvoicePrefix', '')
            defaults['auto_detect_series'] = data.get('autoDetectSeries', True)

        mapping, created = TallyMapping.objects.get_or_create(
            organization=org,
            defaults=defaults
        )

        if not created:
            mapping.sales_ledger = data.get('salesLedger', mapping.sales_ledger)
            mapping.cgst_ledger = data.get('cgstLedger', mapping.cgst_ledger)
            mapping.sgst_ledger = data.get('sgstLedger', mapping.sgst_ledger)
            mapping.igst_ledger = data.get('igstLedger', mapping.igst_ledger)
            mapping.round_off_ledger = data.get('roundOffLedger', mapping.round_off_ledger)
            mapping.discount_ledger = data.get('discountLedger', mapping.discount_ledger)
            mapping.default_party_group = data.get('defaultPartyGroup', mapping.default_party_group)

            # Invoice Number Series Mapping (only if migration applied)
            if has_invoice_series_fields:
                if 'invoiceNumberMode' in data:
                    mapping.invoice_number_mode = data.get('invoiceNumberMode', mapping.invoice_number_mode)
                if 'tallyInvoicePrefix' in data:
                    mapping.tally_invoice_prefix = data.get('tallyInvoicePrefix', mapping.tally_invoice_prefix)
                if 'autoDetectSeries' in data:
                    mapping.auto_detect_series = data.get('autoDetectSeries', mapping.auto_detect_series)
            mapping.save()

        return Response({'success': True, 'message': 'Mappings saved successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_sync_invoices(request):
    """Sync invoices to Tally via Setu connector"""
    from .models import TallyMapping, TallySyncHistory, Invoice
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import uuid
    import time

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
        mapping = TallyMapping.objects.get(organization=org)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except TallyMapping.DoesNotExist:
        return Response(
            {'error': 'Please configure Tally mappings first'},
            status=status.HTTP_400_BAD_REQUEST
        )

    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')

    if not start_date or not end_date:
        return Response(
            {'error': 'Start date and end date are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check for force_resync parameter
    force_resync = request.data.get('force_resync', False)

    # Check if ANY Setu connector is online for this organization
    # Scan Redis for any connector key matching the org pattern
    import redis
    from django.conf import settings

    connector_info = None
    try:
        redis_url = getattr(settings, 'CACHES', {}).get('default', {}).get('LOCATION', 'redis://localhost:6379/1')
        if isinstance(redis_url, str):
            r = redis.from_url(redis_url)
        else:
            r = redis.Redis(host='localhost', port=6379, db=1)

        # Find all setu_connector keys for this organization
        pattern = f":1:setu_connector_setu_{org_id}_*"
        matching_keys = r.keys(pattern)

        for key in matching_keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            cache_key = key_str.replace(":1:", "", 1) if key_str.startswith(":1:") else key_str
            connector_info = cache.get(cache_key)
            if connector_info:
                break

        # Fallback to user-specific key
        if not connector_info:
            connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
            connector_info = cache.get(connector_key)

    except Exception as e:
        logger.error(f"[Tally Sync] Error scanning Redis: {e}")
        connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
        connector_info = cache.get(connector_key)

    if not connector_info:
        return Response(
            {'error': 'Setu connector is offline. Please start the Setu desktop app.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Verify the connection is still fresh by checking last_heartbeat
    from datetime import datetime, timedelta
    last_heartbeat = connector_info.get('last_heartbeat')
    is_fresh = False

    if last_heartbeat:
        try:
            heartbeat_time = datetime.fromisoformat(last_heartbeat)
            time_diff = datetime.now() - heartbeat_time
            is_fresh = time_diff < timedelta(minutes=2)
        except (ValueError, TypeError):
            is_fresh = False

    if not is_fresh:
        return Response(
            {'error': 'Setu connector connection is stale. Please check the Setu desktop app.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    if not connector_info.get('tally_connected'):
        return Response(
            {'error': 'Tally is not connected. Please check Tally connection in Setu app.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Get selected invoice IDs (if provided)
    selected_invoice_ids = request.data.get('invoice_ids', [])

    # Build query for invoices
    if selected_invoice_ids:
        # Sync only selected invoices
        invoices_query = Invoice.objects.filter(
            organization_id=org_id,
            id__in=selected_invoice_ids,
            invoice_type='tax',  # Only tax invoices
            status__in=['sent', 'paid']  # Only finalized invoices
        ).select_related('client')
    else:
        # Sync all invoices in date range (original behavior)
        invoices_query = Invoice.objects.filter(
            organization_id=org_id,
            invoice_date__gte=start_date,
            invoice_date__lte=end_date,
            invoice_type='tax',  # Only tax invoices
            status__in=['sent', 'paid']  # Only finalized invoices
        ).select_related('client')

        if not force_resync:
            # Exclude already synced invoices
            invoices_query = invoices_query.filter(tally_sync__isnull=True)

    invoices = list(invoices_query)

    if not invoices:
        return Response({
            'success': True,
            'message': 'No invoices to sync',
            'synced_count': 0,
            'total_count': 0,
            'skipped_existing': 0
        })

    try:
        # Create sync history record
        sync_history = TallySyncHistory.objects.create(
            organization=org,
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
                'id': str(inv.id),
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date.isoformat(),
                'subtotal': str(inv.subtotal),
                'tax_amount': str(inv.tax_amount),
                'total_amount': str(inv.total_amount),
                'round_off': str(inv.round_off) if inv.round_off else '0',
                'notes': inv.notes or '',
                'client': {
                    'id': str(inv.client.id),
                    'name': inv.client.name,
                    'gstin': inv.client.gstin or '',
                    'state': inv.client.state or '',
                    'state_code': inv.client.gstin[:2] if inv.client.gstin else '',
                    'address': inv.client.address or '',
                    'city': inv.client.city or '',
                    'pinCode': inv.client.pinCode or ''
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
            'companyGstin': org.gstin if hasattr(org, 'gstin') and org.gstin else ''
        }

        # Generate unique request ID
        request_id = str(sync_history.id)
        cache_key = f"sync_response_{org_id}_{request_id}"

        # Send sync request to Setu connector via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'sync_request',
                'data': {
                    'requestId': request_id,
                    'invoices': invoice_data,
                    'mapping': mapping_data,
                    'forceResync': force_resync
                }
            }
        )

        logger.info(f"[Tally Sync] Sent sync request for {len(invoice_data)} invoices, request_id: {request_id}")

        # Wait for response from Setu (poll cache with timeout)
        timeout = 60  # 60 seconds for sync operation
        start_time = time.time()

        while time.time() - start_time < timeout:
            response_data = cache.get(cache_key)
            if response_data is not None:
                # Clear the cache entry
                cache.delete(cache_key)

                # Update sync history
                sync_history.status = 'success' if response_data.get('success_count', 0) > 0 else 'failed'
                sync_history.invoices_synced = response_data.get('success_count', 0)
                sync_history.invoices_failed = response_data.get('failed_count', 0)
                sync_history.save()

                return Response({
                    'success': True,
                    'message': f"Synced {response_data.get('success_count', 0)} invoices to Tally",
                    'synced_count': response_data.get('success_count', 0),
                    'total_count': len(invoice_data),
                    'failed_count': response_data.get('failed_count', 0),
                    'errors': response_data.get('errors', [])
                })

            time.sleep(0.5)

        # Timeout - sync may still be in progress
        # For now, return optimistic response that sync was initiated
        return Response({
            'success': True,
            'message': f"Sync initiated for {len(invoice_data)} invoices. Check sync history for results.",
            'synced_count': len(invoice_data),
            'total_count': len(invoice_data),
            'skipped_existing': 0
        })

    except Exception as e:
        logger.error(f"[Tally Sync] Error during sync: {e}", exc_info=True)
        return Response(
            {'error': f'Sync failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_preview_invoices(request):
    """Preview invoices available for Tally sync based on date range"""
    from .models import Invoice, InvoiceTallySync

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    force_resync = request.data.get('force_resync', False)

    if not start_date or not end_date:
        return Response(
            {'error': 'Start date and end date are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Build query for invoices
    invoices_query = Invoice.objects.filter(
        organization_id=org_id,
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        invoice_type='tax',  # Only tax invoices
        status__in=['sent', 'paid']  # Only finalized invoices
    ).select_related('client').order_by('-invoice_date')

    # Get already synced invoice IDs
    synced_invoice_ids = set(
        InvoiceTallySync.objects.filter(
            invoice__organization_id=org_id,
            synced=True
        ).values_list('invoice_id', flat=True)
    )

    invoices_data = []
    for inv in invoices_query:
        is_synced = inv.id in synced_invoice_ids
        invoices_data.append({
            'id': str(inv.id),
            'invoice_number': inv.invoice_number,
            'invoice_date': inv.invoice_date.isoformat(),
            'client_name': inv.client.name if inv.client else 'Unknown',
            'total_amount': str(inv.total_amount),
            'status': inv.status,
            'is_synced': is_synced,
            'can_sync': not is_synced or force_resync
        })

    # Count stats
    total_count = len(invoices_data)
    synced_count = sum(1 for inv in invoices_data if inv['is_synced'])
    pending_count = total_count - synced_count

    return Response({
        'invoices': invoices_data,
        'total_count': total_count,
        'synced_count': synced_count,
        'pending_count': pending_count,
        'force_resync': force_resync
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_sync_history(request):
    """Get Tally sync history"""
    from .models import TallySyncHistory

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    history = TallySyncHistory.objects.filter(organization=org).order_by('-sync_started_at')[:50]

    history_data = []
    for record in history:
        history_data.append({
            'sync_date': record.sync_started_at.isoformat(),
            'start_date': record.start_date.strftime('%Y-%m-%d'),
            'end_date': record.end_date.strftime('%Y-%m-%d'),
            'invoices_synced': record.invoices_synced,
            'invoices_failed': record.invoices_failed,
            'total_amount': str(record.total_amount),
            'status': record.status,
            'user': record.user.username if record.user else 'Unknown',
        })

    return Response({'history': history_data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_parties(request):
    """Get list of parties (clients) from Tally via Setu connector"""
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import time
    import uuid

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if Setu connector is online
    connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
    connector_info = cache.get(connector_key)

    if not connector_info:
        return Response(
            {'error': 'Setu connector is offline. Please start the Setu desktop app.', 'parties': []},
            status=status.HTTP_200_OK
        )

    if not connector_info.get('tally_connected'):
        return Response(
            {'error': 'Tally is not connected. Please check Tally in the Setu app.', 'parties': []},
            status=status.HTTP_200_OK
        )

    # Generate unique request ID
    request_id = f"parties_{uuid.uuid4().hex[:8]}"
    cache_key = f"parties_response_{org_id}_{request_id}"

    # Clear any previous response
    cache.delete(cache_key)

    try:
        channel_layer = get_channel_layer()

        # Send get parties request to Setu connector
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'get_parties',
                'data': {
                    'request_id': request_id
                }
            }
        )

        # Wait for response (poll cache with timeout)
        timeout = 15  # seconds
        start_time = time.time()

        while time.time() - start_time < timeout:
            response_data = cache.get(cache_key)
            if response_data is not None:
                # Clean up cache
                cache.delete(cache_key)

                if response_data.get('error'):
                    return Response({
                        'error': response_data['error'],
                        'parties': []
                    })

                return Response({
                    'parties': response_data.get('parties', [])
                })

            time.sleep(0.3)  # Poll every 300ms

        # Timeout
        return Response({
            'error': 'Timeout waiting for Tally response. Please try again.',
            'parties': []
        })

    except Exception as e:
        logger.error(f"[tally_get_parties] Error: {e}")
        return Response({
            'error': f'Failed to request parties: {str(e)}',
            'parties': []
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_import_clients(request):
    """Import clients from Tally parties into NexInvo"""
    from .models import Client

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    parties = request.data.get('parties', [])
    if not parties:
        return Response(
            {'error': 'No parties provided for import'},
            status=status.HTTP_400_BAD_REQUEST
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    for party in parties:
        try:
            name = party.get('name', '').strip()
            if not name:
                skipped_count += 1
                continue

            # Check if client already exists by name or GSTIN
            gstin = party.get('gstin', '').strip()
            existing_client = None

            if gstin:
                existing_client = Client.objects.filter(
                    organization=org,
                    gstin=gstin
                ).first()

            if not existing_client:
                existing_client = Client.objects.filter(
                    organization=org,
                    name__iexact=name
                ).first()

            # Prepare client data
            client_data = {
                'name': name,
                'address': party.get('address', ''),
                'state': party.get('state', ''),
                'pinCode': party.get('pincode', ''),
                'phone': party.get('phone', ''),
                'email': party.get('email', ''),
                'gstin': gstin,
            }

            if existing_client:
                # Update existing client
                for field, value in client_data.items():
                    if value:  # Only update if value is not empty
                        setattr(existing_client, field, value)
                existing_client.save()
                updated_count += 1
            else:
                # Create new client
                Client.objects.create(
                    organization=org,
                    **client_data
                )
                created_count += 1

        except Exception as e:
            errors.append(f"Error importing '{party.get('name', 'Unknown')}': {str(e)}")

    return Response({
        'success': True,
        'message': f'Import completed: {created_count} created, {updated_count} updated, {skipped_count} skipped',
        'created_count': created_count,
        'updated_count': updated_count,
        'skipped_count': skipped_count,
        'errors': errors
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_stock_items(request):
    """Get list of stock items (products) from Tally via Setu connector"""
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import time
    import uuid

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if Setu connector is online
    connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
    connector_info = cache.get(connector_key)

    if not connector_info:
        return Response(
            {'error': 'Setu connector is offline. Please start the Setu desktop app.', 'stock_items': []},
            status=status.HTTP_200_OK
        )

    if not connector_info.get('tally_connected'):
        return Response(
            {'error': 'Tally is not connected. Please check Tally in the Setu app.', 'stock_items': []},
            status=status.HTTP_200_OK
        )

    # Generate unique request ID
    request_id = f"stock_items_{uuid.uuid4().hex[:8]}"
    cache_key = f"stock_items_response_{org_id}_{request_id}"

    # Clear any previous response
    cache.delete(cache_key)

    try:
        channel_layer = get_channel_layer()

        # Send get stock items request to Setu connector
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'get_stock_items',
                'data': {
                    'request_id': request_id
                }
            }
        )

        # Wait for response (poll cache with timeout)
        timeout = 15  # seconds
        start_time = time.time()

        while time.time() - start_time < timeout:
            response_data = cache.get(cache_key)
            if response_data is not None:
                # Clean up cache
                cache.delete(cache_key)

                if response_data.get('error'):
                    return Response({
                        'error': response_data['error'],
                        'stock_items': []
                    })

                return Response({
                    'stock_items': response_data.get('stock_items', [])
                })

            time.sleep(0.3)  # Poll every 300ms

        # Timeout
        return Response({
            'error': 'Timeout waiting for Tally response. Please try again.',
            'stock_items': []
        })

    except Exception as e:
        logger.error(f"[tally_get_stock_items] Error: {e}")
        return Response({
            'error': f'Failed to request stock items: {str(e)}',
            'stock_items': []
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_preview_clients(request):
    """Preview clients import - show which will be created vs updated"""
    from .models import Client

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    parties = request.data.get('parties', [])
    if not parties:
        return Response({'error': 'No parties provided'}, status=status.HTTP_400_BAD_REQUEST)

    to_create = []
    to_update = []

    for party in parties:
        name = party.get('name', '').strip()
        if not name:
            continue

        gstin = party.get('gstin', '').strip()
        existing_client = None

        # Match by GSTIN first
        if gstin:
            existing_client = Client.objects.filter(organization=org, gstin=gstin).first()

        # Then by name
        if not existing_client:
            existing_client = Client.objects.filter(organization=org, name__iexact=name).first()

        party_info = {
            'name': name,
            'gstin': gstin or '-',
            'state': party.get('state', '-'),
            'phone': party.get('phone', '-'),
            'email': party.get('email', '-'),
        }

        if existing_client:
            party_info['existing_id'] = str(existing_client.id)
            party_info['tally_name'] = name
            party_info['nexinvo_name'] = existing_client.name
            # Determine match type
            if gstin and existing_client.gstin == gstin:
                party_info['match_type'] = 'gstin'
            else:
                party_info['match_type'] = 'name'
            to_update.append(party_info)
        else:
            to_create.append(party_info)

    return Response({
        'to_create': to_create,
        'to_update': to_update,
        'create_count': len(to_create),
        'update_count': len(to_update),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_preview_products(request):
    """Preview products import - show which will be created vs updated"""
    from .models import Product

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    stock_items = request.data.get('stock_items', [])
    if not stock_items:
        return Response({'error': 'No stock items provided'}, status=status.HTTP_400_BAD_REQUEST)

    to_create = []
    to_update = []

    for item in stock_items:
        name = item.get('name', '').strip()
        if not name:
            continue

        hsn_code = item.get('hsn_code', '').strip()
        existing_product = None

        # Match by HSN code first
        if hsn_code:
            existing_product = Product.objects.filter(organization=org, hsn_code=hsn_code).first()

        # Then by name
        if not existing_product:
            existing_product = Product.objects.filter(organization=org, name__iexact=name).first()

        item_info = {
            'name': name,
            'hsn_code': hsn_code or '-',
            'unit': item.get('unit', '-'),
            'rate': item.get('rate', 0),
        }

        if existing_product:
            item_info['existing_id'] = str(existing_product.id)
            item_info['tally_name'] = name
            item_info['nexinvo_name'] = existing_product.name
            # Determine match type
            if hsn_code and existing_product.hsn_code == hsn_code:
                item_info['match_type'] = 'hsn_code'
            else:
                item_info['match_type'] = 'name'
            to_update.append(item_info)
        else:
            to_create.append(item_info)

    return Response({
        'to_create': to_create,
        'to_update': to_update,
        'create_count': len(to_create),
        'update_count': len(to_update),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_preview_services(request):
    """Preview services import - show which will be created vs updated"""
    from .models import ServiceItem

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    stock_items = request.data.get('stock_items', [])
    if not stock_items:
        return Response({'error': 'No stock items provided'}, status=status.HTTP_400_BAD_REQUEST)

    to_create = []
    to_update = []

    for item in stock_items:
        name = item.get('name', '').strip()
        if not name:
            continue

        sac_code = item.get('hsn_code', '').strip()  # Tally uses same field
        existing_service = None

        # Match by SAC code first
        if sac_code:
            existing_service = ServiceItem.objects.filter(organization=org, sac_code=sac_code).first()

        # Then by name
        if not existing_service:
            existing_service = ServiceItem.objects.filter(organization=org, name__iexact=name).first()

        item_info = {
            'name': name,
            'sac_code': sac_code or '-',
            'unit': item.get('unit', '-'),
            'rate': item.get('rate', 0),
        }

        if existing_service:
            item_info['existing_id'] = str(existing_service.id)
            item_info['tally_name'] = name
            item_info['nexinvo_name'] = existing_service.name
            # Determine match type
            if sac_code and existing_service.sac_code == sac_code:
                item_info['match_type'] = 'sac_code'
            else:
                item_info['match_type'] = 'name'
            to_update.append(item_info)
        else:
            to_create.append(item_info)

    return Response({
        'to_create': to_create,
        'to_update': to_update,
        'create_count': len(to_create),
        'update_count': len(to_update),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_import_products(request):
    """Import products from Tally stock items into NexInvo"""
    from .models import Product
    from decimal import Decimal, InvalidOperation

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    stock_items = request.data.get('stock_items', [])
    if not stock_items:
        return Response(
            {'error': 'No stock items provided for import'},
            status=status.HTTP_400_BAD_REQUEST
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    for item in stock_items:
        try:
            name = item.get('name', '').strip()
            if not name:
                skipped_count += 1
                continue

            # Check if product already exists by name or HSN code
            hsn_code = item.get('hsn_code', '').strip()
            existing_product = None

            if hsn_code:
                existing_product = Product.objects.filter(
                    organization=org,
                    hsn_code=hsn_code
                ).first()

            if not existing_product:
                existing_product = Product.objects.filter(
                    organization=org,
                    name__iexact=name
                ).first()

            # Parse rate/price
            rate = Decimal('0.00')
            rate_str = item.get('rate', '0')
            if rate_str:
                try:
                    # Clean rate string - remove currency symbols, commas
                    rate_str = str(rate_str).replace(',', '').replace('₹', '').strip()
                    rate = Decimal(rate_str)
                except (InvalidOperation, ValueError):
                    rate = Decimal('0.00')

            # Prepare product data
            product_data = {
                'name': name,
                'description': item.get('description', ''),
                'hsn_code': hsn_code,
                'unit_name': item.get('unit', 'pcs'),
                'selling_price': rate,
            }

            if existing_product:
                # Update existing product
                for field, value in product_data.items():
                    if value:  # Only update if value is not empty
                        setattr(existing_product, field, value)
                existing_product.save()
                updated_count += 1
            else:
                # Create new product
                Product.objects.create(
                    organization=org,
                    **product_data
                )
                created_count += 1

        except Exception as e:
            errors.append(f"Error importing '{item.get('name', 'Unknown')}': {str(e)}")

    return Response({
        'success': True,
        'message': f'Import completed: {created_count} created, {updated_count} updated, {skipped_count} skipped',
        'created_count': created_count,
        'updated_count': updated_count,
        'skipped_count': skipped_count,
        'errors': errors
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_import_services(request):
    """Import services from Tally stock items into NexInvo"""
    from .models import ServiceItem
    from decimal import Decimal, InvalidOperation

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response(
            {'error': 'Organization ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organization not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    stock_items = request.data.get('stock_items', [])
    if not stock_items:
        return Response(
            {'error': 'No stock items provided for import'},
            status=status.HTTP_400_BAD_REQUEST
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    for item in stock_items:
        try:
            name = item.get('name', '').strip()
            if not name:
                skipped_count += 1
                continue

            # Check if service already exists by name or SAC code
            sac_code = item.get('hsn_code', '').strip()  # Tally uses same field for HSN/SAC
            existing_service = None

            if sac_code:
                existing_service = ServiceItem.objects.filter(
                    organization=org,
                    sac_code=sac_code
                ).first()

            if not existing_service:
                existing_service = ServiceItem.objects.filter(
                    organization=org,
                    name__iexact=name
                ).first()

            # Prepare service data
            service_data = {
                'name': name,
                'description': item.get('description', ''),
                'sac_code': sac_code,
                'gst_rate': Decimal('18.00'),  # Default GST rate for services
            }

            if existing_service:
                # Update existing service
                for field, value in service_data.items():
                    if value:  # Only update if value is not empty
                        setattr(existing_service, field, value)
                existing_service.save()
                updated_count += 1
            else:
                # Create new service
                ServiceItem.objects.create(
                    organization=org,
                    **service_data
                )
                created_count += 1

        except Exception as e:
            errors.append(f"Error importing '{item.get('name', 'Unknown')}': {str(e)}")

    return Response({
        'success': True,
        'message': f'Import completed: {created_count} created, {updated_count} updated, {skipped_count} skipped',
        'created_count': created_count,
        'updated_count': updated_count,
        'skipped_count': skipped_count,
        'errors': errors
    })


# =============================================================================
# TWO-WAY TALLY INVOICE SYNC
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_sales_vouchers(request):
    """Fetch sales vouchers (invoices) from Tally via Setu connector"""
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import uuid
    import time

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    if not start_date or not end_date:
        return Response({'error': 'Start date and end date are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Check for Setu connector
    connector_info = None
    try:
        import redis
        from django.conf import settings
        redis_url = getattr(settings, 'CACHES', {}).get('default', {}).get('LOCATION', 'redis://localhost:6379/1')
        if isinstance(redis_url, str):
            r = redis.from_url(redis_url)
        else:
            r = redis.Redis(host='localhost', port=6379, db=1)
        pattern = f":1:setu_connector_setu_{org_id}_*"
        matching_keys = r.keys(pattern)
        for key in matching_keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            cache_key = key_str.replace(":1:", "", 1) if key_str.startswith(":1:") else key_str
            connector_info = cache.get(cache_key)
            if connector_info:
                break
        if not connector_info:
            connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
            connector_info = cache.get(connector_key)
    except Exception as e:
        connector_key = f"setu_connector_setu_{org_id}_{request.user.id}"
        connector_info = cache.get(connector_key)

    if not connector_info:
        return Response({'error': 'Setu connector is offline'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not connector_info.get('tally_connected'):
        return Response({'error': 'Tally is not connected'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Generate request ID and send request
    request_id = f"sales_vouchers_{uuid.uuid4().hex[:8]}"
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"setu_org_{org_id}",
        {
            'type': 'get_sales_vouchers',
            'data': {
                'request_id': request_id,
                'start_date': start_date,
                'end_date': end_date
            }
        }
    )

    # Poll for response
    cache_key = f"sales_vouchers_response_{org_id}_{request_id}"
    max_wait = 30
    poll_interval = 0.5
    waited = 0

    while waited < max_wait:
        response_data = cache.get(cache_key)
        if response_data:
            cache.delete(cache_key)
            if 'error' in response_data:
                return Response({'error': response_data['error']}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({'vouchers': response_data.get('vouchers', [])})
        time.sleep(poll_interval)
        waited += poll_interval

    return Response({'error': 'Timeout waiting for Tally response'}, status=status.HTTP_504_GATEWAY_TIMEOUT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_two_way_sync_preview(request):
    """
    Preview two-way sync between Tally and NexInvo.
    Compares invoices from both systems and returns:
    - to_tally: NexInvo invoices not in Tally (will be posted to Tally)
    - to_nexinvo: Tally invoices not in NexInvo (will be created in NexInvo)
    - matched: Invoices that exist in both systems

    MATCHING STRATEGY:
    - Primary match: invoice_date + total_amount + party_name (smart matching)
    - This prevents duplicates when same invoice exists in both systems with different invoice numbers
    - Invoice number series mapping is handled during import
    """
    from .models import Invoice, Client
    from decimal import Decimal, ROUND_HALF_UP

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    tally_vouchers = request.data.get('tally_vouchers', [])
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')

    if not start_date or not end_date:
        return Response({'error': 'Start date and end date are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Get NexInvo invoices (Tax invoices with status sent or paid)
    nexinvo_invoices = Invoice.objects.filter(
        organization_id=org_id,
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        invoice_type='tax',
        status__in=['sent', 'paid']
    ).select_related('client')

    # Helper function to normalize amount for comparison (round to 2 decimal places)
    def normalize_amount(amount):
        if amount is None:
            return Decimal('0.00')
        return Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    # Helper function to normalize date string
    def normalize_date(date_val):
        if not date_val:
            return ''
        # Handle both string and date objects
        if hasattr(date_val, 'isoformat'):
            return date_val.isoformat()
        # Parse common date formats and normalize to YYYY-MM-DD
        date_str = str(date_val).strip()
        # If already in YYYY-MM-DD format
        if len(date_str) == 10 and date_str[4] == '-' and date_str[7] == '-':
            return date_str
        # Try parsing DD-MM-YYYY or DD/MM/YYYY (Tally format)
        for fmt in ['%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d']:
            try:
                from datetime import datetime
                dt = datetime.strptime(date_str[:10], fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        return date_str

    # Helper function to normalize party name for comparison
    def normalize_party_name(name):
        if not name:
            return ''
        return name.strip().lower()

    # Build lookup dictionaries for comparison
    # SMART MATCHING: Match by date + amount + party_name to identify same invoices
    # This prevents duplicates when invoice numbers differ between systems

    tally_lookup_smart = {}  # Key: (date, amount, party_name)
    tally_lookup_by_number = {}  # Secondary lookup by invoice number

    for v in tally_vouchers:
        party_name = normalize_party_name(v.get('party_name', ''))
        invoice_date = normalize_date(v.get('invoice_date', ''))
        total_amount = normalize_amount(v.get('total_amount', 0))
        voucher_number = v.get('voucher_number', '').strip()

        # Primary key: date + amount + party
        smart_key = (invoice_date, str(total_amount), party_name)
        tally_lookup_smart[smart_key] = v

        # Secondary key: voucher number + party (for exact match)
        if voucher_number:
            number_key = (voucher_number.lower(), party_name)
            tally_lookup_by_number[number_key] = v

    nexinvo_lookup_smart = {}  # Key: (date, amount, party_name)
    nexinvo_lookup_by_number = {}  # Secondary lookup by invoice number

    for inv in nexinvo_invoices:
        party_name = normalize_party_name(inv.client.name if inv.client else '')
        invoice_date = normalize_date(inv.invoice_date)
        total_amount = normalize_amount(inv.total_amount)
        invoice_number = inv.invoice_number.strip()

        # Primary key: date + amount + party
        smart_key = (invoice_date, str(total_amount), party_name)
        nexinvo_lookup_smart[smart_key] = inv

        # Secondary key: invoice number + party
        if invoice_number:
            number_key = (invoice_number.lower(), party_name)
            nexinvo_lookup_by_number[number_key] = inv

    # Find invoices to sync
    to_tally = []  # NexInvo invoices not in Tally
    to_nexinvo = []  # Tally invoices not in NexInvo
    matched = []  # Invoices in both (matched by smart key or exact number)
    processed_nexinvo_ids = set()  # Track already processed NexInvo invoices
    processed_tally_vouchers = set()  # Track already matched Tally vouchers

    # Check NexInvo invoices against Tally
    for inv in nexinvo_invoices:
        party_name = normalize_party_name(inv.client.name if inv.client else '')
        invoice_date = normalize_date(inv.invoice_date)
        total_amount = normalize_amount(inv.total_amount)
        invoice_number = inv.invoice_number.strip()

        smart_key = (invoice_date, str(total_amount), party_name)
        number_key = (invoice_number.lower(), party_name) if invoice_number else None

        # Check for match (smart match takes priority)
        matched_voucher = None
        match_type = None

        if smart_key in tally_lookup_smart:
            matched_voucher = tally_lookup_smart[smart_key]
            match_type = 'smart'
        elif number_key and number_key in tally_lookup_by_number:
            matched_voucher = tally_lookup_by_number[number_key]
            match_type = 'exact'

        if matched_voucher:
            voucher_id = (matched_voucher.get('voucher_number', ''), matched_voucher.get('party_name', ''))
            processed_tally_vouchers.add(voucher_id)
            processed_nexinvo_ids.add(inv.id)

            matched.append({
                'invoice_number': inv.invoice_number,
                'tally_voucher_number': matched_voucher.get('voucher_number', ''),
                'client_name': inv.client.name if inv.client else '',
                'invoice_date': str(inv.invoice_date),
                'total_amount': float(inv.total_amount),
                'nexinvo_id': str(inv.id),
                'match_type': match_type,
                'numbers_match': invoice_number.lower() == matched_voucher.get('voucher_number', '').strip().lower()
            })
        else:
            # Not matched - check if synced already via tally_sync
            if not hasattr(inv, 'tally_sync') or not inv.tally_sync:
                to_tally.append({
                    'id': str(inv.id),
                    'invoice_number': inv.invoice_number,
                    'client_name': inv.client.name if inv.client else '',
                    'invoice_date': str(inv.invoice_date),
                    'total_amount': float(inv.total_amount),
                    'status': inv.status
                })

    # Check Tally invoices against NexInvo (only unprocessed ones)
    for v in tally_vouchers:
        voucher_id = (v.get('voucher_number', ''), v.get('party_name', ''))
        if voucher_id in processed_tally_vouchers:
            continue  # Already matched

        party_name = normalize_party_name(v.get('party_name', ''))
        invoice_date = normalize_date(v.get('invoice_date', ''))
        total_amount = normalize_amount(v.get('total_amount', 0))
        voucher_number = v.get('voucher_number', '').strip()

        smart_key = (invoice_date, str(total_amount), party_name)
        number_key = (voucher_number.lower(), party_name) if voucher_number else None

        # Check for match (smart match or exact number match)
        is_matched = smart_key in nexinvo_lookup_smart or (number_key and number_key in nexinvo_lookup_by_number)

        if not is_matched:
            to_nexinvo.append({
                'voucher_number': v.get('voucher_number', ''),
                'party_name': v.get('party_name', ''),
                'invoice_date': v.get('invoice_date', ''),
                'total_amount': v.get('total_amount', 0),
                'reference': v.get('reference', ''),
                'narration': v.get('narration', '')
            })

    return Response({
        'to_tally': to_tally,
        'to_nexinvo': to_nexinvo,
        'matched': matched,
        'to_tally_count': len(to_tally),
        'to_nexinvo_count': len(to_nexinvo),
        'matched_count': len(matched)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_sync_to_nexinvo(request):
    """
    Create invoices in NexInvo from Tally vouchers.
    User selects which Tally vouchers to import.

    MANUAL SYNC MODE (force_sync=True):
    - Used for manual sync with date range
    - Skips duplicate checking - trusts that preview already filtered
    - Forces import of selected vouchers

    AUTO SYNC MODE (force_sync=False):
    - Used for automatic background sync
    - Performs smart matching to prevent duplicates

    INVOICE NUMBER SERIES MAPPING:
    - 'keep': Use the original Tally voucher number as-is
    - 'nexinvo': Generate new NexInvo invoice numbers using organization's invoice settings
    - 'custom': Use a custom prefix + Tally number (e.g., 'TALLY-001')
    """
    from .models import Invoice, InvoiceItem, Client, TallyMapping, InvoiceSettings
    from decimal import ROUND_HALF_UP
    import re

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    vouchers_to_import = request.data.get('vouchers', [])
    if not vouchers_to_import:
        return Response({'error': 'No vouchers provided'}, status=status.HTTP_400_BAD_REQUEST)

    # Force sync mode - skip duplicate checking (used for manual sync)
    force_sync = request.data.get('force_sync', False)

    # Get Tally mapping settings for invoice number handling
    try:
        tally_mapping = TallyMapping.objects.get(organization_id=org_id)
        invoice_number_mode = tally_mapping.invoice_number_mode
        tally_invoice_prefix = tally_mapping.tally_invoice_prefix
        auto_detect_series = tally_mapping.auto_detect_series
    except TallyMapping.DoesNotExist:
        # Default settings if no mapping exists
        invoice_number_mode = 'keep'
        tally_invoice_prefix = ''
        auto_detect_series = True
        tally_mapping = None

    # Get invoice settings for NexInvo series generation
    try:
        invoice_settings = InvoiceSettings.objects.get(organization_id=org_id)
        nexinvo_prefix = invoice_settings.invoicePrefix
        next_number = invoice_settings.startingNumber
    except InvoiceSettings.DoesNotExist:
        nexinvo_prefix = 'INV-'
        next_number = 1
        invoice_settings = None

    # Helper function to normalize amount for comparison
    def normalize_amount(amount):
        if amount is None:
            return Decimal('0.00')
        return Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    # Helper function to normalize date string
    def normalize_date(date_val):
        if not date_val:
            return None
        # Handle both string and date objects
        if hasattr(date_val, 'isoformat'):
            return date_val
        # Parse common date formats
        date_str = str(date_val).strip()
        for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y']:
            try:
                from datetime import datetime
                return datetime.strptime(date_str[:10], fmt).date()
            except ValueError:
                continue
        return None

    # Helper function to detect invoice number prefix from voucher number
    def detect_prefix(voucher_number):
        # Match common patterns like 'INV-001', 'SALES/2024/001', 'GST-001', etc.
        match = re.match(r'^([A-Za-z]+[-/]?)', voucher_number)
        if match:
            return match.group(1)
        return ''

    # Helper function to generate invoice number based on mode
    def generate_invoice_number(voucher_number, mode, custom_prefix, sequence_num):
        if mode == 'keep':
            return voucher_number
        elif mode == 'nexinvo':
            return f"{nexinvo_prefix}{sequence_num}"
        elif mode == 'custom':
            if custom_prefix:
                # Extract numeric part from voucher number
                numeric_match = re.search(r'(\d+)$', voucher_number)
                if numeric_match:
                    return f"{custom_prefix}{numeric_match.group(1)}"
                return f"{custom_prefix}{voucher_number}"
            return voucher_number
        return voucher_number

    # Get current max invoice number for NexInvo series
    if invoice_number_mode == 'nexinvo':
        # Find the highest existing invoice number with NexInvo prefix
        existing_max = Invoice.objects.filter(
            organization_id=org_id,
            invoice_number__startswith=nexinvo_prefix
        ).order_by('-invoice_number').first()
        if existing_max:
            # Extract number from invoice number
            try:
                num_part = existing_max.invoice_number.replace(nexinvo_prefix, '')
                next_number = int(re.sub(r'\D', '', num_part)) + 1
            except (ValueError, AttributeError):
                pass

    created_count = 0
    skipped_count = 0
    matched_count = 0  # Count of invoices matched by smart matching
    skipped_by_number_count = 0  # Count of invoices skipped by invoice number
    errors = []
    skip_details = []  # Detailed skip reasons
    detected_prefixes = set()  # Track detected Tally prefixes

    for voucher in vouchers_to_import:
        try:
            voucher_number = voucher.get('voucher_number', '')
            party_name = voucher.get('party_name', '')
            invoice_date_str = voucher.get('invoice_date', '')
            total_amount = Decimal(str(voucher.get('total_amount', 0)))

            # Detect prefix for auto-detection
            if auto_detect_series and voucher_number:
                prefix = detect_prefix(voucher_number)
                if prefix:
                    detected_prefixes.add(prefix)

            # Normalize values for comparison
            normalized_amount = normalize_amount(total_amount)
            normalized_date = normalize_date(invoice_date_str)
            normalized_party = party_name.strip().lower() if party_name else ''

            # Generate the invoice number based on mapping mode
            final_invoice_number = generate_invoice_number(
                voucher_number,
                invoice_number_mode,
                tally_invoice_prefix,
                next_number
            )

            # SMART MATCHING: Check by invoice number OR by date + amount + client
            # This prevents duplicates when invoices have different numbers but same content
            # Only check against TAX invoices with status SENT or PAID (same as preview endpoint)
            # SKIP duplicate checking if force_sync is True (manual sync mode)

            if not force_sync:
                # Check 1: Exact invoice number match (check both original and generated numbers)
                # Only check tax invoices with status sent/paid
                existing_by_orig_number = Invoice.objects.filter(
                    organization_id=org_id,
                    invoice_number__iexact=voucher_number,
                    invoice_type='tax',
                    status__in=['sent', 'paid']
                ).exists()

                existing_by_final_number = Invoice.objects.filter(
                    organization_id=org_id,
                    invoice_number__iexact=final_invoice_number,
                    invoice_type='tax',
                    status__in=['sent', 'paid']
                ).exists()

                if existing_by_orig_number or existing_by_final_number:
                    skipped_count += 1
                    skipped_by_number_count += 1
                    skip_details.append(f"#{voucher_number}: Invoice number already exists")
                    continue

                # Check 2: Smart match by date + amount + client name
                # Only check tax invoices with status sent/paid
                if normalized_date and normalized_party:
                    # Find invoices with matching date, amount, and client name (case-insensitive)
                    smart_match = Invoice.objects.filter(
                        organization_id=org_id,
                        invoice_date=normalized_date,
                        total_amount=normalized_amount,
                        client__name__iexact=party_name,
                        invoice_type='tax',
                        status__in=['sent', 'paid']
                    ).first()

                    if smart_match:
                        matched_count += 1
                        skipped_count += 1
                        skip_details.append(f"#{voucher_number}: Matched existing invoice #{smart_match.invoice_number} (same date/amount/client)")
                        continue

            # Find or create client
            client = None
            if party_name:
                client = Client.objects.filter(
                    organization_id=org_id,
                    name__iexact=party_name
                ).first()

                if not client:
                    # Create new client
                    client = Client.objects.create(
                        organization_id=org_id,
                        name=party_name
                    )

            # Create invoice with the generated invoice number
            invoice = Invoice.objects.create(
                organization_id=org_id,
                client=client,
                invoice_number=final_invoice_number,
                invoice_date=normalized_date or date.today(),
                invoice_type='tax',
                status='sent',  # Mark as sent since it's from Tally
                subtotal=total_amount,
                tax_amount=Decimal('0'),
                total_amount=total_amount,
                notes=f"Imported from Tally (Tally #{voucher_number}). {voucher.get('narration', '')}"
            )

            # Create a single line item for the total
            InvoiceItem.objects.create(
                invoice=invoice,
                description='Imported from Tally',
                quantity=1,
                rate=total_amount,
                amount=total_amount
            )

            created_count += 1

            # Increment sequence number for NexInvo mode
            if invoice_number_mode == 'nexinvo':
                next_number += 1

        except Exception as e:
            errors.append(f"Error importing '{voucher.get('voucher_number', 'Unknown')}': {str(e)}")

    # Update detected prefix in TallyMapping if auto-detection is enabled
    if auto_detect_series and detected_prefixes and tally_mapping:
        # Store the most common prefix
        detected_prefix = max(detected_prefixes, key=len) if detected_prefixes else ''
        if detected_prefix and detected_prefix != tally_mapping.detected_tally_prefix:
            tally_mapping.detected_tally_prefix = detected_prefix
            tally_mapping.save(update_fields=['detected_tally_prefix', 'updated_at'])

    return Response({
        'success': True,
        'message': f'Import completed: {created_count} created, {skipped_count} skipped ({matched_count} matched by date/amount/client)',
        'created_count': created_count,
        'skipped_count': skipped_count,
        'matched_count': matched_count,
        'invoice_number_mode': invoice_number_mode,
        'detected_prefixes': list(detected_prefixes),
        'errors': errors
    })


# =============================================================================
# FEATURE 1: COMPANY INFO IMPORT FROM TALLY
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_company_info(request):
    """Fetch company info from Tally via Setu connector."""
    import time
    import uuid
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    request_id = str(uuid.uuid4())[:8]
    channel_layer = get_channel_layer()

    try:
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'get_company_info',
                'data': {'request_id': request_id}
            }
        )
    except Exception as e:
        return Response({'error': f'Failed to send request to Setu: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Poll cache for response
    cache_key = f"company_info_response_{org_id}_{request_id}"
    for _ in range(40):  # 20 seconds timeout
        time.sleep(0.5)
        result = cache.get(cache_key)
        if result:
            cache.delete(cache_key)
            if 'error' in result:
                return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'company_info': result.get('company_info', {})})

    return Response({'error': 'Timeout waiting for Tally response. Ensure Setu connector is running.'}, status=status.HTTP_408_REQUEST_TIMEOUT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_import_company_info(request):
    """Import company info from Tally into NexInvo organization settings."""
    from .models import TallyMapping

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    company_info = request.data.get('company_info', {})
    fields_to_import = request.data.get('fields', [])

    if not company_info:
        return Response({'error': 'No company info provided'}, status=status.HTTP_400_BAD_REQUEST)

    updated_fields = []

    # Map Tally fields to Organization/CompanySettings fields
    if 'name' in fields_to_import and company_info.get('name'):
        org.name = company_info['name']
        updated_fields.append('name')

    if 'address' in fields_to_import and company_info.get('address'):
        org.address = company_info['address']
        updated_fields.append('address')

    if 'state' in fields_to_import and company_info.get('state'):
        org.state = company_info['state']
        updated_fields.append('state')

    if 'pincode' in fields_to_import and company_info.get('pincode'):
        org.pincode = company_info['pincode']
        updated_fields.append('pincode')

    if 'gstin' in fields_to_import and company_info.get('gstin'):
        org.gstin = company_info['gstin']
        updated_fields.append('gstin')

    if 'phone' in fields_to_import and company_info.get('phone'):
        org.phone = company_info['phone']
        updated_fields.append('phone')

    if 'email' in fields_to_import and company_info.get('email'):
        org.email = company_info['email']
        updated_fields.append('email')

    if updated_fields:
        org.save()

    # Also update company settings if available
    try:
        from .models import CompanySettings
        settings, _ = CompanySettings.objects.get_or_create(organization=org)

        if 'name' in fields_to_import and company_info.get('name'):
            settings.company_name = company_info['name']
        if 'address' in fields_to_import and company_info.get('address'):
            settings.address = company_info['address']
        if 'state' in fields_to_import and company_info.get('state'):
            settings.state = company_info['state']
        if 'pincode' in fields_to_import and company_info.get('pincode'):
            settings.pincode = company_info['pincode']
        if 'gstin' in fields_to_import and company_info.get('gstin'):
            settings.gstin = company_info['gstin']
        if 'phone' in fields_to_import and company_info.get('phone'):
            settings.phone = company_info['phone']
        if 'email' in fields_to_import and company_info.get('email'):
            settings.email = company_info['email']

        settings.save()
    except Exception:
        pass  # CompanySettings may not exist yet

    # Update TallyMapping with company name
    if company_info.get('name'):
        mapping, _ = TallyMapping.objects.get_or_create(organization=org)
        mapping.tally_company_name = company_info['name']
        mapping.save(update_fields=['tally_company_name', 'updated_at'])

    return Response({
        'success': True,
        'message': f'Imported {len(updated_fields)} field(s) from Tally',
        'updated_fields': updated_fields
    })


# =============================================================================
# FEATURE 2: OPENING BALANCES IMPORT FROM TALLY
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_ledgers_with_balances(request):
    """Fetch ledgers with opening/closing balances from Tally via Setu."""
    import time
    import uuid
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    request_id = str(uuid.uuid4())[:8]
    channel_layer = get_channel_layer()

    try:
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'get_ledgers_with_balances',
                'data': {'request_id': request_id}
            }
        )
    except Exception as e:
        return Response({'error': f'Failed to send request to Setu: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    cache_key = f"ledgers_balances_response_{org_id}_{request_id}"
    for _ in range(40):
        time.sleep(0.5)
        result = cache.get(cache_key)
        if result:
            cache.delete(cache_key)
            if 'error' in result:
                return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'ledgers': result.get('ledgers', [])})

    return Response({'error': 'Timeout waiting for Tally response.'}, status=status.HTTP_408_REQUEST_TIMEOUT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_preview_opening_balances(request):
    """Preview opening balances: match Tally ledgers to NexInvo ledgers by name."""
    from .models import LedgerAccount

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    tally_ledgers = request.data.get('ledgers', [])
    if not tally_ledgers:
        return Response({'error': 'No ledgers provided'}, status=status.HTTP_400_BAD_REQUEST)

    # Get all NexInvo ledgers for this org
    nexinvo_ledgers = LedgerAccount.objects.filter(
        organization_id=org_id, is_active=True
    ).values('id', 'name', 'opening_balance', 'opening_balance_type', 'group__name')

    # Build lookup map (case-insensitive)
    nexinvo_map = {}
    for ledger in nexinvo_ledgers:
        nexinvo_map[ledger['name'].strip().lower()] = ledger

    matched = []
    unmatched = []

    for tally_ledger in tally_ledgers:
        tally_name = (tally_ledger.get('name') or '').strip()
        tally_ob = float(tally_ledger.get('opening_balance', 0) or 0)
        tally_parent = tally_ledger.get('parent', '')

        # Use explicit type if provided by connector, otherwise infer from sign
        tally_ob_type = tally_ledger.get('opening_balance_type') or ('Cr' if tally_ob < 0 else 'Dr')
        tally_ob_abs = abs(tally_ob)

        lookup_key = tally_name.lower()
        nexinvo_ledger = nexinvo_map.get(lookup_key)

        if nexinvo_ledger:
            nexinvo_ob = float(nexinvo_ledger['opening_balance'] or 0)
            nexinvo_ob_type = nexinvo_ledger['opening_balance_type'] or 'Dr'
            has_difference = abs(tally_ob_abs - nexinvo_ob) > 0.01 or tally_ob_type != nexinvo_ob_type

            matched.append({
                'tally_name': tally_name,
                'tally_parent': tally_parent,
                'tally_ob': tally_ob_abs,
                'tally_ob_type': tally_ob_type,
                'nexinvo_id': nexinvo_ledger['id'],
                'nexinvo_name': nexinvo_ledger['name'],
                'nexinvo_group': nexinvo_ledger['group__name'],
                'nexinvo_ob': nexinvo_ob,
                'nexinvo_ob_type': nexinvo_ob_type,
                'has_difference': has_difference,
                'status': 'different' if has_difference else 'same'
            })
        else:
            unmatched.append({
                'tally_name': tally_name,
                'tally_parent': tally_parent,
                'tally_ob': tally_ob_abs,
                'tally_ob_type': tally_ob_type,
                'status': 'unmatched'
            })

    return Response({
        'matched': matched,
        'unmatched': unmatched,
        'total_tally': len(tally_ledgers),
        'total_matched': len(matched),
        'total_unmatched': len(unmatched),
        'total_with_differences': sum(1 for m in matched if m['has_difference'])
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_import_opening_balances(request):
    """Import selected opening balances from Tally into NexInvo ledgers."""
    from .models import LedgerAccount

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    balances_to_import = request.data.get('balances', [])
    if not balances_to_import:
        return Response({'error': 'No balances selected for import'}, status=status.HTTP_400_BAD_REQUEST)

    updated_count = 0
    errors = []

    for item in balances_to_import:
        nexinvo_id = item.get('nexinvo_id')
        tally_ob = Decimal(str(item.get('tally_ob', 0)))
        tally_ob_type = item.get('tally_ob_type', 'Dr')

        try:
            ledger = LedgerAccount.objects.get(id=nexinvo_id, organization_id=org_id)
            ledger.opening_balance = tally_ob
            ledger.opening_balance_type = tally_ob_type
            ledger.save(update_fields=['opening_balance', 'opening_balance_type', 'updated_at'])
            ledger.update_balance()
            updated_count += 1
        except LedgerAccount.DoesNotExist:
            errors.append(f"Ledger ID {nexinvo_id} not found")
        except Exception as e:
            errors.append(f"Error updating ledger {nexinvo_id}: {str(e)}")

    return Response({
        'success': True,
        'message': f'Updated opening balances for {updated_count} ledger(s)',
        'updated_count': updated_count,
        'errors': errors
    })


# =============================================================================
# FEATURE 3: ALL VOUCHERS IMPORT FROM TALLY
# =============================================================================

TALLY_VOUCHER_TYPE_MAP = {
    'Sales': 'sales',
    'Purchase': 'purchase',
    'Receipt': 'receipt',
    'Payment': 'payment',
    'Contra': 'contra',
    'Journal': 'journal',
    'Debit Note': 'debit_note',
    'Credit Note': 'credit_note',
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_all_vouchers(request):
    """Fetch all vouchers from Tally for a date range via Setu."""
    import time
    import uuid
    from django.core.cache import cache
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    start_date = request.query_params.get('start_date', '')
    end_date = request.query_params.get('end_date', '')

    if not start_date or not end_date:
        return Response({'error': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)

    request_id = str(uuid.uuid4())[:8]
    channel_layer = get_channel_layer()

    try:
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{org_id}",
            {
                'type': 'get_all_vouchers',
                'data': {
                    'request_id': request_id,
                    'start_date': start_date,
                    'end_date': end_date,
                }
            }
        )
    except Exception as e:
        return Response({'error': f'Failed to send request: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    cache_key = f"all_vouchers_response_{org_id}_{request_id}"
    for _ in range(60):  # 30 seconds timeout for larger data
        time.sleep(0.5)
        result = cache.get(cache_key)
        if result:
            cache.delete(cache_key)
            if 'error' in result:
                return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
            vouchers = result.get('vouchers', [])
            # Summarize by type
            type_counts = {}
            for v in vouchers:
                vt = v.get('voucher_type', 'Unknown')
                type_counts[vt] = type_counts.get(vt, 0) + 1
            return Response({
                'vouchers': vouchers,
                'total': len(vouchers),
                'type_counts': type_counts
            })

    return Response({'error': 'Timeout waiting for Tally response.'}, status=status.HTTP_408_REQUEST_TIMEOUT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_preview_import_vouchers(request):
    """Preview voucher import: check duplicates, missing ledgers, counts by type."""
    from .models import Voucher, LedgerAccount

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    vouchers = request.data.get('vouchers', [])
    selected_types = request.data.get('voucher_types', list(TALLY_VOUCHER_TYPE_MAP.keys()))

    if not vouchers:
        return Response({'error': 'No vouchers provided'}, status=status.HTTP_400_BAD_REQUEST)

    # Get existing voucher numbers for duplicate check
    existing_vouchers = set(
        Voucher.objects.filter(organization_id=org_id)
        .values_list('voucher_number', 'voucher_type', 'voucher_date')
    )

    # Get existing ledger names
    existing_ledgers = set(
        LedgerAccount.objects.filter(organization_id=org_id, is_active=True)
        .values_list('name', flat=True)
    )
    existing_ledgers_lower = {n.lower() for n in existing_ledgers}

    to_create = []
    duplicates = []
    missing_ledgers = set()
    counts_by_type = {}

    for v in vouchers:
        tally_type = v.get('voucher_type', '')
        if tally_type not in selected_types:
            continue

        mapped_type = TALLY_VOUCHER_TYPE_MAP.get(tally_type)
        if not mapped_type:
            continue

        voucher_number = v.get('voucher_number', '')
        voucher_date = v.get('date', '')

        # Check duplicate
        is_duplicate = False
        for ev_num, ev_type, ev_date in existing_vouchers:
            if ev_num == voucher_number and ev_type == mapped_type and str(ev_date) == voucher_date:
                is_duplicate = True
                break

        # Check missing ledgers from entries
        entry_ledgers = []
        for entry in v.get('entries', []):
            ledger_name = entry.get('ledger_name', '').strip()
            if ledger_name and ledger_name.lower() not in existing_ledgers_lower:
                missing_ledgers.add(ledger_name)
            entry_ledgers.append(ledger_name)

        item = {
            'voucher_number': voucher_number,
            'voucher_type': tally_type,
            'mapped_type': mapped_type,
            'date': voucher_date,
            'amount': v.get('amount', 0),
            'narration': v.get('narration', ''),
            'entries': v.get('entries', []),
            'is_duplicate': is_duplicate,
            'entry_ledgers': entry_ledgers,
        }

        if is_duplicate:
            duplicates.append(item)
        else:
            to_create.append(item)

        counts_by_type[tally_type] = counts_by_type.get(tally_type, 0) + 1

    return Response({
        'to_create': to_create,
        'duplicates': duplicates,
        'missing_ledgers': sorted(missing_ledgers),
        'counts_by_type': counts_by_type,
        'total_to_create': len(to_create),
        'total_duplicates': len(duplicates),
        'total_missing_ledgers': len(missing_ledgers)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_import_vouchers(request):
    """Import vouchers from Tally into NexInvo with double-entry bookkeeping."""
    from .models import Voucher, VoucherEntry, LedgerAccount, AccountGroup

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    vouchers_to_import = request.data.get('vouchers', [])
    auto_create_ledgers = request.data.get('auto_create_ledgers', False)

    if not vouchers_to_import:
        return Response({'error': 'No vouchers to import'}, status=status.HTTP_400_BAD_REQUEST)

    # Build ledger lookup
    ledger_map = {}
    for ledger in LedgerAccount.objects.filter(organization=org, is_active=True):
        ledger_map[ledger.name.lower()] = ledger

    # Default group for auto-created ledgers
    default_group = AccountGroup.objects.filter(
        organization=org, name='Suspense Account'
    ).first() or AccountGroup.objects.filter(
        organization=org, parent__isnull=True
    ).first()

    created_count = 0
    errors = []
    ledgers_created = []

    for v in vouchers_to_import:
        mapped_type = TALLY_VOUCHER_TYPE_MAP.get(v.get('voucher_type', ''))
        if not mapped_type:
            errors.append(f"Unknown voucher type: {v.get('voucher_type')}")
            continue

        try:
            with transaction.atomic():
                voucher = Voucher.objects.create(
                    organization=org,
                    voucher_type=mapped_type,
                    voucher_number=v.get('voucher_number', f"TALLY-{created_count+1}"),
                    voucher_date=v.get('date', date.today().isoformat()),
                    total_amount=Decimal(str(abs(float(v.get('amount', 0))))),
                    narration=v.get('narration', ''),
                    status='posted',
                    synced_to_tally=True,
                    tally_voucher_number=v.get('voucher_number', ''),
                    tally_sync_date=timezone.now(),
                    created_by=request.user
                )

                seq = 0
                for entry in v.get('entries', []):
                    ledger_name = entry.get('ledger_name', '').strip()
                    if not ledger_name:
                        continue

                    ledger = ledger_map.get(ledger_name.lower())

                    # Auto-create missing ledger if enabled
                    if not ledger and auto_create_ledgers and default_group:
                        ledger = LedgerAccount.objects.create(
                            organization=org,
                            name=ledger_name,
                            group=default_group,
                            account_type='asset',
                            opening_balance=0,
                            opening_balance_type='Dr',
                            current_balance=0,
                            current_balance_type='Dr',
                            is_active=True
                        )
                        ledger_map[ledger_name.lower()] = ledger
                        ledgers_created.append(ledger_name)

                    if not ledger:
                        errors.append(f"Ledger '{ledger_name}' not found for voucher {v.get('voucher_number')}")
                        continue

                    amount = abs(float(entry.get('amount', 0)))
                    is_debit = entry.get('is_debit', entry.get('is_deemed_positive', False))

                    VoucherEntry.objects.create(
                        voucher=voucher,
                        ledger_account=ledger,
                        debit_amount=Decimal(str(amount)) if is_debit else Decimal('0'),
                        credit_amount=Decimal(str(amount)) if not is_debit else Decimal('0'),
                        particulars=entry.get('particulars', ''),
                        sequence=seq
                    )
                    seq += 1

                # Update balances for all affected ledgers
                for entry in voucher.entries.all():
                    entry.ledger_account.update_balance()

                created_count += 1

        except Exception as e:
            errors.append(f"Error importing voucher {v.get('voucher_number', '?')}: {str(e)}")

    return Response({
        'success': True,
        'message': f'Imported {created_count} voucher(s)',
        'created_count': created_count,
        'ledgers_created': ledgers_created,
        'errors': errors
    })


# =============================================================================
# FEATURE 4: TWO-WAY REAL-TIME SYNC
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tally_realtime_sync_config(request):
    """Get or update real-time sync configuration."""
    from .models import TallyMapping, TallyRealtimeSyncLog
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=status.HTTP_404_NOT_FOUND)

    mapping, _ = TallyMapping.objects.get_or_create(organization=org)

    if request.method == 'GET':
        return Response({
            'realtime_sync_enabled': mapping.realtime_sync_enabled,
            'realtime_sync_interval': mapping.realtime_sync_interval,
            'realtime_sync_voucher_types': mapping.realtime_sync_voucher_types,
            'last_realtime_sync': mapping.last_realtime_sync,
        })

    # POST - update config
    enabled = request.data.get('enabled', mapping.realtime_sync_enabled)
    interval = request.data.get('interval', mapping.realtime_sync_interval)
    voucher_types = request.data.get('voucher_types', mapping.realtime_sync_voucher_types)

    # Validate interval
    interval = max(30, min(300, int(interval)))

    was_enabled = mapping.realtime_sync_enabled
    mapping.realtime_sync_enabled = enabled
    mapping.realtime_sync_interval = interval
    mapping.realtime_sync_voucher_types = voucher_types
    mapping.save(update_fields=[
        'realtime_sync_enabled', 'realtime_sync_interval',
        'realtime_sync_voucher_types', 'updated_at'
    ])

    # Send enable/disable/update to Setu connector
    channel_layer = get_channel_layer()
    if enabled:
        try:
            async_to_sync(channel_layer.group_send)(
                f"setu_org_{org_id}",
                {
                    'type': 'enable_realtime_sync',
                    'data': {
                        'interval': interval,
                        'voucher_types': voucher_types,
                        'last_state': mapping.realtime_sync_state,
                    }
                }
            )
            if not was_enabled:
                TallyRealtimeSyncLog.objects.create(
                    organization=org,
                    event_type='sync_started',
                    description=f'Real-time sync enabled (interval: {interval}s)',
                    details={'voucher_types': voucher_types}
                )
            else:
                TallyRealtimeSyncLog.objects.create(
                    organization=org,
                    event_type='sync_started',
                    description=f'Real-time sync config updated (interval: {interval}s)',
                    details={'voucher_types': voucher_types}
                )
        except Exception as e:
            logger.error(f"Error enabling realtime sync: {e}")

    elif not enabled and was_enabled:
        try:
            async_to_sync(channel_layer.group_send)(
                f"setu_org_{org_id}",
                {
                    'type': 'disable_realtime_sync',
                    'data': {}
                }
            )
            TallyRealtimeSyncLog.objects.create(
                organization=org,
                event_type='sync_stopped',
                description='Real-time sync disabled'
            )
        except Exception as e:
            logger.error(f"Error disabling realtime sync: {e}")

    return Response({
        'success': True,
        'realtime_sync_enabled': mapping.realtime_sync_enabled,
        'realtime_sync_interval': mapping.realtime_sync_interval,
        'realtime_sync_voucher_types': mapping.realtime_sync_voucher_types,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_realtime_sync_status(request):
    """Get real-time sync status."""
    from .models import TallyMapping
    from django.core.cache import cache

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        mapping = TallyMapping.objects.get(organization_id=org_id)
    except TallyMapping.DoesNotExist:
        return Response({
            'enabled': False,
            'connector_online': False,
            'last_sync': None,
        })

    # Check if Setu connector is online
    connector_online = False
    for key in cache.keys(f"setu_connector_setu_{org_id}_*") if hasattr(cache, 'keys') else []:
        info = cache.get(key)
        if info:
            connector_online = True
            break

    # Fallback: scan known pattern
    if not connector_online:
        from django.core.cache import cache as django_cache
        try:
            # Try common cache key patterns
            for i in range(10):
                test_key = f"setu_connector_setu_{org_id}_{i}"
                if django_cache.get(test_key):
                    connector_online = True
                    break
        except Exception:
            pass

    return Response({
        'enabled': mapping.realtime_sync_enabled,
        'interval': mapping.realtime_sync_interval,
        'voucher_types': mapping.realtime_sync_voucher_types,
        'last_sync': mapping.last_realtime_sync,
        'connector_online': connector_online,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_realtime_sync_log(request):
    """Get paginated real-time sync activity log."""
    from .models import TallyRealtimeSyncLog

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 50))
    offset = (page - 1) * page_size

    logs = TallyRealtimeSyncLog.objects.filter(organization_id=org_id).order_by('-created_at')
    total = logs.count()

    items = logs[offset:offset + page_size].values(
        'id', 'event_type', 'description', 'details', 'created_at'
    )

    return Response({
        'results': list(items),
        'total': total,
        'page': page,
        'page_size': page_size,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_get_pending_changes(request):
    """Get pending NexInvo changes for Setu connector to sync to Tally."""
    from .models import TallyPendingSync

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    pending = TallyPendingSync.objects.filter(
        organization_id=org_id, status='pending'
    ).values('id', 'record_type', 'record_id', 'action', 'data', 'created_at')

    return Response({'pending_changes': list(pending)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tally_mark_changes_synced(request):
    """Mark pending changes as synced after Setu confirms posting to Tally."""
    from .models import TallyPendingSync, TallyRealtimeSyncLog

    org_id = request.headers.get('X-Organization-ID')
    if not org_id:
        return Response({'error': 'Organization ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    change_ids = request.data.get('change_ids', [])
    if not change_ids:
        return Response({'error': 'No change IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

    updated = TallyPendingSync.objects.filter(
        id__in=change_ids, organization_id=org_id, status='pending'
    ).update(status='synced', synced_at=timezone.now())

    if updated:
        TallyRealtimeSyncLog.objects.create(
            organization_id=org_id,
            event_type='nexinvo_to_tally',
            description=f'Synced {updated} change(s) to Tally',
            details={'change_ids': change_ids}
        )

    # Update last sync time
    from .models import TallyMapping
    TallyMapping.objects.filter(organization_id=org_id).update(
        last_realtime_sync=timezone.now()
    )

    return Response({
        'success': True,
        'synced_count': updated
    })
