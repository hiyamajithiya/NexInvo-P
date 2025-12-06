from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import (
    Organization, OrganizationMembership, CompanySettings, InvoiceSettings,
    Client, Invoice, InvoiceItem, Payment, Receipt, EmailSettings, SystemEmailSettings,
    InvoiceFormatSettings, ServiceItem, PaymentTerm, SubscriptionPlan, Coupon,
    CouponUsage, Subscription, SubscriptionUpgradeRequest, SuperAdminNotification,
    ScheduledInvoice, ScheduledInvoiceItem, ScheduledInvoiceLog
)


class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'plan', 'is_active', 'member_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'member_count']

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ['id', 'organization', 'organization_name', 'user', 'user_email',
                  'user_name', 'role', 'is_active', 'joined_at', 'updated_at']
        read_only_fields = ['id', 'joined_at', 'updated_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = ['id', 'companyName', 'tradingName', 'address', 'city', 'state',
                  'pinCode', 'stateCode', 'gstin', 'gstRegistrationDate', 'pan', 'phone', 'email', 'logo',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceSettings
        fields = ['id', 'invoicePrefix', 'startingNumber', 'proformaPrefix',
                  'proformaStartingNumber', 'receiptPrefix', 'receiptStartingNumber',
                  'gstEnabled', 'defaultGstRate', 'paymentDueDays',
                  'termsAndConditions', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'code', 'email', 'phone', 'mobile', 'address', 'city', 'state',
                  'pinCode', 'stateCode', 'gstin', 'pan', 'date_of_birth', 'date_of_incorporation',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_code(self, value):
        """Allow empty code for auto-generation"""
        # Convert empty string or whitespace-only string to empty string
        # The model's save() method will auto-generate it
        if value and value.strip():
            return value.strip()
        return ''


class ServiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceItem
        fields = ['id', 'name', 'description', 'sac_code', 'gst_rate', 'is_active',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTerm
        fields = ['id', 'term_name', 'days', 'description', 'is_active',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'hsn_sac', 'gst_rate',
                  'taxable_amount', 'total_amount']
        read_only_fields = ['id']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    payment_term_name = serializers.CharField(source='payment_term.term_name', read_only=True)
    payment_term_description = serializers.CharField(source='payment_term.description', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'client', 'client_name', 'invoice_number', 'invoice_type',
                  'invoice_date', 'status', 'subtotal', 'tax_amount', 'round_off', 'total_amount',
                  'payment_term', 'payment_term_name', 'payment_term_description',
                  'payment_terms', 'notes', 'parent_proforma', 'is_emailed', 'emailed_at',
                  'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'invoice_number', 'client_name', 'payment_term_name',
                           'payment_term_description', 'is_emailed', 'emailed_at',
                           'created_at', 'updated_at']

    def create(self, validated_data):
        from decimal import Decimal

        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        # Check if GST should be applied to this invoice
        should_apply_gst = invoice.should_apply_gst()

        for item_data in items_data:
            # If GST should not be applied, set gst_rate to 0 and recalculate amounts
            if not should_apply_gst:
                item_data['gst_rate'] = Decimal('0.00')
                # Recalculate total_amount without GST
                item_data['total_amount'] = item_data['taxable_amount']

            InvoiceItem.objects.create(invoice=invoice, **item_data)

        # Recalculate invoice totals with rounding
        invoice.subtotal = sum(item.taxable_amount for item in invoice.items.all())
        invoice.tax_amount = sum(item.total_amount - item.taxable_amount for item in invoice.items.all())

        # Calculate total before rounding
        total_before_round = invoice.subtotal + invoice.tax_amount

        # Round to nearest rupee
        rounded_total = round(total_before_round)
        invoice.round_off = Decimal(str(rounded_total)) - total_before_round
        invoice.total_amount = Decimal(str(rounded_total))
        invoice.save()

        return invoice

    def update(self, instance, validated_data):
        from decimal import Decimal

        items_data = validated_data.pop('items', None)

        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Check if GST should be applied to this invoice
            should_apply_gst = instance.should_apply_gst()

            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                # If GST should not be applied, set gst_rate to 0 and recalculate amounts
                if not should_apply_gst:
                    item_data['gst_rate'] = Decimal('0.00')
                    # Recalculate total_amount without GST
                    item_data['total_amount'] = item_data['taxable_amount']

                InvoiceItem.objects.create(invoice=instance, **item_data)

            # Recalculate invoice totals with rounding
            instance.subtotal = sum(item.taxable_amount for item in instance.items.all())
            instance.tax_amount = sum(item.total_amount - item.taxable_amount for item in instance.items.all())

            # Calculate total before rounding
            total_before_round = instance.subtotal + instance.tax_amount

            # Round to nearest rupee
            rounded_total = round(total_before_round)
            instance.round_off = Decimal(str(rounded_total)) - total_before_round
            instance.total_amount = Decimal(str(rounded_total))
            instance.save()

        return instance


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    client_name = serializers.CharField(source='invoice.client.name', read_only=True)
    receipt_id = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'invoice_number', 'client_name', 'amount',
                  'tds_amount', 'gst_tds_amount', 'amount_received', 'payment_date', 'payment_method',
                  'reference_number', 'notes', 'receipt_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'invoice_number', 'client_name', 'receipt_id', 'created_at', 'updated_at']

    def get_receipt_id(self, obj):
        """Get the receipt ID if one exists for this payment"""
        if hasattr(obj, 'receipt') and obj.receipt:
            return obj.receipt.id
        return None


class ReceiptSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    client_name = serializers.CharField(source='invoice.client.name', read_only=True)
    payment_reference = serializers.CharField(source='payment.reference_number', read_only=True)

    class Meta:
        model = Receipt
        fields = ['id', 'payment', 'invoice', 'invoice_number', 'client_name',
                  'receipt_number', 'receipt_date', 'amount_received', 'tds_amount',
                  'gst_tds_amount', 'total_amount', 'payment_method', 'received_from', 'towards', 'notes',
                  'payment_reference', 'created_at', 'updated_at']
        read_only_fields = ['id', 'receipt_number', 'invoice_number', 'client_name',
                            'payment_reference', 'created_at', 'updated_at']


class EmailSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailSettings
        fields = ['id', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
                  'from_email', 'from_name', 'use_tls', 'email_signature',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'smtp_password': {'write_only': True}  # Don't expose password in GET requests
        }


class SystemEmailSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemEmailSettings
        fields = ['id', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
                  'from_email', 'use_tls', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'smtp_password': {'write_only': True}  # Don't expose password in GET requests
        }


class InvoiceFormatSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceFormatSettings
        fields = [
            'id', 'show_logo', 'logo_position', 'show_company_designation',
            'company_designation_text', 'header_color', 'show_company_name',
            'show_trading_name', 'show_address', 'show_gstin', 'show_pan',
            'show_phone', 'show_email', 'show_invoice_number', 'show_invoice_date',
            'show_due_date', 'show_client_gstin', 'show_client_pan', 'show_client_phone',
            'show_client_email', 'table_header_bg_color', 'table_header_text_color',
            'show_hsn_sac_column', 'show_serial_number', 'show_taxable_value',
            'show_cgst_sgst_separate', 'show_igst', 'show_gst_percentage',
            'show_subtotal', 'show_tax_breakup', 'show_grand_total_in_words',
            'show_bank_details', 'bank_account_number', 'bank_name', 'bank_ifsc',
            'bank_branch', 'show_signature', 'signature_label', 'show_company_seal',
            'show_payment_terms', 'show_notes', 'show_terms_conditions',
            'show_computer_generated_note', 'show_page_numbers', 'font_size',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.CharField(required=False, allow_blank=True)
    organization_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'password', 'role', 'date_joined', 'organization_count']
        read_only_fields = ['id', 'username', 'date_joined', 'organization_count', 'is_superuser']

    def to_representation(self, instance):
        """Add role from OrganizationMembership and organization_count to the response"""
        data = super().to_representation(instance)

        # Add organization_count from annotation if available
        if hasattr(instance, 'organization_count'):
            data['organization_count'] = instance.organization_count
        else:
            # Fallback: count organizations manually
            data['organization_count'] = instance.organization_memberships.filter(is_active=True).count()

        # Get organization from context
        organization = self.context.get('organization')

        if organization:
            try:
                membership = OrganizationMembership.objects.get(
                    user=instance,
                    organization=organization
                )
                data['role'] = membership.role
            except OrganizationMembership.DoesNotExist:
                data['role'] = 'user'
        else:
            data['role'] = 'user'

        return data
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.pop('role', 'user')
        email = validated_data.get('email')

        if not email:
            raise serializers.ValidationError({'email': 'Email is required'})

        if not password:
            raise serializers.ValidationError({'password': 'Password is required'})

        # Validate password
        validate_password(password)

        # Validate role
        valid_roles = ['owner', 'admin', 'user']
        if role not in valid_roles:
            role = 'user'

        # Create user with email as username
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_active=validated_data.get('is_active', True),
            is_staff=validated_data.get('is_staff', False)
        )

        # Get organization from context (should be set by ViewSet)
        organization = self.context.get('organization')

        if organization:
            # Add user to the organization with the specified role
            OrganizationMembership.objects.create(
                organization=organization,
                user=user,
                role=role,
                is_active=True
            )

        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.pop('role', None)

        # Update user fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.is_staff = validated_data.get('is_staff', instance.is_staff)

        # Update password if provided
        if password:
            validate_password(password)
            instance.set_password(password)

        # Update role in OrganizationMembership if provided
        if role:
            valid_roles = ['owner', 'admin', 'user']
            if role in valid_roles:
                organization = self.context.get('organization')
                if organization:
                    try:
                        membership = OrganizationMembership.objects.get(
                            user=instance,
                            organization=organization
                        )
                        membership.role = role
                        membership.save()
                    except OrganizationMembership.DoesNotExist:
                        pass

        instance.save()
        return instance


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'billing_cycle', 'trial_days',
            'max_users', 'max_organizations', 'max_invoices_per_month', 'max_storage_gb',
            'features', 'is_active', 'is_visible', 'sort_order', 'highlight',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for coupons"""
    applicable_plan_names = serializers.SerializerMethodField()
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    is_valid_now = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'name', 'description',
            'discount_type', 'discount_value',  # Legacy fields
            'discount_types', 'discount_percentage', 'discount_fixed', 'discount_days',  # New fields
            'applicable_plans', 'applicable_plan_names', 'valid_from', 'valid_until',
            'max_total_uses', 'max_uses_per_user', 'current_usage_count',
            'is_active', 'is_valid_now', 'created_by', 'created_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_usage_count', 'created_by', 'created_at', 'updated_at']

    def get_applicable_plan_names(self, obj):
        """Get names of applicable plans"""
        if obj.applicable_plans.count() == 0:
            return ['All Plans']
        return [plan.name for plan in obj.applicable_plans.all()]

    def get_is_valid_now(self, obj):
        """Check if coupon is currently valid"""
        is_valid, message = obj.is_valid()
        return is_valid

    def validate(self, data):
        """Validate that at least one discount type is provided"""
        discount_types = data.get('discount_types', [])

        # If using new multi-discount system
        if discount_types:
            if len(discount_types) > 2:
                raise serializers.ValidationError("Maximum 2 discount types can be selected")

            # Validate each discount type has a corresponding value
            if 'percentage' in discount_types and not data.get('discount_percentage'):
                raise serializers.ValidationError("Percentage discount value is required")
            if 'fixed' in discount_types and not data.get('discount_fixed'):
                raise serializers.ValidationError("Fixed discount amount is required")
            if 'extended_period' in discount_types and not data.get('discount_days'):
                raise serializers.ValidationError("Extended period days is required")

        return data


class CouponUsageSerializer(serializers.ModelSerializer):
    """Serializer for coupon usage records"""
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = CouponUsage
        fields = [
            'id', 'coupon', 'coupon_code', 'organization', 'organization_name',
            'user', 'user_email', 'subscription', 'discount_amount', 'extended_days',
            'used_at'
        ]
        read_only_fields = ['id', 'used_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    coupon_code = serializers.CharField(source='coupon_applied.code', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_active_now = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'organization', 'organization_name', 'plan', 'plan_name', 'plan_details',
            'start_date', 'end_date', 'trial_end_date', 'status', 'auto_renew',
            'last_payment_date', 'next_billing_date', 'amount_paid',
            'coupon_applied', 'coupon_code', 'days_remaining', 'is_active_now',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_days_remaining(self, obj):
        """Get days remaining in subscription"""
        return obj.days_remaining()

    def get_is_active_now(self, obj):
        """Check if subscription is currently active"""
        return obj.is_active()


class SubscriptionUpgradeRequestSerializer(serializers.ModelSerializer):
    """Serializer for subscription upgrade requests"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    current_plan_name = serializers.CharField(source='current_plan.name', read_only=True, allow_null=True)
    requested_plan_name = serializers.CharField(source='requested_plan.name', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True, allow_null=True)

    class Meta:
        model = SubscriptionUpgradeRequest
        fields = [
            'id', 'organization', 'organization_name', 'requested_by', 'requested_by_email',
            'requested_by_name', 'current_plan', 'current_plan_name', 'requested_plan',
            'requested_plan_name', 'coupon_code', 'payment_method', 'payment_reference',
            'amount', 'status', 'user_notes', 'admin_notes', 'approved_by',
            'approved_by_email', 'approved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'current_plan', 'amount', 'status',
                           'requested_by', 'approved_by', 'approved_at',
                           'created_at', 'updated_at']

    def get_requested_by_name(self, obj):
        """Get requested by user's full name"""
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None


class SuperAdminNotificationSerializer(serializers.ModelSerializer):
    """Serializer for superadmin notifications"""
    organization_name = serializers.CharField(source='organization.name', read_only=True, allow_null=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)

    class Meta:
        model = SuperAdminNotification
        fields = [
            'id', 'notification_type', 'title', 'message', 'organization',
            'organization_name', 'user', 'user_name', 'user_email',
            'related_object_type', 'related_object_id', 'is_read', 'read_at',
            'read_by', 'action_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


# =============================================================================
# SCHEDULED INVOICE SERIALIZERS
# =============================================================================

class ScheduledInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledInvoiceItem
        fields = ['id', 'description', 'hsn_sac', 'gst_rate', 'taxable_amount', 'total_amount']
        read_only_fields = ['id']


class ScheduledInvoiceLogSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, allow_null=True)

    class Meta:
        model = ScheduledInvoiceLog
        fields = ['id', 'invoice', 'invoice_number', 'status', 'generation_date',
                  'error_message', 'email_sent', 'email_sent_at', 'email_error', 'created_at']
        read_only_fields = ['id', 'created_at']


class ScheduledInvoiceSerializer(serializers.ModelSerializer):
    items = ScheduledInvoiceItemSerializer(many=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    payment_term_name = serializers.CharField(source='payment_term.term_name', read_only=True, allow_null=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledInvoice
        fields = [
            'id', 'name', 'client', 'client_name', 'client_email', 'invoice_type',
            'frequency', 'frequency_display', 'day_of_month', 'day_of_week', 'month_of_year',
            'start_date', 'end_date', 'max_occurrences',
            'payment_term', 'payment_term_name', 'notes',
            'auto_send_email', 'email_subject', 'email_body',
            'status', 'status_display', 'occurrences_generated',
            'last_generated_date', 'next_generation_date',
            'items', 'total_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'occurrences_generated', 'last_generated_date',
                           'next_generation_date', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        """Calculate total amount from items"""
        return sum(item.total_amount for item in obj.items.all())

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')

        # Set organization and created_by
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        scheduled_invoice = ScheduledInvoice.objects.create(**validated_data)

        # Create items
        for item_data in items_data:
            ScheduledInvoiceItem.objects.create(scheduled_invoice=scheduled_invoice, **item_data)

        return scheduled_invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update scheduled invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                ScheduledInvoiceItem.objects.create(scheduled_invoice=instance, **item_data)

        return instance


class ScheduledInvoiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    client_name = serializers.CharField(source='client.name', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_amount = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledInvoice
        fields = [
            'id', 'name', 'client', 'client_name', 'invoice_type',
            'frequency', 'frequency_display', 'day_of_month',
            'start_date', 'end_date', 'status', 'status_display',
            'occurrences_generated', 'next_generation_date',
            'auto_send_email', 'total_amount', 'items_count',
            'created_at'
        ]

    def get_total_amount(self, obj):
        return sum(item.total_amount for item in obj.items.all())

    def get_items_count(self, obj):
        return obj.items.count()
