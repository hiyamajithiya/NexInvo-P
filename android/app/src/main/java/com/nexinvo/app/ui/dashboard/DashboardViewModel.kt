package com.nexinvo.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val totalRevenue: Double = 0.0,
    val totalOutstanding: Double = 0.0,
    val totalPaid: Double = 0.0,
    val totalInvoices: Int = 0,
    val draftCount: Int = 0,
    val sentCount: Int = 0,
    val paidCount: Int = 0,
    val cancelledCount: Int = 0
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val response = apiService.getDashboardStats()

                if (response.isSuccessful) {
                    val stats = response.body()!!
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            totalRevenue = stats.totalRevenue.toDoubleOrNull() ?: 0.0,
                            totalOutstanding = stats.totalOutstanding.toDoubleOrNull() ?: 0.0,
                            totalPaid = stats.totalPaid.toDoubleOrNull() ?: 0.0,
                            totalInvoices = stats.invoiceCount.total,
                            draftCount = stats.invoiceCount.draft,
                            sentCount = stats.invoiceCount.sent,
                            paidCount = stats.invoiceCount.paid,
                            cancelledCount = stats.invoiceCount.cancelled
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Failed to load dashboard"
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
}
