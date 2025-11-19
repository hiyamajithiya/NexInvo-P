from django.db import models
from django.contrib.auth.models import User
import uuid


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
    # General Settings
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
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pinCode = models.CharField(max_length=20, blank=True)
    stateCode = models.CharField(max_length=10, blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    pan = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


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
    amount = models.DecimalField(max_digits=12, decimal_places=2)
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


class EmailSettings(models.Model):
    """Email configuration settings for sending invoices"""
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='email_settings')
    smtp_host = models.CharField(max_length=255, default='smtp.gmail.com')
    smtp_port = models.IntegerField(default=587)
    smtp_username = models.CharField(max_length=255)
    smtp_password = models.CharField(max_length=255)  # Should be encrypted in production
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
    company_designation_text = models.CharField(max_length=100, default='CHARTERED ACCOUNTANT')
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
