"""
API tests for Client and Invoice endpoints.

Covers CRUD operations, filtering, PDF generation, multi-tenant isolation,
and authentication enforcement.
"""

import pytest
from rest_framework import status
from decimal import Decimal

from api.models import Client, Invoice, InvoiceItem


# =============================================================================
# Client API Tests
# =============================================================================

@pytest.mark.django_db
class TestClientAPI:
    """Tests for the /api/clients/ endpoint (ClientViewSet)."""

    def test_list_clients(self, auth_client, client_obj):
        """GET /api/clients/ returns 200 and includes existing clients."""
        response = auth_client.get("/api/clients/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # The response is either a list or a paginated dict with "results"
        results = data if isinstance(data, list) else data.get("results", data)
        assert len(results) >= 1
        names = [c["name"] for c in results]
        assert "Acme Corp" in names

    def test_create_client(self, auth_client):
        """POST /api/clients/ with name and email creates a new client (201)."""
        payload = {
            "name": "New Client Ltd",
            "email": "newclient@example.com",
        }
        response = auth_client.post("/api/clients/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "New Client Ltd"
        assert data["email"] == "newclient@example.com"
        # The model auto-generates a code when none is provided
        assert data["code"] != ""

    def test_create_client_with_full_details(self, auth_client):
        """POST /api/clients/ with all fields creates a complete client record."""
        payload = {
            "name": "Full Detail Corp",
            "email": "full@detail.com",
            "phone": "0221234567",
            "mobile": "9876543210",
            "address": "456 Business Park",
            "city": "Pune",
            "state": "Maharashtra",
            "pinCode": "411001",
            "stateCode": "27",
            "gstin": "27AABCT1332L1ZH",
            "pan": "AABCT1332L",
        }
        response = auth_client.post("/api/clients/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["city"] == "Pune"
        assert data["gstin"] == "27AABCT1332L1ZH"

    def test_update_client(self, auth_client, client_obj):
        """PUT /api/clients/{id}/ updates the client and returns 200."""
        url = f"/api/clients/{client_obj.id}/"
        payload = {
            "name": "Acme Corp Updated",
            "email": "updated@acme.com",
        }
        response = auth_client.put(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Acme Corp Updated"
        assert data["email"] == "updated@acme.com"

    def test_patch_client(self, auth_client, client_obj):
        """PATCH /api/clients/{id}/ partially updates the client."""
        url = f"/api/clients/{client_obj.id}/"
        payload = {"city": "Delhi"}
        response = auth_client.patch(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["city"] == "Delhi"

    def test_delete_client(self, auth_client, client_obj):
        """DELETE /api/clients/{id}/ removes the client (204)."""
        url = f"/api/clients/{client_obj.id}/"
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Client.objects.filter(id=client_obj.id).exists()

    def test_client_isolation(self, auth_client, superadmin_client, client_obj):
        """
        Clients created in one organization must NOT be visible to another.

        - auth_client belongs to 'Test Organization' which owns client_obj.
        - superadmin_client belongs to 'Other Organization'.
        """
        # auth_client should see the client
        response = auth_client.get("/api/clients/")
        assert response.status_code == status.HTTP_200_OK
        auth_data = response.json()
        auth_results = auth_data if isinstance(auth_data, list) else auth_data.get("results", auth_data)
        auth_ids = [c["id"] for c in auth_results]
        assert client_obj.id in auth_ids

        # superadmin_client (different org) should NOT see the client
        response = superadmin_client.get("/api/clients/")
        assert response.status_code == status.HTTP_200_OK
        other_data = response.json()
        other_results = other_data if isinstance(other_data, list) else other_data.get("results", other_data)
        other_ids = [c["id"] for c in other_results]
        assert client_obj.id not in other_ids


# =============================================================================
# Invoice API Tests
# =============================================================================

@pytest.mark.django_db
class TestInvoiceAPI:
    """Tests for the /api/invoices/ endpoint (InvoiceViewSet)."""

    def test_list_invoices(self, auth_client, sample_invoice):
        """GET /api/invoices/ returns 200 and includes existing invoices."""
        response = auth_client.get("/api/invoices/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        assert len(results) >= 1

    def test_create_invoice(self, auth_client, client_obj):
        """
        POST /api/invoices/ with nested items creates a tax invoice (201).

        The serializer calculates subtotal, tax, and total from items.
        """
        payload = {
            "client": client_obj.id,
            "invoice_type": "tax",
            "invoice_date": "2025-01-15",
            "items": [
                {
                    "description": "Web Development Service",
                    "quantity": 1,
                    "rate": "1000.00",
                    "gst_rate": "18",
                    "taxable_amount": "1000.00",
                    "total_amount": "1180.00",
                }
            ],
            "notes": "Test invoice created via API",
        }
        response = auth_client.post("/api/invoices/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invoice_type"] == "tax"
        assert data["client"] == client_obj.id
        # Verify auto-generated invoice number starts with the configured prefix
        assert data["invoice_number"].startswith("INV-")
        # Verify items were created
        assert len(data["items"]) == 1
        assert data["items"][0]["description"] == "Web Development Service"
        # Verify computed totals
        assert Decimal(data["subtotal"]) == Decimal("1000.00")
        assert Decimal(data["total_amount"]) == Decimal("1180")

    def test_create_invoice_multiple_items(self, auth_client, client_obj):
        """POST /api/invoices/ with multiple line items creates all items correctly."""
        payload = {
            "client": client_obj.id,
            "invoice_type": "tax",
            "invoice_date": "2025-02-01",
            "items": [
                {
                    "description": "Design Service",
                    "quantity": 2,
                    "rate": "500.00",
                    "gst_rate": "18",
                    "taxable_amount": "1000.00",
                    "total_amount": "1180.00",
                },
                {
                    "description": "Hosting Service",
                    "quantity": 1,
                    "rate": "2000.00",
                    "gst_rate": "18",
                    "taxable_amount": "2000.00",
                    "total_amount": "2360.00",
                },
            ],
            "notes": "Multi-item invoice",
        }
        response = auth_client.post("/api/invoices/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert len(data["items"]) == 2
        assert Decimal(data["subtotal"]) == Decimal("3000.00")

    def test_create_proforma_invoice(self, auth_client, client_obj):
        """
        POST /api/invoices/ with invoice_type='proforma' creates a proforma (201).

        Proforma invoices use a different number prefix (PI-).
        """
        payload = {
            "client": client_obj.id,
            "invoice_type": "proforma",
            "invoice_date": "2025-01-20",
            "items": [
                {
                    "description": "Advance for Project Alpha",
                    "quantity": 1,
                    "rate": "5000.00",
                    "gst_rate": "18",
                    "taxable_amount": "5000.00",
                    "total_amount": "5900.00",
                }
            ],
            "notes": "Proforma for advance payment",
        }
        response = auth_client.post("/api/invoices/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invoice_type"] == "proforma"
        assert data["invoice_number"].startswith("PI-")

    def test_filter_invoices_by_status(self, auth_client, sample_invoice):
        """
        GET /api/invoices/?status=sent returns only invoices with that status.

        sample_invoice has status='sent', so it should appear in the results.
        """
        response = auth_client.get("/api/invoices/?status=sent")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        assert len(results) >= 1
        for inv in results:
            assert inv["status"] == "sent"

    def test_filter_invoices_by_type(self, auth_client, sample_invoice):
        """GET /api/invoices/?invoice_type=tax filters by invoice type."""
        response = auth_client.get("/api/invoices/?invoice_type=tax")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        for inv in results:
            assert inv["invoice_type"] == "tax"

    def test_filter_invoices_no_match(self, auth_client, sample_invoice):
        """GET /api/invoices/?status=cancelled returns empty when none match."""
        response = auth_client.get("/api/invoices/?status=cancelled")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        # sample_invoice is 'sent', so 'cancelled' filter should exclude it
        invoice_ids = [inv["id"] for inv in results]
        assert sample_invoice.id not in invoice_ids

    def test_invoice_pdf_generation(self, auth_client, sample_invoice):
        """
        GET /api/invoices/{id}/pdf/ returns a PDF document (200).

        The response content-type should be 'application/pdf'.
        """
        url = f"/api/invoices/{sample_invoice.id}/pdf/"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "application/pdf"
        # PDF files start with the %PDF magic bytes
        assert response.content[:4] == b"%PDF"

    def test_update_invoice(self, auth_client, sample_invoice):
        """
        PUT /api/invoices/{id}/ updates the invoice and its items (200).

        When items are provided in an update, old items are deleted and
        new items are created.
        """
        url = f"/api/invoices/{sample_invoice.id}/"
        payload = {
            "client": sample_invoice.client.id,
            "invoice_type": "tax",
            "invoice_date": "2025-01-15",
            "status": "sent",
            "items": [
                {
                    "description": "Updated Consulting Service",
                    "quantity": 2,
                    "rate": "1500.00",
                    "gst_rate": "18",
                    "taxable_amount": "3000.00",
                    "total_amount": "3540.00",
                }
            ],
            "notes": "Updated invoice",
        }
        response = auth_client.put(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["notes"] == "Updated invoice"
        assert len(data["items"]) == 1
        assert data["items"][0]["description"] == "Updated Consulting Service"
        assert Decimal(data["subtotal"]) == Decimal("3000.00")

    def test_retrieve_single_invoice(self, auth_client, sample_invoice):
        """GET /api/invoices/{id}/ returns the full invoice detail."""
        url = f"/api/invoices/{sample_invoice.id}/"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_invoice.id
        assert data["client_name"] == sample_invoice.client.name
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_delete_invoice(self, auth_client, sample_invoice):
        """DELETE /api/invoices/{id}/ removes the invoice (204)."""
        url = f"/api/invoices/{sample_invoice.id}/"
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Invoice.objects.filter(id=sample_invoice.id).exists()

    def test_unauthenticated_access(self, api_client):
        """
        GET /api/invoices/ without authentication returns 401.

        The InvoiceViewSet requires IsAuthenticated.
        """
        response = api_client.get("/api/invoices/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_create(self, api_client):
        """POST /api/invoices/ without authentication returns 401."""
        payload = {
            "client": 1,
            "invoice_type": "tax",
            "invoice_date": "2025-01-15",
            "items": [{"description": "Test", "taxable_amount": "100", "total_amount": "118"}],
        }
        response = api_client.post("/api/invoices/", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_search_invoices(self, auth_client, sample_invoice):
        """GET /api/invoices/?search=<term> filters by invoice number or client name."""
        # Search by client name
        response = auth_client.get(f"/api/invoices/?search={sample_invoice.client.name}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", data)
        assert len(results) >= 1

    def test_invoice_auto_number_generation(self, auth_client, client_obj):
        """Two invoices created sequentially get sequential invoice numbers."""
        item_data = {
            "description": "Service",
            "quantity": 1,
            "rate": "100.00",
            "gst_rate": "18",
            "taxable_amount": "100.00",
            "total_amount": "118.00",
        }
        payload1 = {
            "client": client_obj.id,
            "invoice_type": "tax",
            "invoice_date": "2025-03-01",
            "items": [item_data],
        }
        payload2 = {
            "client": client_obj.id,
            "invoice_type": "tax",
            "invoice_date": "2025-03-02",
            "items": [item_data],
        }
        resp1 = auth_client.post("/api/invoices/", payload1, format="json")
        resp2 = auth_client.post("/api/invoices/", payload2, format="json")
        assert resp1.status_code == status.HTTP_201_CREATED
        assert resp2.status_code == status.HTTP_201_CREATED
        num1 = resp1.json()["invoice_number"]
        num2 = resp2.json()["invoice_number"]
        # Both should have the INV- prefix and be sequential
        assert num1.startswith("INV-")
        assert num2.startswith("INV-")
        assert num1 != num2
