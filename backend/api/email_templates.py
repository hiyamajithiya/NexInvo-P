"""
Professional HTML Email Templates for NexInvo
Using DocMold Theme (Indigo/Purple Gradient)

This module provides a consistent, professional email template system
for all emails sent from the NexInvo application.
"""


def get_base_email_template(
    subject,
    content,
    company_name="NexInvo",
    company_tagline="Invoice Management System",
    tenant_company_name=None,
    tenant_tagline=None,
    footer_text=None,
    show_logo=True,
    primary_color="#6366f1",  # Indigo
    secondary_color="#8b5cf6",  # Purple
):
    """
    Generate a professional HTML email template with DocMold theme.
    Supports dual branding - Tenant company in header, NexInvo in footer.

    Args:
        subject: Email subject/title to display in header
        content: HTML content for the email body
        company_name: NexInvo brand name (used in footer "Powered by")
        company_tagline: NexInvo tagline
        tenant_company_name: Tenant's company name (shown in header if provided)
        tenant_tagline: Tenant's tagline (shown under tenant name)
        footer_text: Custom footer text (optional)
        show_logo: Whether to show logo section
        primary_color: Primary gradient color (default: Indigo)
        secondary_color: Secondary gradient color (default: Purple)

    Returns:
        Complete HTML email template string
    """

    footer = footer_text or "Chinmay Technosoft Private Limited. All rights reserved."

    # Determine what to show in header - tenant if provided, otherwise NexInvo
    header_company = tenant_company_name if tenant_company_name else company_name
    header_tagline = tenant_tagline if tenant_tagline else company_tagline

    # Show "Powered by NexInvo" only if tenant company is different from NexInvo
    show_powered_by = tenant_company_name and tenant_company_name != "NexInvo"

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset styles */
        body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
        body {{ height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f3f4f6; }}
        a[x-apple-data-detectors] {{ color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ width: 100% !important; max-width: 100% !important; }}
            .mobile-padding {{ padding-left: 15px !important; padding-right: 15px !important; }}
            .mobile-stack {{ display: block !important; width: 100% !important; }}
        }}
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <!-- Wrapper Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <!-- Main Content Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="wrapper" style="max-width: 600px; width: 100%;">

                    <!-- Header with Gradient -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, {primary_color} 0%, {secondary_color} 100%); border-radius: 12px 12px 0 0; padding: 35px 30px;">
                            {f'''
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- Logo/Brand Section -->
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 10px;">
                                                    <span style="font-size: 36px;">&#128202;</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center">
                                                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">{header_company}</h1>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-top: 8px;">
                                                    <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 400;">{header_tagline}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            ''' if show_logo else ''}

                            <!-- Subject Line -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: {'20px' if show_logo else '0'};">
                                <tr>
                                    <td align="center">
                                        <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">{subject}</h2>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Email Body -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px 35px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                            {content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 35px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <!-- Divider Line with Gradient -->
                                <tr>
                                    <td style="padding-bottom: 20px;">
                                        <div style="height: 3px; background: linear-gradient(90deg, {primary_color}, {secondary_color}, {primary_color}); border-radius: 2px;"></div>
                                    </td>
                                </tr>

                                <!-- Footer Text -->
                                <tr>
                                    <td align="center" style="padding-bottom: 15px;">
                                        <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                                            This is an automated message from {header_company}.<br>
                                            Please do not reply directly to this email.
                                        </p>
                                    </td>
                                </tr>

                                {f'''
                                <!-- Powered by NexInvo -->
                                <tr>
                                    <td align="center" style="padding-bottom: 15px;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 20px; padding: 8px 16px; border: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                                                        Powered by <strong style="color: #6366f1;">NexInvo</strong> - Invoice Management System
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                ''' if show_powered_by else ''}

                                <!-- Copyright -->
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                            &copy; 2025 {footer}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def format_info_box(title, items, bg_color="#f0f9ff", border_color="#6366f1", title_color="#1e40af"):
    """
    Create a styled information box for displaying key details.

    Args:
        title: Box title
        items: List of tuples (label, value) or dict
        bg_color: Background color
        border_color: Left border accent color
        title_color: Title text color

    Returns:
        HTML string for the info box
    """
    if isinstance(items, dict):
        items = list(items.items())

    rows = ""
    for label, value in items:
        rows += f'''
        <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">
                <strong style="color: #374151;">{label}:</strong>
            </td>
            <td style="padding: 8px 0 8px 15px; font-size: 14px; color: #1f2937;">
                {value}
            </td>
        </tr>
        '''

    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: {bg_color}; border-radius: 8px; border-left: 4px solid {border_color}; margin: 20px 0;">
        <tr>
            <td style="padding: 20px 25px;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: {title_color};">{title}</h3>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    {rows}
                </table>
            </td>
        </tr>
    </table>
    '''


def format_cta_button(text, url, primary_color="#6366f1", secondary_color="#8b5cf6"):
    """
    Create a styled call-to-action button.

    Args:
        text: Button text
        url: Button URL
        primary_color: Gradient start color
        secondary_color: Gradient end color

    Returns:
        HTML string for the CTA button
    """
    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
        <tr>
            <td align="center">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="12%" strokecolor="{primary_color}" fillcolor="{primary_color}">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">{text}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="{url}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; background: linear-gradient(135deg, {primary_color} 0%, {secondary_color} 100%); border-radius: 8px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25); transition: all 0.3s ease;">
                    {text}
                </a>
                <!--<![endif]-->
            </td>
        </tr>
    </table>
    '''


def format_alert_box(message, alert_type="info"):
    """
    Create a styled alert/notice box.

    Args:
        message: Alert message
        alert_type: One of "info", "warning", "success", "error"

    Returns:
        HTML string for the alert box
    """
    styles = {
        "info": {"bg": "#eff6ff", "border": "#3b82f6", "text": "#1e40af", "icon": "&#8505;"},
        "warning": {"bg": "#fef3c7", "border": "#f59e0b", "text": "#92400e", "icon": "&#9888;"},
        "success": {"bg": "#d1fae5", "border": "#10b981", "text": "#065f46", "icon": "&#10004;"},
        "error": {"bg": "#fee2e2", "border": "#ef4444", "text": "#991b1b", "icon": "&#10060;"},
    }

    style = styles.get(alert_type, styles["info"])

    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: {style['bg']}; border-radius: 8px; border-left: 4px solid {style['border']}; margin: 20px 0;">
        <tr>
            <td style="padding: 16px 20px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td width="30" valign="top" style="font-size: 18px;">{style['icon']}</td>
                        <td style="font-size: 14px; color: {style['text']}; line-height: 1.6;">
                            {message}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    '''


def format_paragraph(text, style="normal"):
    """
    Format a paragraph with consistent styling.

    Args:
        text: Paragraph text
        style: One of "normal", "lead", "small", "muted"

    Returns:
        HTML string for the paragraph
    """
    styles = {
        "normal": "font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 16px 0;",
        "lead": "font-size: 17px; color: #1f2937; line-height: 1.7; margin: 0 0 20px 0; font-weight: 500;",
        "small": "font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0 0 12px 0;",
        "muted": "font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 16px 0;",
    }

    return f'<p style="{styles.get(style, styles["normal"])}">{text}</p>'


def format_greeting(name, greeting_text="Dear"):
    """
    Format a personalized greeting.

    Args:
        name: Recipient name
        greeting_text: Greeting prefix (default: "Dear")

    Returns:
        HTML string for the greeting
    """
    return f'<p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;"><strong>{greeting_text} {name},</strong></p>'


def format_signature(name, title=None, company=None, phone=None, email=None):
    """
    Format an email signature block.

    Args:
        name: Sender name
        title: Sender title/position
        company: Company name
        phone: Contact phone
        email: Contact email

    Returns:
        HTML string for the signature
    """
    lines = [f'<strong style="color: #1f2937;">{name}</strong>']
    if title:
        lines.append(f'<span style="color: #6b7280;">{title}</span>')
    if company:
        lines.append(f'<span style="color: #6366f1; font-weight: 500;">{company}</span>')
    if phone:
        lines.append(f'<span style="color: #6b7280;">{phone}</span>')
    if email:
        lines.append(f'<a href="mailto:{email}" style="color: #6366f1; text-decoration: none;">{email}</a>')

    content = '<br>'.join(lines)

    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 25px;">
        <tr>
            <td>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Best Regards,</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.8;">
                    {content}
                </p>
            </td>
        </tr>
    </table>
    '''


def format_amount(amount, currency="Rs."):
    """
    Format a monetary amount with styling.

    Args:
        amount: Numeric amount
        currency: Currency symbol/prefix

    Returns:
        Formatted HTML string
    """
    formatted = f"{float(amount):,.2f}"
    return f'<span style="font-weight: 600; color: #059669;">{currency} {formatted}</span>'


def format_highlight_amount(amount, label, currency="Rs."):
    """
    Create a highlighted amount display box.

    Args:
        amount: Numeric amount
        label: Label text
        currency: Currency symbol/prefix

    Returns:
        HTML string for the highlighted amount
    """
    formatted = f"{float(amount):,.2f}"
    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; margin: 20px 0;">
        <tr>
            <td align="center" style="padding: 25px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #166534; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">{label}</p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #15803d;">{currency} {formatted}</p>
            </td>
        </tr>
    </table>
    '''


def format_list(items, list_type="bullet"):
    """
    Format a styled list.

    Args:
        items: List of items
        list_type: "bullet" or "numbered"

    Returns:
        HTML string for the list
    """
    list_items = ""
    for i, item in enumerate(items, 1):
        marker = "&#8226;" if list_type == "bullet" else f"{i}."
        list_items += f'''
        <tr>
            <td width="25" valign="top" style="font-size: 14px; color: #6366f1; font-weight: 600; padding: 4px 0;">{marker}</td>
            <td style="font-size: 14px; color: #374151; padding: 4px 0; line-height: 1.6;">{item}</td>
        </tr>
        '''

    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 16px 10px;">
        {list_items}
    </table>
    '''


def format_divider():
    """Create a styled horizontal divider."""
    return '''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
        <tr>
            <td style="border-top: 1px solid #e5e7eb;"></td>
        </tr>
    </table>
    '''


def format_code_block(code, label=None):
    """
    Create a styled code/OTP display block.

    Args:
        code: The code to display
        label: Optional label above the code

    Returns:
        HTML string for the code block
    """
    label_html = f'<p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280;">{label}</p>' if label else ''

    return f'''
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 10px; margin: 20px 0;">
        <tr>
            <td align="center" style="padding: 25px;">
                {label_html}
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1; font-family: 'Courier New', Courier, monospace;">{code}</p>
            </td>
        </tr>
    </table>
    '''



