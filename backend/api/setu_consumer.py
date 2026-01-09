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
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        # Remove connection info
        if self.connector_id:
            await self.remove_connection_info()
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
                await self.send_json({'type': 'PONG', 'timestamp': datetime.now().isoformat()})

            elif message_type == 'PONG':
                # Handle pong response (for connection health check)
                pass

            elif message_type == 'TALLY_STATUS':
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

        # Broadcast to web clients
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'tally_status_update',
                'connected': connected,
                'connector_id': self.connector_id
            }
        )

        # Update stored status
        await self.update_connection_info({'tally_connected': connected})

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
        await self.channel_layer.group_send(
            f"web_org_{self.organization_id}",
            {
                'type': 'ledgers_error',
                'data': data,
                'connector_id': self.connector_id
            }
        )

    async def handle_sync_result(self, data):
        """Handle sync result from connector."""
        request_id = data.get('requestId')
        success = data.get('success', [])
        failed = data.get('failed', [])

        logger.info(f"Sync result: {len(success)} success, {len(failed)} failed")

        # Update sync history in database
        await self.update_sync_history(request_id, success, failed)

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
        """Get user's organization ID."""
        # Adjust based on your user-organization relationship
        if hasattr(user, 'organization_id'):
            return user.organization_id
        if hasattr(user, 'organization'):
            return user.organization.id if user.organization else None
        # Check profile or membership
        if hasattr(user, 'profile') and hasattr(user.profile, 'organization'):
            return user.profile.organization.id if user.profile.organization else None
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
                'tally_connected': False
            },
            timeout=3600  # 1 hour
        )

    @database_sync_to_async
    def update_connection_info(self, data):
        """Update connector info in cache."""
        from django.core.cache import cache

        key = f"setu_connector_{self.connector_id}"
        info = cache.get(key, {})
        info.update(data)
        cache.set(key, info, timeout=3600)

    @database_sync_to_async
    def remove_connection_info(self):
        """Remove connector info from cache."""
        from django.core.cache import cache
        cache.delete(f"setu_connector_{self.connector_id}")

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
