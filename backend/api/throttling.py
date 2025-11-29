"""
Custom Throttling Classes for IT Act Compliance.

Provides rate limiting for sensitive endpoints to prevent brute force attacks.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Rate limiting for login attempts.
    Limits: 5 requests per minute per IP.
    """
    scope = 'login'


class PasswordResetRateThrottle(AnonRateThrottle):
    """
    Rate limiting for password reset requests.
    Limits: 3 requests per hour per IP.
    """
    scope = 'password_reset'


class RegistrationRateThrottle(AnonRateThrottle):
    """
    Rate limiting for registration requests.
    Limits: 10 requests per hour per IP.
    """
    scope = 'registration'


class ExportRateThrottle(UserRateThrottle):
    """
    Rate limiting for data export requests.
    Limits: 10 requests per hour per user.
    """
    scope = 'export'


class SensitiveOperationThrottle(UserRateThrottle):
    """
    Rate limiting for sensitive operations (settings changes, etc.).
    Limits: 30 requests per hour per user.
    """
    rate = '30/hour'
