package com.nexinvo.app.ui.invoices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.data.model.Invoice
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InvoicesUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val invoices: List<Invoice> = emptyList(),
    val searchQuery: String = "",
    val statusFilter: String? = null
)

@HiltViewModel
class InvoicesViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(InvoicesUiState())
    val uiState: StateFlow<InvoicesUiState> = _uiState.asStateFlow()

    fun loadInvoices() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val response = apiService.getInvoices(
                    status = _uiState.value.statusFilter,
                    search = _uiState.value.searchQuery.takeIf { it.isNotEmpty() }
                )

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            invoices = response.body()?.results ?: emptyList()
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Failed to load invoices"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Network error"
                    )
                }
            }
        }
    }

    fun updateSearch(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        loadInvoices()
    }

    fun updateStatusFilter(status: String?) {
        _uiState.update { it.copy(statusFilter = status) }
        loadInvoices()
    }
}
