package com.nexinvo.app.data.model

import com.google.gson.annotations.SerializedName

// Login Request
data class LoginRequest(
    val email: String,
    val password: String,
    @SerializedName("force_login")
    val forceLogin: Boolean = false,
    @SerializedName("device_info")
    val deviceInfo: String? = null
)

// Login Response
data class LoginResponse(
    val access: String,
    val refresh: String,
    @SerializedName("session_token")
    val sessionToken: String?,
    @SerializedName("user_id")
    val userId: Int?,
    val email: String?,
    val name: String?,
    @SerializedName("is_superuser")
    val isSuperuser: Boolean?,
    @SerializedName("organization_id")
    val organizationId: String?,
    @SerializedName("organization_name")
    val organizationName: String?,
    val role: String?
)

// Token Refresh Request
data class RefreshTokenRequest(
    val refresh: String
)

// Token Refresh Response
data class RefreshTokenResponse(
    val access: String,
    val refresh: String?
)

// OTP Request
data class SendOtpRequest(
    val email: String
)

// OTP Response
data class SendOtpResponse(
    val message: String,
    val email: String
)

// Verify OTP Request
data class VerifyOtpRequest(
    val email: String,
    val otp: String
)

// Verify OTP Response
data class VerifyOtpResponse(
    val message: String,
    val verified: Boolean
)

// Register Request
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String,
    @SerializedName("organization_name")
    val organizationName: String,
    val otp: String
)

// Register Response
data class RegisterResponse(
    val message: String,
    @SerializedName("user_id")
    val userId: Int,
    val email: String
)

// User Profile
data class UserProfile(
    val id: Int,
    val email: String,
    val name: String,
    @SerializedName("is_superuser")
    val isSuperuser: Boolean,
    @SerializedName("date_joined")
    val dateJoined: String?,
    val organizations: List<OrganizationMembership>?
)

// Organization Membership
data class OrganizationMembership(
    val id: String,
    @SerializedName("organization_id")
    val organizationId: String,
    @SerializedName("organization_name")
    val organizationName: String,
    val role: String,
    @SerializedName("is_active")
    val isActive: Boolean
)

// Error Response
data class ErrorResponse(
    val error: String?,
    val detail: String?,
    val message: String?,
    @SerializedName("device_info")
    val deviceInfo: String?,
    @SerializedName("last_activity")
    val lastActivity: String?
)

// Already Logged In Error (409)
data class AlreadyLoggedInError(
    val error: String,
    val detail: String,
    @SerializedName("device_info")
    val deviceInfo: String?,
    @SerializedName("last_activity")
    val lastActivity: String?
)
