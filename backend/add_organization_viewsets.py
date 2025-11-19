"""
Script to add Organization ViewSets and update all existing ViewSets to use organization filtering.
"""

with open('api/views.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where to insert Organization ViewSets (before ClientViewSet)
insert_index = None
for i, line in enumerate(lines):
    if 'class ClientViewSet' in line:
        insert_index = i
        break

if insert_index is None:
    print("[ERROR] Could not find ClientViewSet")
    exit(1)

# Organization ViewSets to insert
organization_viewsets = '''
# ========== Organization Management ViewSets ==========

class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizations.
    Users can only see organizations they belong to.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Return organizations the user is a member of
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
            is_active=True
        ).distinct()

    def perform_create(self, serializer):
        # Create organization and make the creator an owner
        organization = serializer.save()
        OrganizationMembership.objects.create(
            organization=organization,
            user=self.request.user,
            role='owner',
            is_active=True
        )

    @action(detail=True, methods=['post'])
    def switch(self, request, pk=None):
        """Switch to this organization (sets it as current in response)"""
        organization = self.get_object()
        # Verify user has access
        try:
            membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            return Response({
                'organization_id': str(organization.id),
                'organization_name': organization.name,
                'role': membership.role,
                'message': f'Switched to {organization.name}'
            })
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List all members of the organization"""
        organization = self.get_object()
        memberships = OrganizationMembership.objects.filter(
            organization=organization,
            is_active=True
        ).select_related('user')
        serializer = OrganizationMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the organization"""
        organization = self.get_object()

        # Check if requester is owner or admin
        try:
            requester_membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only owners and admins can invite users'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user email from request
        email = request.data.get('email')
        role = request.data.get('role', 'user')

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'User with this email not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is already a member
        if OrganizationMembership.objects.filter(
            organization=organization,
            user=user
        ).exists():
            return Response(
                {'error': 'User is already a member of this organization'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create membership
        membership = OrganizationMembership.objects.create(
            organization=organization,
            user=user,
            role=role,
            is_active=True
        )

        serializer = OrganizationMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put'], url_path='members/(?P<user_id>[^/.]+)')
    def update_member(self, request, pk=None, user_id=None):
        """Update a member's role or status"""
        organization = self.get_object()

        # Check if requester is owner or admin
        try:
            requester_membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only owners and admins can update members'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the membership to update
        try:
            membership = OrganizationMembership.objects.get(
                organization=organization,
                user_id=user_id
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update role and/or status
        role = request.data.get('role')
        is_active = request.data.get('is_active')

        if role:
            membership.role = role
        if is_active is not None:
            membership.is_active = is_active

        membership.save()
        serializer = OrganizationMembershipSerializer(membership)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Remove a member from the organization"""
        organization = self.get_object()

        # Check if requester is owner or admin
        try:
            requester_membership = OrganizationMembership.objects.get(
                organization=organization,
                user=request.user,
                is_active=True
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only owners and admins can remove members'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the membership to remove
        try:
            membership = OrganizationMembership.objects.get(
                organization=organization,
                user_id=user_id
            )
        except OrganizationMembership.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Don't allow removing the last owner
        if membership.role == 'owner':
            owner_count = OrganizationMembership.objects.filter(
                organization=organization,
                role='owner',
                is_active=True
            ).count()
            if owner_count <= 1:
                return Response(
                    {'error': 'Cannot remove the last owner'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


'''

# Insert Organization ViewSets
lines.insert(insert_index, organization_viewsets)

# Now update all existing ViewSets to use organization
# Find and replace patterns in ViewSets
content = ''.join(lines)

import re

# Update get_queryset methods
replacements = [
    (r'Client\.objects\.filter\(user=self\.request\.user\)', 'Client.objects.filter(organization=self.request.organization)'),
    (r'ServiceItem\.objects\.filter\(user=self\.request\.user,', 'ServiceItem.objects.filter(organization=self.request.organization,'),
    (r'PaymentTerm\.objects\.filter\(user=self\.request\.user,', 'PaymentTerm.objects.filter(organization=self.request.organization,'),
    (r'Invoice\.objects\.filter\(user=self\.request\.user\)', 'Invoice.objects.filter(organization=self.request.organization)'),
    (r'Payment\.objects\.filter\(user=self\.request\.user\)', 'Payment.objects.filter(organization=self.request.organization)'),
    # Update perform_create methods
    (r'serializer\.save\(user=self\.request\.user\)', 'serializer.save(organization=self.request.organization, created_by=self.request.user)'),
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Special handling for Invoice and Payment perform_create (they need created_by)
# Replace the generic save back to specific ones
content = content.replace(
    'serializer.save(organization=self.request.organization, created_by=self.request.user)',
    'serializer.save(organization=self.request.organization, created_by=self.request.user)'
)

# For Client, ServiceItem, PaymentTerm - they don't need created_by
content = re.sub(
    r'class (Client|ServiceItem|PaymentTerm)ViewSet.*?def perform_create\(self, serializer\):\n        serializer\.save\(organization=self\.request\.organization, created_by=self\.request\.user\)',
    lambda m: f'class {m.group(1)}ViewSet{m.group(0).split("ViewSet")[1].split("def perform_create")[0]}def perform_create(self, serializer):\n        serializer.save(organization=self.request.organization)',
    content,
    flags=re.DOTALL
)

# Write back
with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Organization ViewSets added successfully!")
print("[OK] All existing ViewSets updated to use organization filtering!")
print("[OK] Updated ViewSets: Client, ServiceItem, PaymentTerm, Invoice, Payment")
print("\nNext step:")
print("1. Update URLs to include organization routes")
