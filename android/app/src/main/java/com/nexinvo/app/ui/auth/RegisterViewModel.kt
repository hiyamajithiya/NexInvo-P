package com.nexinvo.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.repository.AuthRepository
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RegisterUiState(
    val currentStep: Int = 1,
    val isLoading: Boolean = false,
    val email: String = "",
    val emailError: String? = null,
    val otp: String = "",
    val otpError: String? = null,
    val name: String = "",
    val nameError: String? = null,
    val organizationName: String = "",
    val organizationError: String? = null,
    val password: String = "",
    val passwordError: String? = null,
    val confirmPassword: String = "",
    val confirmPasswordError: String? = null,
    val error: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    fun updateEmail(email: String) {
        _uiState.update { it.copy(email = email, emailError = null, error = null) }
    }

    fun updateOtp(otp: String) {
        _uiState.update { it.copy(otp = otp, otpError = null, error = null) }
    }

    fun updateName(name: String) {
        _uiState.update { it.copy(name = name, nameError = null, error = null) }
    }

    fun updateOrganizationName(name: String) {
        _uiState.update { it.copy(organizationName = name, organizationError = null, error = null) }
    }

    fun updatePassword(password: String) {
        _uiState.update { it.copy(password = password, passwordError = null, error = null) }
    }

    fun updateConfirmPassword(password: String) {
        _uiState.update { it.copy(confirmPassword = password, confirmPasswordError = null, error = null) }
    }

    fun sendOtp() {
        val state = _uiState.value

        // Validate email
        if (state.email.isBlank()) {
            _uiState.update { it.copy(emailError = "Email is required") }
            return
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(state.email).matches()) {
            _uiState.update { it.copy(emailError = "Invalid email format") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = authRepository.sendOtp(state.email)) {
                is Resource.Success -> {
                    _uiState.update { it.copy(isLoading = false, currentStep = 2) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun verifyOtp() {
        val state = _uiState.value

        // Validate OTP
        if (state.otp.isBlank()) {
            _uiState.update { it.copy(otpError = "OTP is required") }
            return
        }
        if (state.otp.length != 6) {
            _uiState.update { it.copy(otpError = "OTP must be 6 digits") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = authRepository.verifyOtp(state.email, state.otp)) {
                is Resource.Success -> {
                    if (result.data?.verified == true) {
                        _uiState.update { it.copy(isLoading = false, currentStep = 3) }
                    } else {
                        _uiState.update { it.copy(isLoading = false, error = "Invalid OTP") }
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun register() {
        val state = _uiState.value
        var hasError = false

        // Validate name
        if (state.name.isBlank()) {
            _uiState.update { it.copy(nameError = "Name is required") }
            hasError = true
        }

        // Validate organization
        if (state.organizationName.isBlank()) {
            _uiState.update { it.copy(organizationError = "Organization name is required") }
            hasError = true
        }

        // Validate password
        if (state.password.isBlank()) {
            _uiState.update { it.copy(passwordError = "Password is required") }
            hasError = true
        } else if (state.password.length < 8) {
            _uiState.update { it.copy(passwordError = "Password must be at least 8 characters") }
            hasError = true
        }

        // Validate confirm password
        if (state.confirmPassword != state.password) {
            _uiState.update { it.copy(confirmPasswordError = "Passwords do not match") }
            hasError = true
        }

        if (hasError) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = authRepository.register(
                email = state.email,
                password = state.password,
                name = state.name,
                organizationName = state.organizationName,
                otp = state.otp
            )) {
                is Resource.Success -> {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                }
                is Resource.Loading -> {}
            }
        }
    }
}
