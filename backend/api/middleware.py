"""
Organization middleware for multi-tenant support.
Sets the current organization context for each request.
"""
from django.utils.deprecation import MiddlewareMixin
from .models import OrganizationMembership


class OrganizationMiddleware(MiddlewareMixin):
    """
    Middleware to set the current organization for the authenticated user.

    The organization is determined by:
    1. X-Organization-ID header (for organization switching)
    2. User's most recently joined active organization (default)
    """

    def process_request(self, request):
        # Only process for authenticated users
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            request.organization = None
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
            else:
                request.organization = None
                request.organization_role = None
        except Exception:
            request.organization = None
            request.organization_role = None
