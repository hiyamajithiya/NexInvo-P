from django.contrib import admin
from .models import CompanySettings, InvoiceSettings, Client, Invoice, InvoiceItem, Payment, EmailSettings, InvoiceFormatSettings


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ['companyName', 'user', 'email', 'phone']
    search_fields = ['companyName', 'email']


@admin.register(InvoiceSettings)
class InvoiceSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'invoicePrefix', 'startingNumber', 'defaultGstRate']


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'city', 'user', 'created_at']
    search_fields = ['name', 'email', 'phone']
    list_filter = ['user', 'city', 'state']


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'client', 'invoice_type', 'invoice_date', 'status', 'total_amount', 'user']
    search_fields = ['invoice_number', 'client__name']
    list_filter = ['status', 'invoice_type', 'user', 'invoice_date']
    inlines = [InvoiceItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_date', 'payment_method', 'user']
    search_fields = ['invoice__invoice_number', 'reference_number']
    list_filter = ['payment_method', 'user', 'payment_date']


@admin.register(EmailSettings)
class EmailSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'smtp_host', 'smtp_port', 'from_email', 'use_tls']
    search_fields = ['user__username', 'from_email']
    list_filter = ['use_tls']


@admin.register(InvoiceFormatSettings)
class InvoiceFormatSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'show_logo', 'logo_position', 'header_color', 'font_size']
    search_fields = ['user__username']
    list_filter = ['logo_position', 'font_size', 'show_logo']
