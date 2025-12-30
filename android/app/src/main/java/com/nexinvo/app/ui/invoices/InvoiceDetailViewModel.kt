package com.nexinvo.app.ui.invoices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.model.Invoice
import com.nexinvo.app.data.repository.InvoiceRepository
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InvoiceDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val invoice: Invoice? = null,
    val isSendingEmail: Boolean = false,
    val emailSent: Boolean = false,
    val emailError: String? = null
)

@HiltViewModel
class InvoiceDetailViewModel @Inject constructor(
    private val invoiceRepository: InvoiceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InvoiceDetailUiState())
    val uiState: StateFlow<InvoiceDetailUiState> = _uiState.asStateFlow()

    fun loadInvoice(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = invoiceRepository.getInvoice(id)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            invoice = result.data
                        )
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

    fun sendEmail() {
        val invoice = _uiState.value.invoice ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isSendingEmail = true, emailError = null) }

            when (val result = invoiceRepository.sendInvoiceEmail(invoice.id)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isSendingEmail = false,
                            emailSent = true
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isSendingEmail = false,
                            emailError = result.message
                        )
                    }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun resetEmailStatus() {
        _uiState.update { it.copy(emailSent = false, emailError = null) }
    }
}
