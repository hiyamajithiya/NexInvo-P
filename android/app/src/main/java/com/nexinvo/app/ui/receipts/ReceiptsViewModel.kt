package com.nexinvo.app.ui.receipts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.model.Receipt
import com.nexinvo.app.data.repository.ReceiptRepository
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReceiptsUiState(
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val error: String? = null,
    val receipts: List<Receipt> = emptyList(),
    val searchQuery: String = "",
    val currentPage: Int = 1,
    val hasMorePages: Boolean = true,
    val totalCount: Int = 0
)

@HiltViewModel
class ReceiptsViewModel @Inject constructor(
    private val receiptRepository: ReceiptRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReceiptsUiState())
    val uiState: StateFlow<ReceiptsUiState> = _uiState.asStateFlow()

    init {
        loadReceipts()
    }

    fun loadReceipts(resetPage: Boolean = true) {
        viewModelScope.launch {
            if (resetPage) {
                _uiState.update { it.copy(isLoading = true, error = null, currentPage = 1) }
            } else {
                _uiState.update { it.copy(isLoadingMore = true) }
            }

            val page = if (resetPage) 1 else _uiState.value.currentPage
            val search = _uiState.value.searchQuery.ifBlank { null }

            when (val result = receiptRepository.getReceipts(page = page, search = search)) {
                is Resource.Success -> {
                    val response = result.data
                    _uiState.update { state ->
                        state.copy(
                            isLoading = false,
                            isLoadingMore = false,
                            receipts = if (resetPage) {
                                response?.results ?: emptyList()
                            } else {
                                state.receipts + (response?.results ?: emptyList())
                            },
                            hasMorePages = response?.next != null,
                            currentPage = page,
                            totalCount = response?.count ?: 0
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLoadingMore = false,
                            error = result.message
                        )
                    }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun loadMore() {
        val state = _uiState.value
        if (!state.isLoading && !state.isLoadingMore && state.hasMorePages) {
            _uiState.update { it.copy(currentPage = it.currentPage + 1) }
            loadReceipts(resetPage = false)
        }
    }

    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun search() {
        loadReceipts(resetPage = true)
    }

    fun clearSearch() {
        _uiState.update { it.copy(searchQuery = "") }
        loadReceipts(resetPage = true)
    }

    fun refresh() {
        loadReceipts(resetPage = true)
    }
}
