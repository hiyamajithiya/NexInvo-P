from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from django.db.models import Sum, Q
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from datetime import date
import os
import tempfile
from .models import CompanySettings, InvoiceSettings, Client, Invoice, InvoiceItem, Payment, EmailSettings, InvoiceFormatSettings
from .serializers import (
    CompanySettingsSerializer, InvoiceSettingsSerializer, ClientSerializer,
    InvoiceSerializer, PaymentSerializer, EmailSettingsSerializer, InvoiceFormatSettingsSerializer
)
from .pdf_generator import generate_invoice_pdf
from .email_service import send_invoice_email
from .invoice_importer import InvoiceImporter, generate_excel_template


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def company_settings_view(request):
    """Get or update company settings for the authenticated user"""
    if request.method == 'GET':
        try:
            settings = CompanySettings.objects.get(user=request.user)
            serializer = CompanySettingsSerializer(settings)
            return Response(serializer.data)
        except CompanySettings.DoesNotExist:
            return Response({'message': 'No settings found'}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'PUT':
        try:
            settings = CompanySettings.objects.get(user=request.user)
            serializer = CompanySettingsSerializer(settings, data=request.data, partial=True)
        except CompanySettings.DoesNotExist:
            serializer = CompanySettingsSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def invoice_settings_view(request):
    """Get or update invoice settings for the authenticated user"""
    if request.method == 'GET':
        try:
            settings = InvoiceSettings.objects.get(user=request.user)
            serializer = InvoiceSettingsSerializer(settings)
            return Response(serializer.data)
        except InvoiceSettings.DoesNotExist:
            return Response({'message': 'No settings found'}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'PUT':
        try:
            settings = InvoiceSettings.objects.get(user=request.user)
            serializer = InvoiceSettingsSerializer(settings, data=request.data, partial=True)
        except InvoiceSettings.DoesNotExist:
            serializer = InvoiceSettingsSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def email_settings_view(request):
    """Get or update email settings for the authenticated user"""
    if request.method == 'GET':
        # Get or create email settings with defaults
        settings, created = EmailSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'smtp_username': '',
                'smtp_password': '',
                'from_email': '',
                'from_name': '',
                'use_tls': True,
                'email_signature': ''
            }
        )
        serializer = EmailSettingsSerializer(settings)
        return Response(serializer.data)

    elif request.method == 'PUT':
        settings, created = EmailSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'use_tls': True
            }
        )
        serializer = EmailSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_email_view(request):
    """Send a test email to verify SMTP configuration"""
    try:
        from django.core.mail import send_mail
        from django.conf import settings as django_settings

        email_settings = EmailSettings.objects.get(user=request.user)

        # Configure email backend temporarily
        from django.core.mail import get_connection

        connection = get_connection(
            host=email_settings.smtp_host,
            port=email_settings.smtp_port,
            username=email_settings.smtp_username,
            password=email_settings.smtp_password,
            use_tls=email_settings.use_tls,
        )

        # Send test email
        send_mail(
            subject='NexInvo - Test Email',
            message='This is a test email from NexInvo. Your email configuration is working correctly!',
            from_email=email_settings.from_email,
            recipient_list=[email_settings.from_email],
            connection=connection,
            fail_silently=False
        )

        return Response({'message': 'Test email sent successfully!'}, status=status.HTTP_200_OK)

    except EmailSettings.DoesNotExist:
        return Response({'error': 'Email settings not configured'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Failed to send test email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def invoice_format_settings_view(request):
    """Get or update invoice format settings for the authenticated user"""
    if request.method == 'GET':
        # Get or create invoice format settings with defaults
        settings, created = InvoiceFormatSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'show_logo': True,
                'logo_position': 'left',
                'show_company_designation': True,
                'company_designation_text': 'CHARTERED ACCOUNTANT',
                'header_color': '#1e3a8a',
                'show_company_name': True,
                'show_trading_name': True,
                'show_address': True,
                'show_gstin': True,
                'show_pan': True,
                'show_phone': True,
                'show_email': True,
                'show_invoice_number': True,
                'show_invoice_date': True,
                'show_due_date': False,
                'show_client_gstin': True,
                'show_client_pan': False,
                'show_client_phone': False,
                'show_client_email': False,
                'table_header_bg_color': '#1e3a8a',
                'table_header_text_color': '#ffffff',
                'show_hsn_sac_column': False,
                'show_serial_number': True,
                'show_taxable_value': True,
                'show_cgst_sgst_separate': True,
                'show_igst': True,
                'show_gst_percentage': False,
                'show_subtotal': True,
                'show_tax_breakup': True,
                'show_grand_total_in_words': False,
                'show_bank_details': True,
                'show_signature': True,
                'signature_label': 'Authorized Signatory',
                'show_company_seal': False,
                'show_payment_terms': True,
                'show_notes': True,
                'show_terms_conditions': True,
                'show_computer_generated_note': True,
                'show_page_numbers': True,
                'font_size': 'medium'
            }
        )
        serializer = InvoiceFormatSettingsSerializer(settings)
        return Response(serializer.data)

    elif request.method == 'PUT':
        settings, created = InvoiceFormatSettings.objects.get_or_create(user=request.user)
        serializer = InvoiceFormatSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Client.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.filter(user=self.request.user)

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

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for an invoice"""
        try:
            invoice = self.get_object()

            # Get company settings for the user
            try:
                company_settings = CompanySettings.objects.get(user=request.user)
            except CompanySettings.DoesNotExist:
                # Create default company settings if not exists
                company_settings = CompanySettings.objects.create(
                    user=request.user,
                    companyName="NexInvo"
                )

            # Get format settings for the user
            try:
                format_settings = InvoiceFormatSettings.objects.get(user=request.user)
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
                company_settings = CompanySettings.objects.get(user=request.user)
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
                company_settings = CompanySettings.objects.get(user=request.user)
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


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        payment = serializer.save(user=self.request.user)

        # Update invoice status based on payment
        invoice = payment.invoice

        # Calculate total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Update invoice status
        if total_paid >= invoice.total_amount:
            # Fully paid
            invoice.status = 'paid'
        elif total_paid > 0 and invoice.status == 'draft':
            # Partially paid, update to sent if still draft
            invoice.status = 'sent'

        invoice.save()

    def perform_update(self, serializer):
        payment = serializer.save()

        # Update invoice status based on updated payment
        invoice = payment.invoice

        # Calculate total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Update invoice status
        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0 and total_paid < invoice.total_amount:
            if invoice.status == 'paid':
                invoice.status = 'sent'  # Downgrade from paid if payment was reduced

        invoice.save()

    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()

        # Recalculate invoice status after payment deletion
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        if total_paid >= invoice.total_amount:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'sent'
        else:
            invoice.status = 'draft'

        invoice.save()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics"""
    user = request.user

    # Total invoices (all types)
    total_invoices = Invoice.objects.filter(user=user).count()

    # Total revenue - Sum of all payments received
    revenue = Payment.objects.filter(user=user).aggregate(
        total=Sum('amount')
    )['total'] or 0

    # Calculate pending amount - invoices with unpaid balance
    all_invoices = Invoice.objects.filter(user=user).exclude(status='cancelled')
    pending = 0

    for invoice in all_invoices:
        # Get total payments for this invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Calculate remaining balance
        balance = invoice.total_amount - total_paid
        if balance > 0:
            pending += balance

    # Total clients
    clients = Client.objects.filter(user=user).count()

    return Response({
        'totalInvoices': total_invoices,
        'revenue': float(revenue),
        'pending': float(pending),
        'clients': clients
    })


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
        importer = InvoiceImporter(request.user)

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
                'errors': result.get('errors', [])
            })
        else:
            return Response(
                {'error': result.get('error', 'Import failed')},
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


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """Get or update user profile information"""
    user = request.user

    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'firstName': user.first_name,
            'lastName': user.last_name
        })

    elif request.method == 'PUT':
        # Update user profile
        first_name = request.data.get('firstName', user.first_name)
        last_name = request.data.get('lastName', user.last_name)
        email = request.data.get('email', user.email)

        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.save()

        return Response({
            'message': 'Profile updated successfully',
            'username': user.username,
            'email': user.email,
            'firstName': user.first_name,
            'lastName': user.last_name
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change user password"""
    user = request.user

    old_password = request.data.get('oldPassword')
    new_password = request.data.get('newPassword')

    if not old_password or not new_password:
        return Response(
            {'error': 'Both old password and new password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if old password is correct
    if not user.check_password(old_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new password
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response(
            {'error': list(e.messages)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    user.set_password(new_password)
    user.save()

    # Update session to prevent logout
    update_session_auth_hash(request, user)

    return Response({'message': 'Password changed successfully'})
