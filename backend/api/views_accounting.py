from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import ReadOnlyForViewer
from api.pagination import StandardPagination, LargePagination
from django.db.models import Sum, Q, Count
from datetime import date
from decimal import Decimal
import logging

from .models import (
    FinancialYear, AccountGroup, LedgerAccount, Voucher, VoucherEntry,
    VoucherNumberSeries, BankReconciliation, BankReconciliationItem,
)
from .serializers import (
    FinancialYearSerializer, AccountGroupSerializer, AccountGroupTreeSerializer,
    LedgerAccountSerializer, LedgerAccountListSerializer, VoucherSerializer,
    VoucherListSerializer, VoucherNumberSeriesSerializer, BankReconciliationSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# ACCOUNTING MODULE VIEWSETS
# =============================================================================

class FinancialYearViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Financial Years.
    """
    serializer_class = FinancialYearSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        return FinancialYear.objects.filter(
            organization=self.request.organization
        ).select_related('organization').order_by('-start_date')

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get the current active financial year"""
        fy = FinancialYear.get_current_fy(request.organization)
        if fy:
            serializer = self.get_serializer(fy)
            return Response(serializer.data)
        return Response({'error': 'No active financial year found'}, status=404)

    @action(detail=False, methods=['post'])
    def create_indian_fy(self, request):
        """Create Indian style financial year (April-March)"""
        year = request.data.get('year')
        if not year:
            return Response({'error': 'Year is required'}, status=400)

        try:
            fy = FinancialYear.create_indian_fy(request.organization, int(year))
            serializer = self.get_serializer(fy)
            return Response(serializer.data, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class AccountGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Account Groups (Chart of Accounts hierarchy).
    """
    serializer_class = AccountGroupSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        queryset = AccountGroup.objects.filter(
            organization=self.request.organization
        ).select_related('parent')

        # Filter by parent
        parent_id = self.request.query_params.get('parent', None)
        if parent_id:
            if parent_id == 'null' or parent_id == 'root':
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)

        # Filter by nature
        nature = self.request.query_params.get('nature', None)
        if nature:
            queryset = queryset.filter(nature=nature)

        # Filter by primary
        is_primary = self.request.query_params.get('is_primary', None)
        if is_primary is not None:
            queryset = queryset.filter(is_primary=is_primary.lower() == 'true')

        return queryset.order_by('sequence', 'name')

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get account groups as a tree structure"""
        root_groups = AccountGroup.objects.filter(
            organization=request.organization,
            parent__isnull=True
        ).order_by('sequence', 'name')
        serializer = AccountGroupTreeSerializer(root_groups, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_primary:
            return Response(
                {'error': 'Cannot delete primary account groups'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if instance.accounts.exists():
            return Response(
                {'error': 'Cannot delete group with existing ledger accounts'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if instance.children.exists():
            return Response(
                {'error': 'Cannot delete group with child groups'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class LedgerAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Ledger Accounts (Chart of Accounts).
    """
    serializer_class = LedgerAccountSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = LedgerAccount.objects.filter(
            organization=self.request.organization
        ).select_related('group', 'linked_client', 'linked_supplier')

        # Filter by group
        group_id = self.request.query_params.get('group', None)
        if group_id:
            queryset = queryset.filter(group_id=group_id)

        # Filter by account type
        account_type = self.request.query_params.get('account_type', None)
        if account_type:
            queryset = queryset.filter(account_type=account_type)

        # Filter bank accounts
        is_bank = self.request.query_params.get('is_bank_account', None)
        if is_bank is not None:
            queryset = queryset.filter(is_bank_account=is_bank.lower() == 'true')

        # Filter cash accounts (for contra vouchers)
        cash_or_bank = self.request.query_params.get('cash_or_bank', None)
        if cash_or_bank and cash_or_bank.lower() == 'true':
            queryset = queryset.filter(
                Q(account_type='cash') | Q(account_type='bank') | Q(is_bank_account=True)
            )

        # Filter party accounts (debtors/creditors)
        party_type = self.request.query_params.get('party_type', None)
        if party_type == 'debtor':
            queryset = queryset.filter(account_type='debtor')
        elif party_type == 'creditor':
            queryset = queryset.filter(account_type='creditor')
        elif party_type == 'all':
            queryset = queryset.filter(account_type__in=['debtor', 'creditor'])

        # Filter active only
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(group__name__icontains=search)
            )

        return queryset.order_by('group__sequence', 'name')

    def get_serializer_class(self):
        if self.action == 'list' and self.request.query_params.get('minimal', None):
            return LedgerAccountListSerializer
        return LedgerAccountSerializer

    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Get ledgers grouped by account group"""
        groups = AccountGroup.objects.filter(
            organization=request.organization
        ).prefetch_related('accounts').order_by('sequence', 'name')

        result = []
        for group in groups:
            ledgers = group.accounts.filter(is_active=True).order_by('name')
            if ledgers.exists():
                result.append({
                    'group': AccountGroupSerializer(group).data,
                    'ledgers': LedgerAccountListSerializer(ledgers, many=True).data
                })

        return Response(result)

    @action(detail=True, methods=['get'])
    def statement(self, request, pk=None):
        """Get ledger statement (all voucher entries)"""
        ledger = self.get_object()
        from_date = request.query_params.get('from_date', None)
        to_date = request.query_params.get('to_date', None)

        entries = VoucherEntry.objects.filter(
            ledger_account=ledger,
            voucher__status='posted'
        ).select_related('voucher').order_by('voucher__voucher_date', 'voucher__created_at')

        if from_date:
            entries = entries.filter(voucher__voucher_date__gte=from_date)
        if to_date:
            entries = entries.filter(voucher__voucher_date__lte=to_date)

        # Calculate running balance
        opening_balance = ledger.opening_balance
        if ledger.opening_balance_type == 'Cr':
            opening_balance = -opening_balance

        running_balance = opening_balance
        statement = []
        for entry in entries:
            debit = entry.debit_amount or Decimal('0')
            credit = entry.credit_amount or Decimal('0')
            running_balance += debit - credit

            statement.append({
                'date': entry.voucher.voucher_date,
                'voucher_number': entry.voucher.voucher_number,
                'voucher_type': entry.voucher.voucher_type,
                'particulars': entry.particulars or entry.voucher.narration,
                'debit': float(debit),
                'credit': float(credit),
                'balance': float(abs(running_balance)),
                'balance_type': 'Dr' if running_balance >= 0 else 'Cr'
            })

        return Response({
            'ledger': LedgerAccountSerializer(ledger).data,
            'opening_balance': float(ledger.opening_balance),
            'opening_balance_type': ledger.opening_balance_type,
            'closing_balance': float(abs(running_balance)),
            'closing_balance_type': 'Dr' if running_balance >= 0 else 'Cr',
            'entries': statement
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_account:
            return Response(
                {'error': 'Cannot delete system accounts'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if instance.voucher_entries.exists():
            return Response(
                {'error': 'Cannot delete ledger with existing voucher entries'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class VoucherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Vouchers (all transaction types).
    """
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = LargePagination

    def get_queryset(self):
        queryset = Voucher.objects.filter(
            organization=self.request.organization
        ).select_related('party_ledger', 'created_by').prefetch_related('entries__ledger_account')

        # Filter by voucher type
        voucher_type = self.request.query_params.get('voucher_type', None)
        if voucher_type:
            queryset = queryset.filter(voucher_type=voucher_type)

        # Filter by status
        voucher_status = self.request.query_params.get('status', None)
        if voucher_status:
            queryset = queryset.filter(status=voucher_status)

        # Note: financial_year filter removed - field doesn't exist on Voucher model
        # Use date range filters instead (from_date, to_date)

        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        if from_date:
            queryset = queryset.filter(voucher_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(voucher_date__lte=to_date)

        # Filter by party ledger
        party_ledger = self.request.query_params.get('party_ledger', None)
        if party_ledger:
            queryset = queryset.filter(party_ledger_id=party_ledger)

        # Filter by ledger (any entry involving this ledger account)
        ledger = self.request.query_params.get('ledger', None)
        if ledger:
            queryset = queryset.filter(entries__ledger_account_id=ledger).distinct()

        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(voucher_number__icontains=search) |
                Q(narration__icontains=search) |
                Q(reference_number__icontains=search) |
                Q(party_ledger__name__icontains=search)
            )

        # Tally sync filter
        synced = self.request.query_params.get('synced_to_tally', None)
        if synced is not None:
            queryset = queryset.filter(synced_to_tally=synced.lower() == 'true')

        return queryset.order_by('-voucher_date', '-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return VoucherListSerializer
        return VoucherSerializer

    def destroy(self, request, *args, **kwargs):
        """Delete voucher and recalculate affected ledger balances."""
        voucher = self.get_object()
        # Collect affected ledger IDs before deletion (entries will cascade-delete)
        affected_ledger_ids = list(
            voucher.entries.values_list('ledger_account_id', flat=True)
        )
        # Delete (triggers VoucherEntry cascade -> post_delete signals)
        response = super().destroy(request, *args, **kwargs)
        # Safety: recalculate in case signals missed any
        for ledger_id in affected_ledger_ids:
            try:
                ledger = LedgerAccount.objects.get(pk=ledger_id)
                ledger.update_balance()
            except LedgerAccount.DoesNotExist:
                pass
        return response

    @action(detail=True, methods=['post'])
    def post_voucher(self, request, pk=None):
        """Post a draft voucher"""
        voucher = self.get_object()
        if voucher.status == 'posted':
            return Response({'error': 'Voucher is already posted'}, status=400)

        if not voucher.is_balanced:
            return Response({'error': 'Voucher is not balanced'}, status=400)

        voucher.status = 'posted'
        voucher.save()
        voucher.post()

        return Response(VoucherSerializer(voucher).data)

    @action(detail=True, methods=['post'])
    def cancel_voucher(self, request, pk=None):
        """Cancel a posted voucher"""
        voucher = self.get_object()
        if voucher.status == 'cancelled':
            return Response({'error': 'Voucher is already cancelled'}, status=400)

        voucher.cancel()
        return Response(VoucherSerializer(voucher).data)

    @action(detail=False, methods=['get'])
    def day_book(self, request):
        """Get day book (all vouchers for a date)"""
        voucher_date = request.query_params.get('date', date.today().isoformat())

        vouchers = Voucher.objects.filter(
            organization=request.organization,
            voucher_date=voucher_date,
            status='posted'
        ).select_related('party_ledger').order_by('voucher_type', 'voucher_number')

        return Response(VoucherListSerializer(vouchers, many=True).data)


class VoucherNumberSeriesViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Voucher Number Series configuration.
    """
    serializer_class = VoucherNumberSeriesSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        return VoucherNumberSeries.objects.filter(
            organization=self.request.organization
        ).order_by('voucher_type', 'financial_year')

    @action(detail=False, methods=['get'])
    def preview(self, request):
        """Preview next voucher number"""
        voucher_type = request.query_params.get('voucher_type')
        fy_name = request.query_params.get('financial_year')

        if not voucher_type:
            return Response({'error': 'voucher_type is required'}, status=400)

        if not fy_name:
            fy = FinancialYear.get_current_fy(request.organization)
            fy_name = fy.name if fy else None

        if not fy_name:
            return Response({'error': 'No active financial year'}, status=400)

        # Get the series without incrementing
        series, _ = VoucherNumberSeries.objects.get_or_create(
            organization=request.organization,
            voucher_type=voucher_type,
            financial_year=fy_name,
            defaults={'current_number': 0}
        )

        # Preview next number using same logic as get_next_number()
        next_num = series.current_number + 1
        padded_num = str(next_num).zfill(series.number_width)

        if series.prefix:
            number = f"{series.prefix}{fy_name}/{padded_num}"
        else:
            number = f"{fy_name}/{padded_num}"

        if series.suffix:
            number += series.suffix

        return Response({
            'preview_number': number,
            'current_number': series.current_number,
            'next_number': next_num
        })


class BankReconciliationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Bank Reconciliations.
    """
    serializer_class = BankReconciliationSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        queryset = BankReconciliation.objects.filter(
            organization=self.request.organization
        ).select_related('bank_account').prefetch_related('items__voucher_entry__voucher')

        # Filter by bank account
        bank_account = self.request.query_params.get('bank_account', None)
        if bank_account:
            queryset = queryset.filter(bank_account_id=bank_account)

        # Filter by status
        rec_status = self.request.query_params.get('status', None)
        if rec_status:
            queryset = queryset.filter(status=rec_status)

        return queryset.order_by('-reconciliation_date')

    @action(detail=False, methods=['get'])
    def unreconciled_entries(self, request):
        """Get unreconciled bank entries"""
        bank_account_id = request.query_params.get('bank_account')
        if not bank_account_id:
            return Response({'error': 'bank_account is required'}, status=400)

        # Get all bank voucher entries that haven't been reconciled
        entries = VoucherEntry.objects.filter(
            ledger_account_id=bank_account_id,
            voucher__status='posted'
        ).exclude(
            reconciliation_items__is_reconciled=True
        ).select_related('voucher').order_by('voucher__voucher_date')

        result = []
        for entry in entries:
            result.append({
                'id': entry.id,
                'voucher_date': entry.voucher.voucher_date,
                'voucher_number': entry.voucher.voucher_number,
                'voucher_type': entry.voucher.voucher_type,
                'particulars': entry.particulars or entry.voucher.narration,
                'debit_amount': float(entry.debit_amount or 0),
                'credit_amount': float(entry.credit_amount or 0)
            })

        return Response(result)

    @action(detail=True, methods=['post'])
    def reconcile_item(self, request, pk=None):
        """Mark an item as reconciled"""
        reconciliation = self.get_object()
        item_id = request.data.get('item_id')
        is_reconciled = request.data.get('is_reconciled', True)

        try:
            item = reconciliation.items.get(id=item_id)
            item.is_reconciled = is_reconciled
            item.reconciled_date = date.today() if is_reconciled else None
            item.save()

            # Update reconciled balance
            reconciled_items = reconciliation.items.filter(is_reconciled=True)
            total_debit = reconciled_items.aggregate(Sum('debit_amount'))['debit_amount__sum'] or 0
            total_credit = reconciled_items.aggregate(Sum('credit_amount'))['credit_amount__sum'] or 0
            reconciliation.reconciled_balance = reconciliation.book_balance + total_debit - total_credit
            reconciliation.save()

            return Response(BankReconciliationSerializer(reconciliation).data)
        except BankReconciliationItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recalculate_all_balances(request):
    """Recalculate all ledger account balances from voucher entries."""
    org = request.organization
    ledgers = LedgerAccount.objects.filter(organization=org)
    count = 0
    for ledger in ledgers:
        ledger.update_balance()
        count += 1
    return Response({
        'message': f'Recalculated balances for {count} ledger accounts',
        'count': count
    })


# Accounting Dashboard Stats
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def accounting_dashboard_stats(request):
    """Get accounting dashboard statistics"""
    org = request.organization

    # Get current financial year
    fy = FinancialYear.get_current_fy(org)
    if not fy:
        return Response({'error': 'No active financial year'}, status=400)

    # Count vouchers by type (filter by FY date range since Voucher has no financial_year field)
    voucher_counts = Voucher.objects.filter(
        organization=org,
        voucher_date__gte=fy.start_date,
        voucher_date__lte=fy.end_date,
        status='posted'
    ).values('voucher_type').annotate(count=Count('id'))

    # Get totals by voucher type
    voucher_totals = Voucher.objects.filter(
        organization=org,
        voucher_date__gte=fy.start_date,
        voucher_date__lte=fy.end_date,
        status='posted'
    ).values('voucher_type').annotate(total=Sum('total_amount'))

    # Cash and bank balances
    cash_ledgers = LedgerAccount.objects.filter(
        organization=org,
        account_type='cash',
        is_active=True
    )
    bank_ledgers = LedgerAccount.objects.filter(
        organization=org,
        is_bank_account=True,
        is_active=True
    )

    total_cash = sum(
        l.current_balance if l.current_balance_type == 'Dr' else -l.current_balance
        for l in cash_ledgers
    )
    total_bank = sum(
        l.current_balance if l.current_balance_type == 'Dr' else -l.current_balance
        for l in bank_ledgers
    )

    # Receivables (Sundry Debtors)
    debtors = LedgerAccount.objects.filter(
        organization=org,
        account_type='debtor',
        is_active=True
    )
    total_receivables = sum(
        l.current_balance if l.current_balance_type == 'Dr' else -l.current_balance
        for l in debtors
    )

    # Payables (Sundry Creditors)
    creditors = LedgerAccount.objects.filter(
        organization=org,
        account_type='creditor',
        is_active=True
    )
    total_payables = sum(
        l.current_balance if l.current_balance_type == 'Cr' else -l.current_balance
        for l in creditors
    )

    return Response({
        'financial_year': fy.name,
        'voucher_counts': {v['voucher_type']: v['count'] for v in voucher_counts},
        'voucher_totals': {v['voucher_type']: float(v['total'] or 0) for v in voucher_totals},
        'cash_balance': float(total_cash),
        'bank_balance': float(total_bank),
        'total_receivables': float(total_receivables),
        'total_payables': float(total_payables),
        'ledger_count': LedgerAccount.objects.filter(organization=org, is_active=True).count(),
        'group_count': AccountGroup.objects.filter(organization=org).count()
    })
