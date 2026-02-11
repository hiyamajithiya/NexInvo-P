"""
views.py - Thin re-export module.

All view logic has been split into domain-specific modules for maintainability.
This file re-exports everything so that existing imports (urls.py, etc.) continue to work.

Domain modules:
  - views_auth.py          : Authentication, OTP, registration, profile, DPDP
  - views_settings.py      : Company, invoice, email, format settings
  - views_organization.py  : Organization management ViewSet
  - views_invoice.py       : Client, Invoice, ServiceItem, PaymentTerm, import/export
  - views_payment.py       : Payment, Receipt ViewSets
  - views_dashboard.py     : Dashboard statistics
  - views_user.py          : User management ViewSet
  - views_staff.py         : Staff profile management
  - views_subscription.py  : Subscription plans, coupons, upgrade requests
  - views_superadmin.py    : SuperAdmin stats, notifications, bulk email
  - views_tally.py         : Tally ERP sync endpoints
  - views_goods.py         : Goods Trader (units, products, suppliers, purchases)
  - views_accounting.py    : Accounting module (ledgers, vouchers, reconciliation)
  - views_scheduled.py     : Scheduled invoice management
  - views_reviews.py       : Reviews, testimonials, payment settings/requests
"""

# Auth: login, logout, OTP, registration, profile, password, DPDP compliance
from .views_auth import (
    EmailTokenObtainPairSerializer,
    EmailTokenObtainPairView,
    logout_view,
    send_otp_view,
    verify_otp_view,
    resend_otp_view,
    forgot_password_send_otp_view,
    forgot_password_verify_otp_view,
    forgot_password_reset_view,
    register_view,
    user_profile_view,
    change_password_view,
    delete_account_view,
    export_personal_data_view,
)

# Settings: company, invoice, email, format settings
from .views_settings import (
    company_settings_view,
    invoice_settings_view,
    email_settings_view,
    test_email_view,
    invoice_format_settings_view,
    send_report_email,
)

# Organization management
from .views_organization import (
    OrganizationViewSet,
)

# Invoice, Client, ServiceItem, PaymentTerm, import/export
from .views_invoice import (
    ClientViewSet,
    ServiceItemViewSet,
    PaymentTermViewSet,
    InvoiceViewSet,
    import_invoices,
    download_import_template,
    export_data,
)

# Payment and Receipt
from .views_payment import (
    PaymentViewSet,
    ReceiptViewSet,
)

# Dashboard
from .views_dashboard import (
    dashboard_stats,
)

# User management
from .views_user import (
    UserViewSet,
)

# Staff management
from .views_staff import (
    StaffProfileViewSet,
)

# Subscription, Coupons, Upgrade Requests
from .views_subscription import (
    SubscriptionPlanViewSet,
    CouponViewSet,
    CouponUsageViewSet,
    SubscriptionViewSet,
    SubscriptionUpgradeRequestViewSet,
    calculate_discount,
)

# SuperAdmin: stats, notifications, bulk email, email config
from .views_superadmin import (
    superadmin_stats,
    superadmin_email_config_view,
    superadmin_test_email_view,
    superadmin_notifications_list,
    superadmin_notifications_unread_count,
    superadmin_notification_mark_read,
    superadmin_notifications_mark_all_read,
    superadmin_notification_delete,
    superadmin_email_templates,
    superadmin_email_template_detail,
    superadmin_email_campaigns,
    superadmin_email_campaign_detail,
    superadmin_email_send_campaign,
    superadmin_email_preview_recipients,
    superadmin_email_send_quick,
)

# Tally ERP sync
from .views_tally import (
    tally_check_connection,
    tally_get_ledgers,
    tally_mappings,
    tally_sync_invoices,
    tally_preview_invoices,
    tally_sync_history,
    tally_get_parties,
    tally_preview_clients,
    tally_import_clients,
    tally_get_stock_items,
    tally_preview_products,
    tally_preview_services,
    tally_import_products,
    tally_import_services,
    tally_get_sales_vouchers,
    tally_two_way_sync_preview,
    tally_sync_to_nexinvo,
)

# Goods Trader
from .views_goods import (
    UnitOfMeasurementViewSet,
    ProductViewSet,
    SupplierViewSet,
    PurchaseViewSet,
    InventoryMovementViewSet,
    SupplierPaymentViewSet,
    ExpensePaymentViewSet,
    predefined_units_view,
)

# Accounting module
from .views_accounting import (
    FinancialYearViewSet,
    AccountGroupViewSet,
    LedgerAccountViewSet,
    VoucherViewSet,
    VoucherNumberSeriesViewSet,
    BankReconciliationViewSet,
    accounting_dashboard_stats,
)

# Scheduled Invoices
from .views_scheduled import (
    ScheduledInvoiceViewSet,
    scheduled_invoice_stats,
)

# Reviews, Testimonials, Payment Settings/Requests
from .views_reviews import (
    get_public_reviews,
    check_review_eligibility,
    dismiss_review_prompt,
    submit_review,
    superadmin_reviews,
    superadmin_approve_review,
    superadmin_reject_review,
    superadmin_toggle_featured_review,
    superadmin_payment_settings,
    get_payment_settings_public,
    get_my_payment_requests,
    submit_payment_request,
    superadmin_payment_requests,
    superadmin_approve_payment_request,
    superadmin_reject_payment_request,
)
