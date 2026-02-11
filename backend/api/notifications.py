"""Utility to send real-time notifications to connected WebSocket clients."""
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def notify_user(user_id, notification_type, data):
    """
    Send a real-time notification to a specific user.

    Args:
        user_id: The user's ID
        notification_type: One of 'notification_message', 'sync_status', 'invoice_update'
        data: Dict of notification data
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f'notifications_{user_id}',
        {
            'type': notification_type,
            'data': data,
        }
    )
