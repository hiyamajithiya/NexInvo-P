from django.contrib import admin
from .models import (
    Organization, OrganizationMembership, CompanySettings, InvoiceSettings,
    Client, Invoice, InvoiceItem, Payment, EmailSettings, InvoiceFormatSettings,
    ServiceItem, PaymentTerm
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
