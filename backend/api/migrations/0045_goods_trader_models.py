# Generated migration for Goods Trader feature

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_predefined_units(apps, schema_editor):
    """Create predefined units of measurement"""
    UnitOfMeasurement = apps.get_model('api', 'UnitOfMeasurement')

    predefined_units = [
        ('Pieces', 'pcs'),
        ('Kilograms', 'kg'),
        ('Grams', 'g'),
        ('Litres', 'ltr'),
        ('Millilitres', 'ml'),
        ('Meters', 'm'),
        ('Centimeters', 'cm'),
        ('Feet', 'ft'),
        ('Inches', 'in'),
        ('Square Feet', 'sqft'),
        ('Square Meters', 'sqm'),
        ('Boxes', 'box'),
        ('Packets', 'pkt'),
        ('Dozens', 'doz'),
        ('Pairs', 'pr'),
        ('Sets', 'set'),
        ('Units', 'unit'),
        ('Rolls', 'roll'),
        ('Bundles', 'bdl'),
        ('Cartons', 'ctn'),
        ('Bags', 'bag'),
        ('Bottles', 'btl'),
        ('Cans', 'can'),
        ('Jars', 'jar'),
        ('Tubes', 'tube'),
    ]

    for name, symbol in predefined_units:
        UnitOfMeasurement.objects.create(
            name=name,
            symbol=symbol,
            organization=None,
            is_predefined=True,
            is_active=True
        )


def reverse_predefined_units(apps, schema_editor):
    """Remove predefined units"""
    UnitOfMeasurement = apps.get_model('api', 'UnitOfMeasurement')
    UnitOfMeasurement.objects.filter(is_predefined=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0044_add_quantity_rate_columns'),
    ]

    operations = [
        # Add business_type field to Organization
        migrations.AddField(
            model_name='organization',
            name='business_type',
            field=models.CharField(
                choices=[
                    ('services', 'Service Provider'),
                    ('goods', 'Goods Trader'),
                    ('both', 'Both Services & Goods')
                ],
                default='services',
                help_text='Type of business: Service Provider, Goods Trader, or Both',
                max_length=20
            ),
        ),

        # Create UnitOfMeasurement model
        migrations.CreateModel(
            name='UnitOfMeasurement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Unit name (e.g., Pieces, Kilograms)', max_length=50)),
                ('symbol', models.CharField(help_text='Short symbol (e.g., pcs, kg, ltr)', max_length=20)),
                ('is_predefined', models.BooleanField(default=False, help_text='True for system-wide predefined units')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(
                    blank=True,
                    help_text='Null for predefined system units',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='custom_units',
                    to='api.organization'
                )),
            ],
            options={
                'verbose_name': 'Unit of Measurement',
                'verbose_name_plural': 'Units of Measurement',
                'ordering': ['-is_predefined', 'name'],
            },
        ),

        # Create Product model
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Product name', max_length=255)),
                ('description', models.TextField(blank=True, help_text='Detailed description')),
                ('hsn_code', models.CharField(blank=True, help_text='HSN (Harmonized System of Nomenclature) Code', max_length=20)),
                ('sku', models.CharField(blank=True, help_text='Stock Keeping Unit / Product Code', max_length=50)),
                ('unit_name', models.CharField(default='pcs', help_text='Unit name for display (pcs, kg, etc.)', max_length=20)),
                ('purchase_price', models.DecimalField(decimal_places=2, default=0.0, help_text='Cost price / Purchase price', max_digits=12)),
                ('selling_price', models.DecimalField(decimal_places=2, default=0.0, help_text='Selling price / MRP', max_digits=12)),
                ('gst_rate', models.DecimalField(decimal_places=2, default=18.0, help_text='GST Rate %', max_digits=5)),
                ('track_inventory', models.BooleanField(default=False, help_text='Enable inventory/stock tracking')),
                ('current_stock', models.DecimalField(decimal_places=2, default=0.0, help_text='Current stock quantity', max_digits=12)),
                ('low_stock_threshold', models.DecimalField(blank=True, decimal_places=2, help_text='Alert when stock falls below this level', max_digits=12, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to='api.organization')),
                ('unit', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='products', to='api.unitofmeasurement')),
            ],
            options={
                'verbose_name': 'Product',
                'verbose_name_plural': 'Products',
                'ordering': ['name'],
                'unique_together': {('organization', 'name')},
            },
        ),

        # Create Supplier model
        migrations.CreateModel(
            name='Supplier',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('code', models.CharField(blank=True, help_text='Supplier code', max_length=50)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('mobile', models.CharField(blank=True, max_length=20)),
                ('address', models.TextField(blank=True)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('pinCode', models.CharField(blank=True, max_length=20)),
                ('stateCode', models.CharField(blank=True, max_length=10)),
                ('gstin', models.CharField(blank=True, max_length=50)),
                ('pan', models.CharField(blank=True, max_length=20)),
                ('bank_name', models.CharField(blank=True, max_length=100)),
                ('account_number', models.CharField(blank=True, max_length=50)),
                ('ifsc_code', models.CharField(blank=True, max_length=20)),
                ('contact_person', models.CharField(blank=True, max_length=100)),
                ('payment_terms', models.CharField(blank=True, help_text='e.g., Net 30, Advance', max_length=100)),
                ('notes', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='suppliers', to='api.organization')),
            ],
            options={
                'verbose_name': 'Supplier',
                'verbose_name_plural': 'Suppliers',
                'ordering': ['name'],
            },
        ),

        # Create Purchase model
        migrations.CreateModel(
            name='Purchase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('purchase_number', models.CharField(help_text='Internal purchase order number', max_length=50)),
                ('supplier_invoice_number', models.CharField(blank=True, help_text="Supplier's invoice/bill number", max_length=100)),
                ('supplier_invoice_date', models.DateField(blank=True, help_text="Date on supplier's invoice", null=True)),
                ('purchase_date', models.DateField(help_text='Date of purchase order')),
                ('received_date', models.DateField(blank=True, help_text='Date goods were received', null=True)),
                ('subtotal', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('cgst_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('sgst_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('igst_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('is_interstate', models.BooleanField(default=False)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('other_charges', models.DecimalField(decimal_places=2, default=0.0, help_text='Freight, handling, etc.', max_digits=12)),
                ('round_off', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('amount_paid', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('payment_status', models.CharField(
                    choices=[('unpaid', 'Unpaid'), ('partial', 'Partially Paid'), ('paid', 'Paid')],
                    default='unpaid',
                    max_length=20
                )),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('received', 'Received'), ('partial', 'Partially Received'), ('cancelled', 'Cancelled')],
                    default='draft',
                    max_length=20
                )),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_purchases', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='purchases', to='api.organization')),
                ('supplier', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='purchases', to='api.supplier')),
            ],
            options={
                'verbose_name': 'Purchase',
                'verbose_name_plural': 'Purchases',
                'ordering': ['-purchase_date', '-created_at'],
            },
        ),

        # Create PurchaseItem model
        migrations.CreateModel(
            name='PurchaseItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.CharField(max_length=500)),
                ('hsn_code', models.CharField(blank=True, max_length=20)),
                ('quantity', models.DecimalField(decimal_places=2, default=1, max_digits=12)),
                ('unit_name', models.CharField(default='pcs', max_length=20)),
                ('rate', models.DecimalField(decimal_places=2, default=0.0, help_text='Rate per unit', max_digits=12)),
                ('gst_rate', models.DecimalField(decimal_places=2, default=18.0, max_digits=5)),
                ('taxable_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('cgst_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('sgst_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('igst_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('quantity_received', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='purchase_items', to='api.product')),
                ('purchase', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='api.purchase')),
            ],
            options={
                'verbose_name': 'Purchase Item',
                'verbose_name_plural': 'Purchase Items',
            },
        ),

        # Create InventoryMovement model
        migrations.CreateModel(
            name='InventoryMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('movement_type', models.CharField(
                    choices=[
                        ('purchase', 'Purchase'),
                        ('sale', 'Sale'),
                        ('adjustment_in', 'Adjustment (In)'),
                        ('adjustment_out', 'Adjustment (Out)'),
                        ('return_in', 'Sales Return'),
                        ('return_out', 'Purchase Return'),
                        ('opening', 'Opening Stock')
                    ],
                    max_length=20
                )),
                ('quantity', models.DecimalField(decimal_places=2, help_text='Positive for stock in, negative for stock out', max_digits=12)),
                ('stock_after', models.DecimalField(decimal_places=2, help_text='Stock level after this movement', max_digits=12)),
                ('reference', models.CharField(blank=True, help_text='Invoice/Purchase number', max_length=100)),
                ('reference_type', models.CharField(blank=True, help_text='invoice, purchase, adjustment', max_length=20)),
                ('reference_id', models.IntegerField(blank=True, help_text='ID of the related document', null=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inventory_movements', to='api.organization')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inventory_movements', to='api.product')),
            ],
            options={
                'verbose_name': 'Inventory Movement',
                'verbose_name_plural': 'Inventory Movements',
                'ordering': ['-created_at'],
            },
        ),

        # Create SupplierPayment model
        migrations.CreateModel(
            name='SupplierPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_date', models.DateField()),
                ('payment_method', models.CharField(
                    choices=[
                        ('cash', 'Cash'),
                        ('bank_transfer', 'Bank Transfer'),
                        ('cheque', 'Cheque'),
                        ('upi', 'UPI'),
                        ('card', 'Card'),
                        ('other', 'Other')
                    ],
                    default='bank_transfer',
                    max_length=20
                )),
                ('reference_number', models.CharField(blank=True, help_text='Cheque no, UTR, etc.', max_length=100)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_supplier_payments', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supplier_payments', to='api.organization')),
                ('purchase', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='api.purchase')),
                ('supplier', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='payments', to='api.supplier')),
            ],
            options={
                'verbose_name': 'Supplier Payment',
                'verbose_name_plural': 'Supplier Payments',
                'ordering': ['-payment_date', '-created_at'],
            },
        ),

        # Create predefined units
        migrations.RunPython(create_predefined_units, reverse_predefined_units),
    ]
