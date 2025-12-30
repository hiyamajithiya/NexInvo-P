package com.nexinvo.app.data.repository

import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.data.model.*
import com.nexinvo.app.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReceiptRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getReceipts(
        page: Int = 1,
        search: String? = null
    ): Resource<ReceiptListResponse> {
        return try {
            val response = apiService.getReceipts(page = page, search = search)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to load receipts", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun getReceipt(id: Int): Resource<Receipt> {
        return try {
            val response = apiService.getReceipt(id)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to load receipt", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
}
