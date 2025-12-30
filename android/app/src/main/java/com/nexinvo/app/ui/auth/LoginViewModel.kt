package com.nexinvo.app.ui.auth

import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.model.LoginResponse
import com.nexinvo.app.data.repository.AuthRepository
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val isLoading: Boolean = false,
    val email: String = "",
    val password: String = "",
    val emailError: String? = null,
    val passwordError: String? = null,
    val loginError: String? = null,
    val isSuccess: Boolean = false,
    val showForceLoginDialog: Boolean = false,
    val otherDeviceInfo: String? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    val isLoggedIn: Flow<Boolean> = authRepository.isLoggedIn

    fun updateEmail(email: String) {
        _uiState.update {
            it.copy(
                email = email,
                emailError = null,
                loginError = null
            )
        }
    }

    fun updatePassword(password: String) {
        _uiState.update {
            it.copy(
                password = password,
                passwordError = null,
                loginError = null
            )
        }
    }

    fun login(forceLogin: Boolean = false) {
        val state = _uiState.value

        // Validate
        var hasError = false
        var emailError: String? = null
        var passwordError: String? = null

        if (state.email.isBlank()) {
            emailError = "Email is required"
            hasError = true
        } else if (!android.util.Patterns.EMAIL_ADDRESS.matcher(state.email).matches()) {
            emailError = "Invalid email format"
            hasError = true
        }

        if (state.password.isBlank()) {
            passwordError = "Password is required"
            hasError = true
        } else if (state.password.length < 6) {
            passwordError = "Password must be at least 6 characters"
            hasError = true
        }

        if (hasError) {
            _uiState.update {
                it.copy(
                    emailError = emailError,
                    passwordError = passwordError
                )
            }
            return
        }

        // Get device info
        val deviceInfo = "${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE})"

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, loginError = null, showForceLoginDialog = false) }

            when (val result = authRepository.login(
                email = state.email,
                password = state.password,
                forceLogin = forceLogin,
                deviceInfo = deviceInfo
            )) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isSuccess = true
                        )
                    }
                }
                is Resource.Error -> {
                    if (result.code == 409) {
                        // Already logged in on another device
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                showForceLoginDialog = true,
                                otherDeviceInfo = result.message
                            )
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                loginError = result.message
                            )
                        }
                    }
                }
                is Resource.Loading -> {
                    // Already set loading state above
                }
            }
        }
    }

    fun dismissForceLoginDialog() {
        _uiState.update {
            it.copy(showForceLoginDialog = false, otherDeviceInfo = null)
        }
    }

    fun forceLogin() {
        login(forceLogin = true)
    }

    fun clearError() {
        _uiState.update {
            it.copy(loginError = null)
        }
    }
}
