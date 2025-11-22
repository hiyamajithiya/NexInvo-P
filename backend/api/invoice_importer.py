import pandas as pd
import json
import re
from datetime import datetime
from decimal import Decimal
from .models import Invoice, InvoiceItem, Client, Organization, InvoiceSettings, ServiceItem


class InvoiceImporter:
    """
    Handles importing invoices from Excel or JSON files
    Supports:
    1. Custom Excel template format
    2. GST Portal JSON/Excel export

    Features:
    - Auto-creates clients if not found in master
    - Collects errors/warnings but continues importing
    - Reports missing mandatory fields after import
    """

    def __init__(self, organization, created_by=None):
        self.organization = organization
        self.created_by = created_by
        self.errors = []
        self.warnings = []
        self.created_clients = []
        self.created_services = []
        self.success_count = 0
        self.failed_count = 0
        self.imported_invoice_numbers = []  # Track imported invoice numbers for format detection

    @staticmethod
    def _safe_str(value):
        """
        Convert pandas value to string, handling NaN and numeric types

        Args:
            value: Any value from pandas DataFrame (can be str, float, int, NaN, etc.)

        Returns:
            String value with whitespace stripped, or empty string for NaN/None
        """
        if pd.isna(value):
            return ''
        return str(value).strip()

    def import_from_excel(self, file_path):
        """
        Import invoices from Excel file (custom template)
        Expected columns:
        - Invoice Number* (required)
        - Invoice Date* (required)
        - Invoice Type (tax/proforma, default: tax)
        - Client Name* (required)
        - Client Email
        - Client Phone
        - Client Mobile
        - Client Address
        - Client City
        - Client State
        - Client PIN Code
        - Client State Code
        - Client GSTIN
        - Client PAN
        - Item Description* (required)
        - HSN/SAC
        - Quantity* (required)
        - Rate* (required)
        - GST Rate (default: 18)
        - Payment Terms
        - Notes
        """
        try:
            df = pd.read_excel(file_path)

            # Group by invoice number to handle multiple items per invoice
            invoice_groups = df.groupby('Invoice Number')

            for invoice_number, group in invoice_groups:
                try:
                    self._process_invoice_group(invoice_number, group)
                    self.imported_invoice_numbers.append(str(invoice_number))
                    self.success_count += 1
                except Exception as e:
                    self.failed_count += 1
                    self.errors.append(f"Invoice {invoice_number}: {str(e)}")

            # Auto-detect and update invoice number format
            if self.imported_invoice_numbers:
                self._update_invoice_format()

            return {
                'success': True,
                'success_count': self.success_count,
                'failed_count': self.failed_count,
                'errors': self.errors,
                'warnings': self.warnings,
                'created_clients': self.created_clients,
                'created_services': self.created_services
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'errors': self.errors,
                'warnings': self.warnings
            }

    def import_from_gst_json(self, file_path):
        """
        Import invoices from GST Portal JSON export
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            # GST Portal typically has a 'invoices' or 'b2b' key
            invoices_data = data.get('invoices', data.get('b2b', []))

            for invoice_data in invoices_data:
                try:
                    invoice = self._process_gst_invoice(invoice_data)
                    if invoice:
                        self.imported_invoice_numbers.append(invoice.invoice_number)
                    self.success_count += 1
                except Exception as e:
                    self.failed_count += 1
                    self.errors.append(f"GST Invoice: {str(e)}")

            # Auto-detect and update invoice number format
            if self.imported_invoice_numbers:
                self._update_invoice_format()

            return {
                'success': True,
                'success_count': self.success_count,
                'failed_count': self.failed_count,
                'errors': self.errors,
                'warnings': self.warnings,
                'created_clients': self.created_clients,
                'created_services': self.created_services
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'errors': self.errors,
                'warnings': self.warnings
            }

    def _process_invoice_group(self, invoice_number, group):
        """Process a single invoice with its items from Excel"""
        first_row = group.iloc[0]

        # Get or create client with all available fields
        # Use _safe_str to handle pandas numeric types and NaN values
        client_data = {
            'name': self._safe_str(first_row.get('Client Name', '')),
            'email': self._safe_str(first_row.get('Client Email', '')),
            'phone': self._safe_str(first_row.get('Client Phone', '')),
            'mobile': self._safe_str(first_row.get('Client Mobile', '')),
            'address': self._safe_str(first_row.get('Client Address', '')),
            'city': self._safe_str(first_row.get('Client City', '')),
            'state': self._safe_str(first_row.get('Client State', '')),
            'pinCode': self._safe_str(first_row.get('Client PIN Code', '')),
            'stateCode': self._safe_str(first_row.get('Client State Code', '')),
            'gstin': self._safe_str(first_row.get('Client GSTIN', '')),
            'pan': self._safe_str(first_row.get('Client PAN', ''))
        }
        client = self._get_or_create_client(client_data)

        # Parse invoice date
        invoice_date = pd.to_datetime(first_row['Invoice Date']).date()

        # Calculate totals
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')

        items_data = []
        for _, row in group.iterrows():
            quantity = Decimal(str(row['Quantity']))
            rate = Decimal(str(row['Rate']))
            gst_rate = Decimal(str(row['GST Rate']))

            taxable_amount = quantity * rate
            item_tax = taxable_amount * (gst_rate / Decimal('100'))
            total_amount = taxable_amount + item_tax

            subtotal += taxable_amount
            tax_amount += item_tax

            # Auto-create service item from import data
            description = self._safe_str(row.get('Item Description', ''))
            hsn_sac = self._safe_str(row.get('HSN/SAC', ''))

            # Create or get service item
            self._get_or_create_service(description, hsn_sac, gst_rate)

            items_data.append({
                'description': description,
                'hsn_sac': hsn_sac,
                'quantity': quantity,
                'rate': rate,
                'gst_rate': gst_rate,
                'taxable_amount': taxable_amount,
                'total_amount': total_amount
            })

        # Create invoice
        # Use _safe_str for all text fields to handle pandas numeric types
        invoice_type = self._safe_str(first_row.get('Invoice Type', 'tax'))
        invoice_type = invoice_type.lower() if invoice_type else 'tax'

        invoice = Invoice.objects.create(
            organization=self.organization,
            created_by=self.created_by,
            client=client,
            invoice_number=str(invoice_number),
            invoice_type=invoice_type,
            invoice_date=invoice_date,
            status='sent',  # Imported invoices are assumed to be sent
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=subtotal + tax_amount,
            payment_terms=self._safe_str(first_row.get('Payment Terms', '')),
            notes=self._safe_str(first_row.get('Notes', ''))
        )

        # Create invoice items
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        return invoice

    def _process_gst_invoice(self, invoice_data):
        """Process GST Portal invoice format"""
        # This is a simplified version - actual GST format may vary
        recipient = invoice_data.get('recipient', {})

        client_data = {
            'name': self._safe_str(recipient.get('name', '')),
            'gstin': self._safe_str(recipient.get('gstin', '')),
            'email': self._safe_str(recipient.get('email', '')),
            'address': self._safe_str(recipient.get('address', '')),
            'state': self._safe_str(recipient.get('state', '')),
            'stateCode': self._safe_str(recipient.get('state_code', ''))
        }
        client = self._get_or_create_client(client_data)

        invoice_date = datetime.strptime(
            invoice_data.get('date', ''),
            '%d-%m-%Y'
        ).date()

        # Parse items
        items = invoice_data.get('items', [])
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')

        invoice = Invoice.objects.create(
            organization=self.organization,
            created_by=self.created_by,
            client=client,
            invoice_number=invoice_data.get('invoice_number', ''),
            invoice_type='tax',
            invoice_date=invoice_date,
            status='sent',
            subtotal=Decimal(str(invoice_data.get('taxable_value', 0))),
            tax_amount=Decimal(str(invoice_data.get('tax_amount', 0))),
            total_amount=Decimal(str(invoice_data.get('total_value', 0)))
        )

        for item in items:
            InvoiceItem.objects.create(
                invoice=invoice,
                description=item.get('description', ''),
                hsn_sac=item.get('hsn_sac', ''),
                quantity=Decimal(str(item.get('quantity', 1))),
                rate=Decimal(str(item.get('rate', 0))),
                gst_rate=Decimal(str(item.get('gst_rate', 0))),
                taxable_amount=Decimal(str(item.get('taxable_amount', 0))),
                total_amount=Decimal(str(item.get('total_amount', 0)))
            )

        return invoice

    def _get_or_create_client(self, client_data):
        """
        Get existing client or create new one

        Args:
            client_data: Dictionary containing client fields (already stripped)

        Returns:
            Client object

        Side effects:
            - Adds to self.created_clients if new client is created
            - Adds to self.warnings if mandatory fields are missing
        """
        name = client_data.get('name', '')

        if not name:
            raise ValueError("Client name is required")

        gstin = client_data.get('gstin', '')
        email = client_data.get('email', '')

        # Try to find by GSTIN first if provided
        if gstin:
            client = Client.objects.filter(organization=self.organization, gstin=gstin).first()
            if client:
                return client

        # Try to find by name
        client = Client.objects.filter(organization=self.organization, name__iexact=name).first()
        if client:
            return client

        # Client not found - create new one with available data
        missing_fields = []

        # Check for missing optional but important fields
        if not email:
            missing_fields.append('email')
        if not client_data.get('phone') and not client_data.get('mobile'):
            missing_fields.append('phone/mobile')
        if not client_data.get('address'):
            missing_fields.append('address')
        if not client_data.get('gstin'):
            missing_fields.append('GSTIN')

        # Create client with available data (all values already stripped by _safe_str)
        new_client = Client.objects.create(
            organization=self.organization,
            name=name,
            email=email,
            phone=client_data.get('phone', ''),
            mobile=client_data.get('mobile', ''),
            address=client_data.get('address', ''),
            city=client_data.get('city', ''),
            state=client_data.get('state', ''),
            pinCode=client_data.get('pinCode', ''),
            stateCode=client_data.get('stateCode', ''),
            gstin=gstin,
            pan=client_data.get('pan', '')
        )

        # Track created client
        client_info = f"'{name}'"
        if missing_fields:
            client_info += f" (missing: {', '.join(missing_fields)})"

        self.created_clients.append(client_info)

        if missing_fields:
            self.warnings.append(
                f"Client '{name}' was created but is missing: {', '.join(missing_fields)}. "
                f"Please update these details in Client Master."
            )

        return new_client

    def _get_or_create_service(self, description, hsn_sac, gst_rate):
        """
        Get existing service or create new one

        Args:
            description: Service description/name
            hsn_sac: HSN/SAC code
            gst_rate: GST rate as Decimal

        Returns:
            ServiceItem object

        Side effects:
            - Adds to self.created_services if new service is created
        """
        description = description.strip()

        if not description:
            # If no description provided, skip service creation
            return None

        # Try to find by description first
        service = ServiceItem.objects.filter(
            organization=self.organization,
            name__iexact=description
        ).first()

        if service:
            return service

        # Try to find by HSN/SAC if provided
        if hsn_sac:
            service = ServiceItem.objects.filter(
                organization=self.organization,
                sac_code=hsn_sac
            ).first()
            if service:
                return service

        # Service not found - create new one
        new_service = ServiceItem.objects.create(
            organization=self.organization,
            name=description,
            description=description,
            sac_code=hsn_sac if hsn_sac else '',
            gst_rate=gst_rate
        )

        # Track created service
        service_info = f"'{description}'"
        if hsn_sac:
            service_info += f" (SAC: {hsn_sac}, GST: {gst_rate}%)"
        else:
            service_info += f" (GST: {gst_rate}%)"

        self.created_services.append(service_info)

        return new_service

    def _detect_invoice_format(self, invoice_numbers):
        """
        Detect invoice number format from imported invoices

        Analyzes invoice numbers to extract:
        1. Prefix pattern (e.g., 'INV-', 'BILL-', '2024-INV-')
        2. Numeric sequence and next number

        Args:
            invoice_numbers: List of invoice number strings

        Returns:
            dict with 'prefix' and 'next_number', or None if pattern unclear
        """
        if not invoice_numbers:
            return None

        # Pattern to separate prefix from numeric part
        # Matches: optional text/symbols, then digits at the end
        pattern = r'^(.*?)(\d+)$'

        formats = []
        for inv_num in invoice_numbers:
            match = re.match(pattern, str(inv_num).strip())
            if match:
                prefix = match.group(1)  # Everything before the number
                number = int(match.group(2))  # The numeric part
                formats.append({
                    'prefix': prefix,
                    'number': number,
                    'full': inv_num
                })

        if not formats:
            return None

        # Find the most common prefix
        prefix_counts = {}
        for fmt in formats:
            prefix = fmt['prefix']
            if prefix not in prefix_counts:
                prefix_counts[prefix] = []
            prefix_counts[prefix].append(fmt['number'])

        # Get the most common prefix
        most_common_prefix = max(prefix_counts.keys(), key=lambda k: len(prefix_counts[k]))

        # Get the highest number for that prefix
        max_number = max(prefix_counts[most_common_prefix])

        return {
            'prefix': most_common_prefix,
            'next_number': max_number + 1,
            'sample': f"{most_common_prefix}{max_number}"
        }

    def _update_invoice_format(self):
        """
        Auto-detect invoice format from imported invoices and update InvoiceSettings
        """
        # Separate tax invoices and proforma invoices if possible
        # For now, we'll detect the overall format
        detected = self._detect_invoice_format(self.imported_invoice_numbers)

        if not detected:
            self.warnings.append(
                "Could not auto-detect invoice number format. "
                "Invoice settings were not updated."
            )
            return

        try:
            # Get or create invoice settings
            settings, created = InvoiceSettings.objects.get_or_create(
                organization=self.organization
            )

            # Check if we should update the settings
            # Only update if the detected format is different
            current_prefix = settings.invoicePrefix
            current_next = settings.startingNumber

            if detected['prefix'] != current_prefix or detected['next_number'] > current_next:
                # Update the settings
                old_format = f"{current_prefix}{current_next}"
                new_format = f"{detected['prefix']}{detected['next_number']}"

                settings.invoicePrefix = detected['prefix']
                settings.startingNumber = detected['next_number']
                settings.save()

                self.warnings.append(
                    f"Invoice number format auto-updated: '{old_format}' → '{new_format}'. "
                    f"Next invoice will be: {new_format}"
                )
        except Exception as e:
            self.warnings.append(
                f"Could not update invoice settings: {str(e)}"
            )


def generate_excel_template():
    """
    Generate Excel template for invoice import
    Returns a pandas DataFrame that can be exported to Excel
    """
    template_data = {
        'Invoice Number': ['INV-0001', 'INV-0001', 'INV-0002'],
        'Invoice Date': ['2025-01-15', '2025-01-15', '2025-01-20'],
        'Invoice Type': ['tax', 'tax', 'proforma'],
        'Client Name': ['ABC Corporation', 'ABC Corporation', 'XYZ Ltd'],
        'Client Email': ['abc@example.com', 'abc@example.com', 'xyz@example.com'],
        'Client Phone': ['022-12345678', '022-12345678', ''],
        'Client Mobile': ['9876543210', '9876543210', '9876543211'],
        'Client Address': ['123 Main St, Andheri', '123 Main St, Andheri', '456 Park Ave'],
        'Client City': ['Mumbai', 'Mumbai', 'Delhi'],
        'Client State': ['Maharashtra', 'Maharashtra', 'Delhi'],
        'Client PIN Code': ['400001', '400001', '110001'],
        'Client State Code': ['27', '27', '07'],
        'Client GSTIN': ['27XXXXX0000X1Z5', '27XXXXX0000X1Z5', '07XXXXX0000X1Z5'],
        'Client PAN': ['ABCDE1234F', 'ABCDE1234F', 'XYZAB5678C'],
        'Item Description': ['Consulting Services - January', 'Software License', 'Design Services'],
        'HSN/SAC': ['998314', '998313', '998311'],
        'Quantity': [1, 1, 10],
        'Rate': [50000, 25000, 5000],
        'GST Rate': [18, 18, 18],
        'Payment Terms': ['Net 30 days', 'Net 30 days', 'Net 15 days'],
        'Notes': ['Thank you for your business', 'Thank you for your business', 'Advance payment received']
    }

    return pd.DataFrame(template_data)
