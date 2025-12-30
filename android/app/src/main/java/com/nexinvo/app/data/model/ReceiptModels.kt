package com.nexinvo.app.data.model

import com.google.gson.annotations.SerializedName

// Receipt
data class Receipt(
    val id: Int,
    @SerializedName("receipt_number")
    val receiptNumber: String,
    @SerializedName("receipt_date")
    val receiptDate: String,
    val invoice: Invoice?,
    @SerializedName("invoice_id")
    val invoiceId: Int?,
    @SerializedName("amount_received")
    val amountReceived: String,
    @SerializedName("tds_amount")
    val tdsAmount: String?,
    @SerializedName("gst_tds_amount")
    val gstTdsAmount: String?,
    @SerializedName("total_amount")
    val totalAmount: String,
    @SerializedName("payment_method")
    val paymentMethod: String,
    @SerializedName("received_from")
    val receivedFrom: String?,
    val towards: String?,
    val notes: String?,
    @SerializedName("created_at")
    val createdAt: String?,
    @SerializedName("updated_at")
    val updatedAt: String?
)

// Receipt List Response (Paginated)
data class ReceiptListResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<Receipt>
)

// Payment Methods
object PaymentMethods {
    val methods = listOf(
        "bank_transfer" to "Bank Transfer",
        "cash" to "Cash",
        "cheque" to "Cheque",
        "upi" to "UPI",
        "card" to "Card",
        "other" to "Other"
    )

    fun getDisplayName(method: String): String {
        return methods.find { it.first == method }?.second ?: method
    }
}
