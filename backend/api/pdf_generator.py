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


def format_address_for_pdf(address):
    """
    Convert address with newlines to HTML format for PDF rendering.
    Replaces newlines with <br/> tags for proper line breaks in PDF.
    """
    if not address:
        return ''
    # Replace different types of newlines with <br/>
    return address.replace('\r\n', '<br/>').replace('\n', '<br/>').replace('\r', '<br/>')


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

    # Get company designation text from format settings or use default
    designation_text = "Professional Services"  # Default value
    if format_settings and format_settings.company_designation_text:
        designation_text = format_settings.company_designation_text

    right_header = [
        Paragraph(designation_text.upper(), right_header_style),
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
    # Format address to preserve line breaks entered by user
    company_address_formatted = format_address_for_pdf(company_settings.address)

    company_info = [
        Paragraph(f"<b>{company_display or 'Company Name'}</b>", bold_style),
        Paragraph(f"{company_address_formatted}", info_style),
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
        Paragraph(f"<b>Invoice Date:</b> {invoice.invoice_date.strftime('%d/%m/%Y')}", invoice_info_right_style),
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

    # Format client address to preserve line breaks entered by user
    client_address_formatted = format_address_for_pdf(invoice.client.address)

    bill_to_content = [
        Paragraph(f"<b>Bill To:</b>", bill_to_style),
        Paragraph(f"{invoice.client.name}", info_style),
        Paragraph(f"{client_address_formatted}", info_style),
        Paragraph(f"{invoice.client.city or ''}, {invoice.client.state or ''} - {invoice.client.pinCode or ''}", info_style),
        Paragraph(f"<b>GSTIN:</b> {invoice.client.gstin or 'N/A'}", info_style),
    ]

    for item in bill_to_content:
        elements.append(item)

    elements.append(Spacer(1, 5*mm))

    # ==================== ITEMS TABLE ====================

    # Check format settings for quantity/rate columns
    show_quantity = format_settings.show_quantity_column if format_settings else False
    show_rate = format_settings.show_rate_column if format_settings else False

    # Build table header dynamically
    header_row = ['S.No', 'Description']
    if show_quantity:
        header_row.append('Qty')
    if show_rate:
        header_row.append('Rate\n(Rs.)')
    header_row.extend([
        'Taxable\nValue',
        'CGST\n(Rs.)',
        'SGST\n(Rs.)',
        'IGST\n(Rs.)',
        'Amount\n(Rs.)'
    ])
    table_data = [header_row]

    # Table rows
    for idx, item in enumerate(invoice.items.all(), 1):
        # Use stored GST values if available, otherwise calculate
        if hasattr(item, 'cgst_amount') and hasattr(item, 'sgst_amount') and hasattr(item, 'igst_amount'):
            cgst = float(item.cgst_amount) if item.cgst_amount else 0
            sgst = float(item.sgst_amount) if item.sgst_amount else 0
            igst = float(item.igst_amount) if item.igst_amount else 0

            # If all are zero but there's tax, fall back to calculation
            if cgst == 0 and sgst == 0 and igst == 0:
                gst_amount = float(item.total_amount) - float(item.taxable_amount)
                if gst_amount > 0:
                    # Use invoice.is_interstate if available
                    if hasattr(invoice, 'is_interstate') and invoice.is_interstate is not None:
                        is_interstate = invoice.is_interstate
                    else:
                        # Fall back to state code comparison using GSTIN extraction
                        is_interstate = True
                        try:
                            # Helper function to get state code - prefer GSTIN extraction
                            def get_state_code(gstin, state_code_field):
                                # First try to extract from GSTIN (first 2 digits)
                                if gstin and len(str(gstin).strip()) >= 2:
                                    extracted = str(gstin).strip()[:2]
                                    if extracted.isdigit():
                                        return extracted
                                # Fall back to stateCode field if it's a valid 2-digit code
                                if state_code_field:
                                    state_code = str(state_code_field).strip()
                                    if state_code.isdigit() and len(state_code) <= 2:
                                        return state_code.zfill(2)
                                return ''

                            company_state_code = get_state_code(
                                company_settings.gstin if company_settings else None,
                                company_settings.stateCode if company_settings else None
                            )
                            client_state_code = get_state_code(
                                invoice.client.gstin if invoice.client else None,
                                invoice.client.stateCode if invoice.client else None
                            )
                            if company_state_code and client_state_code:
                                is_interstate = company_state_code != client_state_code
                        except:
                            pass

                    if is_interstate:
                        igst = gst_amount
                    else:
                        cgst = gst_amount / 2
                        sgst = gst_amount / 2
        else:
            # Legacy: calculate GST breakdown
            gst_amount = float(item.total_amount) - float(item.taxable_amount)
            cgst = 0
            sgst = 0
            igst = 0
            if gst_amount > 0:
                is_interstate = getattr(invoice, 'is_interstate', True)
                if is_interstate:
                    igst = gst_amount
                else:
                    cgst = gst_amount / 2
                    sgst = gst_amount / 2

        # Build row dynamically based on enabled columns
        row = [str(idx), item.description]
        if show_quantity:
            qty = float(item.quantity) if item.quantity else 0
            row.append(f"{qty:,.2f}" if qty > 0 else "-")
        if show_rate:
            rate = float(item.rate) if item.rate else 0
            row.append(f"{rate:,.2f}" if rate > 0 else "-")
        row.extend([
            f"{item.taxable_amount:,.2f}",
            f"{cgst:,.2f}" if cgst > 0 else "-",
            f"{sgst:,.2f}" if sgst > 0 else "-",
            f"{igst:,.2f}" if igst > 0 else "-",
            f"{item.total_amount:,.2f}"
        ])
        table_data.append(row)

    # Calculate column indexes for GST columns (varies based on qty/rate columns)
    base_cols = 2  # S.No and Description
    if show_quantity:
        base_cols += 1
    if show_rate:
        base_cols += 1
    cgst_col_idx = base_cols + 1  # After taxable value
    sgst_col_idx = base_cols + 2
    igst_col_idx = base_cols + 3
    amount_col_idx = base_cols + 4

    # Calculate totals from table data
    total_cgst = sum([float(row[cgst_col_idx].replace(',', '')) for row in table_data[1:] if row[cgst_col_idx] != '-'])
    total_sgst = sum([float(row[sgst_col_idx].replace(',', '')) for row in table_data[1:] if row[sgst_col_idx] != '-'])
    total_igst = sum([float(row[igst_col_idx].replace(',', '')) for row in table_data[1:] if row[igst_col_idx] != '-'])

    # Build subtotal row
    subtotal_row = ['', 'Sub Total']
    if show_quantity:
        subtotal_row.append('')
    if show_rate:
        subtotal_row.append('')
    subtotal_row.extend([
        f"{invoice.subtotal:,.2f}",
        f"{total_cgst:,.2f}" if total_cgst > 0 else "-",
        f"{total_sgst:,.2f}" if total_sgst > 0 else "-",
        f"{total_igst:,.2f}" if total_igst > 0 else "-",
        f"{float(invoice.subtotal) + float(invoice.tax_amount):,.2f}"
    ])
    table_data.append(subtotal_row)

    # Round Off row (only show if round_off is not zero)
    round_off_value = float(invoice.round_off) if invoice.round_off else 0
    if round_off_value != 0:
        round_off_display = f"+{round_off_value:,.2f}" if round_off_value > 0 else f"{round_off_value:,.2f}"
        round_off_row = ['', 'Round Off']
        if show_quantity:
            round_off_row.append('')
        if show_rate:
            round_off_row.append('')
        round_off_row.extend(['', '', '', '', round_off_display])
        table_data.append(round_off_row)

    # Grand Total row
    grand_total_row = ['', 'GRAND TOTAL']
    if show_quantity:
        grand_total_row.append('')
    if show_rate:
        grand_total_row.append('')
    grand_total_row.extend(['', '', '', '', f"{invoice.total_amount:,.2f}"])
    table_data.append(grand_total_row)

    # Calculate column widths based on enabled columns
    num_extra_cols = (1 if show_quantity else 0) + (1 if show_rate else 0)

    # Build column widths dynamically
    col_widths = [table_width * 0.06]  # S.No (6%)

    # Adjust description width based on extra columns
    desc_width = 0.40 - (num_extra_cols * 0.07)  # Reduce for each extra column
    col_widths.append(table_width * desc_width)  # Description

    if show_quantity:
        col_widths.append(table_width * 0.07)  # Qty (7%)
    if show_rate:
        col_widths.append(table_width * 0.08)  # Rate (8%)

    col_widths.extend([
        table_width * 0.12,   # Taxable Value (12%)
        table_width * 0.11,   # CGST (11%)
        table_width * 0.11,   # SGST (11%)
        table_width * 0.13,   # IGST (13%)
        table_width * 0.14    # Amount (14%)
    ])

    # Determine how many summary rows we have (Sub Total, Round Off (optional), Grand Total)
    num_summary_rows = 2  # Sub Total + Grand Total
    if round_off_value != 0:
        num_summary_rows = 3  # Sub Total + Round Off + Grand Total

    items_table = Table(table_data, colWidths=col_widths)

    table_style = [
        # Header row styling
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),

        # Data rows styling (excluding summary rows)
        ('FONTNAME', (0, 1), (-1, -num_summary_rows-1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -num_summary_rows-1), 7),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S.No center
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Description left
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Numbers right
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),

        # Sub Total row styling (light background)
        ('BACKGROUND', (0, -num_summary_rows), (-1, -num_summary_rows), colors.HexColor('#f3f4f6')),
        ('FONTNAME', (0, -num_summary_rows), (-1, -num_summary_rows), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -num_summary_rows), (-1, -num_summary_rows), 8),

        # Grand Total row styling (darker background)
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
    ]

    # Add Round Off row styling if present
    if round_off_value != 0:
        table_style.extend([
            ('FONTNAME', (0, -2), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, -2), (-1, -2), 7),
            ('TEXTCOLOR', (6, -2), (6, -2), colors.HexColor('#059669') if round_off_value > 0 else colors.HexColor('#dc2626')),
        ])

    items_table.setStyle(TableStyle(table_style))

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


def generate_receipt_pdf(receipt, company_settings):
    """Generate a professional receipt PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)

    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=6
    )

    # Title
    elements.append(Paragraph("PAYMENT RECEIPT", title_style))
    elements.append(Spacer(1, 20))

    # Company Info and Receipt Details Side by Side
    # Format address to preserve line breaks
    receipt_company_address = format_address_for_pdf(company_settings.address)

    company_data = [
        [
            Paragraph(f"<b>{company_settings.companyName}</b><br/>"
                     f"{receipt_company_address}<br/>"
                     f"{company_settings.city}, {company_settings.state} - {company_settings.pinCode}<br/>"
                     f"GSTIN: {company_settings.gstin}<br/>"
                     f"Phone: {company_settings.phone}<br/>"
                     f"Email: {company_settings.email}", normal_style),
            Paragraph(f"<b>Receipt No:</b> {receipt.receipt_number}<br/>"
                     f"<b>Receipt Date:</b> {receipt.receipt_date.strftime('%d/%m/%Y')}<br/>"
                     f"<b>Invoice No:</b> {receipt.invoice.invoice_number}", normal_style)
        ]
    ]

    company_table = Table(company_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
    company_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 20))

    # Received From Section
    elements.append(Paragraph(f"<b>Received From:</b>", heading_style))
    elements.append(Paragraph(f"{receipt.received_from}", normal_style))
    elements.append(Spacer(1, 10))

    # Payment Details - with TDS breakdown
    tds_amount = float(receipt.tds_amount) if receipt.tds_amount else 0
    total_amount = float(receipt.total_amount) if receipt.total_amount else float(receipt.amount_received)
    amount_received = float(receipt.amount_received)

    # If total_amount is 0, calculate it (backward compatibility)
    if total_amount == 0:
        total_amount = amount_received + tds_amount

    payment_data = [['Description', 'Amount']]

    if tds_amount > 0:
        # Show breakdown: Total Payment, TDS Deducted, Amount Received
        payment_data.append([receipt.towards, f"₹ {total_amount:,.2f}"])
        payment_data.append(['Less: TDS Deducted', f"₹ {tds_amount:,.2f}"])
        payment_data.append(['Amount Received', f"₹ {amount_received:,.2f}"])
    else:
        # No TDS - simple receipt
        payment_data.append([receipt.towards, f"₹ {amount_received:,.2f}"])

    payment_table = Table(payment_data, colWidths=[doc.width * 0.7, doc.width * 0.3])

    # Build table style
    table_style_list = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 11),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]

    if tds_amount > 0:
        # Highlight TDS row and Amount Received row
        table_style_list.extend([
            ('BACKGROUND', (0, 1), (-1, 1), colors.white),  # Total payment row
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#fff3cd')),  # TDS row (yellow tint)
            ('TEXTCOLOR', (0, 2), (-1, 2), colors.HexColor('#856404')),  # TDS text color
            ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#d4edda')),  # Amount received row (green tint)
            ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),  # Bold for amount received
        ])
    else:
        table_style_list.append(('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ecf0f1')]))

    payment_table.setStyle(TableStyle(table_style_list))
    elements.append(payment_table)
    elements.append(Spacer(1, 15))

    # Amount in Words - show the amount received (what actually came in)
    amount_words = number_to_words(amount_received)
    elements.append(Paragraph(f"<b>Amount Received in Words:</b> {amount_words}", normal_style))
    if tds_amount > 0:
        elements.append(Paragraph(f"<b>Total Payment (Including TDS):</b> ₹ {total_amount:,.2f}", normal_style))
    elements.append(Spacer(1, 15))

    # Payment Method - use payment's method which has choices defined
    elements.append(Paragraph(f"<b>Payment Method:</b> {receipt.payment.get_payment_method_display()}", normal_style))
    if receipt.payment.reference_number:
        elements.append(Paragraph(f"<b>Reference Number:</b> {receipt.payment.reference_number}", normal_style))
    elements.append(Spacer(1, 20))

    # Notes
    if receipt.notes:
        elements.append(Paragraph(f"<b>Notes:</b>", heading_style))
        elements.append(Paragraph(receipt.notes, normal_style))
        elements.append(Spacer(1, 20))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey, spaceBefore=10, spaceAfter=10))
    elements.append(Paragraph(
        f"<i>This is a computer-generated receipt and does not require a signature.</i><br/>"
        f"<i>For any queries, please contact: {company_settings.email}</i>",
        ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))

    # Build PDF
    doc.build(elements)
    pdf_data = buffer.getvalue()
    buffer.close()

    return pdf_data
