from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import (
    Organization, OrganizationMembership, CompanySettings, InvoiceSettings,
    Client, Invoice, InvoiceItem, Payment, EmailSettings, InvoiceFormatSettings,
    ServiceItem, PaymentTerm
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
                  'pinCode', 'stateCode', 'gstin', 'pan', 'phone', 'email', 'logo',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceSettings
        fields = ['id', 'invoicePrefix', 'startingNumber', 'proformaPrefix',
                  'proformaStartingNumber', 'defaultGstRate', 'paymentDueDays',
                  'termsAndConditions', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'phone', 'address', 'city', 'state',
                  'pinCode', 'gstin', 'pan', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


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
                  'invoice_date', 'status', 'subtotal', 'tax_amount', 'total_amount',
                  'payment_term', 'payment_term_name', 'payment_term_description',
                  'payment_terms', 'notes', 'parent_proforma', 'is_emailed', 'emailed_at',
                  'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'invoice_number', 'client_name', 'payment_term_name',
                           'payment_term_description', 'is_emailed', 'emailed_at',
                           'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

        return instance


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    client_name = serializers.CharField(source='invoice.client.name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'invoice_number', 'client_name', 'amount',
                  'payment_date', 'payment_method', 'reference_number', 'notes',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'invoice_number', 'client_name', 'created_at', 'updated_at']


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
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'password', 'date_joined']
        read_only_fields = ['id', 'username', 'date_joined']
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        email = validated_data.get('email')

        if not email:
            raise serializers.ValidationError({'email': 'Email is required'})

        if not password:
            raise serializers.ValidationError({'password': 'Password is required'})

        # Validate password
        validate_password(password)

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
            # Add user to the organization as a user (regular member)
            OrganizationMembership.objects.create(
                organization=organization,
                user=user,
                role='user',
                is_active=True
            )

        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Update user fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.is_staff = validated_data.get('is_staff', instance.is_staff)
        
        # Update password if provided
        if password:
            validate_password(password)
            instance.set_password(password)
        
        instance.save()
        return instance
