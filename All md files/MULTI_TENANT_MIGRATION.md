# Multi-Tenant SaaS Migration Guide

## Overview

NexInvo is being converted from a single-user application to a multi-tenant SaaS platform where:
- Multiple organizations (tenants) can use the same system
- Each organization's data is completely isolated
- Users can belong to multiple organizations
- Each user can have different roles in different organizations

## Architecture Changes

### New Models

1. **Organization** - The tenant entity
   - UUID primary key for security
   - Name and slug for identification
   - Plan field (free, basic, professional, enterprise) for future billing
   - Active status for subscription management

2. **OrganizationMembership** - User-Organization relationship
   - Links users to organizations
   - Stores role (owner, admin, user)
   - Allows users to belong to multiple organizations

### Model Changes

All existing models are updated to belong to Organization instead of User:

| Model | Before | After |
|-------|--------|-------|
| CompanySettings | user (OneToOne) | organization (OneToOne) |
| InvoiceSettings | user (OneToOne) | organization (OneToOne) |
| EmailSettings | user (OneToOne) | organization (OneToOne) |
| InvoiceFormatSettings | user (OneToOne) | organization (OneToOne) |
| Client | user (ForeignKey) | organization (ForeignKey) |
| ServiceItem | user (ForeignKey) | organization (ForeignKey) |
| PaymentTerm | user (ForeignKey) | organization (ForeignKey) |
| Invoice | user (ForeignKey) | organization (ForeignKey) |
| Payment | user (ForeignKey) | organization (ForeignKey) |

### Additional Fields

Some models get additional tracking fields:
- Invoice: `created_by` (User) - tracks who created the invoice
- Payment: `created_by` (User) - tracks who recorded the payment

## Migration Strategy

### Phase 1: Database Schema (Current)
1. Create Organization and OrganizationMembership models
2. Update all models to use organization field
3. Keep old user fields temporarily for data migration

### Phase 2: Data Migration
1. Create a default organization for each existing user
2. Migrate all existing data to the new organization
3. Create OrganizationMembership records (user as owner)
4. Remove old user foreign keys

### Phase 3: Backend Updates
1. Update views and serializers to use organization context
2. Add middleware to set current organization from request
3. Update permissions to check organization membership
4. Add organization switcher API

### Phase 4: Frontend Updates
1. Add organization selection on login
2. Add organization switcher in UI
3. Update all API calls to include organization context
4. Add organization management UI

## User Workflows

### New User Registration
1. User signs up
2. System creates a new organization (named after user or specified)
3. User is added as owner of the organization
4. Default settings are created for the organization

### Existing User (After Migration)
1. User logs in
2. System shows list of organizations they belong to
3. User selects organization to work with
4. All data is filtered by selected organization

### Multi-Organization User
1. User can be invited to join other organizations
2. User can switch between organizations without logging out
3. Each organization maintains separate data and settings

## API Changes

### Authentication
- Login returns user info + list of organizations
- Organization ID must be included in API requests (header or query param)

### New Endpoints
- GET /api/organizations/ - List user's organizations
- POST /api/organizations/ - Create new organization
- GET /api/organizations/{id}/ - Get organization details
- PUT /api/organizations/{id}/ - Update organization
- GET /api/organizations/{id}/members/ - List members
- POST /api/organizations/{id}/invite/ - Invite user to organization

## Security Considerations

1. **Data Isolation**: All queries automatically filter by organization
2. **Permission Checks**: Verify user belongs to organization before any operation
3. **Role-Based Access**: Owner > Admin > User permissions
4. **UUID Keys**: Organization uses UUID to prevent enumeration attacks

## Future Enhancements

1. **Billing Integration**: Stripe/PayPal for subscriptions
2. **Usage Limits**: Based on plan (invoices/month, users, etc.)
3. **Custom Domains**: Organizations can have custom URLs
4. **White Labeling**: Enterprise plans can customize branding
5. **API Access**: Organization-specific API keys for integrations
