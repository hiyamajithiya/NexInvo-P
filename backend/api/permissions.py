"""
Role-Based Access Control (RBAC) permission classes for NexInvo.

Roles (from OrganizationMembership):
    owner  - Full control over organization and all data
    admin  - Manage members, settings, and all data
    user   - Create/edit own data, view organization data
    viewer - Read-only access (for accountants / CAs)

Usage in views:
    from api.permissions import IsOwnerOrAdmin, ReadOnlyForViewer, IsSuperAdmin

    class MyViewSet(ModelViewSet):
        permission_classes = [IsAuthenticated, ReadOnlyForViewer]
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ---------------------------------------------------------------------------
# Role hierarchy helpers
# ---------------------------------------------------------------------------

ROLE_HIERARCHY = {
    'owner': 4,
    'admin': 3,
    'user': 2,
    'viewer': 1,
}


def _get_role_level(request):
    """Return the numeric role level for the current request."""
    role = getattr(request, 'organization_role', None)
    return ROLE_HIERARCHY.get(role, 0)


# ---------------------------------------------------------------------------
# Reusable permission classes
# ---------------------------------------------------------------------------

class IsSuperAdmin(BasePermission):
    """
    Allow access only to Django superusers (superadmin panel).
    Replaces scattered ``request.user.is_superuser`` checks.
    """
    message = 'Superadmin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class IsOrganizationMember(BasePermission):
    """
    Allow access only to users who belong to the current organization.
    The OrganizationMiddleware must have set ``request.organization``.
    """
    message = 'You must be a member of this organization.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request, 'organization', None) is not None
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Allow access only to organization owners or admins.
    Use for sensitive operations: settings changes, member management,
    delete operations, etc.
    """
    message = 'Owner or admin access required.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superadmins bypass role checks
        if request.user.is_superuser:
            return True
        return _get_role_level(request) >= ROLE_HIERARCHY['admin']


class ReadOnlyForViewer(BasePermission):
    """
    Allow full access for owner/admin/user roles.
    Restrict viewer role to read-only (GET, HEAD, OPTIONS).

    This is the most commonly-used permission class — apply it to all
    data ViewSets to enforce the viewer read-only contract.
    """
    message = 'Viewers have read-only access.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superadmins bypass
        if request.user.is_superuser:
            return True
        role = getattr(request, 'organization_role', None)
        if role == 'viewer' and request.method not in SAFE_METHODS:
            return False
        return True


class IsOwner(BasePermission):
    """
    Allow access only to the organization owner.
    Use for destructive operations like deleting the organization itself.
    """
    message = 'Owner access required.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return _get_role_level(request) >= ROLE_HIERARCHY['owner']


class HasStaffPermission(BasePermission):
    """
    Check a specific boolean permission on the user's StaffProfile.

    Usage:
        class MyView(APIView):
            permission_classes = [IsAuthenticated, HasStaffPermission]
            staff_permission = 'can_view_revenue'

    Falls back to superadmin access if no staff profile exists.
    """
    message = 'Insufficient staff permissions.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        perm_name = getattr(view, 'staff_permission', None)
        if not perm_name:
            return True  # No specific permission required

        staff_profile = getattr(request.user, 'staff_profile', None)
        if staff_profile is None:
            try:
                from .models import StaffProfile
                staff_profile = StaffProfile.objects.get(user=request.user)
            except Exception:
                return False

        return getattr(staff_profile, perm_name, False)


class SettingsPermission(BasePermission):
    """
    Settings endpoints: owner/admin can read+write, user can read, viewer can read.
    """
    message = 'Only owners and admins can modify settings.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return True  # All members can read settings
        return _get_role_level(request) >= ROLE_HIERARCHY['admin']
