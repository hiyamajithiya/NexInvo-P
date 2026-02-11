from rest_framework import viewsets, status, serializers
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions import ReadOnlyForViewer
from api.pagination import StandardPagination
from django.db.models import Q, F
from django.db import transaction
from django.utils import timezone
import logging

from .models import (
    UnitOfMeasurement, Product, Supplier, Purchase,
    InventoryMovement, SupplierPayment, ExpensePayment,
    Voucher, VoucherEntry, LedgerAccount, FinancialYear, VoucherNumberSeries,
)
from .serializers import (
    UnitOfMeasurementSerializer, ProductSerializer, ProductListSerializer,
    SupplierSerializer, SupplierListSerializer, PurchaseSerializer, PurchaseListSerializer,
    InventoryMovementSerializer, SupplierPaymentSerializer, StockAdjustmentSerializer,
    ExpensePaymentSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# GOODS TRADER VIEWSETS - Product, Supplier, Purchase, Inventory
# =============================================================================

class UnitOfMeasurementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing units of measurement.
    Includes predefined system units and organization-specific custom units.
    """
    serializer_class = UnitOfMeasurementSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = None  # Disabled - used in dropdowns

    def get_queryset(self):
        # Return predefined units + organization's custom units
        return UnitOfMeasurement.get_units_for_organization(self.request.organization)

    def perform_create(self, serializer):
        # Custom units are tied to the organization
        serializer.save(organization=self.request.organization, is_predefined=False)

    def perform_destroy(self, instance):
        # Don't allow deletion of predefined units
        if instance.is_predefined:
            raise serializers.ValidationError("Cannot delete predefined units")
        instance.delete()


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing products (goods trader).
    Supports inventory tracking, low stock alerts, and stock adjustments.
    """
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.filter(
            organization=self.request.organization
        ).select_related('organization', 'unit')

        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Filter by low stock
        low_stock = self.request.query_params.get('low_stock', None)
        if low_stock == 'true':
            queryset = queryset.filter(
                track_inventory=True,
                current_stock__lte=F('low_stock_threshold')
            )

        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(sku__icontains=search) |
                Q(hsn_code__icontains=search)
            )

        return queryset.order_by('name')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Manually adjust stock for a product"""
        product = self.get_object()

        if not product.track_inventory:
            return Response(
                {'error': 'Inventory tracking is not enabled for this product'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = StockAdjustmentSerializer(data={
            'product': product.id,
            **request.data
        }, context={'request': request})

        if serializer.is_valid():
            movement = serializer.save()
            return Response({
                'message': 'Stock adjusted successfully',
                'new_stock': product.current_stock,
                'movement': InventoryMovementSerializer(movement).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def low_stock_alerts(self, request):
        """Get all products with low stock"""
        products = Product.objects.filter(
            organization=request.organization,
            track_inventory=True,
            is_active=True
        ).exclude(
            low_stock_threshold__isnull=True
        ).filter(
            current_stock__lte=F('low_stock_threshold')
        )

        serializer = ProductListSerializer(products, many=True)
        return Response({
            'count': products.count(),
            'products': serializer.data
        })


class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing suppliers (goods trader).
    """
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = None  # Disabled - used in dropdowns

    def get_serializer_class(self):
        if self.action == 'list':
            return SupplierListSerializer
        return SupplierSerializer

    def get_queryset(self):
        queryset = Supplier.objects.filter(
            organization=self.request.organization
        ).select_related('organization')

        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(email__icontains=search) |
                Q(gstin__icontains=search)
            )

        return queryset.order_by('name')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class PurchaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing purchase entries (goods trader).
    """
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseListSerializer
        return PurchaseSerializer

    def get_queryset(self):
        queryset = Purchase.objects.filter(
            organization=self.request.organization
        ).select_related('supplier', 'created_by').prefetch_related('items', 'payments')

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by payment status
        payment_status = self.request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)

        # Filter by supplier
        supplier_id = self.request.query_params.get('supplier', None)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(purchase_number__icontains=search) |
                Q(supplier_invoice_number__icontains=search) |
                Q(supplier__name__icontains=search)
            )

        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        if from_date:
            queryset = queryset.filter(purchase_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(purchase_date__lte=to_date)

        return queryset.order_by('-purchase_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        """Mark a purchase as received and update inventory"""
        purchase = self.get_object()

        if purchase.status == 'received':
            return Response(
                {'error': 'Purchase is already marked as received'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Update purchase status
            purchase.status = 'received'
            purchase.received_date = timezone.now().date()
            purchase.save()

            # Update inventory for items with products that track inventory
            for item in purchase.items.all():
                if item.product and item.product.track_inventory:
                    item.product.adjust_stock(
                        quantity=item.quantity,
                        movement_type='purchase',
                        reference=purchase.purchase_number,
                        notes=f'Purchase from {purchase.supplier.name}',
                        user=request.user
                    )
                    item.quantity_received = item.quantity
                    item.save()

        return Response({
            'message': 'Purchase marked as received and inventory updated',
            'status': purchase.status
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a purchase"""
        purchase = self.get_object()

        if purchase.status == 'cancelled':
            return Response(
                {'error': 'Purchase is already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if purchase.status == 'received':
            return Response(
                {'error': 'Cannot cancel a received purchase. Create a return instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        purchase.status = 'cancelled'
        purchase.save()

        return Response({
            'message': 'Purchase cancelled successfully',
            'status': purchase.status
        })


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing inventory movements (read-only).
    Movements are created automatically via stock adjustments, purchases, and sales.
    """
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        queryset = InventoryMovement.objects.filter(
            organization=self.request.organization
        ).select_related('product', 'created_by')

        # Filter by product
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        # Filter by movement type
        movement_type = self.request.query_params.get('movement_type', None)
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        if from_date:
            queryset = queryset.filter(created_at__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__date__lte=to_date)

        return queryset.order_by('-created_at')


class SupplierPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing supplier payments.
    """
    serializer_class = SupplierPaymentSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        queryset = SupplierPayment.objects.filter(
            organization=self.request.organization
        ).select_related('supplier', 'purchase', 'created_by')

        # Filter by supplier
        supplier_id = self.request.query_params.get('supplier', None)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Filter by purchase
        purchase_id = self.request.query_params.get('purchase', None)
        if purchase_id:
            queryset = queryset.filter(purchase_id=purchase_id)

        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        if from_date:
            queryset = queryset.filter(payment_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(payment_date__lte=to_date)

        return queryset.order_by('-payment_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save()


class ExpensePaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing expense/outgoing payments (cash, bank, etc.).
    Optionally auto-creates a payment voucher when accounting fields are provided.
    """
    serializer_class = ExpensePaymentSerializer
    permission_classes = [IsAuthenticated, ReadOnlyForViewer]

    def get_queryset(self):
        queryset = ExpensePayment.objects.filter(
            organization=self.request.organization
        ).select_related('created_by')

        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)

        # Filter by payment method
        payment_method = self.request.query_params.get('payment_method', None)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        if from_date:
            queryset = queryset.filter(payment_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(payment_date__lte=to_date)

        # Search filter
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(payee_name__icontains=search) |
                Q(description__icontains=search) |
                Q(reference_number__icontains=search)
            )

        return queryset.order_by('-payment_date', '-created_at')

    def perform_create(self, serializer):
        # Extract accounting fields from request data (already popped from validated_data by serializer)
        cash_bank_account_id = self.request.data.get('cash_bank_account')
        expense_ledger_id = self.request.data.get('expense_ledger')
        post_to_ledger = self.request.data.get('post_to_ledger', False)
        if isinstance(post_to_ledger, str):
            post_to_ledger = post_to_ledger.lower() in ('true', '1')

        payment = serializer.save()

        # Auto-create payment voucher if accounting is enabled
        if post_to_ledger and cash_bank_account_id and expense_ledger_id:
            try:
                self._create_payment_voucher(payment, int(cash_bank_account_id), int(expense_ledger_id))
            except Exception as e:
                logger.error(f"Failed to create payment voucher for expense #{payment.id}: {e}")

    def _create_payment_voucher(self, payment, cash_bank_account_id, expense_ledger_id):
        """Create a double-entry payment voucher for an expense payment."""
        from decimal import Decimal

        organization = self.request.organization

        # Get financial year
        fy = FinancialYear.get_fy_for_date(organization, payment.payment_date)

        # Generate voucher number
        if fy:
            series = VoucherNumberSeries.get_or_create_series(organization, 'payment', fy.name)
            voucher_number = series.get_next_number()
        else:
            voucher_number = f"PMT-{payment.id}"

        with transaction.atomic():
            voucher = Voucher.objects.create(
                organization=organization,
                voucher_type='payment',
                voucher_number=voucher_number,
                voucher_date=payment.payment_date,
                expense_payment=payment,
                total_amount=payment.amount,
                narration=f"{payment.description} - Paid to {payment.payee_name}",
                reference_number=payment.reference_number or '',
                status='posted',
                created_by=self.request.user,
            )

            # Debit: Expense ledger
            VoucherEntry.objects.create(
                voucher=voucher,
                ledger_account_id=expense_ledger_id,
                debit_amount=payment.amount,
                credit_amount=Decimal('0.00'),
                particulars=payment.description,
                sequence=1,
            )

            # Credit: Cash/Bank account
            VoucherEntry.objects.create(
                voucher=voucher,
                ledger_account_id=cash_bank_account_id,
                debit_amount=Decimal('0.00'),
                credit_amount=payment.amount,
                particulars=f"Payment to {payment.payee_name}",
                sequence=2,
            )

            # Post voucher to update ledger balances
            voucher.post()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predefined_units_view(request):
    """Get list of predefined units of measurement"""
    units = UnitOfMeasurement.objects.filter(is_predefined=True, is_active=True)
    serializer = UnitOfMeasurementSerializer(units, many=True)
    return Response(serializer.data)
