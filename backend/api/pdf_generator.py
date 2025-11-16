from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable, KeepTogether
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas
from io import BytesIO
import base64


def number_to_words(number):
    """Convert a number to words (Indian numbering system)"""
    try:
        number = float(number)
        rupees = int(number)
        paise = int(round((number - rupees) * 100))

        def convert_to_words(n):
            if n == 0:
                return 'Zero'

            ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
            teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
                     'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
            tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

            def convert_below_thousand(num):
                if num == 0:
                    return ''
                elif num < 10:
                    return ones[num]
                elif num < 20:
                    return teens[num - 10]
                elif num < 100:
                    return tens[num // 10] + (' ' + ones[num % 10] if num % 10 != 0 else '')
                else:
                    return ones[num // 100] + ' Hundred' + (' ' + convert_below_thousand(num % 100) if num % 100 != 0 else '')

            if n < 1000:
                return convert_below_thousand(n)
            elif n < 100000:  # Thousand
                return convert_below_thousand(n // 1000) + ' Thousand' + (' ' + convert_below_thousand(n % 1000) if n % 1000 != 0 else '')
            elif n < 10000000:  # Lakh
                return convert_below_thousand(n // 100000) + ' Lakh' + (' ' + convert_to_words(n % 100000) if n % 100000 != 0 else '')
            else:  # Crore
                return convert_below_thousand(n // 10000000) + ' Crore' + (' ' + convert_to_words(n % 10000000) if n % 10000000 != 0 else '')

        words = convert_to_words(rupees) + ' Rupees'
        if paise > 0:
            words += ' and ' + convert_to_words(paise) + ' Paise'
        words += ' Only'
        return words
    except:
        return ''


class NumberedCanvas(canvas.Canvas):
    """Custom canvas to add page numbers"""
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.grey)
        self.drawRightString(
            A4[0] - 20*mm, 10*mm,
            f"Page {self._pageNumber} of {page_count}"
        )


def generate_invoice_pdf(invoice, company_settings, format_settings=None):
    """
    Generate invoice PDF matching the specified format

    Args:
        invoice: Invoice model instance
        company_settings: CompanySettings model instance
        format_settings: InvoiceFormatSettings model instance (optional)

    Returns:
        BytesIO: PDF file buffer
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=15*mm,
        bottomMargin=15*mm,
        leftMargin=15*mm,
        rightMargin=15*mm
    )

    elements = []
    available_width = A4[0] - 30*mm
    table_width = available_width * 0.85  # Table uses 85% of available width

    # Use format settings or defaults
    if format_settings:
        HEADER_BG = colors.HexColor(format_settings.table_header_bg_color)
        HEADER_TEXT = colors.HexColor(format_settings.table_header_text_color)
    else:
        HEADER_BG = colors.HexColor('#1e3a8a')  # Dark blue
        HEADER_TEXT = colors.white

    # ==================== HEADER SECTION ====================
    header_data = []
    left_header = []

    # Logo
    if company_settings.logo:
        try:
            logo_data = company_settings.logo
            if ',' in logo_data:
                logo_data = logo_data.split(',')[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = BytesIO(logo_bytes)
            logo_img = Image(logo_buffer, width=50*mm, height=25*mm)
            left_header.append(logo_img)
        except Exception as e:
            print(f"Error adding logo: {e}")

    # Right header - Company designation and Invoice label
    right_header_style = ParagraphStyle(
        'RightHeader',
        fontSize=10,
        textColor=colors.HexColor('#1e3a8a'),
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT,
        leading=12
    )

    invoice_label_style = ParagraphStyle(
        'InvoiceLabel',
        fontSize=14,
        textColor=colors.HexColor('#1e3a8a'),
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT,
        leading=16
    )

    # Invoice type display
    invoice_type_label = "TAX INVOICE" if invoice.invoice_type == 'tax' else "PROFORMA INVOICE"

    right_header = [
        Paragraph("CHARTERED ACCOUNTANT", right_header_style),
        Paragraph(invoice_type_label, invoice_label_style)
    ]

    header_table = Table(
        [[left_header, right_header]],
        colWidths=[available_width * 0.5, available_width * 0.5]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))

    elements.append(header_table)
    elements.append(Spacer(1, 3*mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey, spaceAfter=3*mm))

    # ==================== COMPANY INFO & INVOICE DETAILS ====================

    info_style = ParagraphStyle(
        'InfoStyle',
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica',
        leading=11,
        alignment=TA_LEFT
    )

    bold_style = ParagraphStyle(
        'BoldStyle',
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        leading=11,
        alignment=TA_LEFT
    )

    # Company name display logic
    company_display = company_settings.tradingName if company_settings.tradingName else company_settings.companyName

    # Left side - Company info
    company_info = [
        Paragraph(f"<b>{company_display or 'Company Name'}</b>", bold_style),
        Paragraph(f"{company_settings.address or ''}", info_style),
        Paragraph(f"{company_settings.city or ''}, {company_settings.state or ''} - {company_settings.pinCode or ''}", info_style),
        Paragraph(f"<b>GSTIN:</b> {company_settings.gstin or 'N/A'}", info_style),
        Paragraph(f"<b>PAN:</b> {company_settings.pan or 'N/A'}", info_style),
        Paragraph(f"<b>Phone:</b> {company_settings.phone or 'N/A'}", info_style),
        Paragraph(f"<b>Email:</b> {company_settings.email or 'N/A'}", info_style),
    ]

    # Right side - Invoice details
    invoice_info_right_style = ParagraphStyle(
        'InvoiceInfoRight',
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica',
        leading=11,
        alignment=TA_RIGHT
    )

    invoice_info = [
        Paragraph(f"<b>Invoice No:</b> {invoice.invoice_number}", invoice_info_right_style),
        Paragraph(f"<b>Invoice Date:</b> {invoice.invoice_date.strftime('%d-%b-%Y')}", invoice_info_right_style),
    ]

    info_table = Table(
        [[company_info, invoice_info]],
        colWidths=[available_width * 0.65, available_width * 0.35]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))

    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # ==================== BILL TO SECTION ====================

    bill_to_style = ParagraphStyle(
        'BillTo',
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        leading=11
    )

    bill_to_content = [
        Paragraph(f"<b>Bill To:</b>", bill_to_style),
        Paragraph(f"{invoice.client.name}", info_style),
        Paragraph(f"{invoice.client.address or ''}", info_style),
        Paragraph(f"{invoice.client.city or ''}, {invoice.client.state or ''} - {invoice.client.pinCode or ''}", info_style),
        Paragraph(f"<b>GSTIN:</b> {invoice.client.gstin or 'N/A'}", info_style),
    ]

    for item in bill_to_content:
        elements.append(item)

    elements.append(Spacer(1, 5*mm))

    # ==================== ITEMS TABLE ====================

    # Table header
    table_data = [[
        'S.No',
        'Description',
        'Taxable\nValue',
        'CGST\n(Rs.)',
        'SGST\n(Rs.)',
        'IGST\n(Rs.)',
        'Amount\n(Rs.)'
    ]]

    # Table rows
    for idx, item in enumerate(invoice.items.all(), 1):
        gst_amount = item.total_amount - item.taxable_amount

        # Determine if CGST/SGST or IGST based on state codes
        is_interstate = False
        try:
            if company_settings.stateCode and invoice.client.gstin:
                company_state_code = str(company_settings.stateCode).strip()
                client_state_code = str(invoice.client.gstin[:2]).strip()
                is_interstate = company_state_code != client_state_code
        except:
            pass

        cgst = 0
        sgst = 0
        igst = 0

        if is_interstate:
            igst = gst_amount
        else:
            cgst = gst_amount / 2
            sgst = gst_amount / 2

        table_data.append([
            str(idx),
            item.description,
            f"{item.taxable_amount:,.2f}",
            f"{cgst:,.2f}" if cgst > 0 else "-",
            f"{sgst:,.2f}" if sgst > 0 else "-",
            f"{igst:,.2f}" if igst > 0 else "-",
            f"{item.total_amount:,.2f}"
        ])

    # Grand Total row
    total_cgst = sum([float(row[3].replace(',', '')) for row in table_data[1:] if row[3] != '-'])
    total_sgst = sum([float(row[4].replace(',', '')) for row in table_data[1:] if row[4] != '-'])
    total_igst = sum([float(row[5].replace(',', '')) for row in table_data[1:] if row[5] != '-'])

    table_data.append([
        '',
        'GRAND TOTAL',
        f"{invoice.subtotal:,.2f}",
        f"{total_cgst:,.2f}" if total_cgst > 0 else "-",
        f"{total_sgst:,.2f}" if total_sgst > 0 else "-",
        f"{total_igst:,.2f}" if total_igst > 0 else "-",
        f"{invoice.total_amount:,.2f}"
    ])

    # Create table with reduced width (85% of page width)
    col_widths = [
        table_width * 0.06,   # S.No (6%)
        table_width * 0.40,   # Description (40%)
        table_width * 0.14,   # Taxable Value (14%)
        table_width * 0.13,   # CGST (13%)
        table_width * 0.13,   # SGST (13%)
        table_width * 0.13,   # IGST (13%)
        table_width * 0.14    # Amount (14%)
    ]

    items_table = Table(table_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        # Header row styling
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),

        # Data rows styling
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 7),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S.No center
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Description left
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Numbers right
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),

        # Grand Total row styling
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 9),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),

        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))

    elements.append(items_table)
    elements.append(Spacer(1, 5*mm))

    # Add Grand Total in Words if enabled
    if format_settings and format_settings.show_grand_total_in_words:
        total_in_words = number_to_words(invoice.total_amount)
        words_style = ParagraphStyle(
            'TotalWords',
            fontSize=9,
            textColor=colors.black,
            fontName='Helvetica-Bold',
            leading=11,
            alignment=TA_RIGHT
        )
        elements.append(Paragraph(f"Amount in Words: {total_in_words}", words_style))
        elements.append(Spacer(1, 5*mm))
    else:
        elements.append(Spacer(1, 10*mm))

    # ==================== FOOTER SECTION ====================

    footer_style = ParagraphStyle(
        'Footer',
        fontSize=8,
        textColor=colors.black,
        fontName='Helvetica',
        leading=10,
        alignment=TA_LEFT
    )

    footer_bold_style = ParagraphStyle(
        'FooterBold',
        fontSize=8,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        leading=10,
        alignment=TA_LEFT
    )

    # ==================== TERMS, NOTES & CONDITIONS SECTION ====================
    # Add these BEFORE bank details and signature

    terms_notes_style = ParagraphStyle(
        'TermsNotes',
        fontSize=8,
        textColor=colors.black,
        fontName='Helvetica',
        leading=10,
        alignment=TA_LEFT
    )

    terms_notes_title_style = ParagraphStyle(
        'TermsNotesTitle',
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica-Bold',
        leading=11,
        alignment=TA_LEFT
    )

    # Get default terms and notes from InvoiceSettings
    try:
        from .models import InvoiceSettings
        invoice_settings = InvoiceSettings.objects.get(user=invoice.user)
        default_terms = invoice_settings.termsAndConditions
        default_notes = invoice_settings.notes
    except:
        default_terms = ""
        default_notes = ""

    # Payment Terms
    if format_settings and format_settings.show_payment_terms:
        payment_terms_text = ""
        # Use payment_term foreign key if available, otherwise fall back to payment_terms text field
        if invoice.payment_term:
            payment_terms_text = invoice.payment_term.description
        elif invoice.payment_terms:
            payment_terms_text = invoice.payment_terms

        if payment_terms_text:
            elements.append(Paragraph("<b>Payment Terms:</b>", terms_notes_title_style))
            elements.append(Paragraph(payment_terms_text, terms_notes_style))
            elements.append(Spacer(1, 3*mm))

    # Notes
    if format_settings and format_settings.show_notes:
        notes_text = invoice.notes if invoice.notes else default_notes
        if notes_text:
            elements.append(Paragraph("<b>Notes:</b>", terms_notes_title_style))
            elements.append(Paragraph(notes_text, terms_notes_style))
            elements.append(Spacer(1, 3*mm))

    # Terms & Conditions
    if format_settings and format_settings.show_terms_conditions:
        if default_terms:
            elements.append(Paragraph("<b>Terms & Conditions:</b>", terms_notes_title_style))
            elements.append(Paragraph(default_terms, terms_notes_style))
            elements.append(Spacer(1, 3*mm))

    # Bank Details (left side) - use format settings if available
    bank_details = []
    if format_settings and format_settings.show_bank_details:
        bank_details.append(Paragraph("<b>Bank Details:</b>", footer_bold_style))
        if format_settings.bank_account_number:
            bank_details.append(Paragraph(f"Account No: {format_settings.bank_account_number}", footer_style))
        if format_settings.bank_name:
            bank_details.append(Paragraph(f"Bank Name: {format_settings.bank_name}", footer_style))
        if format_settings.bank_ifsc:
            bank_details.append(Paragraph(f"IFSC: {format_settings.bank_ifsc}", footer_style))
        if format_settings.bank_branch:
            bank_details.append(Paragraph(f"Branch: {format_settings.bank_branch}", footer_style))
    elif not format_settings:  # Default behavior when no format settings
        bank_details = [
            Paragraph("<b>Bank Details:</b>", footer_bold_style),
            Paragraph("Account No: XXXXXXXXXX", footer_style),
            Paragraph("Bank Name: XXXX Bank", footer_style),
            Paragraph("IFSC: XXXXXX", footer_style),
        ]

    # Signature section (right side)
    sig_style = ParagraphStyle(
        'Signature',
        fontSize=9,
        textColor=colors.black,
        fontName='Helvetica',
        leading=11,
        alignment=TA_RIGHT
    )

    # Signature section (right side) - use format settings if available
    signature_section = []
    if format_settings and format_settings.show_signature:
        signature_label = format_settings.signature_label or "Authorized Signatory"
        signature_section = [
            Spacer(1, 15*mm),
            Paragraph(f"<b>For {company_display or 'Company Name'}</b>", sig_style),
            Spacer(1, 15*mm),
            Paragraph(f"<b>{signature_label}</b>", sig_style),
        ]
    elif not format_settings:  # Default behavior
        signature_section = [
            Spacer(1, 15*mm),
            Paragraph(f"<b>For {company_display or 'Company Name'}</b>", sig_style),
            Spacer(1, 15*mm),
            Paragraph("<b>Authorized Signatory</b>", sig_style),
        ]

    # Only show footer table if there's content
    if bank_details or signature_section:
        footer_table = Table(
            [[bank_details, signature_section]],
            colWidths=[available_width * 0.5, available_width * 0.5]
        )
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        elements.append(footer_table)

    # Computer generated note - check format settings
    if not format_settings or format_settings.show_computer_generated_note:
        elements.append(Spacer(1, 5*mm))
        note_style = ParagraphStyle(
            'Note',
            fontSize=7,
            textColor=colors.grey,
            fontName='Helvetica-Oblique',
            alignment=TA_CENTER
        )
        elements.append(Paragraph("This is a computer-generated invoice and does not require a signature.", note_style))

    # Build PDF - check page number setting
    if format_settings and not format_settings.show_page_numbers:
        doc.build(elements)  # Build without page numbers
    else:
        doc.build(elements, canvasmaker=NumberedCanvas)  # Build with page numbers
    buffer.seek(0)
    return buffer
