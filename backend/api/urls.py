from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

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
router.register(r'coupons', views.CouponViewSet, basename='coupon')
router.register(r'coupon-usages', views.CouponUsageViewSet, basename='coupon-usage')
router.register(r'subscriptions', views.SubscriptionViewSet, basename='subscription')

urlpatterns = [
    # Invoice-specific endpoints must come before router to avoid conflicts
    path('invoices/import/', views.import_invoices, name='import-invoices'),
    path('invoices/import-template/', views.download_import_template, name='download-import-template'),

    # Router URLs
    path('', include(router.urls)),

    # Other endpoints
    path('settings/company/', views.company_settings_view, name='company-settings'),
    path('settings/invoice/', views.invoice_settings_view, name='invoice-settings'),
    path('settings/email/', views.email_settings_view, name='email-settings'),
    path('settings/email/test/', views.test_email_view, name='test-email'),
    path('settings/invoice-format/', views.invoice_format_settings_view, name='invoice-format-settings'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('superadmin/stats/', views.superadmin_stats, name='superadmin-stats'),
    path('profile/', views.user_profile_view, name='user-profile'),
    path('profile/change-password/', views.change_password_view, name='change-password'),
]
