"""
Audit Logging Utilities for IT Act & DPDP Act Compliance.

This module provides helper functions for creating audit log entries
throughout the application. All significant user actions should be logged
for compliance with IT Act 2000/2008 and DPDP Act 2023.
"""

import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Extract client IP address from request.
    Handles X-Forwarded-For header for proxied requests.
    """
    ip_header = getattr(settings, 'AUDIT_LOG_IP_HEADER', 'REMOTE_ADDR')

    # Check X-Forwarded-For first (for reverse proxy setups)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Take the first IP in the chain (client's real IP)
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get(ip_header, request.META.get('REMOTE_ADDR', ''))

    return ip or None


def get_user_agent(request):
    """Extract user agent string from request."""
    return request.META.get('HTTP_USER_AGENT', '')[:500]


def create_audit_log(
    action,
    description,
    user=None,
    organization=None,
    request=None,
    resource_type='',
    resource_id='',
    resource_name='',
    old_values=None,
    new_values=None,
    severity='info',
    metadata=None
):
    """
    Create an audit log entry.

    Args:
        action: Action type from AuditLog.ACTION_CHOICES
        description: Human-readable description of the action
        user: Django User object (optional)
        organization: Organization object (optional)
        request: Django HttpRequest object (optional, for IP/user-agent)
        resource_type: Type of resource affected (e.g., 'Invoice', 'Client')
        resource_id: ID of the affected resource
        resource_name: Name/identifier of the affected resource
        old_values: Dict of previous values (for updates)
        new_values: Dict of new values (for updates)
        severity: 'info', 'warning', or 'critical'
        metadata: Additional context data as dict

    Returns:
        AuditLog instance or None if logging is disabled
    """
    # Check if audit logging is enabled
    if not getattr(settings, 'AUDIT_LOG_ENABLED', True):
        return None

    # Check if action should be excluded
    exclude_actions = getattr(settings, 'AUDIT_LOG_EXCLUDE_ACTIONS', [])
    if action in exclude_actions:
        return None

    try:
        from .models import AuditLog

        audit_entry = AuditLog(
            user=user,
            organization=organization,
            action=action,
            severity=severity,
            description=description,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else '',
            resource_name=resource_name,
            old_values=old_values,
            new_values=new_values,
            metadata=metadata,
        )

        # Extract request details if available
        if request:
            audit_entry.ip_address = get_client_ip(request)
            audit_entry.user_agent = get_user_agent(request)
            audit_entry.request_method = request.method
            audit_entry.request_path = request.path[:500]

            # Get user from request if not provided
            if not user and hasattr(request, 'user') and request.user.is_authenticated:
                audit_entry.user = request.user

            # Get organization from request if not provided
            if not organization and hasattr(request, 'organization'):
                audit_entry.organization = request.organization

        audit_entry.save()
        return audit_entry

    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}")
        return None


def log_login(request, user, success=True):
    """Log successful or failed login attempt."""
    if success:
        return create_audit_log(
            action='login',
            description=f"User {user.email} logged in successfully",
            user=user,
            request=request,
            severity='info'
        )
    else:
        email = request.data.get('email', 'unknown')
        return create_audit_log(
            action='login_failed',
            description=f"Failed login attempt for email: {email}",
            request=request,
            severity='warning',
            metadata={'attempted_email': email}
        )


def log_logout(request, user):
    """Log user logout."""
    return create_audit_log(
        action='logout',
        description=f"User {user.email} logged out",
        user=user,
        request=request
    )


def log_password_change(request, user):
    """Log password change."""
    return create_audit_log(
        action='password_change',
        description=f"User {user.email} changed their password",
        user=user,
        request=request,
        severity='info'
    )


def log_password_reset(request, email):
    """Log password reset request."""
    return create_audit_log(
        action='password_reset',
        description=f"Password reset requested for {email}",
        request=request,
        metadata={'email': email}
    )


def log_create(request, model_instance, user=None, organization=None):
    """Log record creation."""
    model_name = model_instance.__class__.__name__
    return create_audit_log(
        action='create',
        description=f"Created {model_name}: {str(model_instance)}",
        user=user,
        organization=organization,
        request=request,
        resource_type=model_name,
        resource_id=getattr(model_instance, 'pk', ''),
        resource_name=str(model_instance),
        new_values=_serialize_instance(model_instance)
    )


def log_update(request, model_instance, old_values=None, user=None, organization=None):
    """Log record update."""
    model_name = model_instance.__class__.__name__
    return create_audit_log(
        action='update',
        description=f"Updated {model_name}: {str(model_instance)}",
        user=user,
        organization=organization,
        request=request,
        resource_type=model_name,
        resource_id=getattr(model_instance, 'pk', ''),
        resource_name=str(model_instance),
        old_values=old_values,
        new_values=_serialize_instance(model_instance)
    )


def log_delete(request, model_instance, user=None, organization=None):
    """Log record deletion."""
    model_name = model_instance.__class__.__name__
    return create_audit_log(
        action='delete',
        description=f"Deleted {model_name}: {str(model_instance)}",
        user=user,
        organization=organization,
        request=request,
        resource_type=model_name,
        resource_id=getattr(model_instance, 'pk', ''),
        resource_name=str(model_instance),
        old_values=_serialize_instance(model_instance),
        severity='warning'
    )


def log_export(request, export_type, user=None, organization=None):
    """Log data export."""
    return create_audit_log(
        action='export',
        description=f"Data export: {export_type}",
        user=user,
        organization=organization,
        request=request,
        severity='info',
        metadata={'export_type': export_type}
    )


def log_email_sent(request, recipient, subject, user=None, organization=None):
    """Log email sent."""
    return create_audit_log(
        action='email_sent',
        description=f"Email sent to {recipient}: {subject}",
        user=user,
        organization=organization,
        request=request,
        metadata={'recipient': recipient, 'subject': subject}
    )


def log_consent(request, user, consent_type, given=True):
    """Log consent given or withdrawn."""
    action = 'consent_given' if given else 'consent_withdrawn'
    status = 'given' if given else 'withdrawn'
    return create_audit_log(
        action=action,
        description=f"Consent {status} for {consent_type}",
        user=user,
        request=request,
        metadata={'consent_type': consent_type}
    )


def log_data_deletion_request(request, user, data_types):
    """Log data deletion request (DPDP Act compliance)."""
    return create_audit_log(
        action='data_deletion',
        description=f"Data deletion request by {user.email}",
        user=user,
        request=request,
        severity='warning',
        metadata={'data_types': data_types}
    )


def log_personal_data_export(request, user):
    """Log personal data export (DPDP Act - Right to Data Portability)."""
    return create_audit_log(
        action='data_export',
        description=f"Personal data export by {user.email}",
        user=user,
        request=request,
        metadata={'export_type': 'personal_data'}
    )


def log_settings_change(request, settings_type, user=None, organization=None, old_values=None, new_values=None):
    """Log settings change."""
    return create_audit_log(
        action='settings_change',
        description=f"Settings updated: {settings_type}",
        user=user,
        organization=organization,
        request=request,
        resource_type=settings_type,
        old_values=old_values,
        new_values=new_values
    )


def _serialize_instance(instance, exclude_fields=None):
    """
    Serialize a model instance to a dict for audit logging.
    Excludes sensitive fields like passwords.
    """
    if exclude_fields is None:
        exclude_fields = ['password', '_smtp_password', 'smtp_password', 'token', 'secret']

    try:
        data = {}
        for field in instance._meta.fields:
            field_name = field.name
            if field_name not in exclude_fields and not field_name.startswith('_'):
                value = getattr(instance, field_name, None)
                # Convert non-serializable types
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif hasattr(value, 'pk'):
                    value = str(value.pk)
                elif not isinstance(value, (str, int, float, bool, type(None), list, dict)):
                    value = str(value)
                data[field_name] = value
        return data
    except Exception:
        return {'str': str(instance)}
