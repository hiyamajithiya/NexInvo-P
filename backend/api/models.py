from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
import uuid
import base64
import os

# =============================================================================
# ENCRYPTION UTILITIES FOR SENSITIVE DATA (IT ACT & DPDP ACT COMPLIANCE)
# =============================================================================

def get_encryption_key():
    """Get or generate encryption key from settings"""
    key = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
    if not key:
        # Fallback to SECRET_KEY derived key (not recommended for production)
        import hashlib
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return key


def encrypt_value(value):
    """Encrypt a string value using Fernet symmetric encryption"""
    if not value:
        return value
    try:
        from cryptography.fernet import Fernet
        key = get_encryption_key()
        f = Fernet(key)
        return f.encrypt(value.encode()).decode()
    except ImportError:
        # cryptography not installed, return as-is (log warning in production)
        return value
    except Exception:
        return value


def decrypt_value(value):
    """Decrypt a string value using Fernet symmetric encryption"""
    if not value:
        return value
    try:
        from cryptography.fernet import Fernet
        key = get_encryption_key()
        f = Fernet(key)
        return f.decrypt(value.encode()).decode()
    except ImportError:
        # cryptography not installed, return as-is
        return value
    except Exception:
        # Decryption failed (possibly unencrypted legacy data)
        return value


class Organization(models.Model):
    """
    Tenant/Organization model for multi-tenancy.
    Each organization has its own isolated data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)

    # Subscription fields (for future SaaS billing)
    plan = models.CharField(max_length=50, default='free', choices=[
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise')
    ])
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class OrganizationMembership(models.Model):
    """
    Links users to organizations with roles.
    A user can belong to multiple organizations.
    """
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('user', 'User'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organization_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    is_active = models.BooleanField(default=True)

    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Organization Membership"
        verbose_name_plural = "Organization Memberships"
        unique_together = ['organization', 'user']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"


class CompanySettings(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='company_settings')
    companyName = models.CharField(max_length=255)
    tradingName = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pinCode = models.CharField(max_length=20, blank=True)
    stateCode = models.CharField(max_length=10, blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    gstRegistrationDate = models.DateField(
        blank=True,
        null=True,
        help_text='Date when organization was registered under GST (leave blank if not registered or GST not applicable)'
    )
    pan = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    logo = models.TextField(blank=True, null=True)  # Store base64 encoded image
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Company Settings"

    def __str__(self):
        return f"{self.companyName} Settings"


class InvoiceSettings(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='invoice_settings')
    # Tax Invoice Settings
    invoicePrefix = models.CharField(max_length=20, default='INV-')
    startingNumber = models.IntegerField(default=1)
    # Proforma Invoice Settings
    proformaPrefix = models.CharField(max_length=20, default='PI-')
    proformaStartingNumber = models.IntegerField(default=1)
    # Receipt Settings
    receiptPrefix = models.CharField(max_length=20, default='RCPT-')
    receiptStartingNumber = models.IntegerField(default=1)
    # General Settings
    gstEnabled = models.BooleanField(default=True, help_text='Enable GST calculations for invoices')
    defaultGstRate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    paymentDueDays = models.IntegerField(default=30)
    termsAndConditions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    # Payment Reminder Settings
    enablePaymentReminders = models.BooleanField(default=True)
    reminderFrequencyDays = models.IntegerField(default=3, help_text='Send reminders every X days for unpaid proforma invoices')
    reminderEmailSubject = models.CharField(max_length=255, default='Payment Reminder for Invoice {invoice_number}')
    reminderEmailBody = models.TextField(default='Dear {client_name},\n\nThis is a friendly reminder that payment for {invoice_number} dated {invoice_date} is pending.\n\nAmount Due: ₹{total_amount}\n\nPlease make the payment at your earliest convenience.\n\nThank you!')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Invoice Settings"

    def __str__(self):
        return f"{self.organization.name} Invoice Settings"


class Client(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='clients')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, unique=False)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pinCode = models.CharField(max_length=20, blank=True)
    stateCode = models.CharField(max_length=10, blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    pan = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_incorporation = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def generate_client_code(self):
        """Auto-generate client code from name and dates"""
        if self.code:
            return self.code

        # Get abbreviation from name (first 3 letters of each word, max 6 chars)
        words = self.name.strip().upper().split()
        abbreviation = ''
        for word in words[:2]:  # Take first 2 words
            abbreviation += word[:3] if len(word) >= 3 else word
        abbreviation = abbreviation[:6]  # Max 6 characters

        # Get two digits from date
        date_digits = ''
        if self.date_of_birth:
            date_digits = self.date_of_birth.strftime('%d')
        elif self.date_of_incorporation:
            date_digits = self.date_of_incorporation.strftime('%d')
        else:
            # Use last 2 digits of created year
            import datetime
            date_digits = datetime.datetime.now().strftime('%d')

        # Combine abbreviation and date digits
        base_code = f"{abbreviation}{date_digits}"

        # Check if code exists and add counter if needed
        code = base_code
        counter = 1
        while Client.objects.filter(organization=self.organization, code=code).exclude(id=self.id).exists():
            code = f"{base_code}{counter}"
            counter += 1

        return code

    def save(self, *args, **kwargs):
        # Auto-generate code if not provided
        if not self.code:
            self.code = self.generate_client_code()
        super().save(*args, **kwargs)


class Invoice(models.Model):
    INVOICE_TYPE_CHOICES = [
        ('proforma', 'Proforma Invoice'),
        ('tax', 'Tax Invoice'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invoices')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_invoices')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPE_CHOICES, default='tax')
    invoice_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    round_off = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_term = models.ForeignKey('PaymentTerm', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    payment_terms = models.TextField(blank=True)  # Kept for backwards compatibility
    notes = models.TextField(blank=True)
    parent_proforma = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='converted_tax_invoice')
    is_emailed = models.BooleanField(default=False)
    emailed_at = models.DateTimeField(null=True, blank=True)
    last_reminder_sent = models.DateTimeField(null=True, blank=True, help_text='Last payment reminder sent date')
    reminder_count = models.IntegerField(default=0, help_text='Number of reminders sent')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.client.name}"

    def should_apply_gst(self):
        """
        Determine if GST should be applied to this invoice based on:
        1. Organization's GST enabled setting
        2. GST registration date (if set)
        3. Invoice date
        """
        try:
            invoice_settings = InvoiceSettings.objects.get(organization=self.organization)
            company_settings = CompanySettings.objects.get(organization=self.organization)

            # If GST is not enabled for this organization, don't apply GST
            if not invoice_settings.gstEnabled:
                return False

            # If GST is enabled but no registration date is set, apply GST to all invoices
            if not company_settings.gstRegistrationDate:
                return True

            # If registration date is set, only apply GST to invoices on or after that date
            return self.invoice_date >= company_settings.gstRegistrationDate

        except (InvoiceSettings.DoesNotExist, CompanySettings.DoesNotExist):
            # Default to applying GST if settings don't exist
            return True

    def save(self, *args, **kwargs):
        # Auto-generate unique invoice number if not provided
        if not self.invoice_number:
            # Auto-generate invoice number with separate series for proforma and tax invoices
            try:
                settings = InvoiceSettings.objects.get(organization=self.organization)

                # Use different prefixes and starting numbers for proforma and tax invoices
                if self.invoice_type == 'proforma':
                    prefix = settings.proformaPrefix  # Proforma Invoice prefix (e.g., 'PI-')
                    starting_num = settings.proformaStartingNumber
                else:
                    prefix = settings.invoicePrefix  # Tax Invoice prefix (e.g., 'INV-')
                    starting_num = settings.startingNumber

                # Get last invoice of same type with locking to prevent race conditions
                last_invoice = Invoice.objects.filter(
                    organization=self.organization,
                    invoice_type=self.invoice_type,
                    invoice_number__startswith=prefix
                ).order_by('-created_at').first()

                if last_invoice:
                    last_num = int(last_invoice.invoice_number.replace(prefix, ''))
                    new_num = last_num + 1
                else:
                    new_num = starting_num

                # Ensure uniqueness by checking if the generated number already exists
                max_attempts = 100
                for attempt in range(max_attempts):
                    potential_number = f"{prefix}{new_num:04d}"
                    if not Invoice.objects.filter(invoice_number=potential_number).exists():
                        self.invoice_number = potential_number
                        break
                    new_num += 1
                else:
                    # Fallback if all attempts fail
                    import uuid
                    self.invoice_number = f"{prefix}{uuid.uuid4().hex[:8].upper()}"

            except InvoiceSettings.DoesNotExist:
                prefix = 'PI-' if self.invoice_type == 'proforma' else 'INV-'
                self.invoice_number = f"{prefix}{self.id or 1:04d}"

        super().save(*args, **kwargs)


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    hsn_sac = models.CharField(max_length=50, blank=True)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('upi', 'UPI'),
        ('card', 'Card'),
        ('other', 'Other'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payments')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text='Total payment amount (received + TDS)')
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text='TDS deducted amount')
    amount_received = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text='Actual amount received in bank/cash')
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment {self.amount} for {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        # If amount_received is not set, calculate it from amount - tds_amount
        if self.amount_received == 0 and self.amount > 0:
            self.amount_received = self.amount - self.tds_amount
        super().save(*args, **kwargs)


class Receipt(models.Model):
    """
    Receipt model for payment acknowledgment.
    Generated automatically when payment is recorded against an invoice.
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='receipts')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_receipts')
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='receipt')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='receipts')

    # Receipt details
    receipt_number = models.CharField(max_length=50, unique=True)
    receipt_date = models.DateField()
    amount_received = models.DecimalField(max_digits=12, decimal_places=2, help_text='Actual amount received (after TDS)')
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text='TDS deducted amount')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text='Total payment (received + TDS)')
    payment_method = models.CharField(max_length=20)

    # Additional info
    received_from = models.CharField(max_length=255)  # Client name
    towards = models.CharField(max_length=255, default='Payment against invoice')
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-receipt_date', '-created_at']
        verbose_name = "Receipt"
        verbose_name_plural = "Receipts"

    def __str__(self):
        return f"Receipt {self.receipt_number} - ₹{self.amount_received}"


class EmailSettings(models.Model):
    """Email configuration settings for sending invoices"""
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='email_settings')
    smtp_host = models.CharField(max_length=255, default='smtp.gmail.com')
    smtp_port = models.IntegerField(default=587)
    smtp_username = models.CharField(max_length=255)
    _smtp_password = models.CharField(max_length=500, db_column='smtp_password', blank=True)  # Encrypted field
    from_email = models.EmailField()
    from_name = models.CharField(max_length=255, blank=True)
    use_tls = models.BooleanField(default=True)
    email_signature = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Email Settings"
        verbose_name_plural = "Email Settings"

    def __str__(self):
        return f"Email Settings for {self.organization.name}"

    @property
    def smtp_password(self):
        """Decrypt password when accessing"""
        return decrypt_value(self._smtp_password)

    @smtp_password.setter
    def smtp_password(self, value):
        """Encrypt password when setting"""
        self._smtp_password = encrypt_value(value)


class SystemEmailSettings(models.Model):
    """System-level email configuration for superadmin (password reset, notifications, etc.)"""
    smtp_host = models.CharField(max_length=255, default='smtp.gmail.com')
    smtp_port = models.IntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True)
    _smtp_password = models.CharField(max_length=500, db_column='smtp_password', blank=True)  # Encrypted field
    from_email = models.EmailField(blank=True)
    use_tls = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Email Settings"
        verbose_name_plural = "System Email Settings"

    def __str__(self):
        return "System Email Settings"

    @property
    def smtp_password(self):
        """Decrypt password when accessing"""
        return decrypt_value(self._smtp_password)

    @smtp_password.setter
    def smtp_password(self, value):
        """Encrypt password when setting"""
        self._smtp_password = encrypt_value(value)


class ServiceItem(models.Model):
    """Service/Item master for professional services"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='service_items')
    name = models.CharField(max_length=255, help_text="Service/Item name")
    description = models.TextField(blank=True, help_text="Detailed description")
    sac_code = models.CharField(max_length=50, blank=True, help_text="SAC (Service Accounting Code)")
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, help_text="GST Rate %")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['organization', 'name']

    def __str__(self):
        return f"{self.name} ({self.sac_code})"


class PaymentTerm(models.Model):
    """Payment Terms master"""
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='payment_terms')
    term_name = models.CharField(max_length=100, help_text="Payment term name (e.g., Net 15, Net 30)")
    days = models.IntegerField(help_text="Number of days for payment")
    description = models.TextField(help_text="Payment term description")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['days']
        unique_together = ['organization', 'term_name']

    def __str__(self):
        return f"{self.term_name} - {self.days} days"


class InvoiceFormatSettings(models.Model):
    """Invoice format and layout customization settings"""
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='invoice_format_settings')

    # Header Settings
    show_logo = models.BooleanField(default=True)
    logo_position = models.CharField(max_length=10, choices=[('left', 'Left'), ('center', 'Center'), ('right', 'Right')], default='left')
    show_company_designation = models.BooleanField(default=True)
    company_designation_text = models.CharField(max_length=100, default='Professional Services')
    header_color = models.CharField(max_length=7, default='#1e3a8a')  # Hex color

    # Company Info Display
    show_company_name = models.BooleanField(default=True)
    show_trading_name = models.BooleanField(default=True)
    show_address = models.BooleanField(default=True)
    show_gstin = models.BooleanField(default=True)
    show_pan = models.BooleanField(default=True)
    show_phone = models.BooleanField(default=True)
    show_email = models.BooleanField(default=True)

    # Invoice Details Display
    show_invoice_number = models.BooleanField(default=True)
    show_invoice_date = models.BooleanField(default=True)
    show_due_date = models.BooleanField(default=False)

    # Client/Bill To Settings
    show_client_gstin = models.BooleanField(default=True)
    show_client_pan = models.BooleanField(default=False)
    show_client_phone = models.BooleanField(default=False)
    show_client_email = models.BooleanField(default=False)

    # Table Settings
    table_header_bg_color = models.CharField(max_length=7, default='#1e3a8a')
    table_header_text_color = models.CharField(max_length=7, default='#ffffff')
    show_hsn_sac_column = models.BooleanField(default=False)
    show_serial_number = models.BooleanField(default=True)
    show_taxable_value = models.BooleanField(default=True)
    show_cgst_sgst_separate = models.BooleanField(default=True)
    show_igst = models.BooleanField(default=True)
    show_gst_percentage = models.BooleanField(default=False)

    # Total Section
    show_subtotal = models.BooleanField(default=True)
    show_tax_breakup = models.BooleanField(default=True)
    show_grand_total_in_words = models.BooleanField(default=False)

    # Footer Settings
    show_bank_details = models.BooleanField(default=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    bank_branch = models.CharField(max_length=100, blank=True)

    show_signature = models.BooleanField(default=True)
    signature_label = models.CharField(max_length=100, default='Authorized Signatory')
    show_company_seal = models.BooleanField(default=False)

    # Terms & Notes
    show_payment_terms = models.BooleanField(default=True)
    show_notes = models.BooleanField(default=True)
    show_terms_conditions = models.BooleanField(default=True)

    # Additional Options
    show_computer_generated_note = models.BooleanField(default=True)
    show_page_numbers = models.BooleanField(default=True)

    # Font & Styling
    font_size = models.CharField(max_length=10, choices=[('small', 'Small'), ('medium', 'Medium'), ('large', 'Large')], default='medium')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Invoice Format Settings"
        verbose_name_plural = "Invoice Format Settings"

    def __str__(self):
        return f"Invoice Format Settings for {self.organization.name}"


class SubscriptionPlan(models.Model):
    """
    Subscription plans that organizations can subscribe to.
    Managed by super admin only.
    """
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=100)  # Free, Basic, Professional, Enterprise
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default='monthly')
    trial_days = models.IntegerField(default=0)  # Free trial period in days

    # Feature Limits
    max_users = models.IntegerField(default=1, help_text="Maximum users allowed")
    max_invoices_per_month = models.IntegerField(default=100, help_text="Maximum invoices per month")
    max_storage_gb = models.IntegerField(default=1, help_text="Maximum storage in GB")

    # Features (JSON field for flexible feature flags)
    features = models.JSONField(default=list, blank=True, help_text='["Feature 1", "Feature 2", "Feature 3"]')

    # Display & Status
    is_active = models.BooleanField(default=True, help_text="Plan is available for subscription")
    is_visible = models.BooleanField(default=True, help_text="Show on pricing page")
    sort_order = models.IntegerField(default=0, help_text="Display order on pricing page")
    highlight = models.BooleanField(default=False, help_text="Highlight as 'Most Popular'")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"
        ordering = ['sort_order', 'price']

    def __str__(self):
        return f"{self.name} - ₹{self.price}/{self.billing_cycle}"


class Coupon(models.Model):
    """
    Discount coupons that can be redeemed by organizations.
    Created and managed by super admin only.
    """
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage Discount'),
        ('fixed', 'Fixed Amount Discount'),
        ('extended_period', 'Extended Period'),
    ]

    code = models.CharField(max_length=50, unique=True, help_text="Coupon code (e.g., WELCOME20)")
    name = models.CharField(max_length=100, help_text="Internal name for reference")
    description = models.TextField(blank=True, help_text="Description of the offer")

    # Discount Details
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2,
                                        help_text="20 for 20%, 500 for ₹500, 30 for 30 days")

    # Applicable Plans (if empty, applies to all plans)
    applicable_plans = models.ManyToManyField(SubscriptionPlan, blank=True, related_name='coupons',
                                             help_text="Leave empty to apply to all plans")

    # Validity Period
    valid_from = models.DateTimeField(help_text="Coupon valid from this date")
    valid_until = models.DateTimeField(help_text="Coupon expires after this date")

    # Usage Limits
    max_total_uses = models.IntegerField(null=True, blank=True,
                                        help_text="Maximum total redemptions (leave empty for unlimited)")
    max_uses_per_user = models.IntegerField(default=1,
                                           help_text="Maximum times one organization can use this")
    current_usage_count = models.IntegerField(default=0, editable=False,
                                             help_text="Current total usage count")

    # Status
    is_active = models.BooleanField(default=True, help_text="Coupon is active and can be redeemed")

    # Audit
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                  related_name='created_coupons')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} - {self.discount_type} ({self.discount_value})"

    def is_valid(self):
        """Check if coupon is currently valid"""
        from django.utils import timezone
        now = timezone.now()

        if not self.is_active:
            return False, "Coupon is not active"

        if now < self.valid_from:
            return False, "Coupon not yet valid"

        if now > self.valid_until:
            return False, "Coupon has expired"

        if self.max_total_uses and self.current_usage_count >= self.max_total_uses:
            return False, "Coupon usage limit reached"

        return True, "Valid"

    def can_redeem(self, organization):
        """Check if organization can redeem this coupon"""
        # Check if coupon is valid
        is_valid, message = self.is_valid()
        if not is_valid:
            return False, message

        # Check per-user usage limit
        usage_count = self.usages.filter(organization=organization).count()
        if usage_count >= self.max_uses_per_user:
            return False, f"You have already used this coupon {self.max_uses_per_user} time(s)"

        return True, "Can redeem"


class CouponUsage(models.Model):
    """
    Record of coupon redemptions by organizations.
    """
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='coupon_usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coupon_usages',
                            help_text="User who redeemed the coupon")

    # Subscription details
    subscription = models.ForeignKey('Subscription', on_delete=models.CASCADE,
                                    related_name='coupon_usages', null=True, blank=True)

    # Applied Discount
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                         help_text="Actual discount amount applied")
    extended_days = models.IntegerField(default=0, help_text="Extra days added to subscription")

    # Timestamp
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Coupon Usage"
        verbose_name_plural = "Coupon Usages"
        ordering = ['-used_at']

    def __str__(self):
        return f"{self.coupon.code} used by {self.organization.name}"


class Subscription(models.Model):
    """
    Organization's subscription to a plan.
    """
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    organization = models.OneToOneField(Organization, on_delete=models.CASCADE,
                                       related_name='subscription_detail')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')

    # Subscription Period
    start_date = models.DateField()
    end_date = models.DateField()
    trial_end_date = models.DateField(null=True, blank=True, help_text="End of trial period")

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    auto_renew = models.BooleanField(default=True, help_text="Automatically renew subscription")

    # Payment Details
    last_payment_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Coupon Applied
    coupon_applied = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='applied_subscriptions',
                                      help_text="Coupon used for this subscription")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization.name} - {self.plan.name} ({self.status})"

    def is_active(self):
        """Check if subscription is currently active"""
        from django.utils import timezone
        from datetime import date

        if self.status == 'cancelled':
            return False

        if self.status == 'trial' and self.trial_end_date:
            return date.today() <= self.trial_end_date

        return date.today() <= self.end_date

    def days_remaining(self):
        """Calculate days remaining in subscription"""
        from datetime import date

        if self.status == 'trial' and self.trial_end_date:
            delta = self.trial_end_date - date.today()
        else:
            delta = self.end_date - date.today()

        return max(0, delta.days)


class SuperAdminNotification(models.Model):
    """
    In-app notifications for superadmin.
    Used to notify about upgrade requests, new registrations, etc.
    """
    NOTIFICATION_TYPE_CHOICES = [
        ('upgrade_request', 'Subscription Upgrade Request'),
        ('new_registration', 'New Organization Registration'),
        ('payment_received', 'Payment Received'),
        ('subscription_expiring', 'Subscription Expiring'),
        ('other', 'Other'),
    ]

    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()

    # Related objects (optional)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                    null=True, blank=True, related_name='superadmin_notifications')
    user = models.ForeignKey(User, on_delete=models.SET_NULL,
                            null=True, blank=True, related_name='triggered_notifications',
                            help_text="User who triggered this notification")

    # Reference to related object (generic)
    related_object_type = models.CharField(max_length=50, blank=True,
                                          help_text="e.g., 'upgrade_request', 'subscription'")
    related_object_id = models.IntegerField(null=True, blank=True,
                                           help_text="ID of the related object")

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    read_by = models.ForeignKey(User, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='read_notifications')

    # Action URL (optional - for quick navigation)
    action_url = models.CharField(max_length=255, blank=True,
                                 help_text="URL/route to navigate to for action")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Super Admin Notification"
        verbose_name_plural = "Super Admin Notifications"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type}: {self.title}"


class SubscriptionUpgradeRequest(models.Model):
    """
    Tracks subscription upgrade/change requests from users.
    Superadmin approves after payment confirmation.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled by User'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                    related_name='upgrade_requests')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    related_name='subscription_requests')

    # Current and requested plans
    current_plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL,
                                    null=True, blank=True,
                                    related_name='upgrade_from_requests',
                                    help_text="Current plan (if any)")
    requested_plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT,
                                      related_name='upgrade_to_requests')

    # Coupon (optional)
    coupon_code = models.CharField(max_length=50, blank=True,
                                   help_text="Coupon code user wants to apply")

    # Payment Information
    payment_method = models.CharField(max_length=100, blank=True,
                                     help_text="User's intended payment method")
    payment_reference = models.CharField(max_length=200, blank=True,
                                        help_text="Payment reference/transaction ID after payment")
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                help_text="Amount user will pay")

    # Request details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    user_notes = models.TextField(blank=True, help_text="User's message/notes")
    admin_notes = models.TextField(blank=True, help_text="Superadmin's notes")

    # Approval details
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='approved_requests')
    approved_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subscription Upgrade Request"
        verbose_name_plural = "Subscription Upgrade Requests"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization.name} - {self.requested_plan.name} ({self.status})"


# =============================================================================
# IT ACT & DPDP ACT COMPLIANCE MODELS
# =============================================================================

class AuditLog(models.Model):
    """
    Comprehensive audit trail for IT Act 2000/2008 compliance.
    Records all significant user actions for security and compliance.
    """
    ACTION_CHOICES = [
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('login_failed', 'Failed Login Attempt'),
        ('password_change', 'Password Changed'),
        ('password_reset', 'Password Reset'),
        ('profile_update', 'Profile Updated'),
        ('create', 'Record Created'),
        ('update', 'Record Updated'),
        ('delete', 'Record Deleted'),
        ('view', 'Record Viewed'),
        ('export', 'Data Exported'),
        ('email_sent', 'Email Sent'),
        ('payment_recorded', 'Payment Recorded'),
        ('invoice_generated', 'Invoice Generated'),
        ('consent_given', 'Consent Given'),
        ('consent_withdrawn', 'Consent Withdrawn'),
        ('data_deletion', 'Data Deletion Request'),
        ('data_export', 'Personal Data Export'),
        ('api_access', 'API Access'),
        ('settings_change', 'Settings Changed'),
        ('permission_change', 'Permission Changed'),
    ]

    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    # User and Organization Context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')

    # Action Details
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    description = models.TextField(help_text='Detailed description of the action')

    # Affected Resource
    resource_type = models.CharField(max_length=100, blank=True, help_text='Model/Resource type affected (e.g., Invoice, Client)')
    resource_id = models.CharField(max_length=100, blank=True, help_text='ID of the affected resource')
    resource_name = models.CharField(max_length=255, blank=True, help_text='Name/identifier of the affected resource')

    # Request Details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, help_text='Browser/Client user agent string')
    request_method = models.CharField(max_length=10, blank=True, help_text='HTTP method (GET, POST, etc.)')
    request_path = models.CharField(max_length=500, blank=True, help_text='API endpoint/URL path')

    # Data Changes (for update/delete actions)
    old_values = models.JSONField(null=True, blank=True, help_text='Previous values before change')
    new_values = models.JSONField(null=True, blank=True, help_text='New values after change')

    # Additional Metadata
    metadata = models.JSONField(null=True, blank=True, help_text='Additional context data')

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['organization', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['ip_address']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else 'Anonymous'
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M:%S')} - {user_str} - {self.action}"


class UserConsent(models.Model):
    """
    DPDP Act 2023 compliance - Records user consent for data processing.
    Required for lawful processing of personal data.
    """
    CONSENT_TYPE_CHOICES = [
        ('terms_of_service', 'Terms of Service'),
        ('privacy_policy', 'Privacy Policy'),
        ('data_processing', 'Data Processing'),
        ('marketing_emails', 'Marketing Emails'),
        ('analytics', 'Analytics & Tracking'),
        ('third_party_sharing', 'Third Party Data Sharing'),
        ('payment_processing', 'Payment Processing'),
        ('invoice_storage', 'Invoice Data Storage'),
    ]

    VERSION_REGEX = r'^\d+\.\d+$'  # e.g., "1.0", "2.1"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consents')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='user_consents')

    # Consent Details
    consent_type = models.CharField(max_length=50, choices=CONSENT_TYPE_CHOICES)
    consent_given = models.BooleanField(default=False)
    consent_text = models.TextField(help_text='The exact text user consented to')
    policy_version = models.CharField(max_length=20, help_text='Version of the policy/terms')

    # Consent Collection Details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    collection_method = models.CharField(max_length=50, default='web_form', help_text='How consent was collected')

    # Timestamps
    consented_at = models.DateTimeField(null=True, blank=True, help_text='When consent was given')
    withdrawn_at = models.DateTimeField(null=True, blank=True, help_text='When consent was withdrawn')
    expires_at = models.DateTimeField(null=True, blank=True, help_text='Consent expiry date (if applicable)')

    # Audit Trail
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Consent"
        verbose_name_plural = "User Consents"
        ordering = ['-created_at']
        unique_together = ['user', 'consent_type', 'policy_version']
        indexes = [
            models.Index(fields=['user', 'consent_type']),
            models.Index(fields=['consent_given']),
        ]

    def __str__(self):
        status = "Granted" if self.consent_given else "Withdrawn"
        return f"{self.user.email} - {self.consent_type} ({status})"

    def withdraw(self):
        """Withdraw consent and record timestamp"""
        self.consent_given = False
        self.withdrawn_at = timezone.now()
        self.save()


class FailedLoginAttempt(models.Model):
    """
    Security tracking for failed login attempts.
    Used for rate limiting and brute force attack detection.
    """
    email = models.EmailField(db_index=True, help_text='Email attempted for login')
    ip_address = models.GenericIPAddressField(db_index=True)
    user_agent = models.TextField(blank=True)
    failure_reason = models.CharField(max_length=100, default='invalid_credentials')

    # Attempt Details
    attempt_count = models.IntegerField(default=1, help_text='Consecutive failed attempts')
    locked_until = models.DateTimeField(null=True, blank=True, help_text='Account locked until this time')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Failed Login Attempt"
        verbose_name_plural = "Failed Login Attempts"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]

    def __str__(self):
        return f"{self.email} from {self.ip_address} - {self.attempt_count} attempts"

    @classmethod
    def record_attempt(cls, email, ip_address, user_agent='', failure_reason='invalid_credentials'):
        """Record a failed login attempt and return lockout status"""
        from datetime import timedelta

        # Find existing record within last 30 minutes
        cutoff_time = timezone.now() - timedelta(minutes=30)
        attempt, created = cls.objects.get_or_create(
            email=email.lower(),
            ip_address=ip_address,
            created_at__gte=cutoff_time,
            defaults={
                'user_agent': user_agent,
                'failure_reason': failure_reason,
            }
        )

        if not created:
            attempt.attempt_count += 1
            attempt.user_agent = user_agent
            attempt.failure_reason = failure_reason

        # Lock account after 5 failed attempts
        if attempt.attempt_count >= 5:
            # Progressive lockout: 5 min, 15 min, 30 min, 1 hour
            lockout_minutes = min(5 * (2 ** (attempt.attempt_count - 5)), 60)
            attempt.locked_until = timezone.now() + timedelta(minutes=lockout_minutes)

        attempt.save()
        return attempt

    @classmethod
    def is_locked(cls, email, ip_address):
        """Check if login is locked for this email/IP combination"""
        cutoff_time = timezone.now() - timedelta(minutes=30)
        attempt = cls.objects.filter(
            email=email.lower(),
            ip_address=ip_address,
            created_at__gte=cutoff_time,
            locked_until__gte=timezone.now()
        ).first()

        if attempt:
            remaining = (attempt.locked_until - timezone.now()).seconds // 60
            return True, remaining
        return False, 0

    @classmethod
    def clear_attempts(cls, email, ip_address):
        """Clear failed attempts after successful login"""
        cutoff_time = timezone.now() - timedelta(minutes=30)
        cls.objects.filter(
            email=email.lower(),
            ip_address=ip_address,
            created_at__gte=cutoff_time
        ).delete()


class DataDeletionRequest(models.Model):
    """
    DPDP Act compliance - Right to Erasure (Right to be Forgotten).
    Tracks user requests for data deletion.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='deletion_requests')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='deletion_requests')

    # Request Details
    email = models.EmailField(help_text='Email of the requesting user (preserved even after user deletion)')
    reason = models.TextField(blank=True, help_text='User-provided reason for deletion')
    data_types_requested = models.JSONField(default=list, help_text='Types of data requested for deletion')

    # Processing Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_deletion_requests')
    processed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, help_text='Reason if request was rejected')

    # Compliance Tracking
    legal_hold = models.BooleanField(default=False, help_text='Data under legal hold cannot be deleted')
    retention_end_date = models.DateField(null=True, blank=True, help_text='Date when data can be deleted (if under retention)')

    # Verification
    verification_token = models.CharField(max_length=100, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Data Deletion Request"
        verbose_name_plural = "Data Deletion Requests"
        ordering = ['-created_at']

    def __str__(self):
        return f"Deletion Request - {self.email} ({self.status})"
