"""
Signal handlers for automated email notifications
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Organization, OrganizationMembership
from .email_utils import (
    send_welcome_email_to_user,
    send_user_added_notification_to_owner,
    send_organization_registration_email
)
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def send_welcome_email_on_user_creation(sender, instance, created, **kwargs):
    """
    Send welcome email when a new user is created
    """
    if created and instance.email:
        # Send welcome email to the new user
        send_welcome_email_to_user(instance)
        logger.info(f"Welcome email triggered for new user: {instance.username}")


@receiver(post_save, sender=Organization)
def send_notification_on_organization_creation(sender, instance, created, **kwargs):
    """
    Send notification to superadmin when a new organization is created
    """
    if created:
        # Get the creator/owner of the organization
        try:
            # Find the first membership (owner) for this organization
            owner_membership = OrganizationMembership.objects.filter(
                organization=instance,
                role='owner'
            ).first()

            if owner_membership:
                # Send notification to superadmin
                send_organization_registration_email(owner_membership.user, instance)
                logger.info(f"Organization registration notification sent for: {instance.name}")
        except Exception as e:
            logger.error(f"Error sending organization registration notification: {str(e)}")


@receiver(post_save, sender=OrganizationMembership)
def send_notification_on_user_added_to_organization(sender, instance, created, **kwargs):
    """
    Send notifications when a user is added to an organization:
    1. Welcome email to the new user (only for non-owners)
    2. Notification to organization owner
    """
    if created and instance.is_active:
        organization = instance.organization
        new_user = instance.user

        # Don't send emails for the owner (they already got a welcome email when they registered)
        if instance.role == 'owner':
            return

        try:
            # 1. Send welcome email to new user with organization context
            # Check if there's a temporary password stored in the instance
            temp_password = getattr(instance, '_temp_password', None)
            send_welcome_email_to_user(new_user, organization, temporary_password=temp_password)
            logger.info(f"Welcome email sent to {new_user.username} for joining {organization.name}")

            # 2. Send notification to organization owner/admin
            owner_membership = OrganizationMembership.objects.filter(
                organization=organization,
                role__in=['owner', 'admin'],
                is_active=True
            ).first()

            if owner_membership and owner_membership.user.email:
                send_user_added_notification_to_owner(
                    owner_membership.user,
                    new_user,
                    organization
                )
                logger.info(f"User added notification sent to {owner_membership.user.username}")

        except Exception as e:
            logger.error(f"Error sending user added notifications: {str(e)}")
