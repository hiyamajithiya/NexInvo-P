package com.nexinvo.app.data.model

import com.google.gson.annotations.SerializedName

// Dashboard Stats
data class DashboardStats(
    @SerializedName("total_revenue")
    val totalRevenue: String,
    @SerializedName("total_outstanding")
    val totalOutstanding: String,
    @SerializedName("total_paid")
    val totalPaid: String,
    @SerializedName("invoice_count")
    val invoiceCount: InvoiceCount,
    @SerializedName("recent_invoices")
    val recentInvoices: List<Invoice>?,
    @SerializedName("monthly_revenue")
    val monthlyRevenue: List<MonthlyRevenue>?,
    @SerializedName("top_clients")
    val topClients: List<TopClient>?
)

// Invoice Count
data class InvoiceCount(
    val total: Int,
    val draft: Int,
    val sent: Int,
    val paid: Int,
    val cancelled: Int,
    val proforma: Int,
    val tax: Int
)

// Monthly Revenue
data class MonthlyRevenue(
    val month: String,
    val revenue: String
)

// Top Client
data class TopClient(
    @SerializedName("client_id")
    val clientId: Int,
    @SerializedName("client_name")
    val clientName: String,
    @SerializedName("total_amount")
    val totalAmount: String,
    @SerializedName("invoice_count")
    val invoiceCount: Int
)
