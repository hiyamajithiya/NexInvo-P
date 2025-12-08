"""
Organization middleware for multi-tenant support.
Sets the current organization context for each request.
"""
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import OrganizationMembership, UserSession


class OrganizationMiddleware(MiddlewareMixin):
    """
    Middleware to set the current organization for the authenticated user.

    The organization is determined by:
    1. X-Organization-ID header (for organization switching)
    2. User's most recently joined active organization (default)

    This middleware handles JWT authentication to ensure the user is authenticated
    before setting the organization context.
    """

    def process_request(self, request):
        # Initialize organization attributes
        request.organization = None
        request.organization_role = None

        # Try to authenticate with JWT if Authorization header is present
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
                request.user = user
                
                # Validate session token for single device login
                session_token = request.headers.get('X-Session-Token')
                if session_token:
                    if not UserSession.validate_session(user, session_token):
                        # Session is invalid (user logged in from another device)
                        return JsonResponse({
                            'error': 'session_invalid',
                            'detail': 'Your session has been terminated because you logged in from another device.'
                        }, status=401)
                    # Update last activity
                    try:
                        session = UserSession.objects.get(user=user)
                        session.save()  # Updates last_activity via auto_now
                    except UserSession.DoesNotExist:
                        pass
            except (AuthenticationFailed, Exception):
                # Authentication failed, user will remain unauthenticated
                pass

        # Only process for authenticated users
        if not hasattr(request, 'user') or not request.user.is_authenticated or isinstance(request.user, AnonymousUser):
            return

        # Check for organization ID in header (for switching)
        org_id = request.headers.get('X-Organization-ID')

        if org_id:
            # Validate user has access to this organization
            try:
                membership = OrganizationMembership.objects.select_related('organization').get(
                    user=request.user,
                    organization_id=org_id,
                    is_active=True,
                    organization__is_active=True
                )
                request.organization = membership.organization
                request.organization_role = membership.role
                return
            except OrganizationMembership.DoesNotExist:
                # Invalid organization ID, fall through to default
                pass

        # Get user's default organization (most recently joined active one)
        try:
            membership = OrganizationMembership.objects.select_related('organization').filter(
                user=request.user,
                is_active=True,
                organization__is_active=True
            ).order_by('-joined_at').first()

            if membership:
                request.organization = membership.organization
                request.organization_role = membership.role
        except Exception as e:
            # Log the exception for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error setting organization for user {request.user.email}: {str(e)}")
