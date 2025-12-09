from django.core.management.base import BaseCommand
from django.db.models import Sum
from api.models import Invoice, Payment


class Command(BaseCommand):
    help = 'Fix invoices marked as paid but have no payments or partial payments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made\n'))
        
        fixed_count = 0
        
        for invoice in Invoice.objects.filter(status='paid'):
            total_paid = Payment.objects.filter(invoice=invoice).aggregate(
                total=Sum('amount')
            )['total'] or 0
            
            if total_paid == 0:
                # No payments - set to 'sent'
                if dry_run:
                    self.stdout.write(
                        f"  Would fix {invoice.invoice_number}: paid -> sent (no payments)"
                    )
                else:
                    invoice.status = 'sent'
                    invoice.save()
                    self.stdout.write(
                        self.style.SUCCESS(f"  Fixed {invoice.invoice_number}: paid -> sent (no payments)")
                    )
                fixed_count += 1
                
            elif total_paid < float(invoice.total_amount):
                # Partial payment - set to 'sent'
                if dry_run:
                    self.stdout.write(
                        f"  Would fix {invoice.invoice_number}: paid -> sent (partial: {total_paid}/{invoice.total_amount})"
                    )
                else:
                    invoice.status = 'sent'
                    invoice.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Fixed {invoice.invoice_number}: paid -> sent (partial: {total_paid}/{invoice.total_amount})"
                        )
                    )
                fixed_count += 1
        
        if fixed_count == 0:
            self.stdout.write(self.style.SUCCESS('\nNo invoices need fixing. All statuses are correct!'))
        else:
            action = 'Would fix' if dry_run else 'Fixed'
            self.stdout.write(self.style.SUCCESS(f'\n{action} {fixed_count} invoice(s)'))
