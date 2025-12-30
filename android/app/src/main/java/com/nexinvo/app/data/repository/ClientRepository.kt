package com.nexinvo.app.data.repository

import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.data.model.*
import com.nexinvo.app.utils.Resource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClientRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getClients(
        page: Int = 1,
        search: String? = null
    ): Resource<ClientListResponse> {
        return try {
            val response = apiService.getClients(page = page, search = search)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to load clients", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun getClient(id: Int): Resource<Client> {
        return try {
            val response = apiService.getClient(id)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to load client", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun createClient(request: ClientRequest): Resource<Client> {
        return try {
            val response = apiService.createClient(request)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to create client", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun updateClient(id: Int, request: ClientRequest): Resource<Client> {
        return try {
            val response = apiService.updateClient(id, request)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to update client", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun deleteClient(id: Int): Resource<Unit> {
        return try {
            val response = apiService.deleteClient(id)
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Failed to delete client", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }
}
