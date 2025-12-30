package com.nexinvo.app.data.api

import com.nexinvo.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ==================== Authentication ====================

    @POST("token/")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("token/refresh/")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @POST("send-otp/")
    suspend fun sendOtp(@Body request: SendOtpRequest): Response<SendOtpResponse>

    @POST("verify-otp/")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<VerifyOtpResponse>

    @POST("register/")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>

    @GET("profile/")
    suspend fun getProfile(): Response<UserProfile>

    @PUT("profile/")
    suspend fun updateProfile(@Body profile: UserProfile): Response<UserProfile>

    // ==================== Dashboard ====================

    @GET("dashboard/stats/")
    suspend fun getDashboardStats(): Response<DashboardStats>

    // ==================== Invoices ====================

    @GET("invoices/")
    suspend fun getInvoices(
        @Query("page") page: Int = 1,
        @Query("status") status: String? = null,
        @Query("invoice_type") invoiceType: String? = null,
        @Query("client") clientId: Int? = null,
        @Query("search") search: String? = null,
        @Query("date_from") dateFrom: String? = null,
        @Query("date_to") dateTo: String? = null
    ): Response<InvoiceListResponse>

    @GET("invoices/{id}/")
    suspend fun getInvoice(@Path("id") id: Int): Response<Invoice>

    @POST("invoices/")
    suspend fun createInvoice(@Body request: InvoiceRequest): Response<Invoice>

    @PUT("invoices/{id}/")
    suspend fun updateInvoice(
        @Path("id") id: Int,
        @Body request: InvoiceRequest
    ): Response<Invoice>

    @DELETE("invoices/{id}/")
    suspend fun deleteInvoice(@Path("id") id: Int): Response<Unit>

    @POST("invoices/{id}/send_email/")
    suspend fun sendInvoiceEmail(@Path("id") id: Int): Response<Map<String, Any>>

    @GET("invoices/{id}/pdf/")
    suspend fun getInvoicePdf(@Path("id") id: Int): Response<okhttp3.ResponseBody>

    // ==================== Clients ====================

    @GET("clients/")
    suspend fun getClients(
        @Query("page") page: Int = 1,
        @Query("search") search: String? = null
    ): Response<ClientListResponse>

    @GET("clients/{id}/")
    suspend fun getClient(@Path("id") id: Int): Response<Client>

    @POST("clients/")
    suspend fun createClient(@Body request: ClientRequest): Response<Client>

    @PUT("clients/{id}/")
    suspend fun updateClient(
        @Path("id") id: Int,
        @Body request: ClientRequest
    ): Response<Client>

    @DELETE("clients/{id}/")
    suspend fun deleteClient(@Path("id") id: Int): Response<Unit>

    // ==================== Receipts ====================

    @GET("receipts/")
    suspend fun getReceipts(
        @Query("page") page: Int = 1,
        @Query("search") search: String? = null
    ): Response<ReceiptListResponse>

    @GET("receipts/{id}/")
    suspend fun getReceipt(@Path("id") id: Int): Response<Receipt>

    @GET("receipts/{id}/pdf/")
    suspend fun getReceiptPdf(@Path("id") id: Int): Response<okhttp3.ResponseBody>

    // ==================== Payments ====================

    @POST("payments/")
    suspend fun recordPayment(@Body request: Map<String, Any>): Response<Map<String, Any>>
}
