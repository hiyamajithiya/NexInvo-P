from django.contrib import admin
from .models import (
    Organization, OrganizationMembership, CompanySettings, InvoiceSettings,
    Client, Invoice, InvoiceItem, Payment, Receipt, EmailSettings, InvoiceFormatSettings,
    ServiceItem, PaymentTerm, SubscriptionPlan, Coupon, CouponUsage, Subscription
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'plan', 'is_active', 'created_at']
    search_fields = ['name', 'slug']
    list_filter = ['plan', 'is_active', 'created_at']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'organization', 'role', 'is_active', 'joined_at']
    search_fields = ['user__email', 'user__username', 'organization__name']
    list_filter = ['role', 'is_active', 'joined_at']


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ['companyName', 'organization', 'email', 'phone']
    search_fields = ['companyName', 'email', 'organization__name']
    list_filter = ['organization']


@admin.register(InvoiceSettings)
class InvoiceSettingsAdmin(admin.ModelAdmin):
    list_display = ['organization', 'invoicePrefix', 'proformaPrefix', 'defaultGstRate']
    search_fields = ['organization__name']
    list_filter = ['organization']


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'city', 'organization', 'created_at']
    search_fields = ['name', 'email', 'phone', 'organization__name']
    list_filter = ['organization', 'city', 'state']


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'client', 'invoice_type', 'invoice_date', 'status', 'total_amount', 'organization', 'created_by']
    search_fields = ['invoice_number', 'client__name', 'organization__name']
    list_filter = ['status', 'invoice_type', 'organization', 'invoice_date']
    inlines = [InvoiceItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_date', 'payment_method', 'organization', 'created_by']
    search_fields = ['invoice__invoice_number', 'reference_number', 'organization__name']
    list_filter = ['payment_method', 'organization', 'payment_date']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'organization', 'received_from', 'amount_received', 'receipt_date', 'payment_method']
    list_filter = ['organization', 'receipt_date', 'payment_method']
    search_fields = ['receipt_number', 'received_from', 'notes']
    readonly_fields = ['receipt_number', 'created_at', 'updated_at']
    ordering = ['-receipt_date', '-created_at']


@admin.register(EmailSettings)
class EmailSettingsAdmin(admin.ModelAdmin):
    list_display = ['organization', 'smtp_host', 'smtp_port', 'from_email', 'use_tls']
    search_fields = ['organization__name', 'from_email']
    list_filter = ['use_tls', 'organization']


@admin.register(InvoiceFormatSettings)
class InvoiceFormatSettingsAdmin(admin.ModelAdmin):
    list_display = ['organization', 'show_logo', 'logo_position', 'header_color', 'font_size']
    search_fields = ['organization__name']
    list_filter = ['logo_position', 'font_size', 'show_logo', 'organization']


@admin.register(ServiceItem)
class ServiceItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'sac_code', 'gst_rate', 'organization', 'is_active', 'created_at']
    search_fields = ['name', 'sac_code', 'organization__name']
    list_filter = ['is_active', 'organization', 'created_at']


@admin.register(PaymentTerm)
class PaymentTermAdmin(admin.ModelAdmin):
    list_display = ['term_name', 'days', 'organization', 'is_active', 'created_at']
    search_fields = ['term_name', 'organization__name']
    list_filter = ['is_active', 'organization', 'created_at']


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'billing_cycle', 'max_users', 'max_invoices_per_month', 'is_active', 'is_visible', 'highlight', 'sort_order']
    search_fields = ['name', 'description']
    list_filter = ['billing_cycle', 'is_active', 'is_visible', 'highlight']
    list_editable = ['sort_order', 'is_active', 'is_visible', 'highlight']
    ordering = ['sort_order', 'price']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'price', 'billing_cycle', 'trial_days')
        }),
        ('Limits', {
            'fields': ('max_users', 'max_invoices_per_month', 'max_storage_gb')
        }),
        ('Features', {
            'fields': ('features',)
        }),
        ('Display & Status', {
            'fields': ('is_active', 'is_visible', 'sort_order', 'highlight')
        }),
    )


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'discount_type', 'discount_value', 'valid_from', 'valid_until', 'current_usage_count', 'max_total_uses', 'is_active']
    search_fields = ['code', 'name', 'description']
    list_filter = ['discount_type', 'is_active', 'valid_from', 'valid_until']
    readonly_fields = ['current_usage_count', 'created_at', 'updated_at', 'created_by']
    filter_horizontal = ['applicable_plans']
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description')
        }),
        ('Discount Details', {
            'fields': ('discount_type', 'discount_value', 'applicable_plans')
        }),
        ('Validity Period', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Usage Limits', {
            'fields': ('max_total_uses', 'max_uses_per_user', 'current_usage_count')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by during the first save
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ['coupon', 'organization', 'user', 'discount_amount', 'extended_days', 'used_at']
    search_fields = ['coupon__code', 'organization__name', 'user__email']
    list_filter = ['used_at', 'coupon__discount_type']
    readonly_fields = ['coupon', 'organization', 'user', 'subscription', 'discount_amount', 'extended_days', 'used_at']

    def has_add_permission(self, request):
        # Prevent manual addition - usages should only be created programmatically
        return False

    def has_change_permission(self, request, obj=None):
        # Read-only for all users
        return False

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion to maintain audit trail
        return request.user.is_superuser


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['organization', 'plan', 'status', 'start_date', 'end_date', 'trial_end_date', 'auto_renew', 'amount_paid']
    search_fields = ['organization__name', 'plan__name']
    list_filter = ['status', 'plan', 'auto_renew', 'start_date', 'end_date']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Subscription Details', {
            'fields': ('organization', 'plan', 'status')
        }),
        ('Period', {
            'fields': ('start_date', 'end_date', 'trial_end_date')
        }),
        ('Payment', {
            'fields': ('amount_paid', 'last_payment_date', 'next_billing_date', 'auto_renew')
        }),
        ('Coupon', {
            'fields': ('coupon_applied',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
