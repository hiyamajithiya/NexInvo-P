"""
Dashboard API endpoints for financial summaries, analytics, and status displays.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from django.db.models import Sum, Count, Q, F, Value, DecimalField, Max, Subquery, OuterRef
from django.db.models.functions import Coalesce
from datetime import date, timedelta
from decimal import Decimal
from .models import (
    Invoice, Payment, Purchase, SupplierPayment, ExpensePayment,
    LedgerAccount, BankReconciliation, TallyMapping, AccountGroup
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ageing_report_summary(request):
    """
    Returns receivables and payables aging summary for dashboard.
    Buckets: Current (0-30), 31-60, 61-90, 90+ days
    """
    org = getattr(request, 'organization', None)
    if not org:
        return Response({
            'receivables': {'total': 0, 'current': 0, 'days30': 0, 'days60': 0, 'days90': 0, 'above90': 0},
            'payables': {'total': 0}
        })

    # Check cache first (120 second TTL, keyed by organization)
    cache_key = f'ageing_report_summary_{org.id}'
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    today = date.today()

    # Get all unpaid invoices with outstanding amounts in a single query
    unpaid_invoices = Invoice.objects.filter(
        organization=org,
        invoice_type='tax'
    ).exclude(status__in=['cancelled', 'paid']).annotate(
        total_paid=Coalesce(
            Sum('payments__amount'), Value(0), output_field=DecimalField()
        ),
        outstanding=F('total_amount') - Coalesce(
            Sum('payments__amount'), Value(0), output_field=DecimalField()
        )
    ).filter(outstanding__gt=0)

    # Calculate aging buckets for receivables
    current = Decimal('0')
    days30 = Decimal('0')
    days60 = Decimal('0')
    days90 = Decimal('0')
    above90 = Decimal('0')

    for inv in unpaid_invoices:
        age = (today - inv.invoice_date).days

        if age <= 30:
            current += inv.outstanding
        elif age <= 60:
            days30 += inv.outstanding
        elif age <= 90:
            days60 += inv.outstanding
        elif age <= 120:
            days90 += inv.outstanding
        else:
            above90 += inv.outstanding

    # Get payables (unpaid purchases)
    payables_total = Purchase.objects.filter(
        organization=org
    ).exclude(payment_status='paid').aggregate(
        total=Coalesce(Sum(F('total_amount') - F('amount_paid')), Decimal('0'))
    )['total']

    total_receivables = current + days30 + days60 + days90 + above90

    data = {
        'receivables': {
            'total': float(total_receivables),
            'current': float(current),
            'days30': float(days30),
            'days60': float(days60),
            'days90': float(days90),
            'above90': float(above90)
        },
        'payables': {
            'total': float(payables_total)
        }
    }
    cache.set(cache_key, data, 120)  # Cache for 120 seconds
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    """
    Returns cash flow, income/expense, and profit metrics for dashboard.
    """
    org = getattr(request, 'organization', None)
    if not org:
        return Response({
            'cashFlowData': [],
            'ytdIncome': 0,
            'ytdExpenses': 0,
            'netProfit': 0
        })

    # Check cache first (120 second TTL, keyed by organization)
    cache_key = f'analytics_summary_{org.id}'
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    today = date.today()

    # Current financial year (April to March)
    if today.month >= 4:
        fy_start = date(today.year, 4, 1)
    else:
        fy_start = date(today.year - 1, 4, 1)

    # Last 6 months for cash flow
    cash_flow_data = []
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=i * 30)
        month_start = date(month_date.year, month_date.month, 1)
        if month_date.month == 12:
            month_end = date(month_date.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(month_date.year, month_date.month + 1, 1) - timedelta(days=1)

        # Receipts (payments received)
        receipts = Payment.objects.filter(
            organization=org,
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        # Payments made (expenses + purchase payments)
        expense_payments = ExpensePayment.objects.filter(
            organization=org,
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        purchase_payments = SupplierPayment.objects.filter(
            organization=org,
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        cash_flow_data.append({
            'month': month_start.strftime('%b'),
            'receipts': float(receipts),
            'payments': float(expense_payments + purchase_payments)
        })

    # YTD totals
    ytd_income = Invoice.objects.filter(
        organization=org,
        invoice_type='tax',
        invoice_date__gte=fy_start
    ).exclude(status='cancelled').aggregate(
        total=Coalesce(Sum('total_amount'), Decimal('0'))
    )['total']

    ytd_expenses = ExpensePayment.objects.filter(
        organization=org,
        payment_date__gte=fy_start
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

    ytd_purchases = Purchase.objects.filter(
        organization=org,
        purchase_date__gte=fy_start
    ).aggregate(total=Coalesce(Sum('total_amount'), Decimal('0')))['total']

    net_profit = ytd_income - ytd_expenses - ytd_purchases

    data = {
        'cashFlowData': cash_flow_data,
        'ytdIncome': float(ytd_income),
        'ytdExpenses': float(ytd_expenses + ytd_purchases),
        'netProfit': float(net_profit)
    }
    cache.set(cache_key, data, 120)  # Cache for 120 seconds
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bank_reconciliation_status(request):
    """
    Returns bank accounts with their reconciliation status for dashboard.
    """
    org = getattr(request, 'organization', None)
    if not org:
        return Response([])

    # Get bank accounts with last reconciliation date in a single query
    latest_recon = BankReconciliation.objects.filter(
        bank_account=OuterRef('pk'),
        organization=org
    ).order_by('-reconciliation_date').values('reconciliation_date')[:1]

    bank_accounts = LedgerAccount.objects.filter(
        organization=org,
        account_type='bank',
        is_active=True
    ).annotate(
        last_reconciled_date=Subquery(latest_recon)
    )

    status_list = []
    for account in bank_accounts:
        status_list.append({
            'account_name': account.name,
            'balance': float(account.current_balance),
            'balance_type': account.current_balance_type,
            'last_reconciled': account.last_reconciled_date.isoformat() if account.last_reconciled_date else None,
            'is_reconciled': account.last_reconciled_date is not None
        })

    return Response(status_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tally_sync_status(request):
    """
    Returns Tally sync status for dashboard.
    """
    org = getattr(request, 'organization', None)
    if not org:
        return Response({
            'is_configured': False,
            'is_connected': False,
            'last_sync': None
        })

    mapping = TallyMapping.objects.filter(organization=org).first()

    if not mapping:
        return Response({
            'is_configured': False,
            'is_connected': False,
            'last_sync': None
        })

    return Response({
        'is_configured': True,
        'is_connected': mapping.is_connected if hasattr(mapping, 'is_connected') else False,
        'last_sync': mapping.updated_at.isoformat() if mapping.updated_at else None,
        'company_name': mapping.tally_company_name if hasattr(mapping, 'tally_company_name') else None
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def opening_balance_status(request):
    """
    Returns trial balance status (whether debits = credits).
    """
    org = getattr(request, 'organization', None)
    if not org:
        return Response({
            'balanced': True,
            'total_debit': 0,
            'total_credit': 0,
            'difference': 0
        })

    # Get all ledger accounts
    ledgers = LedgerAccount.objects.filter(organization=org, is_active=True)

    total_dr = Decimal('0')
    total_cr = Decimal('0')

    for ledger in ledgers:
        if ledger.current_balance_type == 'Dr':
            total_dr += ledger.current_balance
        else:
            total_cr += ledger.current_balance

    difference = abs(total_dr - total_cr)
    is_balanced = difference < Decimal('0.01')  # Allow for rounding

    return Response({
        'balanced': is_balanced,
        'total_debit': float(total_dr),
        'total_credit': float(total_cr),
        'difference': float(difference)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_reminders_summary(request):
    """
    Returns overdue invoices count and amount for dashboard alerts.
    """
    org = getattr(request, 'organization', None)
    if not org:
        return Response({
            'overdueCount': 0,
            'overdueAmount': 0,
            'criticalCount': 0
        })
    today = date.today()

    # Get unpaid invoices with outstanding amounts in a single query
    unpaid_invoices = Invoice.objects.filter(
        organization=org,
        invoice_type='tax'
    ).exclude(status__in=['cancelled', 'paid']).annotate(
        total_paid=Coalesce(
            Sum('payments__amount'), Value(0), output_field=DecimalField()
        ),
        outstanding=F('total_amount') - Coalesce(
            Sum('payments__amount'), Value(0), output_field=DecimalField()
        )
    ).filter(outstanding__gt=0)

    overdue_count = 0
    overdue_amount = Decimal('0')
    critical_count = 0  # 90+ days

    for inv in unpaid_invoices:
        age = (today - inv.invoice_date).days

        if age > 30:  # Consider overdue after 30 days
            overdue_count += 1
            overdue_amount += inv.outstanding

            if age > 90:
                critical_count += 1

    return Response({
        'overdueCount': overdue_count,
        'overdueAmount': float(overdue_amount),
        'criticalCount': critical_count
    })
