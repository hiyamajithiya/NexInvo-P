import logging
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import (
    Organization, OrganizationMembership, StaffProfile, CompanySettings, InvoiceSettings,
    Client, Invoice, InvoiceItem, Payment, Receipt, EmailSettings, SystemEmailSettings,
    InvoiceFormatSettings, ServiceItem, PaymentTerm, SubscriptionPlan, Coupon,
    CouponUsage, Subscription, SubscriptionUpgradeRequest, SuperAdminNotification,
    ScheduledInvoice, ScheduledInvoiceItem, ScheduledInvoiceLog,
    # Goods Trader models
    UnitOfMeasurement, Product, Supplier, Purchase, PurchaseItem,
    InventoryMovement, SupplierPayment, ExpensePayment,
    # Accounting Module models
    FinancialYear, AccountGroup, LedgerAccount, Voucher, VoucherEntry,
    VoucherNumberSeries, BankReconciliation, BankReconciliationItem
)

from .utils import get_state_code

logger = logging.getLogger(__name__)


class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    business_type_display = serializers.SerializerMethodField()
    acquisition_source_display = serializers.SerializerMethodField()
    acquired_by_name = serializers.SerializerMethodField()
    referred_by_name = serializers.SerializerMethodField()
    acquisition_coupon_code = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'business_type', 'business_type_display', 'plan', 'is_active',
                  'member_count', 'acquisition_source', 'acquisition_source_display', 'acquired_by',
                  'acquired_by_name', 'referred_by', 'referred_by_name', 'acquisition_coupon',
                  'acquisition_coupon_code', 'acquisition_campaign', 'acquisition_notes',
                  'acquisition_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'member_count', 'plan', 'business_type_display',
                           'acquisition_source_display', 'acquired_by_name', 'referred_by_name', 'acquisition_coupon_code']

    def get_business_type_display(self, obj):
        return obj.get_business_type_display()

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_plan(self, obj):
        """Get plan from Subscription record if exists, otherwise use legacy field"""
        try:
            if hasattr(obj, 'subscription_detail') and obj.subscription_detail:
                return obj.subscription_detail.plan.name.lower()
        except Exception:
            pass
        return obj.plan  # Fallback to legacy CharField

    def get_acquisition_source_display(self, obj):
        return obj.get_acquisition_source_display()

    def get_acquired_by_name(self, obj):
        if obj.acquired_by:
            return obj.acquired_by.get_full_name() or obj.acquired_by.username
        return None

    def get_referred_by_name(self, obj):
        if obj.referred_by:
            return obj.referred_by.name
        return None

    def get_acquisition_coupon_code(self, obj):
        if obj.acquisition_coupon:
            return obj.acquisition_coupon.code
        return None


class OrganizationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for organization with owner, subscription, and stats"""
    member_count = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    business_type_display = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    subscription_info = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    acquisition_info = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'business_type', 'business_type_display', 'plan',
                  'is_active', 'member_count', 'owner', 'subscription_info', 'stats',
                  'acquisition_info', 'created_at', 'updated_at']

    def get_business_type_display(self, obj):
        return obj.get_business_type_display()

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_plan(self, obj):
        try:
            if hasattr(obj, 'subscription_detail') and obj.subscription_detail:
                return obj.subscription_detail.plan.name
        except Exception:
            pass
        return obj.plan

    def get_owner(self, obj):
        """Get organization owner details"""
        owner_membership = obj.memberships.filter(role='owner', is_active=True).first()
        if owner_membership:
            user = owner_membership.user
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.get_full_name() or user.username,
                'date_joined': user.date_joined,
                'last_login': user.last_login
            }
        return None

    def get_subscription_info(self, obj):
        """Get subscription details"""
        try:
            subscription = Subscription.objects.get(organization=obj)
            return {
                'plan_name': subscription.plan.name if subscription.plan else None,
                'status': subscription.status,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'trial_end_date': subscription.trial_end_date,
                'auto_renew': subscription.auto_renew,
                'amount_paid': str(subscription.amount_paid) if subscription.amount_paid else None
            }
        except Subscription.DoesNotExist:
            return None

    def get_stats(self, obj):
        """Get organization statistics"""
        from django.db.models import Sum
        invoices = obj.invoices.all()
        clients = obj.clients.all()
        return {
            'total_invoices': invoices.count(),
            'total_clients': clients.count(),
            'total_revenue': str(invoices.aggregate(total=Sum('total_amount'))['total'] or 0),
            'pending_invoices': invoices.filter(status='pending').count(),
            'paid_invoices': invoices.filter(status='paid').count()
        }

    def get_acquisition_info(self, obj):
        """Get acquisition/source tracking details"""
        info = {
            'source': obj.acquisition_source,
            'source_display': obj.get_acquisition_source_display(),
            'campaign': obj.acquisition_campaign,
            'notes': obj.acquisition_notes,
            'date': obj.acquisition_date or obj.created_at.date(),
        }

        # Sales person details
        if obj.acquired_by:
            info['sales_person'] = {
                'id': obj.acquired_by.id,
                'name': obj.acquired_by.get_full_name() or obj.acquired_by.username,
                'email': obj.acquired_by.email
            }
        else:
            info['sales_person'] = None

        # Referrer details
        if obj.referred_by:
            info['referred_by'] = {
                'id': str(obj.referred_by.id),
                'name': obj.referred_by.name
            }
        else:
            info['referred_by'] = None

        # Coupon details
        if obj.acquisition_coupon:
            info['coupon'] = {
                'id': obj.acquisition_coupon.id,
                'code': obj.acquisition_coupon.code,
                'name': obj.acquisition_coupon.name
            }
        else:
            info['coupon'] = None

        return info


class StaffProfileSerializer(serializers.ModelSerializer):
    """Serializer for staff profiles"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    staff_type_display = serializers.CharField(source='get_staff_type_display', read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user', 'user_email', 'user_name', 'staff_type', 'staff_type_display',
            'is_active', 'phone', 'department', 'employee_id',
            'can_view_all_organizations', 'can_view_subscriptions', 'can_manage_tickets',
            'can_view_revenue', 'can_manage_leads',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class StaffUserCreateSerializer(serializers.Serializer):
    """Serializer for creating staff users"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    staff_type = serializers.ChoiceField(choices=[('support', 'Support Team'), ('sales', 'Sales Team')])
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employee_id = serializers.CharField(max_length=50, required=False, allow_blank=True)

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
                  'termsAndConditions', 'notes',
                  'enablePaymentReminders', 'reminderFrequencyDays',
                  'reminderEmailSubject', 'reminderEmailBody',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientSerializer(serializers.ModelSerializer):
    ledger_balance = serializers.SerializerMethodField()
    ledger_balance_type = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ['id', 'name', 'code', 'email', 'phone', 'mobile', 'address', 'city', 'state',
                  'pinCode', 'stateCode', 'gstin', 'pan', 'date_of_birth', 'date_of_incorporation',
                  'ledger_balance', 'ledger_balance_type',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'ledger_balance', 'ledger_balance_type']

    def validate_code(self, value):
        """Allow empty code for auto-generation"""
        # Convert empty string or whitespace-only string to empty string
        # The model's save() method will auto-generate it
        if value and value.strip():
            return value.strip()
        return ''

    def get_ledger_balance(self, obj):
        """Get the current balance from the linked debtor ledger account"""
        try:
            from .models import LedgerAccount
            ledger = LedgerAccount.objects.filter(
                organization=obj.organization,
                linked_client=obj,
                is_active=True
            ).first()
            if ledger:
                return float(ledger.current_balance)
            return 0.0
        except Exception:
            return 0.0

    def get_ledger_balance_type(self, obj):
        """Get the balance type (Dr/Cr) from the linked debtor ledger account"""
        try:
            from .models import LedgerAccount
            ledger = LedgerAccount.objects.filter(
                organization=obj.organization,
                linked_client=obj,
                is_active=True
            ).first()
            if ledger:
                return ledger.current_balance_type
            return 'Dr'
        except Exception:
            return 'Dr'


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
        fields = ['id', 'description', 'hsn_sac', 'quantity', 'rate', 'gst_rate',
                  'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount']
        read_only_fields = ['id', 'cgst_amount', 'sgst_amount', 'igst_amount']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    payment_term_name = serializers.CharField(source='payment_term.term_name', read_only=True)
    payment_term_description = serializers.CharField(source='payment_term.description', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'client', 'client_name', 'invoice_number', 'invoice_type',
                  'invoice_date', 'status', 'subtotal', 'tax_amount',
                  'cgst_amount', 'sgst_amount', 'igst_amount', 'is_interstate',
                  'round_off', 'total_amount',
                  'payment_term', 'payment_term_name', 'payment_term_description',
                  'payment_terms', 'notes', 'parent_proforma', 'is_emailed', 'emailed_at',
                  'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'invoice_number', 'client_name', 'payment_term_name',
                           'payment_term_description', 'is_emailed', 'emailed_at',
                           'cgst_amount', 'sgst_amount', 'igst_amount', 'is_interstate',
                           'created_at', 'updated_at']

    def create(self, validated_data):
        from decimal import Decimal
        from .models import CompanySettings

        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        # Check if GST should be applied to this invoice
        should_apply_gst = invoice.should_apply_gst()

        # Determine if interstate (IGST) or local (CGST+SGST)
        is_interstate = True  # Default to IGST
        try:
            company_settings = CompanySettings.objects.get(organization=invoice.organization)

            # Get company state code
            company_state_code = get_state_code(
                company_settings.gstin,
                company_settings.stateCode
            )

            # Get client state code
            client_state_code = ''
            if invoice.client:
                client_state_code = get_state_code(
                    invoice.client.gstin,
                    invoice.client.stateCode
                )

            logger.debug(f"[GST] Company stateCode: '{company_state_code}', Client stateCode: '{client_state_code}'")
            logger.debug(f"[GST] Company GSTIN: '{company_settings.gstin}', Client GSTIN: '{invoice.client.gstin if invoice.client else 'N/A'}'")
            logger.debug(f"[GST] Company stateCode field: '{company_settings.stateCode}', Client stateCode field: '{invoice.client.stateCode if invoice.client else 'N/A'}'")

            if company_state_code and client_state_code:
                is_interstate = company_state_code != client_state_code
                logger.debug(f"[GST] is_interstate = {is_interstate} (company: {company_state_code} vs client: {client_state_code})")
            else:
                logger.debug(f"[GST] Missing state code - defaulting to IGST. company_state_code='{company_state_code}', client_state_code='{client_state_code}'")
        except CompanySettings.DoesNotExist:
            logger.debug("[GST] CompanySettings not found - defaulting to IGST")

        invoice.is_interstate = is_interstate

        # Track GST totals
        total_cgst = Decimal('0.00')
        total_sgst = Decimal('0.00')
        total_igst = Decimal('0.00')

        for item_data in items_data:
            # If GST should not be applied, set gst_rate to 0 and recalculate amounts
            if not should_apply_gst:
                item_data['gst_rate'] = Decimal('0.00')
                item_data['total_amount'] = item_data['taxable_amount']
                item_data['cgst_amount'] = Decimal('0.00')
                item_data['sgst_amount'] = Decimal('0.00')
                item_data['igst_amount'] = Decimal('0.00')
            else:
                # Calculate GST breakdown for this item
                gst_amount = Decimal(str(item_data['total_amount'])) - Decimal(str(item_data['taxable_amount']))
                if is_interstate:
                    item_data['cgst_amount'] = Decimal('0.00')
                    item_data['sgst_amount'] = Decimal('0.00')
                    item_data['igst_amount'] = gst_amount
                    total_igst += gst_amount
                else:
                    item_data['cgst_amount'] = gst_amount / 2
                    item_data['sgst_amount'] = gst_amount / 2
                    item_data['igst_amount'] = Decimal('0.00')
                    total_cgst += gst_amount / 2
                    total_sgst += gst_amount / 2

            InvoiceItem.objects.create(invoice=invoice, **item_data)

        # Recalculate invoice totals with rounding
        invoice.subtotal = sum(item.taxable_amount for item in invoice.items.all())
        invoice.tax_amount = sum(item.total_amount - item.taxable_amount for item in invoice.items.all())
        invoice.cgst_amount = total_cgst
        invoice.sgst_amount = total_sgst
        invoice.igst_amount = total_igst

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
        from .models import CompanySettings

        items_data = validated_data.pop('items', None)

        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Check if GST should be applied to this invoice
            should_apply_gst = instance.should_apply_gst()

            # Determine if interstate (IGST) or local (CGST+SGST)
            is_interstate = True  # Default to IGST
            try:
                company_settings = CompanySettings.objects.get(organization=instance.organization)

                # Get company state code
                company_state_code = get_state_code(
                    company_settings.gstin,
                    company_settings.stateCode
                )

                # Get client state code
                client_state_code = ''
                if instance.client:
                    client_state_code = get_state_code(
                        instance.client.gstin,
                        instance.client.stateCode
                    )

                logger.debug(f"[GST Update] Company stateCode: '{company_state_code}', Client stateCode: '{client_state_code}'")
                logger.debug(f"[GST Update] Company GSTIN: '{company_settings.gstin}', Client GSTIN: '{instance.client.gstin if instance.client else 'N/A'}'")
                logger.debug(f"[GST Update] Company stateCode field: '{company_settings.stateCode}', Client stateCode field: '{instance.client.stateCode if instance.client else 'N/A'}'")

                if company_state_code and client_state_code:
                    is_interstate = company_state_code != client_state_code
                    logger.debug(f"[GST Update] is_interstate = {is_interstate} (company: {company_state_code} vs client: {client_state_code})")
                else:
                    logger.debug(f"[GST Update] Missing state code - defaulting to IGST. company_state_code='{company_state_code}', client_state_code='{client_state_code}'")
            except CompanySettings.DoesNotExist:
                logger.debug("[GST Update] CompanySettings not found - defaulting to IGST")

            instance.is_interstate = is_interstate

            # Track GST totals
            total_cgst = Decimal('0.00')
            total_sgst = Decimal('0.00')
            total_igst = Decimal('0.00')

            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                # If GST should not be applied, set gst_rate to 0 and recalculate amounts
                if not should_apply_gst:
                    item_data['gst_rate'] = Decimal('0.00')
                    item_data['total_amount'] = item_data['taxable_amount']
                    item_data['cgst_amount'] = Decimal('0.00')
                    item_data['sgst_amount'] = Decimal('0.00')
                    item_data['igst_amount'] = Decimal('0.00')
                else:
                    # Calculate GST breakdown for this item
                    gst_amount = Decimal(str(item_data['total_amount'])) - Decimal(str(item_data['taxable_amount']))
                    if is_interstate:
                        item_data['cgst_amount'] = Decimal('0.00')
                        item_data['sgst_amount'] = Decimal('0.00')
                        item_data['igst_amount'] = gst_amount
                        total_igst += gst_amount
                    else:
                        item_data['cgst_amount'] = gst_amount / 2
                        item_data['sgst_amount'] = gst_amount / 2
                        item_data['igst_amount'] = Decimal('0.00')
                        total_cgst += gst_amount / 2
                        total_sgst += gst_amount / 2

                InvoiceItem.objects.create(invoice=instance, **item_data)

            # Recalculate invoice totals with rounding
            instance.subtotal = sum(item.taxable_amount for item in instance.items.all())
            instance.tax_amount = sum(item.total_amount - item.taxable_amount for item in instance.items.all())
            instance.cgst_amount = total_cgst
            instance.sgst_amount = total_sgst
            instance.igst_amount = total_igst

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

    # Accounting fields (write-only, used for auto voucher creation)
    cash_bank_account = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    post_to_ledger = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'invoice_number', 'client_name', 'amount',
                  'tds_amount', 'gst_tds_amount', 'amount_received', 'payment_date', 'payment_method',
                  'reference_number', 'notes', 'receipt_id',
                  'cash_bank_account', 'post_to_ledger',
                  'created_at', 'updated_at']
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


class EmailSettingsSerializer(serializers.Serializer):
    """
    Custom serializer for EmailSettings to handle encrypted smtp_password properly.
    We use a plain Serializer instead of ModelSerializer to avoid property introspection issues.
    """
    id = serializers.IntegerField(read_only=True)
    smtp_host = serializers.CharField(max_length=255, required=False, default='smtp.gmail.com')
    smtp_port = serializers.IntegerField(required=False, default=587)
    smtp_username = serializers.CharField(max_length=255, required=False, allow_blank=True)
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    from_email = serializers.EmailField(required=False, allow_blank=True)
    from_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    use_tls = serializers.BooleanField(required=False, default=True)
    email_signature = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        from .models import EmailSettings
        return EmailSettings.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.smtp_host = validated_data.get('smtp_host', instance.smtp_host)
        instance.smtp_port = validated_data.get('smtp_port', instance.smtp_port)
        instance.smtp_username = validated_data.get('smtp_username', instance.smtp_username)
        if 'smtp_password' in validated_data and validated_data['smtp_password']:
            instance.smtp_password = validated_data['smtp_password']
        instance.from_email = validated_data.get('from_email', instance.from_email)
        instance.from_name = validated_data.get('from_name', instance.from_name)
        instance.use_tls = validated_data.get('use_tls', instance.use_tls)
        instance.email_signature = validated_data.get('email_signature', instance.email_signature)
        instance.save()
        return instance


class SystemEmailSettingsSerializer(serializers.Serializer):
    """
    Custom serializer for SystemEmailSettings to handle encrypted smtp_password properly.
    We use a plain Serializer instead of ModelSerializer to avoid property introspection issues.
    """
    id = serializers.IntegerField(read_only=True)
    smtp_host = serializers.CharField(max_length=255, required=False, default='smtp.gmail.com')
    smtp_port = serializers.IntegerField(required=False, default=587)
    smtp_username = serializers.CharField(max_length=255, required=False, allow_blank=True)
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    from_email = serializers.EmailField(required=False, allow_blank=True)
    use_tls = serializers.BooleanField(required=False, default=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        from .models import SystemEmailSettings
        return SystemEmailSettings.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.smtp_host = validated_data.get('smtp_host', instance.smtp_host)
        instance.smtp_port = validated_data.get('smtp_port', instance.smtp_port)
        instance.smtp_username = validated_data.get('smtp_username', instance.smtp_username)
        if 'smtp_password' in validated_data and validated_data['smtp_password']:
            instance.smtp_password = validated_data['smtp_password']
        instance.from_email = validated_data.get('from_email', instance.from_email)
        instance.use_tls = validated_data.get('use_tls', instance.use_tls)
        instance.save()
        return instance


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
            'show_hsn_sac_column', 'show_serial_number', 'show_quantity_column',
            'show_rate_column', 'show_taxable_value',
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
            'is_active', 'is_valid_now', 'campaign_name', 'campaign_source',
            'created_by', 'created_by_email', 'created_at', 'updated_at'
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
    # Add field with validation - limit to 1-28 to handle all months safely
    day_of_month = serializers.IntegerField(min_value=1, max_value=28, default=1)
    day_of_week = serializers.IntegerField(min_value=0, max_value=6, default=0, required=False, allow_null=True)
    month_of_year = serializers.IntegerField(min_value=1, max_value=12, default=1, required=False, allow_null=True)

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

    def validate(self, data):
        """Validate schedule configuration based on frequency"""
        frequency = data.get('frequency', self.instance.frequency if self.instance else None)

        # Validate day_of_week is only required for weekly
        if frequency == 'weekly':
            if 'day_of_week' not in data and (not self.instance or self.instance.day_of_week is None):
                raise serializers.ValidationError({
                    'day_of_week': 'Day of week is required for weekly schedules (0=Monday, 6=Sunday)'
                })

        # Validate month_of_year is only required for yearly
        if frequency == 'yearly':
            if not data.get('month_of_year') and (not self.instance or not self.instance.month_of_year):
                raise serializers.ValidationError({
                    'month_of_year': 'Month of year is required for yearly schedules (1=January, 12=December)'
                })

        return data

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


# =============================================================================
# GOODS TRADER SERIALIZERS - Product, Supplier, Purchase, Inventory
# =============================================================================

class UnitOfMeasurementSerializer(serializers.ModelSerializer):
    """Serializer for units of measurement"""

    class Meta:
        model = UnitOfMeasurement
        fields = ['id', 'name', 'symbol', 'is_predefined', 'is_active', 'created_at']
        read_only_fields = ['id', 'is_predefined', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product master"""
    unit_display = serializers.SerializerMethodField()
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'hsn_code', 'sku',
            'unit', 'unit_name', 'unit_display',
            'purchase_price', 'selling_price', 'gst_rate',
            'track_inventory', 'current_stock', 'low_stock_threshold', 'is_low_stock',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_stock', 'is_low_stock', 'created_at', 'updated_at']

    def get_unit_display(self, obj):
        if obj.unit:
            return f"{obj.unit.name} ({obj.unit.symbol})"
        return obj.unit_name


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product list views"""
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'hsn_code', 'sku', 'unit_name',
            'selling_price', 'gst_rate',
            'track_inventory', 'current_stock', 'is_low_stock',
            'is_active'
        ]


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer for Supplier master"""
    ledger_balance = serializers.SerializerMethodField()
    ledger_balance_type = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'code', 'email', 'phone', 'mobile',
            'address', 'city', 'state', 'pinCode', 'stateCode',
            'gstin', 'pan',
            'bank_name', 'account_number', 'ifsc_code',
            'contact_person', 'payment_terms', 'notes',
            'ledger_balance', 'ledger_balance_type',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'ledger_balance', 'ledger_balance_type']

    def validate_code(self, value):
        """Allow empty code for auto-generation"""
        if value and value.strip():
            return value.strip()
        return ''

    def get_ledger_balance(self, obj):
        """Get the current balance from the linked creditor ledger account"""
        try:
            from .models import LedgerAccount
            ledger = LedgerAccount.objects.filter(
                organization=obj.organization,
                linked_supplier=obj,
                is_active=True
            ).first()
            if ledger:
                return float(ledger.current_balance)
            return 0.0
        except Exception:
            return 0.0

    def get_ledger_balance_type(self, obj):
        """Get the balance type (Dr/Cr) from the linked creditor ledger account"""
        try:
            from .models import LedgerAccount
            ledger = LedgerAccount.objects.filter(
                organization=obj.organization,
                linked_supplier=obj,
                is_active=True
            ).first()
            if ledger:
                return ledger.current_balance_type
            return 'Cr'
        except Exception:
            return 'Cr'


class SupplierListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for supplier list views"""

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'code', 'email', 'phone', 'city', 'gstin', 'is_active']


class PurchaseItemSerializer(serializers.ModelSerializer):
    """Serializer for purchase line items"""
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = [
            'id', 'product', 'product_name', 'description', 'hsn_code',
            'quantity', 'unit_name', 'rate',
            'gst_rate', 'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'total_amount', 'quantity_received'
        ]
        read_only_fields = ['id', 'product_name', 'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount']


class PurchaseSerializer(serializers.ModelSerializer):
    """Serializer for Purchase entry"""
    items = PurchaseItemSerializer(many=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'supplier', 'supplier_name',
            'purchase_number', 'supplier_invoice_number', 'supplier_invoice_date',
            'purchase_date', 'received_date',
            'subtotal', 'tax_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'is_interstate', 'discount_amount', 'other_charges', 'round_off', 'total_amount',
            'amount_paid', 'balance_amount', 'payment_status', 'payment_status_display',
            'status', 'status_display', 'notes',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'purchase_number', 'supplier_name', 'status_display', 'payment_status_display',
            'balance_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        from decimal import Decimal

        items_data = validated_data.pop('items', [])
        request = self.context.get('request')

        # Set organization and created_by
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        # Determine if interstate based on supplier state
        supplier = validated_data.get('supplier')
        if supplier and hasattr(request, 'organization'):
            try:
                company_settings = request.organization.company_settings
                if company_settings.stateCode and supplier.stateCode:
                    validated_data['is_interstate'] = company_settings.stateCode != supplier.stateCode
            except Exception:
                pass

        purchase = Purchase.objects.create(**validated_data)

        # Create items and calculate totals
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        cgst_amount = Decimal('0.00')
        sgst_amount = Decimal('0.00')
        igst_amount = Decimal('0.00')

        for item_data in items_data:
            item_data['purchase'] = purchase
            item = PurchaseItem.objects.create(**item_data)
            subtotal += item.taxable_amount
            tax_amount += (item.cgst_amount + item.sgst_amount + item.igst_amount)
            cgst_amount += item.cgst_amount
            sgst_amount += item.sgst_amount
            igst_amount += item.igst_amount

        # Update purchase totals
        purchase.subtotal = subtotal
        purchase.tax_amount = tax_amount
        purchase.cgst_amount = cgst_amount
        purchase.sgst_amount = sgst_amount
        purchase.igst_amount = igst_amount
        purchase.total_amount = subtotal + tax_amount + purchase.other_charges - purchase.discount_amount + purchase.round_off
        purchase.save()

        return purchase

    def update(self, instance, validated_data):
        from decimal import Decimal

        items_data = validated_data.pop('items', None)

        # Update purchase fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()

            # Create new items and recalculate totals
            subtotal = Decimal('0.00')
            tax_amount = Decimal('0.00')
            cgst_amount = Decimal('0.00')
            sgst_amount = Decimal('0.00')
            igst_amount = Decimal('0.00')

            for item_data in items_data:
                item_data['purchase'] = instance
                item = PurchaseItem.objects.create(**item_data)
                subtotal += item.taxable_amount
                tax_amount += (item.cgst_amount + item.sgst_amount + item.igst_amount)
                cgst_amount += item.cgst_amount
                sgst_amount += item.sgst_amount
                igst_amount += item.igst_amount

            instance.subtotal = subtotal
            instance.tax_amount = tax_amount
            instance.cgst_amount = cgst_amount
            instance.sgst_amount = sgst_amount
            instance.igst_amount = igst_amount
            instance.total_amount = subtotal + tax_amount + instance.other_charges - instance.discount_amount + instance.round_off

        instance.save()
        return instance


class PurchaseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for purchase list views"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            'id', 'purchase_number', 'supplier', 'supplier_name',
            'purchase_date', 'total_amount', 'amount_paid',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'items_count', 'created_at'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class InventoryMovementSerializer(serializers.ModelSerializer):
    """Serializer for inventory movements"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryMovement
        fields = [
            'id', 'product', 'product_name',
            'movement_type', 'movement_type_display',
            'quantity', 'stock_after',
            'reference', 'reference_type', 'reference_id',
            'notes', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'product_name', 'movement_type_display', 'created_by_name', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class SupplierPaymentSerializer(serializers.ModelSerializer):
    """Serializer for supplier payments"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    purchase_number = serializers.CharField(source='purchase.purchase_number', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = SupplierPayment
        fields = [
            'id', 'supplier', 'supplier_name',
            'purchase', 'purchase_number',
            'amount', 'payment_date', 'payment_method', 'payment_method_display',
            'reference_number', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'supplier_name', 'purchase_number', 'payment_method_display', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')

        # Set organization and created_by
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        return super().create(validated_data)


class ExpensePaymentSerializer(serializers.ModelSerializer):
    """Serializer for expense/outgoing payments"""
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    # Accounting fields (write-only, used for auto voucher creation)
    cash_bank_account = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    expense_ledger = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    post_to_ledger = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = ExpensePayment
        fields = [
            'id', 'payment_date', 'amount', 'payment_method', 'payment_method_display',
            'category', 'category_display', 'payee_name', 'reference_number',
            'description', 'notes',
            'cash_bank_account', 'expense_ledger', 'post_to_ledger',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'payment_method_display', 'category_display', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Pop accounting fields before model creation
        validated_data.pop('cash_bank_account', None)
        validated_data.pop('expense_ledger', None)
        validated_data.pop('post_to_ledger', None)

        request = self.context.get('request')

        # Set organization and created_by
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        return super().create(validated_data)


class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustment operations"""
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    adjustment_type = serializers.ChoiceField(choices=[('in', 'Stock In'), ('out', 'Stock Out')])
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        product = data['product']
        if not product.track_inventory:
            raise serializers.ValidationError("Inventory tracking is not enabled for this product")

        # For stock out, ensure sufficient stock
        if data['adjustment_type'] == 'out':
            if product.current_stock < data['quantity']:
                raise serializers.ValidationError(
                    f"Insufficient stock. Current stock: {product.current_stock}, Requested: {data['quantity']}"
                )

        return data

    def create(self, validated_data):
        product = validated_data['product']
        quantity = validated_data['quantity']
        adjustment_type = validated_data['adjustment_type']
        notes = validated_data.get('notes', '')
        request = self.context.get('request')
        user = request.user if request else None

        # Determine movement type and quantity sign
        if adjustment_type == 'in':
            movement_type = 'adjustment_in'
        else:
            movement_type = 'adjustment_out'
            quantity = -quantity  # Negative for stock out

        # Adjust stock
        movement = product.adjust_stock(
            quantity=quantity,
            movement_type=movement_type,
            reference='Manual Adjustment',
            notes=notes,
            user=user
        )

        return movement


# =============================================================================
# ACCOUNTING MODULE SERIALIZERS
# =============================================================================

class FinancialYearSerializer(serializers.ModelSerializer):
    """Serializer for Financial Year"""

    class Meta:
        model = FinancialYear
        fields = [
            'id', 'name', 'start_date', 'end_date', 'is_active', 'is_closed',
            'books_beginning_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)


class AccountGroupSerializer(serializers.ModelSerializer):
    """Serializer for Account Groups (Chart of Accounts hierarchy)"""
    full_path = serializers.CharField(read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = AccountGroup
        fields = [
            'id', 'name', 'parent', 'parent_name', 'nature', 'is_primary',
            'sequence', 'full_path', 'children_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_primary', 'full_path', 'children_count', 'created_at', 'updated_at']

    def get_children_count(self, obj):
        return obj.children.count()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)

    def validate_parent(self, value):
        """Ensure parent belongs to same organization"""
        request = self.context.get('request')
        if value and request and hasattr(request, 'organization'):
            if value.organization != request.organization:
                raise serializers.ValidationError("Parent group must belong to the same organization")
        return value


class AccountGroupTreeSerializer(serializers.ModelSerializer):
    """Serializer for Account Groups with nested children (tree view)"""
    children = serializers.SerializerMethodField()
    ledger_count = serializers.SerializerMethodField()

    class Meta:
        model = AccountGroup
        fields = ['id', 'name', 'nature', 'is_primary', 'sequence', 'children', 'ledger_count']

    def get_children(self, obj):
        children = obj.children.all().order_by('sequence', 'name')
        return AccountGroupTreeSerializer(children, many=True).data

    def get_ledger_count(self, obj):
        return obj.accounts.count()


class LedgerAccountSerializer(serializers.ModelSerializer):
    """Serializer for Ledger Accounts"""
    group_name = serializers.CharField(source='group.name', read_only=True)
    group_full_path = serializers.CharField(source='group.full_path', read_only=True)
    balance_display = serializers.CharField(read_only=True)
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    linked_client_name = serializers.CharField(source='linked_client.name', read_only=True, allow_null=True)
    linked_supplier_name = serializers.CharField(source='linked_supplier.name', read_only=True, allow_null=True)

    class Meta:
        model = LedgerAccount
        fields = [
            'id', 'name', 'account_code', 'alias', 'group', 'group_name', 'group_full_path',
            'account_type', 'account_type_display',
            'opening_balance', 'opening_balance_type', 'opening_balance_date',
            'current_balance', 'current_balance_type', 'balance_display',
            'is_bank_account', 'bank_name', 'account_number', 'ifsc_code', 'branch',
            'linked_client', 'linked_client_name',
            'linked_supplier', 'linked_supplier_name',
            'gst_applicable', 'gstin', 'gst_registration_type',
            'is_system_account', 'is_active', 'allow_negative_balance',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'group_name', 'group_full_path', 'balance_display', 'account_type_display',
            'linked_client_name', 'linked_supplier_name',
            'is_system_account',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)

    def validate_group(self, value):
        """Ensure group belongs to same organization"""
        request = self.context.get('request')
        if value and request and hasattr(request, 'organization'):
            if value.organization != request.organization:
                raise serializers.ValidationError("Account group must belong to the same organization")
        return value


class LedgerAccountListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for ledger dropdowns"""
    group_name = serializers.CharField(source='group.name', read_only=True)
    balance_display = serializers.CharField(read_only=True)

    class Meta:
        model = LedgerAccount
        fields = ['id', 'name', 'group', 'group_name', 'account_type', 'balance_display', 'is_bank_account']


class VoucherEntrySerializer(serializers.ModelSerializer):
    """Serializer for Voucher Entry (debit/credit line)"""
    ledger_name = serializers.CharField(source='ledger_account.name', read_only=True)
    ledger_balance = serializers.CharField(source='ledger_account.balance_display', read_only=True)

    class Meta:
        model = VoucherEntry
        fields = [
            'id', 'ledger_account', 'ledger_name', 'ledger_balance',
            'debit_amount', 'credit_amount',
            'bill_reference', 'bill_date', 'bill_type', 'particulars', 'sequence'
        ]
        read_only_fields = ['id', 'ledger_name', 'ledger_balance']


class VoucherSerializer(serializers.ModelSerializer):
    """Serializer for Voucher (main voucher record)"""
    entries = VoucherEntrySerializer(many=True)
    voucher_type_display = serializers.CharField(source='get_voucher_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_ledger_name = serializers.CharField(source='party_ledger.name', read_only=True, allow_null=True)
    is_balanced = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = [
            'id', 'voucher_type', 'voucher_type_display',
            'voucher_number', 'voucher_date',
            'invoice', 'payment_record', 'purchase', 'expense_payment',
            'party_ledger', 'party_ledger_name',
            'total_amount', 'narration', 'reference_number', 'reference_date',
            'status', 'status_display', 'is_balanced',
            'synced_to_tally', 'tally_voucher_number', 'tally_sync_date',
            'entries', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'voucher_number', 'voucher_type_display', 'status_display',
            'party_ledger_name', 'is_balanced',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def validate(self, data):
        """Validate that debit equals credit"""
        entries = data.get('entries', [])
        if entries:
            total_debit = sum(e.get('debit_amount', 0) or 0 for e in entries)
            total_credit = sum(e.get('credit_amount', 0) or 0 for e in entries)
            if total_debit != total_credit:
                raise serializers.ValidationError(
                    f"Voucher is not balanced. Total Debit: {total_debit}, Total Credit: {total_credit}"
                )
        return data

    def create(self, validated_data):
        from decimal import Decimal

        entries_data = validated_data.pop('entries', [])
        request = self.context.get('request')

        # Set organization and created_by
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        # Determine financial year for voucher numbering (not stored on Voucher model)
        fy = None
        voucher_date = validated_data.get('voucher_date')
        if voucher_date and request and hasattr(request, 'organization'):
            fy = FinancialYear.get_fy_for_date(request.organization, voucher_date)

        # Generate voucher number using the series
        voucher_type = validated_data.get('voucher_type')
        if request and hasattr(request, 'organization') and fy:
            series = VoucherNumberSeries.get_or_create_series(
                request.organization, voucher_type, fy.name
            )
            validated_data['voucher_number'] = series.get_next_number()

        voucher = Voucher.objects.create(**validated_data)

        # Create entries and calculate total
        total_amount = Decimal('0.00')
        for i, entry_data in enumerate(entries_data):
            entry_data['voucher'] = voucher
            entry_data['sequence'] = i + 1
            VoucherEntry.objects.create(**entry_data)
            total_amount += entry_data.get('debit_amount', 0) or Decimal('0.00')

        voucher.total_amount = total_amount
        voucher.save()

        # Post voucher (update ledger balances)
        if voucher.status == 'posted':
            voucher.post()

        return voucher

    def update(self, instance, validated_data):
        from decimal import Decimal

        entries_data = validated_data.pop('entries', None)

        # Don't allow editing posted vouchers
        if instance.status == 'posted' and entries_data is not None:
            # Cancel old entries effect first
            instance.cancel()

        # Update voucher fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if entries_data is not None:
            # Delete old entries
            instance.entries.all().delete()

            # Create new entries
            total_amount = Decimal('0.00')
            for i, entry_data in enumerate(entries_data):
                entry_data['voucher'] = instance
                entry_data['sequence'] = i + 1
                VoucherEntry.objects.create(**entry_data)
                total_amount += entry_data.get('debit_amount', 0) or Decimal('0.00')

            instance.total_amount = total_amount

        instance.save()

        # Re-post if status is posted
        if instance.status == 'posted':
            instance.post()

        return instance


class VoucherListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for voucher lists"""
    voucher_type_display = serializers.CharField(source='get_voucher_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    party_ledger_name = serializers.CharField(source='party_ledger.name', read_only=True)

    class Meta:
        model = Voucher
        fields = [
            'id', 'voucher_type', 'voucher_type_display',
            'voucher_number', 'voucher_date',
            'party_ledger_name', 'total_amount', 'narration',
            'status', 'status_display', 'synced_to_tally'
        ]


class VoucherNumberSeriesSerializer(serializers.ModelSerializer):
    """Serializer for Voucher Number Series configuration"""

    class Meta:
        model = VoucherNumberSeries
        fields = [
            'id', 'voucher_type', 'prefix', 'suffix',
            'financial_year', 'starting_number', 'current_number', 'number_width',
        ]
        read_only_fields = ['id', 'current_number']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)


class BankReconciliationItemSerializer(serializers.ModelSerializer):
    """Serializer for Bank Reconciliation Item"""
    voucher_number = serializers.CharField(source='voucher_entry.voucher.voucher_number', read_only=True)
    voucher_date = serializers.DateField(source='voucher_entry.voucher.voucher_date', read_only=True)
    particulars = serializers.CharField(source='voucher_entry.particulars', read_only=True)

    class Meta:
        model = BankReconciliationItem
        fields = [
            'id', 'voucher_entry', 'voucher_number', 'voucher_date',
            'transaction_date', 'description', 'debit_amount', 'credit_amount',
            'particulars', 'is_reconciled', 'reconciled_date',
            'is_bank_only', 'bank_reference'
        ]
        read_only_fields = ['id', 'voucher_number', 'voucher_date', 'particulars']


class BankReconciliationSerializer(serializers.ModelSerializer):
    """Serializer for Bank Reconciliation"""
    items = BankReconciliationItemSerializer(many=True, read_only=True)
    bank_account_name = serializers.CharField(source='bank_account.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    difference = serializers.SerializerMethodField()

    class Meta:
        model = BankReconciliation
        fields = [
            'id', 'bank_account', 'bank_account_name',
            'reconciliation_date', 'statement_date',
            'statement_opening_balance', 'statement_closing_balance',
            'book_balance', 'reconciled_balance',
            'status', 'status_display', 'difference',
            'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'bank_account_name', 'status_display', 'difference', 'created_at', 'updated_at']

    def get_difference(self, obj):
        return obj.statement_closing_balance - obj.reconciled_balance

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)
