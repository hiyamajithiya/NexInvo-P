import pandas as pd
import json
from datetime import datetime
from decimal import Decimal
from .models import Invoice, InvoiceItem, Client


class InvoiceImporter:
    """
    Handles importing invoices from Excel or JSON files
    Supports:
    1. Custom Excel template format
    2. GST Portal JSON/Excel export
    """

    def __init__(self, user):
        self.user = user
        self.errors = []
        self.success_count = 0
        self.failed_count = 0

    def import_from_excel(self, file_path):
        """
        Import invoices from Excel file (custom template)
        Expected columns:
        - Invoice Number
        - Invoice Date
        - Invoice Type (tax/proforma)
        - Client Name
        - Client GSTIN
        - Client Email
        - Item Description
        - HSN/SAC
        - Quantity
        - Rate
        - GST Rate
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
                    self.success_count += 1
                except Exception as e:
                    self.failed_count += 1
                    self.errors.append(f"Invoice {invoice_number}: {str(e)}")

            return {
                'success': True,
                'success_count': self.success_count,
                'failed_count': self.failed_count,
                'errors': self.errors
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
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
                    self._process_gst_invoice(invoice_data)
                    self.success_count += 1
                except Exception as e:
                    self.failed_count += 1
                    self.errors.append(f"GST Invoice: {str(e)}")

            return {
                'success': True,
                'success_count': self.success_count,
                'failed_count': self.failed_count,
                'errors': self.errors
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _process_invoice_group(self, invoice_number, group):
        """Process a single invoice with its items from Excel"""
        first_row = group.iloc[0]

        # Get or create client
        client = self._get_or_create_client(
            name=first_row.get('Client Name', ''),
            gstin=first_row.get('Client GSTIN', ''),
            email=first_row.get('Client Email', '')
        )

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

            items_data.append({
                'description': row['Item Description'],
                'hsn_sac': row.get('HSN/SAC', ''),
                'quantity': quantity,
                'rate': rate,
                'gst_rate': gst_rate,
                'taxable_amount': taxable_amount,
                'total_amount': total_amount
            })

        # Create invoice
        invoice = Invoice.objects.create(
            user=self.user,
            client=client,
            invoice_number=str(invoice_number),
            invoice_type=first_row.get('Invoice Type', 'tax').lower(),
            invoice_date=invoice_date,
            status='sent',  # Imported invoices are assumed to be sent
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=subtotal + tax_amount,
            payment_terms=first_row.get('Payment Terms', ''),
            notes=first_row.get('Notes', '')
        )

        # Create invoice items
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        return invoice

    def _process_gst_invoice(self, invoice_data):
        """Process GST Portal invoice format"""
        # This is a simplified version - actual GST format may vary
        client_data = invoice_data.get('recipient', {})

        client = self._get_or_create_client(
            name=client_data.get('name', ''),
            gstin=client_data.get('gstin', ''),
            email=client_data.get('email', '')
        )

        invoice_date = datetime.strptime(
            invoice_data.get('date', ''),
            '%d-%m-%Y'
        ).date()

        # Parse items
        items = invoice_data.get('items', [])
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')

        invoice = Invoice.objects.create(
            user=self.user,
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

    def _get_or_create_client(self, name, gstin='', email=''):
        """Get existing client or create new one"""
        if not name:
            raise ValueError("Client name is required")

        # Try to find by GSTIN first if provided
        if gstin:
            client = Client.objects.filter(user=self.user, gstin=gstin).first()
            if client:
                return client

        # Try to find by name
        client = Client.objects.filter(user=self.user, name=name).first()
        if client:
            return client

        # Create new client
        return Client.objects.create(
            user=self.user,
            name=name,
            gstin=gstin,
            email=email
        )


def generate_excel_template():
    """
    Generate Excel template for invoice import
    Returns a pandas DataFrame that can be exported to Excel
    """
    template_data = {
        'Invoice Number': ['INV-0001', 'INV-0001', 'INV-0002'],
        'Invoice Date': ['2025-01-15', '2025-01-15', '2025-01-20'],
        'Invoice Type': ['tax', 'tax', 'tax'],
        'Client Name': ['ABC Corporation', 'ABC Corporation', 'XYZ Ltd'],
        'Client GSTIN': ['27XXXXX0000X1Z5', '27XXXXX0000X1Z5', '07XXXXX0000X1Z5'],
        'Client Email': ['abc@example.com', 'abc@example.com', 'xyz@example.com'],
        'Item Description': ['Consulting Services - January', 'Software License', 'Design Services'],
        'HSN/SAC': ['998314', '998313', '998311'],
        'Quantity': [1, 1, 10],
        'Rate': [50000, 25000, 5000],
        'GST Rate': [18, 18, 18],
        'Payment Terms': ['Net 30 days', 'Net 30 days', 'Net 15 days'],
        'Notes': ['Thank you for your business', 'Thank you for your business', 'Advance payment received']
    }

    return pd.DataFrame(template_data)
