import logging
import time
from django.utils.deprecation import MiddlewareMixin

audit_logger = logging.getLogger('django.security')


class AuditLogMiddleware(MiddlewareMixin):
    """Log security-relevant API actions to the security log."""

    # Paths that should always be audit-logged
    AUDIT_PATHS = [
        '/api/token/',
        '/api/register/',
        '/api/logout/',
        '/api/forgot-password/',
        '/api/profile/delete-account/',
        '/api/profile/change-password/',
        '/api/superadmin/',
    ]

    def process_request(self, request):
        request._audit_start_time = time.time()

    def process_response(self, request, response):
        # Only log write operations (POST/PUT/PATCH/DELETE) and security-relevant paths
        should_audit = (
            request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
            or any(request.path.startswith(p) for p in self.AUDIT_PATHS)
        )

        if not should_audit:
            return response

        duration = time.time() - getattr(request, '_audit_start_time', time.time())
        user = getattr(request, 'user', None)
        user_info = user.email if user and hasattr(user, 'email') and user.is_authenticated else 'anonymous'
        org = getattr(request, 'organization', None)
        org_info = str(org.id) if org else 'none'

        # Determine log level based on status code
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code in (401, 403):
            log_level = logging.WARNING
        else:
            log_level = logging.INFO

        audit_logger.log(
            log_level,
            'AUDIT | %s %s | user=%s | org=%s | status=%d | duration=%.3fs | ip=%s',
            request.method,
            request.path,
            user_info,
            org_info,
            response.status_code,
            duration,
            request.META.get('REMOTE_ADDR', 'unknown'),
        )

        return response
