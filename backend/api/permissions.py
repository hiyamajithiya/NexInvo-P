"""
Custom permission classes for role-based access control.
"""
from rest_framework import permissions


class IsAuthenticatedWithRole(permissions.BasePermission):
    """
    Permission class that allows:
    - All authenticated users to read (GET, HEAD, OPTIONS)
    - Only non-viewer users to write (POST, PUT, PATCH, DELETE)

    This ensures viewers can access reports, download, and view data
    but cannot create, update, or delete records.
    """

    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Allow all safe methods (read operations) for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True

        # For write operations, check if user is viewer
        # Viewers should not be able to modify data
        organization_role = getattr(request, 'organization_role', None)
        if organization_role == 'viewer':
            return False

        return True


class IsNotViewer(permissions.BasePermission):
    """
    Permission class that denies access to viewers.
    Use this for endpoints that should never be accessible to viewers.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        organization_role = getattr(request, 'organization_role', None)
        if organization_role == 'viewer':
            return False

        return True


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class that only allows owners and admins.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers always have access
        if request.user.is_superuser:
            return True

        organization_role = getattr(request, 'organization_role', None)
        return organization_role in ['owner', 'admin']


class AllowViewerReadOnly(permissions.BasePermission):
    """
    Permission class specifically for endpoints where viewers need read access.
    - Viewers: Read only (GET, HEAD, OPTIONS)
    - Others: Full access
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        organization_role = getattr(request, 'organization_role', None)

        # Viewers can only read
        if organization_role == 'viewer':
            return request.method in permissions.SAFE_METHODS

        # All other roles have full access
        return True
