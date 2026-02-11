from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import SettingsPermission
from datetime import datetime
import logging
from .models import (
    CompanySettings, InvoiceSettings, EmailSettings, InvoiceFormatSettings
)
from .serializers import (
    CompanySettingsSerializer, InvoiceSettingsSerializer,
    EmailSettingsSerializer, InvoiceFormatSettingsSerializer
)

logger = logging.getLogger(__name__)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, SettingsPermission])
def company_settings_view(request):
    """Get or update company settings for the authenticated user"""
    if request.method == 'GET':
        try:
            settings = CompanySettings.objects.get(organization=request.organization)
            serializer = CompanySettingsSerializer(settings)
            return Response(serializer.data)
        except CompanySettings.DoesNotExist:
            return Response({'message': 'No settings found'}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'PUT':
        try:
            settings = CompanySettings.objects.get(organization=request.organization)
            serializer = CompanySettingsSerializer(settings, data=request.data, partial=True)
        except CompanySettings.DoesNotExist:
            serializer = CompanySettingsSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, SettingsPermission])
def invoice_settings_view(request):
    """Get or update invoice settings for the authenticated user"""
    if request.method == 'GET':
        try:
            settings = InvoiceSettings.objects.get(organization=request.organization)
            serializer = InvoiceSettingsSerializer(settings)
            return Response(serializer.data)
        except InvoiceSettings.DoesNotExist:
            return Response({'message': 'No settings found'}, status=status.HTTP_404_NOT_FOUND)

    elif request.method == 'PUT':
        try:
            settings = InvoiceSettings.objects.get(organization=request.organization)
            serializer = InvoiceSettingsSerializer(settings, data=request.data, partial=True)
        except InvoiceSettings.DoesNotExist:
            serializer = InvoiceSettingsSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, SettingsPermission])
def email_settings_view(request):
    """Get or update email settings for the authenticated user"""
    # Check if user has an organization
    if not request.organization:
        return Response(
            {'error': 'No organization associated with this user. Superadmin users cannot configure email settings as they are not associated with any organization.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'GET':
        # Get or create email settings with defaults
        settings, created = EmailSettings.objects.get_or_create(
            organization=request.organization,
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
            organization=request.organization,
            defaults={
                'smtp_host': 'smtp.gmail.com',
                'smtp_port': 587,
                'use_tls': True
            }
        )
        serializer = EmailSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_email_view(request):
    """Send a test email to verify SMTP configuration"""
    # Check if user has an organization
    if not request.organization:
        return Response(
            {'error': 'No organization associated with this user. Superadmin users cannot test email settings as they are not associated with any organization.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from django.core.mail import send_mail
        from django.conf import settings as django_settings

        email_settings = EmailSettings.objects.get(organization=request.organization)

        # Validate email settings
        if not email_settings.smtp_username or not email_settings.smtp_password:
            return Response(
                {'error': 'Please configure SMTP username and password in Email Settings'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email_settings.from_email:
            return Response(
                {'error': 'Please configure From Email address in Email Settings'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Configure email backend temporarily
        from django.core.mail import get_connection

        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
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
@permission_classes([IsAuthenticated, SettingsPermission])
def invoice_format_settings_view(request):
    """Get or update invoice format settings for the organization"""
    if request.method == 'GET':
        # Get or create invoice format settings with defaults
        settings, created = InvoiceFormatSettings.objects.get_or_create(
            organization=request.organization,
            defaults={
                'show_logo': True,
                'logo_position': 'left',
                'show_company_designation': True,
                'company_designation_text': 'Professional Services',
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
        settings, created = InvoiceFormatSettings.objects.get_or_create(organization=request.organization)
        serializer = InvoiceFormatSettingsSerializer(settings, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(organization=request.organization)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_report_email(request):
    """
    Send a report via email to specified recipient.
    Expects: report_name, report_data (list of dicts), recipient_email, date_filter
    """
    report_name = request.data.get('report_name')
    report_data = request.data.get('report_data', [])
    recipient_email = request.data.get('recipient_email')
    date_filter = request.data.get('date_filter', 'All Time')

    if not report_name or not recipient_email:
        return Response({'error': 'Report name and recipient email are required'}, status=status.HTTP_400_BAD_REQUEST)

    if not report_data:
        return Response({'error': 'No report data to send'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get email settings for the organization
        email_settings = EmailSettings.objects.get(organization=request.organization)
    except EmailSettings.DoesNotExist:
        return Response({'error': 'Email settings not configured. Please configure email settings first.'}, status=status.HTTP_400_BAD_REQUEST)

    if not email_settings.smtp_username or not email_settings.smtp_password or not email_settings.from_email:
        return Response({'error': 'SMTP settings incomplete. Please configure email settings.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get company settings for company name
        try:
            company_settings = CompanySettings.objects.get(organization=request.organization)
            company_name = company_settings.companyName
        except CompanySettings.DoesNotExist:
            company_name = request.organization.name

        # Generate CSV content
        if report_data:
            headers = list(report_data[0].keys())
            csv_rows = [','.join(headers)]
            for row in report_data:
                values = []
                for h in headers:
                    val = row.get(h, '')
                    if isinstance(val, (int, float)):
                        values.append(str(round(val, 2)))
                    else:
                        values.append(str(val).replace(',', ' '))
                csv_rows.append(','.join(values))
            csv_content = '\n'.join(csv_rows)
        else:
            csv_content = 'No data available'

        # Create email
        from django.core.mail import EmailMessage, get_connection

        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=email_settings.smtp_host,
            port=email_settings.smtp_port,
            username=email_settings.smtp_username,
            password=email_settings.smtp_password,
            use_tls=email_settings.use_tls,
            timeout=30,
        )

        subject = f'{report_name} - {company_name}'
        signature = f"\n\n{email_settings.email_signature}" if email_settings.email_signature else ""

        body = f"""Dear User,

Please find attached the {report_name} for the period: {date_filter}.

Report Summary:
- Report Type: {report_name}
- Period: {date_filter}
- Total Records: {len(report_data)}
- Generated on: {datetime.now().strftime('%d/%m/%Y %H:%M')}

This report was generated from {company_name}'s NexInvo system.

Best Regards,
{company_name}
{email_settings.from_email}
{signature}
        """.strip()

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=email_settings.from_email,
            to=[recipient_email],
            connection=connection
        )
        email.content_subtype = "plain"
        email.encoding = 'utf-8'

        # Attach CSV report
        filename = f"{report_name.replace(' ', '_')}_{date_filter.replace(' ', '_')}.csv"
        email.attach(filename, csv_content, 'text/csv')

        email.send(fail_silently=False)

        return Response({'message': f'Report sent successfully to {recipient_email}'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
