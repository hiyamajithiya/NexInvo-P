package com.nexinvo.app.ui.clients

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.model.*
import com.nexinvo.app.data.repository.ClientRepository
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClientFormUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,

    // Form fields
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val mobile: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val pinCode: String = "",
    val gstin: String = "",
    val pan: String = "",
    val dateOfBirth: String = "",
    val dateOfIncorporation: String = "",

    // Validation errors
    val nameError: String? = null,
    val emailError: String? = null,
    val gstinError: String? = null,
    val panError: String? = null,

    // Existing client (for edit mode)
    val existingClient: Client? = null
)

@HiltViewModel
class ClientFormViewModel @Inject constructor(
    private val clientRepository: ClientRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientFormUiState())
    val uiState: StateFlow<ClientFormUiState> = _uiState.asStateFlow()

    fun loadClient(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = clientRepository.getClient(id)) {
                is Resource.Success -> {
                    val client = result.data
                    if (client != null) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                existingClient = client,
                                name = client.name,
                                email = client.email ?: "",
                                phone = client.phone ?: "",
                                mobile = client.mobile ?: "",
                                address = client.address ?: "",
                                city = client.city ?: "",
                                state = client.state ?: "",
                                pinCode = client.pinCode ?: "",
                                gstin = client.gstin ?: "",
                                pan = client.pan ?: "",
                                dateOfBirth = client.dateOfBirth ?: "",
                                dateOfIncorporation = client.dateOfIncorporation ?: ""
                            )
                        }
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun updateName(value: String) {
        _uiState.update { it.copy(name = value, nameError = null) }
    }

    fun updateEmail(value: String) {
        _uiState.update { it.copy(email = value, emailError = null) }
    }

    fun updatePhone(value: String) {
        _uiState.update { it.copy(phone = value) }
    }

    fun updateMobile(value: String) {
        _uiState.update { it.copy(mobile = value) }
    }

    fun updateAddress(value: String) {
        _uiState.update { it.copy(address = value) }
    }

    fun updateCity(value: String) {
        _uiState.update { it.copy(city = value) }
    }

    fun updateState(value: String) {
        _uiState.update { it.copy(state = value) }
    }

    fun updatePinCode(value: String) {
        if (value.length <= 6 && value.all { it.isDigit() }) {
            _uiState.update { it.copy(pinCode = value) }
        }
    }

    fun updateGstin(value: String) {
        if (value.length <= 15) {
            _uiState.update { it.copy(gstin = value.uppercase(), gstinError = null) }
        }
    }

    fun updatePan(value: String) {
        if (value.length <= 10) {
            _uiState.update { it.copy(pan = value.uppercase(), panError = null) }
        }
    }

    fun updateDateOfBirth(value: String) {
        _uiState.update { it.copy(dateOfBirth = value) }
    }

    fun updateDateOfIncorporation(value: String) {
        _uiState.update { it.copy(dateOfIncorporation = value) }
    }

    private fun validateForm(): Boolean {
        var isValid = true
        val state = _uiState.value

        // Validate name
        if (state.name.isBlank()) {
            _uiState.update { it.copy(nameError = "Name is required") }
            isValid = false
        }

        // Validate email format
        if (state.email.isNotBlank() && !android.util.Patterns.EMAIL_ADDRESS.matcher(state.email).matches()) {
            _uiState.update { it.copy(emailError = "Invalid email format") }
            isValid = false
        }

        // Validate GSTIN format (15 characters)
        if (state.gstin.isNotBlank()) {
            val gstinRegex = Regex("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
            if (!gstinRegex.matches(state.gstin)) {
                _uiState.update { it.copy(gstinError = "Invalid GSTIN format") }
                isValid = false
            }
        }

        // Validate PAN format (10 characters)
        if (state.pan.isNotBlank()) {
            val panRegex = Regex("^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
            if (!panRegex.matches(state.pan)) {
                _uiState.update { it.copy(panError = "Invalid PAN format") }
                isValid = false
            }
        }

        return isValid
    }

    fun saveClient() {
        if (!validateForm()) return

        val state = _uiState.value

        val request = ClientRequest(
            name = state.name,
            email = state.email.ifBlank { null },
            phone = state.phone.ifBlank { null },
            mobile = state.mobile.ifBlank { null },
            address = state.address.ifBlank { null },
            city = state.city.ifBlank { null },
            state = state.state.ifBlank { null },
            pinCode = state.pinCode.ifBlank { null },
            gstin = state.gstin.ifBlank { null },
            pan = state.pan.ifBlank { null },
            dateOfBirth = state.dateOfBirth.ifBlank { null },
            dateOfIncorporation = state.dateOfIncorporation.ifBlank { null }
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val result = if (state.existingClient != null) {
                clientRepository.updateClient(state.existingClient.id, request)
            } else {
                clientRepository.createClient(request)
            }

            when (result) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saveSuccess = true
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = result.message
                        )
                    }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
