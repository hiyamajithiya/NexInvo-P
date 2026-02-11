from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .throttles import ExportRateThrottle
from api.permissions import ReadOnlyForViewer
from api.pagination import StandardPagination
from django.http import HttpResponse
from django.db.models import Q
from datetime import date
import os
import logging
import tempfile

from .models import (
    Client, Invoice, InvoiceItem, ServiceItem, PaymentTerm,
    Payment, CompanySettings, InvoiceSettings, InvoiceFormatSettings,
    EmailSettings
)
from .serializers import (
    ClientSerializer, InvoiceSerializer, ServiceItemSerializer,
    PaymentTermSerializer
)
from .pdf_generator import generate_invoice_pdf
from .email_service import send_invoice_email, send_bulk_invoice_emails
from .invoice_importer import InvoiceImporter, generate_excel_template

logger = logging.getLogger(__name__)


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Client.objects.filter(
            organization=self.request.organization
        ).select_related('organization').prefetch_related('invoices')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """Bulk upload clients from CSV/Excel file"""
        import csv
        import io
        from datetime import datetime

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Read file content
            file_content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(file_content))

            # Validate CSV headers
            expected_headers = {'Client Name*', 'Email*'}  # Required headers
            optional_headers = {'Client Code', 'Phone', 'Mobile', 'Address', 'City', 'State',
                              'PIN Code', 'State Code', 'GSTIN', 'PAN', 'Date of Birth', 'Date of Incorporation'}

            if csv_reader.fieldnames is None:
                return Response({'error': 'CSV file is empty or invalid'}, status=status.HTTP_400_BAD_REQUEST)

            file_headers = set(csv_reader.fieldnames)
            missing_required = expected_headers - file_headers

            if missing_required:
                return Response({
                    'error': f'Missing required columns: {", ".join(missing_required)}. Please use the provided template.'
                }, status=status.HTTP_400_BAD_REQUEST)

            created_count = 0
            errors = []

            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    # Parse date fields if provided
                    date_of_birth = None
                    date_of_incorporation = None

                    if row.get('Date of Birth'):
                        try:
                            date_of_birth = datetime.strptime(row['Date of Birth'], '%Y-%m-%d').date()
                        except ValueError:
                            pass

                    if row.get('Date of Incorporation'):
                        try:
                            date_of_incorporation = datetime.strptime(row['Date of Incorporation'], '%Y-%m-%d').date()
                        except ValueError:
                            pass

                    # Create client data
                    client_data = {
                        'name': row.get('Client Name*', '').strip(),
                        'code': row.get('Client Code', '').strip(),
                        'email': row.get('Email*', '').strip(),
                        'phone': row.get('Phone', '').strip(),
                        'mobile': row.get('Mobile', '').strip(),
                        'address': row.get('Address', '').strip(),
                        'city': row.get('City', '').strip(),
                        'state': row.get('State', '').strip(),
                        'pinCode': row.get('PIN Code', '').strip(),
                        'stateCode': row.get('State Code', '').strip(),
                        'gstin': row.get('GSTIN', '').strip(),
                        'pan': row.get('PAN', '').strip(),
                        'date_of_birth': date_of_birth,
                        'date_of_incorporation': date_of_incorporation,
                    }

                    # Validate required fields
                    if not client_data['name']:
                        errors.append(f"Row {row_num}: Client name is required")
                        continue

                    # Create client
                    serializer = ClientSerializer(data=client_data)
                    if serializer.is_valid():
                        serializer.save(organization=request.organization)
                        created_count += 1
                    else:
                        errors.append(f"Row {row_num}: {serializer.errors}")

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

            return Response({
                'success': True,
                'created_count': created_count,
                'errors': errors
            }, status=status.HTTP_201_CREATED)

        except UnicodeDecodeError:
            return Response({
                'error': 'Unable to read the file. Please ensure it is saved as UTF-8 CSV format.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': f'Failed to process file: {str(e)}. Please ensure the file matches the template format.'
            }, status=status.HTTP_400_BAD_REQUEST)


class ServiceItemViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceItemSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = None  # Disabled - used in dropdowns

    def get_queryset(self):
        return ServiceItem.objects.filter(
            organization=self.request.organization, is_active=True
        ).select_related('organization')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class PaymentTermViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentTermSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = None  # Disabled - used in dropdowns

    def get_queryset(self):
        return PaymentTerm.objects.filter(
            organization=self.request.organization, is_active=True
        ).select_related('organization')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Invoice.objects.filter(
            organization=self.request.organization
        ).select_related(
            'client', 'organization', 'created_by', 'payment_term', 'parent_proforma'
        ).prefetch_related('items', 'payments')

        # Filter by search term
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(client__name__icontains=search)
            )

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by invoice type
        invoice_type = self.request.query_params.get('invoice_type', None)
        if invoice_type:
            queryset = queryset.filter(invoice_type=invoice_type)

        # Filter for unpaid invoices (for payment dropdown)
        unpaid_only = self.request.query_params.get('unpaid_only', None)
        if unpaid_only == 'true':
            # Exclude invoices that are already fully paid
            queryset = queryset.exclude(status='paid')

        return queryset

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization, created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for an invoice"""
        try:
            invoice = self.get_object()

            # Get company settings for the user
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                # Create default company settings if not exists
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Get format settings for the user
            try:
                format_settings = InvoiceFormatSettings.objects.get(organization=request.organization)
            except InvoiceFormatSettings.DoesNotExist:
                format_settings = None

            # Generate PDF
            pdf_buffer = generate_invoice_pdf(invoice, company_settings, format_settings)

            # Create HTTP response with PDF
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'

            return response

        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send invoice email to client"""
        try:
            invoice = self.get_object()

            # Check if client has email
            if not invoice.client.email:
                return Response(
                    {'error': 'Client does not have an email address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get company settings
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Send email
            success = send_invoice_email(invoice, company_settings)

            if success:
                # Update invoice status to 'sent' if it was 'draft'
                if invoice.status == 'draft':
                    invoice.status = 'sent'
                    invoice.save()

                return Response({
                    'message': 'Invoice email sent successfully',
                    'invoice': InvoiceSerializer(invoice).data
                })
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_send_email(self, request):
        """Send emails for multiple invoices at once - optimized for speed"""
        try:
            invoice_ids = request.data.get('invoice_ids', [])

            if not invoice_ids:
                return Response(
                    {'error': 'No invoice IDs provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get invoices
            invoices = Invoice.objects.filter(
                id__in=invoice_ids,
                organization=request.organization
            ).select_related('client')

            if not invoices.exists():
                return Response(
                    {'error': 'No valid invoices found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get company settings
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Send bulk emails using optimized function
            result = send_bulk_invoice_emails(list(invoices), company_settings)

            # Update status for successfully sent invoices
            Invoice.objects.filter(
                id__in=invoice_ids,
                organization=request.organization,
                status='draft',
                is_emailed=True
            ).update(status='sent')

            return Response({
                'message': f'Emails sent: {result["success"]} successful, {result["failed"]} failed',
                'success_count': result['success'],
                'failed_count': result['failed'],
                'errors': result['errors'][:10] if result['errors'] else []  # Return only first 10 errors
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def convert_to_tax_invoice(self, request, pk=None):
        """Convert proforma invoice to tax invoice after payment received"""
        try:
            proforma_invoice = self.get_object()

            # Validate that it's a proforma invoice
            if proforma_invoice.invoice_type != 'proforma':
                return Response(
                    {'error': 'Only proforma invoices can be converted to tax invoices'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if already converted
            if hasattr(proforma_invoice, 'converted_tax_invoice') and proforma_invoice.converted_tax_invoice.exists():
                return Response(
                    {'error': 'This proforma invoice has already been converted to a tax invoice'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create new tax invoice
            tax_invoice = Invoice.objects.create(
                user=proforma_invoice.user,
                client=proforma_invoice.client,
                invoice_type='tax',
                invoice_date=date.today(),
                status='paid',  # Mark as paid since payment has been received
                subtotal=proforma_invoice.subtotal,
                tax_amount=proforma_invoice.tax_amount,
                total_amount=proforma_invoice.total_amount,
                payment_terms=proforma_invoice.payment_terms,
                notes=proforma_invoice.notes,
                parent_proforma=proforma_invoice
            )

            # Copy invoice items
            for item in proforma_invoice.items.all():
                InvoiceItem.objects.create(
                    invoice=tax_invoice,
                    description=item.description,
                    hsn_sac=item.hsn_sac,
                    quantity=item.quantity,
                    rate=item.rate,
                    gst_rate=item.gst_rate,
                    taxable_amount=item.taxable_amount,
                    total_amount=item.total_amount
                )

            # Update proforma invoice status
            proforma_invoice.status = 'paid'
            proforma_invoice.save()

            # Get company settings
            try:
                company_settings = CompanySettings.objects.get(organization=request.organization)
            except CompanySettings.DoesNotExist:
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Auto-send tax invoice email if client has email
            if tax_invoice.client.email:
                send_invoice_email(tax_invoice, company_settings)

            return Response({
                'message': 'Proforma invoice converted to tax invoice successfully',
                'proforma_invoice': InvoiceSerializer(proforma_invoice).data,
                'tax_invoice': InvoiceSerializer(tax_invoice).data
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_invoices(request):
    """
    Import invoices from Excel or JSON file
    Supports custom Excel template and GST Portal exports
    """
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = request.FILES['file']
    file_extension = os.path.splitext(uploaded_file.name)[1].lower()

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
        for chunk in uploaded_file.chunks():
            tmp_file.write(chunk)
        tmp_file_path = tmp_file.name

    try:
        importer = InvoiceImporter(
            organization=request.organization,
            created_by=request.user
        )

        if file_extension in ['.xlsx', '.xls']:
            result = importer.import_from_excel(tmp_file_path)
        elif file_extension == '.json':
            result = importer.import_from_gst_json(tmp_file_path)
        else:
            return Response(
                {'error': 'Unsupported file format. Please upload .xlsx, .xls, or .json file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clean up temp file
        os.unlink(tmp_file_path)

        if result.get('success'):
            return Response({
                'message': 'Import completed',
                'success_count': result.get('success_count', 0),
                'failed_count': result.get('failed_count', 0),
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', []),
                'created_clients': result.get('created_clients', []),
                'created_services': result.get('created_services', [])
            })
        else:
            return Response(
                {
                    'error': result.get('error', 'Import failed'),
                    'errors': result.get('errors', []),
                    'warnings': result.get('warnings', [])
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_import_template(request):
    """
    Download Excel template for invoice import
    """
    try:
        # Generate template
        df = generate_excel_template()

        # Create HTTP response with Excel file
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="invoice_import_template.xlsx"'

        # Write to response
        df.to_excel(response, index=False, engine='openpyxl')

        return response

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([ExportRateThrottle])
def export_data(request):
    """
    Export organization data (invoices, clients, payments) to Excel or CSV
    """
    import pandas as pd
    from io import BytesIO

    export_format = request.GET.get('format', 'excel')  # excel or csv
    data_type = request.GET.get('type', 'all')  # all, invoices, clients, payments

    organization = request.organization

    try:
        # Prepare data based on type
        if data_type in ['all', 'invoices']:
            invoices = Invoice.objects.filter(organization=organization).select_related('client')
            invoices_data = []
            for inv in invoices:
                invoices_data.append({
                    'Invoice Number': inv.invoice_number,
                    'Type': inv.invoice_type.upper(),
                    'Client': inv.client.name if inv.client else '',
                    'Invoice Date': inv.invoice_date.strftime('%d/%m/%Y') if inv.invoice_date else '',
                    'Due Date': inv.due_date.strftime('%d/%m/%Y') if inv.due_date else '',
                    'Subtotal': float(inv.subtotal or 0),
                    'Tax Amount': float(inv.tax_amount or 0),
                    'Total Amount': float(inv.total_amount or 0),
                    'Status': inv.status.upper(),
                    'Created': inv.created_at.strftime('%d/%m/%Y %H:%M') if inv.created_at else ''
                })
            df_invoices = pd.DataFrame(invoices_data)

        if data_type in ['all', 'clients']:
            clients = Client.objects.filter(organization=organization)
            clients_data = []
            for client in clients:
                clients_data.append({
                    'Name': client.name,
                    'Email': client.email or '',
                    'Phone': client.phone or '',
                    'GSTIN': client.gstin or '',
                    'PAN': client.pan or '',
                    'Address': client.address or '',
                    'City': client.city or '',
                    'State': client.state or '',
                    'PIN Code': client.pin_code or '',
                    'Created': client.created_at.strftime('%d/%m/%Y') if client.created_at else ''
                })
            df_clients = pd.DataFrame(clients_data)

        if data_type in ['all', 'payments']:
            payments = Payment.objects.filter(invoice__organization=organization).select_related('invoice', 'invoice__client')
            payments_data = []
            for payment in payments:
                payments_data.append({
                    'Payment ID': payment.id,
                    'Invoice Number': payment.invoice.invoice_number if payment.invoice else '',
                    'Client': payment.invoice.client.name if payment.invoice and payment.invoice.client else '',
                    'Payment Date': payment.payment_date.strftime('%d/%m/%Y') if payment.payment_date else '',
                    'Amount': float(payment.amount or 0),
                    'TDS Deducted': float(payment.tds_amount or 0),
                    'Amount Received': float(payment.amount_received or 0),
                    'Payment Method': payment.get_payment_method_display() if payment.payment_method else '',
                    'Reference': payment.reference_number or '',
                    'Notes': payment.notes or ''
                })
            df_payments = pd.DataFrame(payments_data)

        # Generate file based on format
        if export_format == 'csv':
            # For CSV, export only the requested type (or invoices if all)
            if data_type == 'invoices' or data_type == 'all':
                df = df_invoices
                filename = 'invoices_export.csv'
            elif data_type == 'clients':
                df = df_clients
                filename = 'clients_export.csv'
            elif data_type == 'payments':
                df = df_payments
                filename = 'payments_export.csv'

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            df.to_csv(response, index=False, encoding='utf-8-sig')
            return response

        else:  # Excel format
            output = BytesIO()

            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                if data_type in ['all', 'invoices']:
                    df_invoices.to_excel(writer, sheet_name='Invoices', index=False)
                if data_type in ['all', 'clients']:
                    df_clients.to_excel(writer, sheet_name='Clients', index=False)
                if data_type in ['all', 'payments']:
                    df_payments.to_excel(writer, sheet_name='Payments', index=False)

            output.seek(0)

            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="nexinvo_data_export.xlsx"'
            return response

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
