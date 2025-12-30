package com.nexinvo.app.data.model

import com.google.gson.annotations.SerializedName

// Invoice
data class Invoice(
    val id: Int,
    @SerializedName("invoice_number")
    val invoiceNumber: String,
    @SerializedName("invoice_type")
    val invoiceType: String, // "proforma" or "tax"
    @SerializedName("invoice_date")
    val invoiceDate: String,
    @SerializedName("due_date")
    val dueDate: String?,
    val status: String, // "draft", "sent", "paid", "cancelled"
    val client: Client?,
    @SerializedName("client_id")
    val clientId: Int?,
    val items: List<InvoiceItem>?,
    val subtotal: String,
    @SerializedName("tax_amount")
    val taxAmount: String,
    @SerializedName("cgst_amount")
    val cgstAmount: String?,
    @SerializedName("sgst_amount")
    val sgstAmount: String?,
    @SerializedName("igst_amount")
    val igstAmount: String?,
    @SerializedName("is_interstate")
    val isInterstate: Boolean?,
    @SerializedName("round_off")
    val roundOff: String?,
    @SerializedName("total_amount")
    val totalAmount: String,
    @SerializedName("payment_terms")
    val paymentTerms: String?,
    val notes: String?,
    @SerializedName("is_emailed")
    val isEmailed: Boolean?,
    @SerializedName("emailed_at")
    val emailedAt: String?,
    @SerializedName("created_at")
    val createdAt: String?,
    @SerializedName("updated_at")
    val updatedAt: String?
)

// Invoice Item
data class InvoiceItem(
    val id: Int?,
    val description: String,
    @SerializedName("hsn_sac")
    val hsnSac: String?,
    @SerializedName("gst_rate")
    val gstRate: String,
    @SerializedName("taxable_amount")
    val taxableAmount: String,
    @SerializedName("cgst_amount")
    val cgstAmount: String?,
    @SerializedName("sgst_amount")
    val sgstAmount: String?,
    @SerializedName("igst_amount")
    val igstAmount: String?,
    @SerializedName("total_amount")
    val totalAmount: String
)

// Create/Update Invoice Request
data class InvoiceRequest(
    @SerializedName("invoice_type")
    val invoiceType: String,
    @SerializedName("invoice_date")
    val invoiceDate: String,
    @SerializedName("due_date")
    val dueDate: String?,
    @SerializedName("client_id")
    val clientId: Int,
    val items: List<InvoiceItemRequest>,
    @SerializedName("payment_terms")
    val paymentTerms: String?,
    val notes: String?
)

// Invoice Item Request
data class InvoiceItemRequest(
    val description: String,
    @SerializedName("hsn_sac")
    val hsnSac: String?,
    @SerializedName("gst_rate")
    val gstRate: String,
    @SerializedName("taxable_amount")
    val taxableAmount: String
)

// Invoice List Response (Paginated)
data class InvoiceListResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<Invoice>
)

// Invoice Filter
data class InvoiceFilter(
    val status: String? = null,
    val invoiceType: String? = null,
    val clientId: Int? = null,
    val search: String? = null,
    val dateFrom: String? = null,
    val dateTo: String? = null
)
