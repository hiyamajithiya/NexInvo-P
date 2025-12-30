package com.nexinvo.app.data.repository

import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.data.model.*
import com.nexinvo.app.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InvoiceRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getInvoices(
        page: Int = 1,
        status: String? = null,
        invoiceType: String? = null,
        clientId: Int? = null,
        search: String? = null,
        dateFrom: String? = null,
        dateTo: String? = null
    ): Resource<InvoiceListResponse> {
        return try {
            val response = apiService.getInvoices(
                page = page,
                status = status,
                invoiceType = invoiceType,
                clientId = clientId,
                search = search,
                dateFrom = dateFrom,
                dateTo = dateTo
            )
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to load invoices", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun getInvoice(id: Int): Resource<Invoice> {
        return try {
            val response = apiService.getInvoice(id)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to load invoice", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun createInvoice(request: InvoiceRequest): Resource<Invoice> {
        return try {
            val response = apiService.createInvoice(request)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to create invoice", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun updateInvoice(id: Int, request: InvoiceRequest): Resource<Invoice> {
        return try {
            val response = apiService.updateInvoice(id, request)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to update invoice", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun deleteInvoice(id: Int): Resource<Unit> {
        return try {
            val response = apiService.deleteInvoice(id)
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Failed to delete invoice", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun sendInvoiceEmail(id: Int): Resource<Map<String, Any>> {
        return try {
            val response = apiService.sendInvoiceEmail(id)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to send email", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
}
