package com.nexinvo.app.data.model

import com.google.gson.annotations.SerializedName

// Client
data class Client(
    val id: Int,
    val name: String,
    val code: String?,
    val email: String?,
    val phone: String?,
    val mobile: String?,
    val address: String?,
    val city: String?,
    val state: String?,
    @SerializedName("pinCode")
    val pinCode: String?,
    @SerializedName("stateCode")
    val stateCode: String?,
    val gstin: String?,
    val pan: String?,
    @SerializedName("date_of_birth")
    val dateOfBirth: String?,
    @SerializedName("date_of_incorporation")
    val dateOfIncorporation: String?,
    @SerializedName("created_at")
    val createdAt: String?,
    @SerializedName("updated_at")
    val updatedAt: String?
)

// Create/Update Client Request
data class ClientRequest(
    val name: String,
    val email: String?,
    val phone: String?,
    val mobile: String?,
    val address: String?,
    val city: String?,
    val state: String?,
    @SerializedName("pinCode")
    val pinCode: String?,
    val gstin: String?,
    val pan: String?,
    @SerializedName("date_of_birth")
    val dateOfBirth: String?,
    @SerializedName("date_of_incorporation")
    val dateOfIncorporation: String?
)

// Client List Response (Paginated)
data class ClientListResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<Client>
)

// Indian States
object IndianStates {
    val states = listOf(
        "01" to "Jammu and Kashmir",
        "02" to "Himachal Pradesh",
        "03" to "Punjab",
        "04" to "Chandigarh",
        "05" to "Uttarakhand",
        "06" to "Haryana",
        "07" to "Delhi",
        "08" to "Rajasthan",
        "09" to "Uttar Pradesh",
        "10" to "Bihar",
        "11" to "Sikkim",
        "12" to "Arunachal Pradesh",
        "13" to "Nagaland",
        "14" to "Manipur",
        "15" to "Mizoram",
        "16" to "Tripura",
        "17" to "Meghalaya",
        "18" to "Assam",
        "19" to "West Bengal",
        "20" to "Jharkhand",
        "21" to "Odisha",
        "22" to "Chhattisgarh",
        "23" to "Madhya Pradesh",
        "24" to "Gujarat",
        "26" to "Dadra and Nagar Haveli and Daman and Diu",
        "27" to "Maharashtra",
        "28" to "Andhra Pradesh (Old)",
        "29" to "Karnataka",
        "30" to "Goa",
        "31" to "Lakshadweep",
        "32" to "Kerala",
        "33" to "Tamil Nadu",
        "34" to "Puducherry",
        "35" to "Andaman and Nicobar Islands",
        "36" to "Telangana",
        "37" to "Andhra Pradesh",
        "38" to "Ladakh"
    )

    fun getStateName(code: String): String? {
        return states.find { it.first == code }?.second
    }

    fun getStateCode(name: String): String? {
        return states.find { it.second.equals(name, ignoreCase = true) }?.first
    }
}
