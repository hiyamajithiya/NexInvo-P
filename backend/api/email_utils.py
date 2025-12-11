"""
Email utility functions for sending automated notifications
"""
from django.core.mail import send_mail, get_connection
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils.crypto import get_random_string
import logging
from .email_templates import (
    get_base_email_template,
    format_greeting,
    format_paragraph,
    format_info_box,
    format_cta_button,
    format_alert_box,
    format_code_block,
    format_list,
    format_divider,
    format_signature,
)

logger = logging.getLogger(__name__)

# Get URLs and email from settings
FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'https://www.nexinvo.chinmaytechnosoft.com')
SUPPORT_EMAIL = getattr(settings, 'SUPPORT_EMAIL', 'chinmaytechsoft@gmail.com')


def get_system_email_settings():
    """
    Get system email settings from database.
    Returns tuple: (connection, from_email) or (None, None) if not configured
    """
    try:
        from .models import SystemEmailSettings
        system_settings = SystemEmailSettings.objects.first()

        if system_settings and system_settings.smtp_host and system_settings.smtp_username:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=system_settings.smtp_host,
                port=system_settings.smtp_port,
                username=system_settings.smtp_username,
                password=system_settings.smtp_password,
                use_tls=system_settings.use_tls,
                fail_silently=False,
            )
            from_email = system_settings.from_email or system_settings.smtp_username
            logger.info(f"Using system email settings: {system_settings.smtp_host}")
            return connection, from_email
    except Exception as e:
        logger.warning(f"Could not load system email settings: {str(e)}")

    return None, None


def send_email_with_system_settings(subject, plain_message, html_message, recipient_list):
    """
    Send email using system email settings if available, otherwise use Django settings.

    Args:
        subject: Email subject
        plain_message: Plain text message
        html_message: HTML message
        recipient_list: List of recipient email addresses

    Returns:
        Boolean indicating success
    """
    connection, from_email = get_system_email_settings()

    if connection and from_email:
        # Use system email settings
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=from_email,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,
                connection=connection,
            )
            logger.info(f"Email sent using system settings to: {recipient_list}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email using system settings: {str(e)}")
            raise
    else:
        # Fallback to Django settings
        logger.info("Using Django default email settings")
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        return True


def generate_temporary_password(length=12):
    """
    Generate a secure temporary password

    Args:
        length: Length of password (default 12)

    Returns:
        String password
    """
    return get_random_string(length=length)


def send_welcome_email_to_user(user, organization=None, temporary_password=None):
    """
    Send welcome email to newly registered user

    Args:
        user: User object
        organization: Organization object (optional, for organization-specific welcome)
        temporary_password: Temporary password if user was added by admin
    """
    try:
        subject = 'Welcome to NexInvo - Invoice Management System'

        login_url = f'{FRONTEND_URL}/login'

        # Create email body using professional templates
        if temporary_password:
            # User added by organization admin
            content = format_greeting(user.username, "Welcome")
            content += format_paragraph(
                f"You have been added as a user to <strong>{organization.name}</strong> on NexInvo Invoice Management System.",
                style="lead"
            )

            # Login credentials info box
            credentials = [
                ("Username", user.username),
                ("Email", user.email),
                ("Temporary Password", f"<code style='background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;'>{temporary_password}</code>"),
                ("Organization", organization.name),
            ]
            content += format_info_box("Your Login Credentials", credentials)

            content += format_alert_box(
                "<strong>Important:</strong> Please change your password after your first login for security purposes.",
                "warning"
            )

            content += format_cta_button("Login to Your Account", login_url)

            # What's next list
            content += format_paragraph("<strong>What's Next?</strong>", style="normal")
            content += format_list([
                "Login to your account using the credentials above",
                "Change your password in Profile settings",
                "Explore the invoice management features",
                "Contact your organization admin for any questions"
            ])

        else:
            # Self-registered user
            content = format_greeting(user.username, "Welcome")
            content += format_paragraph(
                "Thank you for registering with NexInvo Invoice Management System. Your account has been successfully created!",
                style="lead"
            )

            # Account details info box
            account_details = [
                ("Username", user.username),
                ("Email", user.email),
            ]
            if organization:
                account_details.append(("Organization", organization.name))
            content += format_info_box("Your Account Details", account_details)

            content += format_cta_button("Login to Your Account", login_url)

            # Getting started list
            content += format_paragraph("<strong>Getting Started:</strong>", style="normal")
            content += format_list([
                "Create your organization or join an existing one",
                "Set up your company details and preferences",
                "Add clients and service items",
                "Start creating and managing invoices",
                "Choose a subscription plan that fits your needs"
            ])

            content += format_divider()

            # Key features
            content += format_paragraph("<strong>Key Features:</strong>", style="normal")
            content += format_list([
                "Professional Invoice Generation",
                "Payment Tracking & Management",
                "Client Management",
                "Reports & Analytics",
                "Multi-Organization Support",
                "Customizable Settings"
            ])

        content += format_divider()
        content += format_paragraph(
            f"If you have any questions, please contact support at <a href='mailto:{SUPPORT_EMAIL}' style='color: #6366f1;'>{SUPPORT_EMAIL}</a>",
            style="small"
        )

        # Generate full HTML email
        html_message = get_base_email_template(
            subject="Welcome to NexInvo!",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
        )

        plain_message = strip_tags(html_message)

        send_email_with_system_settings(
            subject=subject,
            plain_message=plain_message,
            html_message=html_message,
            recipient_list=[user.email],
        )

        logger.info(f"Welcome email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
        return False


def send_user_added_notification_to_owner(owner_user, new_user, organization):
    """
    Send notification to organization owner when a new user is added

    Args:
        owner_user: User object (organization owner/admin)
        new_user: User object (newly added user)
        organization: Organization object
    """
    try:
        subject = f'New User Added to {organization.name} - NexInvo'

        # Build professional HTML content
        content = format_greeting(owner_user.username)
        content += format_paragraph(
            f"A new user has been successfully added to your organization <strong>{organization.name}</strong>.",
            style="lead"
        )

        # New user details info box
        user_details = [
            ("Username", new_user.username),
            ("Email", new_user.email),
            ("Date Added", new_user.date_joined.strftime('%d %B %Y at %I:%M %p')),
        ]
        content += format_info_box("New User Details", user_details, bg_color="#f0fdf4", border_color="#10b981", title_color="#065f46")

        content += format_alert_box(
            "The user has been sent a welcome email with their login credentials.",
            "success"
        )

        content += format_cta_button("View Organization Members", f"{FRONTEND_URL}/organization")

        content += format_divider()
        content += format_paragraph(
            f"For support, contact <a href='mailto:{SUPPORT_EMAIL}' style='color: #6366f1;'>{SUPPORT_EMAIL}</a>",
            style="small"
        )

        # Generate full HTML email
        html_message = get_base_email_template(
            subject="New User Added",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
        )

        plain_message = strip_tags(html_message)

        send_email_with_system_settings(
            subject=subject,
            plain_message=plain_message,
            html_message=html_message,
            recipient_list=[owner_user.email],
        )

        logger.info(f"User added notification sent to {owner_user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send user added notification to {owner_user.email}: {str(e)}")
        return False


def send_organization_registration_email(user, organization):
    """
    Send email to superadmin when new organization is registered

    Args:
        user: User object (organization creator)
        organization: Organization object
    """
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Get all superadmin emails
        superadmin_emails = list(User.objects.filter(is_superuser=True).values_list('email', flat=True))

        if not superadmin_emails:
            logger.warning("No superadmin emails found to send organization registration notification")
            return False

        subject = f'New Organization Registered - {organization.name}'

        # Build professional HTML content
        content = format_greeting("Admin")
        content += format_paragraph(
            "A new organization has been registered on NexInvo Invoice Management System.",
            style="lead"
        )

        # Organization details info box
        org_details = [
            ("Organization Name", organization.name),
            ("Registration Date", organization.created_at.strftime('%d %B %Y at %I:%M %p')),
            ("Status", f"<span style='color: #10b981; font-weight: 600;'>Active</span>" if organization.is_active else "<span style='color: #ef4444; font-weight: 600;'>Inactive</span>"),
            ("Current Plan", organization.plan),
        ]
        content += format_info_box("Organization Details", org_details)

        # Owner details info box
        owner_details = [
            ("Username", user.username),
            ("Email", user.email),
        ]
        content += format_info_box("Owner Details", owner_details, bg_color="#eff6ff", border_color="#3b82f6", title_color="#1e40af")

        content += format_cta_button("View in Admin Panel", f"{FRONTEND_URL}/superadmin")

        content += format_divider()
        content += format_paragraph(
            f"For support, contact <a href='mailto:{SUPPORT_EMAIL}' style='color: #6366f1;'>{SUPPORT_EMAIL}</a>",
            style="small"
        )

        # Generate full HTML email
        html_message = get_base_email_template(
            subject="New Organization Registration",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
        )

        plain_message = strip_tags(html_message)

        send_email_with_system_settings(
            subject=subject,
            plain_message=plain_message,
            html_message=html_message,
            recipient_list=superadmin_emails,
        )

        logger.info(f"Organization registration notification sent to superadmins")
        return True

    except Exception as e:
        logger.error(f"Failed to send organization registration notification: {str(e)}")
        return False


def send_upgrade_request_notification_to_superadmin(upgrade_request):
    """
    Send email notification to superadmins when a user requests subscription upgrade

    Args:
        upgrade_request: SubscriptionUpgradeRequest object

    Returns:
        Boolean indicating success
    """
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Get all superadmin emails
        superadmin_emails = list(User.objects.filter(is_superuser=True).values_list('email', flat=True))

        if not superadmin_emails:
            logger.warning("No superadmin emails found for upgrade request notification")
            return False

        subject = f'New Subscription Upgrade Request - {upgrade_request.organization.name}'

        # Build professional HTML content
        content = format_greeting("Admin")
        content += format_paragraph(
            "A user has requested to upgrade their subscription plan. Please review and approve after payment confirmation.",
            style="lead"
        )

        # Organization details info box
        org_details = [
            ("Organization Name", upgrade_request.organization.name),
            ("Organization Status", f"<span style='color: #10b981; font-weight: 600;'>Active</span>" if upgrade_request.organization.is_active else "<span style='color: #ef4444; font-weight: 600;'>Inactive</span>"),
        ]
        content += format_info_box("Organization Details", org_details)

        # Subscription details info box
        subscription_details = [
            ("Current Plan", upgrade_request.current_plan.name if upgrade_request.current_plan else "No active plan (Trial)"),
            ("Requested Plan", f"<strong>{upgrade_request.requested_plan.name}</strong>"),
            ("Billing Cycle", upgrade_request.requested_plan.billing_cycle.title()),
            ("Plan Price", f"Rs. {upgrade_request.requested_plan.price:,.2f}"),
        ]
        if upgrade_request.coupon_code:
            subscription_details.append(("Coupon Code", f"<span style='color: #059669; font-weight: 600;'>{upgrade_request.coupon_code}</span>"))
        subscription_details.append(("Amount to Pay", f"<span style='font-size: 18px; color: #6366f1; font-weight: 700;'>Rs. {upgrade_request.amount:,.2f}</span>"))
        content += format_info_box("Subscription Details", subscription_details, bg_color="#eff6ff", border_color="#6366f1", title_color="#4338ca")

        # Requested by info box
        requester_details = [
            ("Name", upgrade_request.requested_by.get_full_name() or upgrade_request.requested_by.username if upgrade_request.requested_by else "Unknown"),
            ("Email", upgrade_request.requested_by.email if upgrade_request.requested_by else "N/A"),
            ("Request Date", upgrade_request.created_at.strftime('%d %B %Y at %I:%M %p')),
        ]
        content += format_info_box("Requested By", requester_details)

        # User notes if available
        if upgrade_request.user_notes:
            content += format_alert_box(f"<strong>User Notes:</strong><br>{upgrade_request.user_notes}", "warning")

        content += format_alert_box(
            "<strong>Please verify payment confirmation before approving this request.</strong>",
            "info"
        )

        content += format_cta_button("Review in Admin Panel", f"{FRONTEND_URL}/superadmin")

        content += format_divider()
        content += format_paragraph(
            f"For support, contact <a href='mailto:{SUPPORT_EMAIL}' style='color: #6366f1;'>{SUPPORT_EMAIL}</a>",
            style="small"
        )

        # Generate full HTML email
        html_message = get_base_email_template(
            subject="Subscription Upgrade Request",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
        )

        plain_message = strip_tags(html_message)

        send_email_with_system_settings(
            subject=subject,
            plain_message=plain_message,
            html_message=html_message,
            recipient_list=superadmin_emails,
        )

        logger.info(f"Upgrade request notification sent to superadmins for organization: {upgrade_request.organization.name}")
        return True

    except Exception as e:
        logger.error(f"Failed to send upgrade request notification: {str(e)}")
        return False


def send_otp_email(email, otp_code):
    """
    Send OTP email for email verification during registration

    Args:
        email: Email address to send OTP to
        otp_code: 6-digit OTP code

    Returns:
        Boolean indicating success
    """
    try:
        subject = 'NexInvo - Email Verification OTP'

        # Build professional HTML content
        content = format_paragraph("Hello,", style="normal")
        content += format_paragraph(
            "Thank you for registering with NexInvo. Please use the following OTP to verify your email address:",
            style="lead"
        )

        # OTP code block
        content += format_code_block(otp_code, "Your One-Time Password (OTP)")

        content += format_alert_box(
            "<strong>Important:</strong> This OTP is valid for <strong>10 minutes</strong> only. Do not share this OTP with anyone.",
            "warning"
        )

        content += format_paragraph(
            "If you didn't request this verification, please ignore this email. Someone might have entered your email by mistake.",
            style="muted"
        )

        content += format_divider()
        content += format_paragraph(
            f"For support, contact <a href='mailto:{SUPPORT_EMAIL}' style='color: #6366f1;'>{SUPPORT_EMAIL}</a>",
            style="small"
        )

        # Generate full HTML email
        html_message = get_base_email_template(
            subject="Email Verification",
            content=content,
            company_name="NexInvo",
            company_tagline="Invoice Management System",
        )

        plain_message = f"""
NexInvo - Email Verification

Hello,

Thank you for registering with NexInvo. Please use the following OTP to verify your email address:

Your OTP: {otp_code}

This OTP is valid for 10 minutes only. Do not share this OTP with anyone.

If you didn't request this verification, please ignore this email.

---
© 2025 Chinmay Technosoft Private Limited. All rights reserved.
Support: {SUPPORT_EMAIL}
        """

        send_email_with_system_settings(
            subject=subject,
            plain_message=plain_message,
            html_message=html_message,
            recipient_list=[email],
        )

        logger.info(f"OTP email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        return False
