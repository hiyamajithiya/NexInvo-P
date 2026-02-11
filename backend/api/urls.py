from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import setu_views
from . import dashboard_views

router = DefaultRouter()
router.register(r'organizations', views.OrganizationViewSet, basename='organization')
router.register(r'clients', views.ClientViewSet, basename='client')
router.register(r'service-items', views.ServiceItemViewSet, basename='service-item')
router.register(r'payment-terms', views.PaymentTermViewSet, basename='payment-term')
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'receipts', views.ReceiptViewSet, basename='receipt')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'subscription-plans', views.SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'staff-profiles', views.StaffProfileViewSet, basename='staff-profile')
router.register(r'coupons', views.CouponViewSet, basename='coupon')
router.register(r'coupon-usages', views.CouponUsageViewSet, basename='coupon-usage')
router.register(r'subscriptions', views.SubscriptionViewSet, basename='subscription')
router.register(r'subscription-upgrade-requests', views.SubscriptionUpgradeRequestViewSet, basename='subscription-upgrade-request')
router.register(r'scheduled-invoices', views.ScheduledInvoiceViewSet, basename='scheduled-invoice')

# Goods Trader routes
router.register(r'units', views.UnitOfMeasurementViewSet, basename='unit')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'suppliers', views.SupplierViewSet, basename='supplier')
router.register(r'purchases', views.PurchaseViewSet, basename='purchase')
router.register(r'inventory-movements', views.InventoryMovementViewSet, basename='inventory-movement')
router.register(r'supplier-payments', views.SupplierPaymentViewSet, basename='supplier-payment')
router.register(r'expense-payments', views.ExpensePaymentViewSet, basename='expense-payment')

# Accounting Module routes
router.register(r'financial-years', views.FinancialYearViewSet, basename='financial-year')
router.register(r'account-groups', views.AccountGroupViewSet, basename='account-group')
router.register(r'ledger-accounts', views.LedgerAccountViewSet, basename='ledger-account')
router.register(r'vouchers', views.VoucherViewSet, basename='voucher')
router.register(r'voucher-series', views.VoucherNumberSeriesViewSet, basename='voucher-series')
router.register(r'bank-reconciliations', views.BankReconciliationViewSet, basename='bank-reconciliation')
urlpatterns = [
    # Invoice-specific endpoints must come before router to avoid conflicts
    path('invoices/import/', views.import_invoices, name='import-invoices'),
    path('invoices/import-template/', views.download_import_template, name='download-import-template'),
    path('export/', views.export_data, name='export-data'),
    path('reports/send-email/', views.send_report_email, name='send-report-email'),
    # Scheduled Invoices stats (must be before router to avoid conflict)
    path('scheduled-invoices/stats/', views.scheduled_invoice_stats, name='scheduled-invoice-stats'),
    # Email Logs stats
    path('', include(router.urls)),

    # Other endpoints
    path('settings/company/', views.company_settings_view, name='company-settings'),
    path('settings/invoice/', views.invoice_settings_view, name='invoice-settings'),
    path('settings/email/', views.email_settings_view, name='email-settings'),
    path('settings/email/test/', views.test_email_view, name='test-email'),
    path('settings/invoice-format/', views.invoice_format_settings_view, name='invoice-format-settings'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('superadmin/stats/', views.superadmin_stats, name='superadmin-stats'),
    path('superadmin/email-config/', views.superadmin_email_config_view, name='superadmin-email-config'),
    path('superadmin/email-config/test/', views.superadmin_test_email_view, name='superadmin-test-email'),
    # SuperAdmin Notifications
    path('superadmin/notifications/', views.superadmin_notifications_list, name='superadmin-notifications'),
    path('superadmin/notifications/unread-count/', views.superadmin_notifications_unread_count, name='superadmin-notifications-unread-count'),
    path('superadmin/notifications/<int:notification_id>/mark-read/', views.superadmin_notification_mark_read, name='superadmin-notification-mark-read'),
    path('superadmin/notifications/mark-all-read/', views.superadmin_notifications_mark_all_read, name='superadmin-notifications-mark-all-read'),
    path('superadmin/notifications/<int:notification_id>/delete/', views.superadmin_notification_delete, name='superadmin-notification-delete'),
    # SuperAdmin Bulk Email
    path('superadmin/bulk-email/templates/', views.superadmin_email_templates, name='superadmin-email-templates'),
    path('superadmin/bulk-email/templates/<int:template_id>/', views.superadmin_email_template_detail, name='superadmin-email-template-detail'),
    path('superadmin/bulk-email/campaigns/', views.superadmin_email_campaigns, name='superadmin-email-campaigns'),
    path('superadmin/bulk-email/campaigns/<int:campaign_id>/', views.superadmin_email_campaign_detail, name='superadmin-email-campaign-detail'),
    path('superadmin/bulk-email/campaigns/<int:campaign_id>/send/', views.superadmin_email_send_campaign, name='superadmin-email-send-campaign'),
    path('superadmin/bulk-email/preview-recipients/', views.superadmin_email_preview_recipients, name='superadmin-email-preview-recipients'),
    path('superadmin/bulk-email/send-quick/', views.superadmin_email_send_quick, name='superadmin-email-send-quick'),
    path('profile/', views.user_profile_view, name='user-profile'),
    path('profile/change-password/', views.change_password_view, name='change-password'),
    # DPDP Act compliance endpoints
    path('profile/delete-account/', views.delete_account_view, name='delete-account'),
    path('profile/export-data/', views.export_personal_data_view, name='export-personal-data'),
    # Tally Sync endpoints
    path('tally-sync/check-connection/', views.tally_check_connection, name='tally-check-connection'),
    path('tally-sync/tally-ledgers/', views.tally_get_ledgers, name='tally-get-ledgers'),
    path('tally-sync/mappings/', views.tally_mappings, name='tally-mappings'),
    path('tally-sync/sync-invoices/', views.tally_sync_invoices, name='tally-sync-invoices'),
    path('tally-sync/preview-invoices/', views.tally_preview_invoices, name='tally-preview-invoices'),
    path('tally-sync/sync-history/', views.tally_sync_history, name='tally-sync-history'),
    # Tally Import endpoints
    path('tally-sync/parties/', views.tally_get_parties, name='tally-get-parties'),
    path('tally-sync/preview-clients/', views.tally_preview_clients, name='tally-preview-clients'),
    path('tally-sync/import-clients/', views.tally_import_clients, name='tally-import-clients'),
    path('tally-sync/stock-items/', views.tally_get_stock_items, name='tally-get-stock-items'),
    path('tally-sync/preview-products/', views.tally_preview_products, name='tally-preview-products'),
    path('tally-sync/preview-services/', views.tally_preview_services, name='tally-preview-services'),
    path('tally-sync/import-products/', views.tally_import_products, name='tally-import-products'),
    path('tally-sync/import-services/', views.tally_import_services, name='tally-import-services'),
    # Two-way Tally sync
    path('tally-sync/sales-vouchers/', views.tally_get_sales_vouchers, name='tally-get-sales-vouchers'),
    path('tally-sync/two-way-preview/', views.tally_two_way_sync_preview, name='tally-two-way-preview'),
    path('tally-sync/sync-to-nexinvo/', views.tally_sync_to_nexinvo, name='tally-sync-to-nexinvo'),
    # Feature 1: Company Info Import
    path('tally-sync/company-info/', views.tally_get_company_info, name='tally-get-company-info'),
    path('tally-sync/import-company-info/', views.tally_import_company_info, name='tally-import-company-info'),
    # Feature 2: Opening Balances Import
    path('tally-sync/ledgers-with-balances/', views.tally_get_ledgers_with_balances, name='tally-get-ledgers-with-balances'),
    path('tally-sync/preview-opening-balances/', views.tally_preview_opening_balances, name='tally-preview-opening-balances'),
    path('tally-sync/import-opening-balances/', views.tally_import_opening_balances, name='tally-import-opening-balances'),
    # Feature 3: All Vouchers Import
    path('tally-sync/all-vouchers/', views.tally_get_all_vouchers, name='tally-get-all-vouchers'),
    path('tally-sync/preview-import-vouchers/', views.tally_preview_import_vouchers, name='tally-preview-import-vouchers'),
    path('tally-sync/import-vouchers/', views.tally_import_vouchers, name='tally-import-vouchers'),
    # Feature 4: Real-Time Sync
    path('tally-sync/realtime-config/', views.tally_realtime_sync_config, name='tally-realtime-sync-config'),
    path('tally-sync/realtime-status/', views.tally_realtime_sync_status, name='tally-realtime-sync-status'),
    path('tally-sync/realtime-log/', views.tally_realtime_sync_log, name='tally-realtime-sync-log'),
    path('tally-sync/pending-changes/', views.tally_get_pending_changes, name='tally-get-pending-changes'),
    path('tally-sync/mark-changes-synced/', views.tally_mark_changes_synced, name='tally-mark-changes-synced'),
    # Payment Settings & Payment Requests
    path('superadmin/payment-settings/', views.superadmin_payment_settings, name='superadmin-payment-settings'),
    path('payment-settings/', views.get_payment_settings_public, name='payment-settings-public'),
    path('payment-requests/', views.get_my_payment_requests, name='my-payment-requests'),
    path('payment-requests/submit/', views.submit_payment_request, name='submit-payment-request'),
    path('superadmin/payment-requests/', views.superadmin_payment_requests, name='superadmin-payment-requests'),
    path('superadmin/payment-requests/<uuid:request_id>/approve/', views.superadmin_approve_payment_request, name='superadmin-approve-payment-request'),
    path('superadmin/payment-requests/<uuid:request_id>/reject/', views.superadmin_reject_payment_request, name='superadmin-reject-payment-request'),
    # Reviews & Testimonials
    path('reviews/public/', views.get_public_reviews, name='public-reviews'),
    path('reviews/eligibility/', views.check_review_eligibility, name='review-eligibility'),
    path('reviews/dismiss-prompt/', views.dismiss_review_prompt, name='dismiss-review-prompt'),
    path('reviews/submit/', views.submit_review, name='submit-review'),
    path('superadmin/reviews/', views.superadmin_reviews, name='superadmin-reviews'),
    path('superadmin/reviews/<uuid:review_id>/approve/', views.superadmin_approve_review, name='superadmin-approve-review'),
    path('superadmin/reviews/<uuid:review_id>/reject/', views.superadmin_reject_review, name='superadmin-reject-review'),
    path('superadmin/reviews/<uuid:review_id>/toggle-featured/', views.superadmin_toggle_featured_review, name='superadmin-toggle-featured-review'),
    # Setu Desktop Connector endpoints (for Tally integration via local connector)
    path('setu/status/', setu_views.get_setu_status, name='setu-status'),
    path('setu/connector/', setu_views.check_setu_connector, name='setu-connector'),
    path('setu/check-tally/', setu_views.request_tally_connection_check, name='setu-check-tally'),
    path('setu/get-ledgers/', setu_views.request_tally_ledgers, name='setu-get-ledgers'),
    path('setu/sync-invoices/', setu_views.sync_invoices_via_setu, name='setu-sync-invoices'),
    path('setu/sync-status/<int:sync_id>/', setu_views.get_setu_sync_status, name='setu-sync-status'),

    # Goods Trader additional endpoints
    path('units/predefined/', views.predefined_units_view, name='predefined-units'),

    # Accounting Module additional endpoints
    path('accounting/dashboard/', views.accounting_dashboard_stats, name='accounting-dashboard'),
    path('accounting/recalculate-balances/', views.recalculate_all_balances, name='accounting-recalculate-balances'),

    # Dashboard Summary APIs (for dashboard widgets)
    path('dashboard/ageing-summary/', dashboard_views.ageing_report_summary, name='dashboard-ageing-summary'),
    path('dashboard/analytics-summary/', dashboard_views.analytics_summary, name='dashboard-analytics-summary'),
    path('dashboard/bank-reconciliation-status/', dashboard_views.bank_reconciliation_status, name='dashboard-bank-reconciliation-status'),
    path('dashboard/tally-sync-status/', dashboard_views.tally_sync_status, name='dashboard-tally-sync-status'),
    path('dashboard/opening-balance-status/', dashboard_views.opening_balance_status, name='dashboard-opening-balance-status'),
    path('dashboard/payment-reminders/', dashboard_views.payment_reminders_summary, name='dashboard-payment-reminders'),
]
