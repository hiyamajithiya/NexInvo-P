"""
Signal handlers for automated email notifications, accounting ledger creation,
auto-voucher generation, and balance recalculation for double-entry bookkeeping.
"""
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import (
    Organization, OrganizationMembership, Client, Supplier,
    AccountGroup, LedgerAccount, Invoice, Purchase, Payment, ExpensePayment,
    Voucher, VoucherEntry
)
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


@receiver(post_save, sender=OrganizationMembership)
def send_notification_on_membership_created(sender, instance, created, **kwargs):
    """
    Send notifications when a user is added to an organization:
    1. For owners: Send notification to superadmin about new organization registration
    2. For non-owners: Send welcome email to new user and notification to org owner
    """
    if created and instance.is_active:
        organization = instance.organization
        new_user = instance.user

        # For owners - send notification to superadmin about new organization registration
        if instance.role == 'owner':
            try:
                send_organization_registration_email(new_user, organization)
                logger.info(f"Organization registration notification sent to superadmin for: {organization.name}")
            except Exception as e:
                logger.error(f"Error sending organization registration notification: {str(e)}")
            return

        # For non-owners - send welcome email and notify org owner
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


# =============================================================================
# ACCOUNTING MODULE SIGNALS - Auto-create party ledgers
# =============================================================================

@receiver(post_save, sender=Client)
def create_client_ledger(sender, instance, created, **kwargs):
    """
    Auto-create a Sundry Debtor ledger account when a new Client is created.
    This links the client to the accounting system for double-entry bookkeeping.
    """
    if not created:
        return

    try:
        # Check if accounting is set up for this organization
        sundry_debtors_group = AccountGroup.objects.filter(
            organization=instance.organization,
            name='Sundry Debtors'
        ).first()

        if not sundry_debtors_group:
            # Accounting not set up yet - skip ledger creation
            logger.debug(f"Sundry Debtors group not found for org {instance.organization.name}, skipping client ledger creation")
            return

        # Check if ledger already exists for this client
        existing_ledger = LedgerAccount.objects.filter(
            organization=instance.organization,
            linked_client=instance
        ).first()

        if existing_ledger:
            logger.debug(f"Ledger already exists for client {instance.name}")
            return

        # Create the debtor ledger
        ledger = LedgerAccount.objects.create(
            organization=instance.organization,
            name=instance.name,
            group=sundry_debtors_group,
            account_type='debtor',
            opening_balance=0,
            opening_balance_type='Dr',
            current_balance=0,
            current_balance_type='Dr',
            linked_client=instance,
            gstin=instance.gstin or '',
            gst_applicable=bool(instance.gstin),
            is_system_account=False,
            is_active=True
        )
        logger.info(f"Created debtor ledger '{ledger.name}' for client {instance.name}")

    except Exception as e:
        logger.error(f"Error creating client ledger for {instance.name}: {str(e)}")


@receiver(post_save, sender=Supplier)
def create_supplier_ledger(sender, instance, created, **kwargs):
    """
    Auto-create a Sundry Creditor ledger account when a new Supplier is created.
    This links the supplier to the accounting system for double-entry bookkeeping.
    """
    if not created:
        return

    try:
        # Check if accounting is set up for this organization
        sundry_creditors_group = AccountGroup.objects.filter(
            organization=instance.organization,
            name='Sundry Creditors'
        ).first()

        if not sundry_creditors_group:
            # Accounting not set up yet - skip ledger creation
            logger.debug(f"Sundry Creditors group not found for org {instance.organization.name}, skipping supplier ledger creation")
            return

        # Check if ledger already exists for this supplier
        existing_ledger = LedgerAccount.objects.filter(
            organization=instance.organization,
            linked_supplier=instance
        ).first()

        if existing_ledger:
            logger.debug(f"Ledger already exists for supplier {instance.name}")
            return

        # Create the creditor ledger
        ledger = LedgerAccount.objects.create(
            organization=instance.organization,
            name=instance.name,
            group=sundry_creditors_group,
            account_type='creditor',
            opening_balance=0,
            opening_balance_type='Cr',
            current_balance=0,
            current_balance_type='Cr',
            linked_supplier=instance,
            gstin=instance.gstin or '',
            gst_applicable=bool(instance.gstin),
            is_system_account=False,
            is_active=True
        )
        logger.info(f"Created creditor ledger '{ledger.name}' for supplier {instance.name}")

    except Exception as e:
        logger.error(f"Error creating supplier ledger for {instance.name}: {str(e)}")


# =============================================================================
# ORGANIZATION SETUP SIGNAL - Auto-setup Chart of Accounts
# =============================================================================

@receiver(post_save, sender=Organization)
def setup_chart_of_accounts_on_organization_creation(sender, instance, created, **kwargs):
    """
    Auto-setup default Chart of Accounts (Tally-style account groups and ledger accounts)
    when a new Organization is created. This ensures the accounting system is ready
    for double-entry bookkeeping from day one.
    """
    if not created:
        return

    try:
        # Check if account groups already exist for this organization
        if AccountGroup.objects.filter(organization=instance).exists():
            logger.debug(f"Account groups already exist for org {instance.name}, skipping auto-setup")
            return

        # Import here to avoid circular imports
        from django.core.management import call_command
        from io import StringIO

        # Capture output
        out = StringIO()

        # Run the setup command for this organization
        call_command('setup_chart_of_accounts', org_id=str(instance.id), stdout=out)

        logger.info(f"Auto-setup Chart of Accounts completed for organization: {instance.name}")
        logger.debug(out.getvalue())

    except Exception as e:
        logger.error(f"Error auto-setting up Chart of Accounts for {instance.name}: {str(e)}")


# =============================================================================
# AUTO-VOUCHER CREATION SIGNALS - Double-Entry Bookkeeping
# =============================================================================

@receiver(post_save, sender=Invoice)
def create_sales_voucher_on_invoice_save(sender, instance, created, **kwargs):
    """
    Auto-create a Sales Voucher when an invoice is saved with post_to_ledger=True.
    This ensures proper double-entry bookkeeping with GST postings.

    Triggered when:
    - Invoice is created/updated with post_to_ledger=True
    - Proforma invoices are always skipped
    """
    # Skip proforma invoices and invoices where post_to_ledger is False
    if instance.invoice_type == 'proforma' or not instance.post_to_ledger:
        return

    try:
        from .accounting_utils import create_sales_voucher
        voucher = create_sales_voucher(instance, post_immediately=True)
        if voucher:
            logger.info(f"Auto-created sales voucher {voucher.voucher_number} for invoice {instance.invoice_number}")
    except Exception as e:
        logger.error(f"Error auto-creating sales voucher for invoice {instance.invoice_number}: {str(e)}")


@receiver(post_save, sender=Purchase)
def create_purchase_voucher_on_purchase_save(sender, instance, created, **kwargs):
    """
    Auto-create a Purchase Voucher when a purchase is created.
    This ensures proper double-entry bookkeeping with GST postings.
    """
    # Only create for new purchases or when status changes to a non-draft state
    if not created and getattr(instance, '_skip_voucher_creation', False):
        return

    try:
        from .accounting_utils import create_purchase_voucher
        voucher = create_purchase_voucher(instance, post_immediately=True)
        if voucher:
            logger.info(f"Auto-created purchase voucher {voucher.voucher_number} for purchase {instance.purchase_number}")
    except Exception as e:
        logger.error(f"Error auto-creating purchase voucher for purchase {instance.purchase_number}: {str(e)}")


@receiver(post_save, sender=Payment)
def create_receipt_voucher_on_payment_save(sender, instance, created, **kwargs):
    """
    Auto-create a Receipt Voucher when payment is received against an invoice.
    This records the cash/bank entry against the client's ledger.
    """
    if not created:
        return

    try:
        from .accounting_utils import create_receipt_voucher
        voucher = create_receipt_voucher(instance, post_immediately=True)
        if voucher:
            logger.info(f"Auto-created receipt voucher {voucher.voucher_number} for payment against invoice {instance.invoice.invoice_number}")
    except Exception as e:
        logger.error(f"Error auto-creating receipt voucher: {str(e)}")


@receiver(post_save, sender=ExpensePayment)
def create_payment_voucher_on_expense_save(sender, instance, created, **kwargs):
    """
    Auto-create a Payment Voucher when an expense payment is recorded.
    This records the expense debit against the bank/cash credit.
    """
    if not created:
        return

    try:
        from .accounting_utils import create_expense_payment_voucher
        voucher = create_expense_payment_voucher(instance, post_immediately=True)
        if voucher:
            logger.info(f"Auto-created payment voucher {voucher.voucher_number} for expense")
    except Exception as e:
        logger.error(f"Error auto-creating payment voucher for expense: {str(e)}")


# =============================================================================
# BALANCE RECALCULATION SIGNALS - Keep ledger balances in sync on deletion
# =============================================================================

@receiver(post_delete, sender=VoucherEntry)
def recalculate_ledger_balance_on_entry_delete(sender, instance, **kwargs):
    """
    Recalculate the affected ledger account's balance whenever a voucher entry
    is deleted (directly or via cascade when a voucher is deleted).
    """
    try:
        # instance.ledger_account still available because it uses PROTECT
        # but after cascade it may already be gone - use pk to fetch
        ledger = LedgerAccount.objects.filter(pk=instance.ledger_account_id).first()
        if ledger:
            ledger.update_balance()
            logger.info(f"Recalculated balance for ledger '{ledger.name}' after entry deletion")
    except Exception as e:
        logger.error(f"Error recalculating ledger balance after entry deletion: {str(e)}")


# =============================================================================
# CASCADE DELETE VOUCHERS - Clean up accounting entries when source is deleted
# =============================================================================

@receiver(pre_delete, sender=Invoice)
def delete_vouchers_on_invoice_delete(sender, instance, **kwargs):
    """
    Delete all associated vouchers when an invoice is deleted.
    This triggers VoucherEntry cascade deletion -> balance recalculation.
    """
    try:
        vouchers = Voucher.objects.filter(invoice=instance)
        count = vouchers.count()
        if count > 0:
            vouchers.delete()
            logger.info(f"Deleted {count} voucher(s) for invoice {instance.invoice_number}")
    except Exception as e:
        logger.error(f"Error deleting vouchers for invoice {instance.invoice_number}: {str(e)}")


@receiver(pre_delete, sender=Purchase)
def delete_vouchers_on_purchase_delete(sender, instance, **kwargs):
    """
    Delete all associated vouchers when a purchase is deleted.
    """
    try:
        vouchers = Voucher.objects.filter(purchase=instance)
        count = vouchers.count()
        if count > 0:
            vouchers.delete()
            logger.info(f"Deleted {count} voucher(s) for purchase {instance.purchase_number}")
    except Exception as e:
        logger.error(f"Error deleting vouchers for purchase {instance.purchase_number}: {str(e)}")


@receiver(pre_delete, sender=Payment)
def delete_vouchers_on_payment_delete(sender, instance, **kwargs):
    """
    Delete all associated vouchers when a payment record is deleted.
    """
    try:
        vouchers = Voucher.objects.filter(payment_record=instance)
        count = vouchers.count()
        if count > 0:
            vouchers.delete()
            logger.info(f"Deleted {count} voucher(s) for payment record")
    except Exception as e:
        logger.error(f"Error deleting vouchers for payment: {str(e)}")


@receiver(pre_delete, sender=ExpensePayment)
def delete_vouchers_on_expense_delete(sender, instance, **kwargs):
    """
    Delete all associated vouchers when an expense payment is deleted.
    """
    try:
        vouchers = Voucher.objects.filter(expense_payment=instance)
        count = vouchers.count()
        if count > 0:
            vouchers.delete()
            logger.info(f"Deleted {count} voucher(s) for expense payment")
    except Exception as e:
        logger.error(f"Error deleting vouchers for expense payment: {str(e)}")


# =============================================================================
# TALLY REAL-TIME SYNC SIGNALS - Queue changes for NexInvo → Tally sync
# =============================================================================

@receiver(post_save, sender=Voucher)
def queue_voucher_for_tally_sync(sender, instance, created, **kwargs):
    """
    Queue newly created/updated vouchers for sync to Tally.
    Skip if the voucher was imported from Tally (to prevent sync loops).
    """
    # Skip if this voucher came from Tally import
    if instance.synced_to_tally:
        return

    # Skip cancelled vouchers
    if instance.status == 'cancelled':
        return

    try:
        from .models import TallyMapping, TallyPendingSync

        # Check if real-time sync is enabled for this organization
        try:
            mapping = TallyMapping.objects.get(
                organization=instance.organization,
                realtime_sync_enabled=True
            )
        except TallyMapping.DoesNotExist:
            return

        # Serialize voucher data for Tally
        entries_data = []
        for entry in instance.entries.all():
            entries_data.append({
                'ledger_name': entry.ledger_account.name,
                'debit_amount': float(entry.debit_amount),
                'credit_amount': float(entry.credit_amount),
                'is_debit': float(entry.debit_amount) > 0,
                'particulars': entry.particulars,
            })

        voucher_data = {
            'voucher_type': instance.voucher_type,
            'voucher_number': instance.voucher_number,
            'voucher_date': str(instance.voucher_date),
            'total_amount': float(instance.total_amount),
            'narration': instance.narration,
            'reference_number': instance.reference_number,
            'entries': entries_data,
        }

        TallyPendingSync.objects.create(
            organization=instance.organization,
            record_type='voucher',
            record_id=instance.id,
            action='create' if created else 'update',
            data=voucher_data
        )
        logger.info(f"Queued voucher {instance.voucher_number} for Tally sync")

    except Exception as e:
        logger.error(f"Error queuing voucher for Tally sync: {str(e)}")


@receiver(post_save, sender=LedgerAccount)
def queue_ledger_for_tally_sync(sender, instance, created, **kwargs):
    """
    Queue new ledger accounts for sync to Tally.
    Only queue newly created ledgers (not balance updates).
    """
    if not created:
        return

    # Skip system accounts
    if instance.is_system_account:
        return

    try:
        from .models import TallyMapping, TallyPendingSync

        try:
            mapping = TallyMapping.objects.get(
                organization=instance.organization,
                realtime_sync_enabled=True
            )
        except TallyMapping.DoesNotExist:
            return

        ledger_data = {
            'name': instance.name,
            'group_name': instance.group.name if instance.group else 'Suspense Account',
            'opening_balance': float(instance.opening_balance),
            'opening_balance_type': instance.opening_balance_type,
        }

        TallyPendingSync.objects.create(
            organization=instance.organization,
            record_type='ledger',
            record_id=instance.id,
            action='create',
            data=ledger_data
        )
        logger.info(f"Queued ledger {instance.name} for Tally sync")

    except Exception as e:
        logger.error(f"Error queuing ledger for Tally sync: {str(e)}")
