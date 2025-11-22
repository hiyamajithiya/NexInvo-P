"""
Email utility functions for sending automated notifications
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils.crypto import get_random_string
import logging

logger = logging.getLogger(__name__)


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

        context = {
            'user': user,
            'organization': organization,
            'temporary_password': temporary_password,
            'login_url': 'http://localhost:3000/login',  # Update with actual frontend URL
            'support_email': 'support@nexinvo.com',
        }

        # Create email body
        if temporary_password:
            # User added by organization admin
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
                        Welcome to NexInvo!
                    </h2>

                    <p>Dear {user.username},</p>

                    <p>You have been added as a user to <strong>{organization.name}</strong> on NexInvo Invoice Management System.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e3a8a;">Your Login Credentials:</h3>
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 2px 6px; border-radius: 3px;">{temporary_password}</code></p>
                        <p><strong>Organization:</strong> {organization.name}</p>
                    </div>

                    <p style="color: #ef4444; font-weight: bold;">⚠️ Please change your password after your first login for security purposes.</p>

                    <div style="margin: 30px 0;">
                        <a href="{context['login_url']}"
                           style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Login to Your Account
                        </a>
                    </div>

                    <h3 style="color: #1e3a8a;">What's Next?</h3>
                    <ul>
                        <li>Login to your account using the credentials above</li>
                        <li>Change your password in Profile settings</li>
                        <li>Explore the invoice management features</li>
                        <li>Contact your organization admin for any questions</li>
                    </ul>

                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                    <p style="font-size: 12px; color: #666;">
                        If you have any questions, please contact support at
                        <a href="mailto:{context['support_email']}">{context['support_email']}</a>
                    </p>

                    <p style="font-size: 12px; color: #666;">
                        © {2025} Chinmay Technosoft Private Limited. All rights reserved.
                    </p>
                </div>
            </body>
            </html>
            """
        else:
            # Self-registered user
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
                        Welcome to NexInvo!
                    </h2>

                    <p>Dear {user.username},</p>

                    <p>Thank you for registering with NexInvo Invoice Management System. Your account has been successfully created!</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1e3a8a;">Your Account Details:</h3>
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        {f"<p><strong>Organization:</strong> {organization.name}</p>" if organization else ""}
                    </div>

                    <div style="margin: 30px 0;">
                        <a href="{context['login_url']}"
                           style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Login to Your Account
                        </a>
                    </div>

                    <h3 style="color: #1e3a8a;">Getting Started:</h3>
                    <ul>
                        <li>Create your organization or join an existing one</li>
                        <li>Set up your company details and preferences</li>
                        <li>Add clients and service items</li>
                        <li>Start creating and managing invoices</li>
                        <li>Choose a subscription plan that fits your needs</li>
                    </ul>

                    <h3 style="color: #1e3a8a;">Key Features:</h3>
                    <ul>
                        <li>📄 Professional Invoice Generation</li>
                        <li>💰 Payment Tracking & Management</li>
                        <li>👥 Client Management</li>
                        <li>📊 Reports & Analytics</li>
                        <li>🏢 Multi-Organization Support</li>
                        <li>⚙️ Customizable Settings</li>
                    </ul>

                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                    <p style="font-size: 12px; color: #666;">
                        If you have any questions, please contact support at
                        <a href="mailto:{context['support_email']}">{context['support_email']}</a>
                    </p>

                    <p style="font-size: 12px; color: #666;">
                        © {2025} Chinmay Technosoft Private Limited. All rights reserved.
                    </p>
                </div>
            </body>
            </html>
            """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
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

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
                    New User Added to Your Organization
                </h2>

                <p>Dear {owner_user.username},</p>

                <p>A new user has been successfully added to your organization <strong>{organization.name}</strong>.</p>

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">New User Details:</h3>
                    <p><strong>Username:</strong> {new_user.username}</p>
                    <p><strong>Email:</strong> {new_user.email}</p>
                    <p><strong>Date Added:</strong> {new_user.date_joined.strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>

                <p>The user has been sent a welcome email with their login credentials.</p>

                <div style="margin: 30px 0;">
                    <a href="http://localhost:3000/organization"
                       style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        View Organization Members
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                <p style="font-size: 12px; color: #666;">
                    This is an automated notification from NexInvo Invoice Management System.
                </p>

                <p style="font-size: 12px; color: #666;">
                    © {2025} Chinmay Technosoft Private Limited. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[owner_user.email],
            html_message=html_message,
            fail_silently=False,
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

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
                    New Organization Registration
                </h2>

                <p>Dear Admin,</p>

                <p>A new organization has been registered on NexInvo Invoice Management System.</p>

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Organization Details:</h3>
                    <p><strong>Organization Name:</strong> {organization.name}</p>
                    <p><strong>Registration Date:</strong> {organization.created_at.strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <p><strong>Status:</strong> {"Active" if organization.is_active else "Inactive"}</p>
                    <p><strong>Current Plan:</strong> {organization.plan}</p>
                </div>

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Owner Details:</h3>
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                </div>

                <div style="margin: 30px 0;">
                    <a href="http://localhost:3000/superadmin"
                       style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        View in Admin Panel
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                <p style="font-size: 12px; color: #666;">
                    This is an automated notification from NexInvo Invoice Management System.
                </p>

                <p style="font-size: 12px; color: #666;">
                    © {2025} Chinmay Technosoft Private Limited. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=superadmin_emails,
            html_message=html_message,
            fail_silently=False,
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

        # Calculate discount if coupon applied
        discount_info = ""
        if upgrade_request.coupon_code:
            discount_info = f"<p><strong>Coupon Code:</strong> {upgrade_request.coupon_code}</p>"

        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">New Subscription Upgrade Request</h1>
            </div>

            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                    A user has requested to upgrade their subscription plan. Please review and approve after payment confirmation.
                </p>

                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Organization Details:</h3>
                    <p><strong>Organization Name:</strong> {upgrade_request.organization.name}</p>
                    <p><strong>Organization Status:</strong> {"Active" if upgrade_request.organization.is_active else "Inactive"}</p>
                </div>

                <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Subscription Details:</h3>
                    <p><strong>Current Plan:</strong> {upgrade_request.current_plan.name if upgrade_request.current_plan else "No active plan (Trial)"}</p>
                    <p><strong>Requested Plan:</strong> {upgrade_request.requested_plan.name}</p>
                    <p><strong>Billing Cycle:</strong> {upgrade_request.requested_plan.billing_cycle.title()}</p>
                    <p><strong>Plan Price:</strong> ₹{upgrade_request.requested_plan.price:,.2f}</p>
                    {discount_info}
                    <p><strong>Amount to Pay:</strong> <span style="font-size: 20px; color: #1e3a8a; font-weight: bold;">₹{upgrade_request.amount:,.2f}</span></p>
                </div>

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e3a8a;">Requested By:</h3>
                    <p><strong>Name:</strong> {upgrade_request.requested_by.get_full_name() or upgrade_request.requested_by.username if upgrade_request.requested_by else "Unknown"}</p>
                    <p><strong>Email:</strong> {upgrade_request.requested_by.email if upgrade_request.requested_by else "N/A"}</p>
                    <p><strong>Request Date:</strong> {upgrade_request.created_at.strftime('%d %B %Y at %I:%M %p')}</p>
                </div>

                {f'''<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="margin-top: 0; color: #92400e;">User Notes:</h3>
                    <p style="margin: 0; white-space: pre-wrap;">{upgrade_request.user_notes}</p>
                </div>''' if upgrade_request.user_notes else ''}

                <div style="margin: 30px 0; text-align: center;">
                    <p style="margin-bottom: 15px; font-weight: bold; color: #1e3a8a;">
                        Please verify payment confirmation before approving this request.
                    </p>
                    <a href="http://localhost:3000/superadmin"
                       style="background-color: #1e3a8a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Review in Admin Panel
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                <p style="font-size: 12px; color: #666;">
                    This is an automated notification from NexInvo Invoice Management System.
                </p>

                <p style="font-size: 12px; color: #666;">
                    © 2025 Chinmay Technosoft Private Limited. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=superadmin_emails,
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Upgrade request notification sent to superadmins for organization: {upgrade_request.organization.name}")
        return True

    except Exception as e:
        logger.error(f"Failed to send upgrade request notification: {str(e)}")
        return False
