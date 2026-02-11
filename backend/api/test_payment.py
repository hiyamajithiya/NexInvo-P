"""
API tests for Payment and Receipt endpoints.

Covers payment CRUD, invoice status transitions on payment/deletion,
partial vs full payment logic, and automatic receipt creation.
"""

import pytest
from rest_framework import status
from decimal import Decimal

from api.models import Payment, Receipt, Invoice


# =============================================================================
# Payment API Tests
# =============================================================================

@pytest.mark.django_db
class TestPaymentAPI:
    """Tests for the /api/payments/ endpoint (PaymentViewSet)."""

    def test_list_payments(self, auth_client):
        """GET /api/payments/ returns 200 (even when empty)."""
        response = auth_client.get("/api/payments/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_payment(self, auth_client, sample_invoice):
        """
        POST /api/payments/ records a payment against an invoice (201).

        The response should contain the payment details including the
        auto-computed amount_received field.
        """
        payload = {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
        }
        response = auth_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert Decimal(data["amount"]) == Decimal("1180.00")
        assert data["payment_method"] == "bank_transfer"
        assert data["invoice"] == sample_invoice.id
        # amount_received should default to amount when tds is 0
        assert Decimal(data["amount_received"]) == Decimal("1180.00")

    def test_create_payment_with_tds(self, auth_client, sample_invoice):
        """
        POST /api/payments/ with TDS deduction records correctly.

        amount_received = amount - tds_amount - gst_tds_amount
        """
        payload = {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "tds_amount": "100.00",
            "gst_tds_amount": "20.00",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
            "reference_number": "NEFT-123456",
            "notes": "Payment with TDS deduction",
        }
        response = auth_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert Decimal(data["tds_amount"]) == Decimal("100.00")
        assert Decimal(data["gst_tds_amount"]) == Decimal("20.00")
        # amount_received = 1180 - 100 - 20 = 1060
        assert Decimal(data["amount_received"]) == Decimal("1060.00")

    def test_payment_updates_invoice_status_to_paid(self, auth_client, sample_invoice):
        """
        After a full payment (amount >= invoice.total_amount), the invoice
        status transitions to 'paid'.
        """
        payload = {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
        }
        response = auth_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Refresh invoice from DB and verify status
        sample_invoice.refresh_from_db()
        assert sample_invoice.status == "paid"

    def test_partial_payment(self, auth_client, sample_invoice):
        """
        A partial payment (amount < total_amount) should NOT mark the
        invoice as 'paid'. The invoice remains at its current status.
        """
        payload = {
            "invoice": sample_invoice.id,
            "amount": "500.00",
            "payment_date": "2025-01-20",
            "payment_method": "upi",
        }
        response = auth_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        sample_invoice.refresh_from_db()
        # 500 < 1180 so invoice should NOT be 'paid'
        assert sample_invoice.status != "paid"

    def test_multiple_partial_payments_reach_paid(self, auth_client, sample_invoice):
        """
        Multiple partial payments that together cover the full amount
        should eventually transition the invoice to 'paid'.
        """
        # First partial payment
        payload1 = {
            "invoice": sample_invoice.id,
            "amount": "600.00",
            "payment_date": "2025-01-20",
            "payment_method": "upi",
        }
        resp1 = auth_client.post("/api/payments/", payload1, format="json")
        assert resp1.status_code == status.HTTP_201_CREATED

        sample_invoice.refresh_from_db()
        assert sample_invoice.status != "paid"

        # Second partial payment covers the remainder
        payload2 = {
            "invoice": sample_invoice.id,
            "amount": "580.00",
            "payment_date": "2025-01-25",
            "payment_method": "bank_transfer",
        }
        resp2 = auth_client.post("/api/payments/", payload2, format="json")
        assert resp2.status_code == status.HTTP_201_CREATED

        sample_invoice.refresh_from_db()
        # 600 + 580 = 1180 >= total_amount (1180), so now it should be 'paid'
        assert sample_invoice.status == "paid"

    def test_delete_payment_reverts_status(self, auth_client, sample_invoice):
        """
        Deleting a payment recalculates the invoice status.

        If no payments remain, the invoice status reverts to 'draft'.
        """
        # Create a full payment first
        payload = {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
        }
        create_resp = auth_client.post("/api/payments/", payload, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        payment_id = create_resp.json()["id"]

        # Verify invoice is paid
        sample_invoice.refresh_from_db()
        assert sample_invoice.status == "paid"

        # Delete the payment
        delete_resp = auth_client.delete(f"/api/payments/{payment_id}/")
        assert delete_resp.status_code == status.HTTP_204_NO_CONTENT

        # Verify invoice status reverted (no payments left -> 'draft')
        sample_invoice.refresh_from_db()
        assert sample_invoice.status == "draft"

    def test_delete_partial_payment_reverts_from_paid(self, auth_client, sample_invoice):
        """
        If two payments make the invoice 'paid' and one is deleted,
        the status should downgrade to 'sent' (since some payment remains).
        """
        # Payment 1: partial
        resp1 = auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "600.00",
            "payment_date": "2025-01-20",
            "payment_method": "cash",
        }, format="json")
        assert resp1.status_code == status.HTTP_201_CREATED

        # Payment 2: covers the rest
        resp2 = auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "580.00",
            "payment_date": "2025-01-25",
            "payment_method": "bank_transfer",
        }, format="json")
        assert resp2.status_code == status.HTTP_201_CREATED
        payment2_id = resp2.json()["id"]

        sample_invoice.refresh_from_db()
        assert sample_invoice.status == "paid"

        # Delete payment 2 -> only 600 remains, which is < 1180
        auth_client.delete(f"/api/payments/{payment2_id}/")

        sample_invoice.refresh_from_db()
        # Some payment remains (600) but not enough, so status should be 'sent'
        assert sample_invoice.status == "sent"

    def test_update_payment(self, auth_client, sample_invoice):
        """PUT /api/payments/{id}/ updates the payment and recalculates invoice status."""
        # Create a payment
        create_resp = auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "cash",
        }, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        payment_id = create_resp.json()["id"]

        sample_invoice.refresh_from_db()
        assert sample_invoice.status == "paid"

        # Update to a smaller amount
        update_resp = auth_client.put(f"/api/payments/{payment_id}/", {
            "invoice": sample_invoice.id,
            "amount": "500.00",
            "payment_date": "2025-01-20",
            "payment_method": "cash",
        }, format="json")
        assert update_resp.status_code == status.HTTP_200_OK
        assert Decimal(update_resp.json()["amount"]) == Decimal("500.00")

        # Invoice should no longer be 'paid' since 500 < 1180
        sample_invoice.refresh_from_db()
        assert sample_invoice.status != "paid"

    def test_unauthenticated_payment_access(self, api_client):
        """GET /api/payments/ without auth returns 401."""
        response = api_client.get("/api/payments/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_payment_create(self, api_client):
        """POST /api/payments/ without auth returns 401."""
        payload = {
            "invoice": 999,
            "amount": "100.00",
            "payment_date": "2025-01-20",
            "payment_method": "cash",
        }
        response = api_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# Receipt API Tests
# =============================================================================

@pytest.mark.django_db
class TestReceiptAPI:
    """
    Tests for the /api/receipts/ endpoint (ReceiptViewSet).

    Receipts are auto-generated when a payment is made against a tax invoice.
    The ReceiptViewSet is read-only (list + retrieve only).
    """

    def test_list_receipts(self, auth_client):
        """GET /api/receipts/ returns 200 (even when empty)."""
        response = auth_client.get("/api/receipts/")
        assert response.status_code == status.HTTP_200_OK

    def test_receipt_auto_created_on_payment(self, auth_client, sample_invoice):
        """
        When a payment is recorded against a tax invoice, a Receipt is
        automatically created by the PaymentViewSet.perform_create logic.
        """
        # Verify no receipts exist initially
        assert Receipt.objects.filter(invoice=sample_invoice).count() == 0

        # Create a payment
        payload = {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
        }
        response = auth_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        payment_id = response.json()["id"]

        # Verify a receipt was auto-created
        receipts = Receipt.objects.filter(invoice=sample_invoice)
        assert receipts.count() == 1

        receipt = receipts.first()
        assert receipt.payment_id == payment_id
        assert receipt.receipt_number.startswith("RCPT-")
        assert receipt.payment_method == "bank_transfer"
        assert receipt.received_from == sample_invoice.client.name
        assert Decimal(receipt.total_amount) == Decimal("1180.00")

    def test_receipt_visible_in_api(self, auth_client, sample_invoice):
        """After auto-creation, the receipt appears in GET /api/receipts/."""
        # Create a payment (which auto-creates a receipt)
        auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
        }, format="json")

        # List receipts
        response = auth_client.get("/api/receipts/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        assert len(results) >= 1
        # Verify receipt data
        receipt_data = results[0]
        assert receipt_data["receipt_number"].startswith("RCPT-")
        assert receipt_data["client_name"] == sample_invoice.client.name

    def test_receipt_filter_by_invoice(self, auth_client, sample_invoice):
        """GET /api/receipts/?invoice={id} filters receipts by invoice."""
        # Create a payment
        auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "payment_date": "2025-01-20",
            "payment_method": "cash",
        }, format="json")

        # Filter receipts by invoice
        response = auth_client.get(f"/api/receipts/?invoice={sample_invoice.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        assert len(results) == 1
        assert results[0]["invoice"] == sample_invoice.id

    def test_receipt_tds_details(self, auth_client, sample_invoice):
        """
        Receipts capture TDS details (Income Tax TDS + GST TDS)
        from the payment.
        """
        payload = {
            "invoice": sample_invoice.id,
            "amount": "1180.00",
            "tds_amount": "118.00",
            "gst_tds_amount": "23.60",
            "payment_date": "2025-01-20",
            "payment_method": "bank_transfer",
        }
        response = auth_client.post("/api/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        receipt = Receipt.objects.filter(invoice=sample_invoice).first()
        assert receipt is not None
        assert Decimal(receipt.tds_amount) == Decimal("118.00")
        assert Decimal(receipt.gst_tds_amount) == Decimal("23.60")
        # amount_received = 1180 - 118 - 23.60 = 1038.40
        assert Decimal(receipt.amount_received) == Decimal("1038.40")

    def test_receipts_read_only(self, auth_client, sample_invoice):
        """
        The ReceiptViewSet is read-only. POST should return 405 Method Not Allowed.
        """
        payload = {
            "invoice": sample_invoice.id,
            "receipt_number": "RCPT-9999",
            "receipt_date": "2025-01-20",
            "amount_received": "1180.00",
            "total_amount": "1180.00",
            "payment_method": "cash",
            "received_from": "Test",
        }
        response = auth_client.post("/api/receipts/", payload, format="json")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_unauthenticated_receipt_access(self, api_client):
        """GET /api/receipts/ without auth returns 401."""
        response = api_client.get("/api/receipts/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_multiple_payments_create_multiple_receipts(self, auth_client, sample_invoice):
        """
        Each payment against a tax invoice generates its own receipt.
        Two payments should produce two distinct receipts.
        """
        # Payment 1
        auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "600.00",
            "payment_date": "2025-01-20",
            "payment_method": "upi",
        }, format="json")

        # Payment 2
        auth_client.post("/api/payments/", {
            "invoice": sample_invoice.id,
            "amount": "580.00",
            "payment_date": "2025-01-25",
            "payment_method": "bank_transfer",
        }, format="json")

        receipts = Receipt.objects.filter(invoice=sample_invoice).order_by("created_at")
        assert receipts.count() == 2

        # Verify distinct receipt numbers
        receipt_numbers = list(receipts.values_list("receipt_number", flat=True))
        assert len(set(receipt_numbers)) == 2
