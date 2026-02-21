# Subscription Plans & Coupon System Implementation Plan

## Overview
Super admin can design subscription plans and create discount coupons that users (organization admins) can redeem for discounts on subscription price or extended subscription period.

## Features Required

### 1. Subscription Plan Management (Super Admin)
- Create/Edit/Delete subscription plans
- Define plan features:
  - Plan name (Free, Basic, Professional, Enterprise, etc.)
  - Price (monthly/yearly)
  - Max users allowed
  - Max invoices per month
  - Max storage (GB)
  - Custom features (email support, API access, custom branding, etc.)
  - Trial period (days)
  - Is active/visible

### 2. Coupon Management (Super Admin)
- Create/Edit/Delete/Deactivate coupons
- Coupon properties:
  - Coupon code (e.g., "WELCOME20", "NEWYEAR2025")
  - Discount type:
    - Percentage discount (e.g., 20% off)
    - Fixed amount discount (e.g., ₹500 off)
    - Extended period (e.g., +1 month free)
  - Discount value
  - Applicable plans (specific plans or all plans)
  - Usage limits:
    - Max total uses (e.g., first 100 customers)
    - Max uses per user (e.g., 1 per organization)
    - Valid from date
    - Valid until date
  - Is active
  - Current usage count

### 3. Coupon Redemption (Organization Admin)
- Redeem coupon during subscription purchase/renewal
- Validate coupon:
  - Check if code exists and is active
  - Check if user hasn't exceeded usage limit
  - Check if coupon is valid for selected plan
  - Check if coupon is within valid date range
  - Check if total usage limit not exceeded
- Apply discount:
  - Calculate discounted price
  - Or extend subscription period
- Record coupon usage

## Database Models

### SubscriptionPlan Model
```python
class SubscriptionPlan(models.Model):
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=100)  # Free, Basic, Pro, Enterprise
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default='monthly')
    trial_days = models.IntegerField(default=0)  # Free trial period

    # Limits
    max_users = models.IntegerField(default=1)
    max_invoices_per_month = models.IntegerField(default=100)
    max_storage_gb = models.IntegerField(default=1)

    # Features (JSON field)
    features = models.JSONField(default=dict, blank=True)  # {"email_support": true, "api_access": false}

    # Status
    is_active = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)  # Show on pricing page

    # Display
    sort_order = models.IntegerField(default=0)  # For ordering plans
    highlight = models.BooleanField(default=False)  # Highlight as "Most Popular"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Coupon Model
```python
class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage Discount'),
        ('fixed', 'Fixed Amount Discount'),
        ('extended_period', 'Extended Period'),
    ]

    code = models.CharField(max_length=50, unique=True)  # WELCOME20
    name = models.CharField(max_length=100)  # Internal name
    description = models.TextField(blank=True)

    # Discount details
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)  # 20 for 20%, 500 for ₹500, 30 for 30 days

    # Applicable plans (if empty, applies to all)
    applicable_plans = models.ManyToManyField(SubscriptionPlan, blank=True, related_name='coupons')

    # Validity
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()

    # Usage limits
    max_total_uses = models.IntegerField(null=True, blank=True)  # Total uses across all users
    max_uses_per_user = models.IntegerField(default=1)  # Per organization
    current_usage_count = models.IntegerField(default=0)

    # Status
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_coupons')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### CouponUsage Model
```python
class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='coupon_usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coupon_usages')

    # Subscription details
    subscription = models.ForeignKey('Subscription', on_delete=models.CASCADE, related_name='coupon_usages', null=True)

    # Discount applied
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Actual discount amount
    extended_days = models.IntegerField(default=0)  # Extra days added

    used_at = models.DateTimeField(auto_now_add=True)
```

### Subscription Model (Enhanced)
```python
class Subscription(models.Model):
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')

    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    trial_end_date = models.DateField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    auto_renew = models.BooleanField(default=True)

    # Payment
    last_payment_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)

    # Coupon applied
    coupon_applied = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True, related_name='applied_subscriptions')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## API Endpoints

### Subscription Plans (Super Admin Only)
- `GET /api/subscription-plans/` - List all plans
- `POST /api/subscription-plans/` - Create plan
- `GET /api/subscription-plans/{id}/` - Get plan details
- `PUT /api/subscription-plans/{id}/` - Update plan
- `DELETE /api/subscription-plans/{id}/` - Delete plan
- `GET /api/subscription-plans/public/` - List active/visible plans (for all users)

### Coupons (Super Admin Only)
- `GET /api/coupons/` - List all coupons
- `POST /api/coupons/` - Create coupon
- `GET /api/coupons/{id}/` - Get coupon details
- `PUT /api/coupons/{id}/` - Update coupon
- `DELETE /api/coupons/{id}/` - Delete coupon
- `POST /api/coupons/{id}/deactivate/` - Deactivate coupon

### Coupon Redemption (Org Admin)
- `POST /api/coupons/validate/` - Validate coupon code
  - Request: `{"code": "WELCOME20", "plan_id": 2}`
  - Response: `{"valid": true, "discount_type": "percentage", "discount_value": 20, "final_price": 800}`
- `POST /api/coupons/redeem/` - Redeem coupon
  - Request: `{"code": "WELCOME20", "plan_id": 2}`
  - Response: `{"subscription": {...}, "discount_applied": 200}`

### Subscriptions
- `GET /api/subscriptions/my-subscription/` - Get current org subscription
- `POST /api/subscriptions/subscribe/` - Subscribe to a plan
- `POST /api/subscriptions/upgrade/` - Upgrade plan
- `POST /api/subscriptions/cancel/` - Cancel subscription

## Frontend Pages

### 1. Super Admin - Subscription Plans Management
**Path:** `/superadmin/subscription-plans`

Features:
- Table listing all plans
- Create/Edit/Delete plan buttons
- Toggle active/visible status
- Preview pricing page
- Reorder plans (drag & drop)

### 2. Super Admin - Coupon Management
**Path:** `/superadmin/coupons`

Features:
- Table listing all coupons with:
  - Code, Type, Value, Valid dates
  - Usage (current/max)
  - Status (active/expired/deactivated)
- Create/Edit/Delete/Deactivate buttons
- Filter by status, type, validity
- Search by code
- Export coupon usage report

### 3. Organization Admin - Pricing & Subscription
**Path:** `/subscription/plans`

Features:
- Display all active plans in cards
- Current plan highlighted
- Upgrade/Downgrade buttons
- Coupon code input field
- Apply coupon and see updated price
- Subscribe/Upgrade with coupon

### 4. Organization Admin - Current Subscription
**Path:** `/subscription/current`

Features:
- Current plan details
- Usage statistics (users, invoices, storage)
- Billing history
- Next billing date
- Upgrade/Cancel buttons
- Applied coupon details (if any)

## Implementation Steps

### Phase 1: Backend Models & Migrations
1. Create SubscriptionPlan model
2. Create Coupon model
3. Create CouponUsage model
4. Enhance Subscription model
5. Create migrations
6. Register in admin panel

### Phase 2: Backend API
1. Create SubscriptionPlanViewSet (Super Admin)
2. Create CouponViewSet (Super Admin)
3. Create coupon validation endpoint
4. Create coupon redemption endpoint
5. Create subscription management endpoints
6. Add permissions

### Phase 3: Frontend - Super Admin
1. Subscription Plans Management page
2. Coupon Management page
3. Plan form modal
4. Coupon form modal
5. Usage analytics

### Phase 4: Frontend - Organization Admin
1. Pricing page with all plans
2. Coupon redemption UI
3. Current subscription page
4. Upgrade/Downgrade flow
5. Payment integration (if needed)

### Phase 5: Business Logic
1. Subscription expiry checker (cron job)
2. Auto-disable features on expiry
3. Renewal reminders
4. Usage limit enforcement

## Testing Checklist

- [ ] Super admin can create/edit/delete plans
- [ ] Super admin can create/edit/delete coupons
- [ ] Coupon validation works correctly
- [ ] Percentage discount calculates correctly
- [ ] Fixed amount discount calculates correctly
- [ ] Extended period adds days correctly
- [ ] Usage limits are enforced
- [ ] Date range validation works
- [ ] Plan-specific coupons work
- [ ] One-time use per user enforced
- [ ] Max total uses enforced
- [ ] Expired coupons rejected
- [ ] Invalid coupons rejected
- [ ] Subscription upgrades work
- [ ] Subscription cancellation works

## Next Steps

Would you like me to:
1. Start implementing the backend models and migrations?
2. Create the API endpoints?
3. Build the frontend pages?

Please confirm and I'll begin the implementation step by step.
