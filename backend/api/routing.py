"""
WebSocket URL routing for NexInvo

This module defines WebSocket URL patterns for the application,
including the Setu connector endpoint.
"""

from django.urls import re_path
from . import setu_consumer
from .notification_consumer import NotificationConsumer

websocket_urlpatterns = [
    # Setu desktop connector WebSocket endpoint
    re_path(r'ws/setu/$', setu_consumer.SetuConsumer.as_asgi()),
    # Real-time notification WebSocket endpoint
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
]
