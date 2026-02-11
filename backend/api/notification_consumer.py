"""
WebSocket consumer for real-time notifications.
Sends notifications to connected users when events happen
(invoice created, payment received, sync completed, etc.)
"""
import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.

    Connect: ws://<host>/ws/notifications/?token=<jwt_token>

    Sends JSON messages:
        {"type": "notification", "data": {...}}
        {"type": "sync_status", "data": {...}}
        {"type": "invoice_update", "data": {...}}
    """

    async def connect(self):
        # Authenticate via token query param
        token = self.scope['query_string'].decode().split('token=')[-1] if b'token=' in self.scope['query_string'] else None

        if not token:
            await self.close(code=4001)
            return

        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
        except Exception:
            await self.close(code=4001)
            return

        self.user_id = str(user_id)
        self.group_name = f'notifications_{self.user_id}'

        # Join user-specific notification group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.info(f'Notification WS connected: user={self.user_id}')

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f'Notification WS disconnected: user={getattr(self, "user_id", "unknown")}')

    async def receive_json(self, content):
        # Client can send ping to keep alive
        msg_type = content.get('type', '')
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    # Group message handlers
    async def notification_message(self, event):
        """Handle notification messages from the channel layer."""
        await self.send_json({
            'type': 'notification',
            'data': event.get('data', {}),
        })

    async def sync_status(self, event):
        """Handle sync status updates."""
        await self.send_json({
            'type': 'sync_status',
            'data': event.get('data', {}),
        })

    async def invoice_update(self, event):
        """Handle invoice update notifications."""
        await self.send_json({
            'type': 'invoice_update',
            'data': event.get('data', {}),
        })
