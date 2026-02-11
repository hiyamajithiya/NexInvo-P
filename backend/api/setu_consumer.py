"""
Setu WebSocket Consumer for NexInvo

This module handles WebSocket connections from Setu desktop connectors.
It enables real-time communication between the web application and local Tally instances.
"""

import json
import logging
from datetime import datetime
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


class SetuConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for Setu desktop connector.

    Handles:
    - Authentication via JWT token
    - Real-time sync requests from web app to desktop
    - Status updates from desktop to web app
    - Tally connection status monitoring
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.user = None
        self.organization_id = None
        self.connector_id = None
        self.group_name = None

        # Get token from query string or headers
        token = self.get_token_from_request()

        if not token:
            logger.warning("Setu connection rejected: No token provided")
            await self.close(code=4001)
            return

        # Validate token and get user
        user = await self.authenticate_token(token)

        if not user:
            logger.warning("Setu connection rejected: Invalid token")
            await self.close(code=4002)
            return

        self.user = user
        self.organization_id = await self.get_user_organization(user)

        if not self.organization_id:
            logger.warning(f"Setu connection rejected: User {user.email} has no organization")
            await self.close(code=4003)
            return

        # Create unique connector ID
        self.connector_id = f"setu_{self.organization_id}_{user.id}"

        # Join organization-specific group
        self.group_name = f"setu_org_{self.organization_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # Join user-specific group (for targeted messages)
        self.user_group = f"setu_user_{user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

        # Store connection info
        await self.store_connection_info()

        logger.info(f"Setu connector connected: {self.connector_id}")

        # Send welcome message
        await self.send_json({
            'type': 'CONNECTED',
            'data': {
                'connector_id': self.connector_id,
                'organization_id': self.organization_id,
                'message': 'Connected to NexInvo server'
            }
        })

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        logger.debug(f"[Setu Disconnect] WebSocket disconnecting, close_code: {close_code}, connector_id: {self.connector_id}")

        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        # Remove connection info from cache immediately
        if self.connector_id:
            await self.remove_connection_info()
            logger.debug(f"[Setu Disconnect] Removed cache entry for: {self.connector_id}")
            logger.info(f"Setu connector disconnected: {self.connector_id}")

    async def receive_json(self, content):
        """Handle incoming JSON messages from Setu connector."""
        message_type = content.get('type', '')
        data = content.get('data', {})

        logger.debug(f"Setu message received: {message_type}")

        try:
            if message_type == 'REGISTER':
                await self.handle_register(data)

            elif message_type == 'PING':
                # Refresh cache timeout on each ping to keep connection alive
                await self.refresh_heartbeat()
                await self.send_json({'type': 'PONG', 'timestamp': datetime.now().isoformat()})

            elif message_type == 'PONG':
                # Handle pong response (if server sends ping)
                pass

            elif message_type == 'TALLY_STATUS':
                logger.debug(f"[TALLY_STATUS] Received from {self.connector_id}: {data}")
                await self.handle_tally_status(data)

            elif message_type == 'CONNECTION_STATUS':
                await self.handle_connection_status(data)

            elif message_type == 'LEDGERS_RESPONSE':
                await self.handle_ledgers_response(data)

            elif message_type == 'LEDGERS_ERROR':
                await self.handle_ledgers_error(data)

            elif message_type == 'SYNC_RESULT':
                await self.handle_sync_result(data)

            elif message_type == 'SYNC_ERROR':
                await self.handle_sync_error(data)

            elif message_type == 'SYNC_QUEUED':
                await self.handle_sync_queued(data)

            elif message_type == 'PARTIES_RESPONSE':
                await self.handle_parties_response(data)

            elif message_type == 'PARTIES_ERROR':
                await self.handle_parties_error(data)

            elif message_type == 'STOCK_ITEMS_RESPONSE':
                await self.handle_stock_items_response(data)

            elif message_type == 'STOCK_ITEMS_ERROR':
                await self.handle_stock_items_error(data)

            elif message_type == 'SALES_VOUCHERS_RESPONSE':
                await self.handle_sales_vouchers_response(data)

            elif message_type == 'SALES_VOUCHERS_ERROR':
                await self.handle_sales_vouchers_error(data)
            else:
                logger.warning(f"Unknown message type from Setu: {message_type}")

        except Exception as e:
            logger.error(f"Error processing Setu message: {e}")
            await self.send_json({
                'type': 'ERROR',
                'data': {'message': str(e)}
            })

    # Message handlers

    async def handle_register(self, data):
        """Handle connector registration."""
        client_version = data.get('version', 'unknown')

        await self.update_connection_info({
            'version': client_version,
            'registered_at': datetime.now().isoformat()
        })

        logger.info(f"Setu connector registered: {self.connector_id}, version: {client_version}")

        await self.send_json({
            'type': 'REGISTERED',
            'data': {'message': 'Registration successful'}
        })

    async def handle_tally_status(self, data):
        """Handle Tally connection status update from connector."""
        connected = data.get('connected', False)
        company_name = data.get('companyName', '') or data.get('company_name', '')

        logger.debug(f"[handle_tally_status] Processing: connected={connected}, company_name={company_name}")

        # Broadcast to web clients
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'tally_status_update',
                'connected': connected,
                'company_name': company_name,
                'connector_id': self.connector_id
            }
        )

        # Update stored status with company name
        logger.debug(f"[handle_tally_status] Updating cache for {self.connector_id}")
        await self.update_connection_info({
            'tally_connected': connected,
            'company_name': company_name
        })
        logger.debug(f"[handle_tally_status] Cache updated successfully")

    async def handle_connection_status(self, data):
        """Handle connection check response."""
        # Forward to requesting web client
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'connection_status_response',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_ledgers_response(self, data):
        """Handle ledgers list response from Tally."""
        request_id = data.get('request_id', data.get('requestId', ''))
        ledgers = data.get('ledgers', [])

        logger.debug(f"[handle_ledgers_response] Received {len(ledgers)} ledgers for request {request_id}")

        # Store in cache for synchronous API to retrieve
        if request_id:
            await self.cache_ledgers_response(request_id, {'ledgers': ledgers})

        # Also broadcast to web clients for real-time updates
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'ledgers_response',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_ledgers_error(self, data):
        """Handle ledgers fetch error."""
        request_id = data.get('request_id', data.get('requestId', ''))
        error = data.get('error', 'Unknown error')

        logger.error(f"[handle_ledgers_error] Error for request {request_id}: {error}")

        # Store error in cache for synchronous API to retrieve
        if request_id:
            await self.cache_ledgers_response(request_id, {'error': error, 'ledgers': []})

        # Also broadcast to web clients
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'ledgers_error',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    @database_sync_to_async
    def cache_ledgers_response(self, request_id, data):
        """Store ledgers response in cache for synchronous API retrieval."""
        from django.core.cache import cache
        cache_key = f"ledgers_response_{self.organization_id}_{request_id}"
        cache.set(cache_key, data, timeout=60)  # Store for 60 seconds
        logger.debug(f"[cache_ledgers_response] Cached response at key: {cache_key}")

    @database_sync_to_async
    def cache_sync_response(self, request_id, data):
        """Store sync response in cache for synchronous API retrieval."""
        from django.core.cache import cache
        cache_key = f"sync_response_{self.organization_id}_{request_id}"
        cache.set(cache_key, data, timeout=120)  # Store for 2 minutes
        logger.debug(f"[cache_sync_response] Cached response at key: {cache_key}")

    async def handle_sync_result(self, data):
        """Handle sync result from connector."""
        request_id = data.get('requestId')
        success = data.get('success', [])
        failed = data.get('failed', [])

        logger.info(f"Sync result: {len(success)} success, {len(failed)} failed")

        # Update sync history in database
        await self.update_sync_history(request_id, success, failed)

        # Cache the response for synchronous API retrieval
        await self.cache_sync_response(request_id, {
            'success_count': len(success),
            'failed_count': len(failed),
            'success': success,
            'failed': failed,
            'errors': [f.get('error', '') for f in failed]
        })

        # Notify web clients
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'sync_result',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_sync_error(self, data):
        """Handle sync error from connector."""
        request_id = data.get('requestId')
        error = data.get('error')

        logger.error(f"Sync error for request {request_id}: {error}")

        # Update sync history
        await self.update_sync_history_error(request_id, error)

        # Cache the error response for synchronous API retrieval
        await self.cache_sync_response(request_id, {
            'success_count': 0,
            'failed_count': 0,
            'success': [],
            'failed': [],
            'errors': [error]
        })

        # Notify web clients
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'sync_error',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_sync_queued(self, data):
        """Handle sync queued notification."""
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'sync_queued',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_parties_response(self, data):
        """Handle parties list response from Tally."""
        request_id = data.get('request_id', data.get('requestId', ''))
        parties = data.get('parties', [])

        logger.debug(f"[handle_parties_response] Received {len(parties)} parties for request {request_id}")

        # Store in cache for synchronous API to retrieve
        if request_id:
            await self.cache_parties_response(request_id, {'parties': parties})

        # Broadcast to web clients
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'parties_response',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_parties_error(self, data):
        """Handle parties fetch error."""
        request_id = data.get('request_id', data.get('requestId', ''))
        error = data.get('error', 'Unknown error')

        logger.error(f"[handle_parties_error] Error for request {request_id}: {error}")

        if request_id:
            await self.cache_parties_response(request_id, {'error': error, 'parties': []})

        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'parties_error',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    @database_sync_to_async
    def cache_parties_response(self, request_id, data):
        """Store parties response in cache for synchronous API retrieval."""
        from django.core.cache import cache
        cache_key = f"parties_response_{self.organization_id}_{request_id}"
        cache.set(cache_key, data, timeout=60)
        logger.debug(f"[cache_parties_response] Cached response at key: {cache_key}")

    async def handle_stock_items_response(self, data):
        """Handle stock items list response from Tally."""
        request_id = data.get('request_id', data.get('requestId', ''))
        stock_items = data.get('stock_items', [])

        logger.debug(f"[handle_stock_items_response] Received {len(stock_items)} stock items for request {request_id}")

        if request_id:
            await self.cache_stock_items_response(request_id, {'stock_items': stock_items})

        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'stock_items_response',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_stock_items_error(self, data):
        """Handle stock items fetch error."""
        request_id = data.get('request_id', data.get('requestId', ''))
        error = data.get('error', 'Unknown error')

        logger.error(f"[handle_stock_items_error] Error for request {request_id}: {error}")

        if request_id:
            await self.cache_stock_items_response(request_id, {'error': error, 'stock_items': []})

        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'stock_items_error',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    @database_sync_to_async
    def cache_stock_items_response(self, request_id, data):
        """Store stock items response in cache for synchronous API retrieval."""
        from django.core.cache import cache
        cache_key = f"stock_items_response_{self.organization_id}_{request_id}"
        cache.set(cache_key, data, timeout=60)
        logger.debug(f"[cache_stock_items_response] Cached response at key: {cache_key}")

    async def handle_sales_vouchers_response(self, data):
        """Handle sales vouchers list response from Tally."""
        request_id = data.get('request_id', data.get('requestId', ''))
        vouchers = data.get('vouchers', [])

        logger.debug(f"[handle_sales_vouchers_response] Received {len(vouchers)} sales vouchers for request {request_id}")

        if request_id:
            await self.cache_sales_vouchers_response(request_id, {'vouchers': vouchers})

        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'sales_vouchers_response',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_sales_vouchers_error(self, data):
        """Handle sales vouchers fetch error."""
        request_id = data.get('request_id', data.get('requestId', ''))
        error = data.get('error', 'Unknown error')

        logger.error(f"[handle_sales_vouchers_error] Error for request {request_id}: {error}")

        if request_id:
            await self.cache_sales_vouchers_response(request_id, {'error': error, 'vouchers': []})

        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'sales_vouchers_error',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    @database_sync_to_async
    def cache_sales_vouchers_response(self, request_id, data):
        """Store sales vouchers response in cache for synchronous API retrieval."""
        from django.core.cache import cache
        cache_key = f"sales_vouchers_response_{self.organization_id}_{request_id}"
        cache.set(cache_key, data, timeout=120)  # 2 minutes as it may have more data
        logger.debug(f"[cache_sales_vouchers_response] Cached response at key: {cache_key}")

    # Channel layer message handlers (from web app)

    async def sync_request(self, event):
        """Forward sync request to Setu connector."""
        await self.send_json({
            'type': 'SYNC_REQUEST',
            'data': event['data']
        })

    async def check_connection(self, event):
        """Forward connection check request."""
        await self.send_json({
            'type': 'CHECK_CONNECTION',
            'data': event.get('data', {})
        })

    async def get_ledgers(self, event):
        """Forward get ledgers request."""
        await self.send_json({
            'type': 'GET_LEDGERS',
            'data': event.get('data', {})
        })

    async def ping_connector(self, event):
        """Send ping to connector."""
        await self.send_json({
            'type': 'PING',
            'timestamp': datetime.now().isoformat()
        })

    async def get_parties(self, event):
        """Forward get parties request to Setu connector."""
        await self.send_json({
            'type': 'GET_PARTIES',
            'data': event.get('data', {})
        })

    async def get_stock_items(self, event):
        """Forward get stock items request to Setu connector."""
        await self.send_json({
            'type': 'GET_STOCK_ITEMS',
            'data': event.get('data', {})
        })

    async def get_sales_vouchers(self, event):
        """Forward get sales vouchers request to Setu connector."""
        await self.send_json({
            'type': 'GET_SALES_VOUCHERS',
            'data': event.get('data', {})
        })

    # Helper methods

    def get_token_from_request(self):
        """Extract JWT token from query string or headers."""
        # Try query string first
        query_string = self.scope.get('query_string', b'').decode()
        if query_string:
            params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
            if 'token' in params:
                return params['token']

        # Try headers
        headers = dict(self.scope.get('headers', []))
        auth_header = headers.get(b'authorization', b'').decode()
        if auth_header.startswith('Bearer '):
            return auth_header[7:]

        return None

    @database_sync_to_async
    def authenticate_token(self, token):
        """Validate JWT token and return user."""
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except (TokenError, User.DoesNotExist) as e:
            logger.warning(f"Token authentication failed: {e}")
            return None

    @database_sync_to_async
    def get_user_organization(self, user):
        """Get user's organization ID from membership."""
        from api.models import OrganizationMembership

        # Check organization memberships (primary method for NexInvo)
        try:
            membership = OrganizationMembership.objects.filter(
                user=user,
                is_active=True
            ).first()

            if membership:
                return str(membership.organization.id)
        except Exception as e:
            logger.error(f"Error getting organization membership: {e}")

        # Fallback: Check if user has organization_id attribute
        if hasattr(user, 'organization_id') and user.organization_id:
            return user.organization_id

        # Fallback: Check if user has direct organization
        if hasattr(user, 'organization') and user.organization:
            return user.organization.id

        return None

    @database_sync_to_async
    def store_connection_info(self):
        """Store connector connection info in cache/database."""
        from django.core.cache import cache

        cache.set(
            f"setu_connector_{self.connector_id}",
            {
                'user_id': self.user.id,
                'organization_id': self.organization_id,
                'connected_at': datetime.now().isoformat(),
                'channel_name': self.channel_name,
                'tally_connected': False,
                'last_heartbeat': datetime.now().isoformat()
            },
            timeout=120  # 2 minutes - requires periodic heartbeat to stay alive
        )

    @database_sync_to_async
    def update_connection_info(self, data):
        """Update connector info in cache."""
        from django.core.cache import cache

        key = f"setu_connector_{self.connector_id}"
        info = cache.get(key, {})
        info.update(data)
        info['last_heartbeat'] = datetime.now().isoformat()
        cache.set(key, info, timeout=120)  # Reset 2 minute timeout on each update

    @database_sync_to_async
    def remove_connection_info(self):
        """Remove connector info from cache."""
        from django.core.cache import cache
        cache.delete(f"setu_connector_{self.connector_id}")

    async def refresh_heartbeat(self):
        """Refresh the cache timeout to keep connection alive."""
        await self.update_connection_info({})

    @database_sync_to_async
    def update_sync_history(self, request_id, success, failed):
        """Update sync history in database."""
        from .models import TallySyncHistory, InvoiceTallySync, Invoice

        try:
            sync_history = TallySyncHistory.objects.get(id=request_id)
            sync_history.invoices_synced = len(success)
            sync_history.invoices_failed = len(failed)
            sync_history.status = 'success' if not failed else ('partial' if success else 'failed')
            sync_history.sync_completed_at = datetime.now()

            if failed:
                sync_history.failed_invoice_ids = [f['invoiceId'] for f in failed]
                sync_history.error_message = '; '.join([f"{f['invoiceNumber']}: {f['error']}" for f in failed[:5]])

            sync_history.save()

            # Create InvoiceTallySync records for successful syncs
            for item in success:
                invoice_id = item.get('invoiceId')
                if invoice_id:
                    try:
                        invoice = Invoice.objects.get(id=invoice_id)
                        InvoiceTallySync.objects.update_or_create(
                            invoice=invoice,
                            defaults={
                                'sync_history': sync_history,
                                'synced': True,
                                'tally_voucher_number': item.get('invoiceNumber', ''),
                                'tally_voucher_date': invoice.invoice_date
                            }
                        )
                    except Invoice.DoesNotExist:
                        pass

        except TallySyncHistory.DoesNotExist:
            logger.error(f"Sync history not found: {request_id}")

    @database_sync_to_async
    def update_sync_history_error(self, request_id, error):
        """Update sync history with error."""
        from .models import TallySyncHistory

        try:
            sync_history = TallySyncHistory.objects.get(id=request_id)
            sync_history.status = 'failed'
            sync_history.error_message = error
            sync_history.sync_completed_at = datetime.now()
            sync_history.save()
        except TallySyncHistory.DoesNotExist:
            logger.error(f"Sync history not found: {request_id}")


# Utility function to send messages to Setu connectors
async def send_to_setu_connector(organization_id, message_type, data):
    """
    Send a message to all Setu connectors for an organization.

    Usage from views:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"setu_org_{organization_id}",
            {
                'type': message_type,
                'data': data
            }
        )
    """
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"setu_org_{organization_id}",
        {
            'type': message_type,
            'data': data
        }
    )
