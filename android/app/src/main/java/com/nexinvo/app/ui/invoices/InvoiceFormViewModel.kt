package com.nexinvo.app.ui.invoices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.model.*
import com.nexinvo.app.data.repository.ClientRepository
import com.nexinvo.app.data.repository.InvoiceRepository
import com.nexinvo.app.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class InvoiceFormItem(
    val id: String = UUID.randomUUID().toString(),
    val description: String = "",
    val hsnSac: String = "",
    val gstRate: String = "18",
    val taxableAmount: String = ""
)

data class InvoiceFormUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,

    // Form fields
    val invoiceType: String = "proforma",
    val invoiceDate: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
    val dueDate: String = "",
    val selectedClientId: Int? = null,
    val selectedClient: Client? = null,
    val paymentTerms: String = "",
    val notes: String = "",
    val items: List<InvoiceFormItem> = listOf(InvoiceFormItem()),

    // Clients list for dropdown
    val clients: List<Client> = emptyList(),
    val isLoadingClients: Boolean = false,

    // Existing invoice (for edit mode)
    val existingInvoice: Invoice? = null
)

@HiltViewModel
class InvoiceFormViewModel @Inject constructor(
    private val invoiceRepository: InvoiceRepository,
    private val clientRepository: ClientRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InvoiceFormUiState())
    val uiState: StateFlow<InvoiceFormUiState> = _uiState.asStateFlow()

    init {
        loadClients()
    }

    private fun loadClients() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingClients = true) }

            when (val result = clientRepository.getClients(page = 1, search = null)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoadingClients = false,
                            clients = result.data?.results ?: emptyList()
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoadingClients = false) }
                }
                is Resource.Loading -> {}
            }
        }
    }

    fun loadInvoice(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = invoiceRepository.getInvoice(id)) {
                is Resource.Success -> {
                    val invoice = result.data
                    if (invoice != null) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                existingInvoice = invoice,
                                invoiceType = invoice.invoiceType,
                                invoiceDate = invoice.invoiceDate,
                                dueDate = invoice.dueDate ?: "",
                                selectedClientId = invoice.clientId,
                                selectedClient = invoice.client,
                                paymentTerms = invoice.paymentTerms ?: "",
                                notes = invoice.notes ?: "",
                                items = invoice.items?.map { item ->
                                    InvoiceFormItem(
                                        description = item.description,
                                        hsnSac = item.hsnSac ?: "",
                                        gstRate = item.gstRate,
                                        taxableAmount = item.taxableAmount
                                    )
                                } ?: listOf(InvoiceFormItem())
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

    fun updateInvoiceType(type: String) {
        _uiState.update { it.copy(invoiceType = type) }
    }

    fun updateInvoiceDate(date: String) {
        _uiState.update { it.copy(invoiceDate = date) }
    }

    fun updateDueDate(date: String) {
        _uiState.update { it.copy(dueDate = date) }
    }

    fun updateSelectedClient(client: Client?) {
        _uiState.update {
            it.copy(
                selectedClientId = client?.id,
                selectedClient = client
            )
        }
    }

    fun updatePaymentTerms(terms: String) {
        _uiState.update { it.copy(paymentTerms = terms) }
    }

    fun updateNotes(notes: String) {
        _uiState.update { it.copy(notes = notes) }
    }

    fun addItem() {
        _uiState.update {
            it.copy(items = it.items + InvoiceFormItem())
        }
    }

    fun removeItem(itemId: String) {
        _uiState.update { state ->
            val newItems = state.items.filter { it.id != itemId }
            state.copy(items = if (newItems.isEmpty()) listOf(InvoiceFormItem()) else newItems)
        }
    }

    fun updateItem(itemId: String, description: String? = null, hsnSac: String? = null,
                   gstRate: String? = null, taxableAmount: String? = null) {
        _uiState.update { state ->
            state.copy(
                items = state.items.map { item ->
                    if (item.id == itemId) {
                        item.copy(
                            description = description ?: item.description,
                            hsnSac = hsnSac ?: item.hsnSac,
                            gstRate = gstRate ?: item.gstRate,
                            taxableAmount = taxableAmount ?: item.taxableAmount
                        )
                    } else item
                }
            )
        }
    }

    fun calculateSubtotal(): Double {
        return _uiState.value.items.sumOf {
            it.taxableAmount.toDoubleOrNull() ?: 0.0
        }
    }

    fun calculateTax(): Double {
        return _uiState.value.items.sumOf { item ->
            val taxable = item.taxableAmount.toDoubleOrNull() ?: 0.0
            val rate = item.gstRate.toDoubleOrNull() ?: 0.0
            taxable * rate / 100
        }
    }

    fun calculateTotal(): Double {
        return calculateSubtotal() + calculateTax()
    }

    fun saveInvoice() {
        val state = _uiState.value

        // Validation
        if (state.selectedClientId == null) {
            _uiState.update { it.copy(error = "Please select a client") }
            return
        }

        if (state.items.all { it.description.isBlank() || it.taxableAmount.isBlank() }) {
            _uiState.update { it.copy(error = "Please add at least one item") }
            return
        }

        val request = InvoiceRequest(
            invoiceType = state.invoiceType,
            invoiceDate = state.invoiceDate,
            dueDate = state.dueDate.ifBlank { null },
            clientId = state.selectedClientId,
            items = state.items
                .filter { it.description.isNotBlank() && it.taxableAmount.isNotBlank() }
                .map { item ->
                    InvoiceItemRequest(
                        description = item.description,
                        hsnSac = item.hsnSac.ifBlank { null },
                        gstRate = item.gstRate,
                        taxableAmount = item.taxableAmount
                    )
                },
            paymentTerms = state.paymentTerms.ifBlank { null },
            notes = state.notes.ifBlank { null }
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val result = if (state.existingInvoice != null) {
                invoiceRepository.updateInvoice(state.existingInvoice.id, request)
            } else {
                invoiceRepository.createInvoice(request)
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
