package com.nexinvo.app.data.repository

import com.google.gson.Gson
import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.data.local.AuthPreferences
import com.nexinvo.app.data.model.*
import com.nexinvo.app.utils.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val authPreferences: AuthPreferences
) {
    val isLoggedIn: Flow<Boolean> = authPreferences.isLoggedIn
    val userInfo = authPreferences.userInfo

    suspend fun login(
        email: String,
        password: String,
        forceLogin: Boolean = false,
        deviceInfo: String? = null
    ): Resource<LoginResponse> {
        return try {
            val request = LoginRequest(
                email = email,
                password = password,
                forceLogin = forceLogin,
                deviceInfo = deviceInfo
            )
            val response = apiService.login(request)

            when {
                response.isSuccessful -> {
                    val body = response.body()!!

                    // Save tokens
                    authPreferences.saveTokens(
                        accessToken = body.access,
                        refreshToken = body.refresh,
                        sessionToken = body.sessionToken
                    )

                    // Save user info
                    authPreferences.saveUserInfo(
                        userId = body.userId,
                        email = body.email,
                        name = body.name,
                        isSuperuser = body.isSuperuser,
                        organizationId = body.organizationId,
                        organizationName = body.organizationName,
                        role = body.role
                    )

                    Resource.Success(body)
                }
                response.code() == 409 -> {
                    // Already logged in on another device
                    val errorBody = response.errorBody()?.string()
                    val error = Gson().fromJson(errorBody, AlreadyLoggedInError::class.java)
                    Resource.Error(
                        message = error.detail,
                        code = 409,
                        data = null
                    )
                }
                response.code() == 401 -> {
                    Resource.Error("Invalid email or password", code = 401)
                }
                response.code() == 403 -> {
                    val errorBody = response.errorBody()?.string()
                    val error = Gson().fromJson(errorBody, ErrorResponse::class.java)
                    Resource.Error(error.detail ?: "Subscription expired", code = 403)
                }
                else -> {
                    val errorBody = response.errorBody()?.string()
                    val error = try {
                        Gson().fromJson(errorBody, ErrorResponse::class.java)
                    } catch (e: Exception) {
                        null
                    }
                    Resource.Error(
                        error?.detail ?: error?.error ?: "Login failed",
                        code = response.code()
                    )
                }
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun refreshToken(): Resource<RefreshTokenResponse> {
        return try {
            val refreshToken = authPreferences.refreshToken.first()
                ?: return Resource.Error("No refresh token")

            val response = apiService.refreshToken(RefreshTokenRequest(refreshToken))

            if (response.isSuccessful) {
                val body = response.body()!!
                authPreferences.updateAccessToken(body.access)
                body.refresh?.let {
                    authPreferences.saveTokens(
                        accessToken = body.access,
                        refreshToken = it,
                        sessionToken = null
                    )
                }
                Resource.Success(body)
            } else {
                Resource.Error("Token refresh failed", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun sendOtp(email: String): Resource<SendOtpResponse> {
        return try {
            val response = apiService.sendOtp(SendOtpRequest(email))
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                val error = try {
                    Gson().fromJson(errorBody, ErrorResponse::class.java)
                } catch (e: Exception) {
                    null
                }
                Resource.Error(error?.detail ?: error?.error ?: "Failed to send OTP")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun verifyOtp(email: String, otp: String): Resource<VerifyOtpResponse> {
        return try {
            val response = apiService.verifyOtp(VerifyOtpRequest(email, otp))
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Invalid OTP")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun register(
        email: String,
        password: String,
        name: String,
        organizationName: String,
        otp: String
    ): Resource<RegisterResponse> {
        return try {
            val request = RegisterRequest(
                email = email,
                password = password,
                name = name,
                organizationName = organizationName,
                otp = otp
            )
            val response = apiService.register(request)
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                val error = try {
                    Gson().fromJson(errorBody, ErrorResponse::class.java)
                } catch (e: Exception) {
                    null
                }
                Resource.Error(error?.detail ?: error?.error ?: "Registration failed")
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun getProfile(): Resource<UserProfile> {
        return try {
            val response = apiService.getProfile()
            if (response.isSuccessful) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Failed to get profile", code = response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    suspend fun logout() {
        authPreferences.clearAll()
    }

    suspend fun setOrganization(organizationId: String, organizationName: String) {
        authPreferences.setOrganization(organizationId, organizationName)
    }
}
