package com.nexinvo.app.ui.invoices

import android.app.DatePickerDialog
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nexinvo.app.data.model.Client
import com.nexinvo.app.ui.theme.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceFormScreen(
    invoiceId: Int?,
    onNavigateBack: () -> Unit,
    onInvoiceSaved: () -> Unit,
    viewModel: InvoiceFormViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isEditing = invoiceId != null
    val context = LocalContext.current
    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }

    LaunchedEffect(invoiceId) {
        if (invoiceId != null) {
            viewModel.loadInvoice(invoiceId)
        }
    }

    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            onInvoiceSaved()
        }
    }

    // Error Snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(if (isEditing) "Edit Invoice" else "New Invoice") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.saveInvoice() },
                        enabled = !uiState.isSaving
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Save", color = Primary)
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Invoice Type Selection
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Invoice Type",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = uiState.invoiceType == "proforma",
                                onClick = { viewModel.updateInvoiceType("proforma") },
                                label = { Text("Proforma") },
                                modifier = Modifier.weight(1f)
                            )
                            FilterChip(
                                selected = uiState.invoiceType == "tax",
                                onClick = { viewModel.updateInvoiceType("tax") },
                                label = { Text("Tax Invoice") },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Client Selection
                ClientDropdown(
                    clients = uiState.clients,
                    selectedClient = uiState.selectedClient,
                    isLoading = uiState.isLoadingClients,
                    onClientSelected = { viewModel.updateSelectedClient(it) }
                )

                // Dates
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Dates",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        DateField(
                            label = "Invoice Date *",
                            value = uiState.invoiceDate,
                            onDateSelected = { viewModel.updateInvoiceDate(it) }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        DateField(
                            label = "Due Date",
                            value = uiState.dueDate,
                            onDateSelected = { viewModel.updateDueDate(it) }
                        )
                    }
                }

                // Items
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Items",
                                style = MaterialTheme.typography.labelLarge,
                                color = Primary
                            )
                            TextButton(onClick = { viewModel.addItem() }) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Add Item")
                            }
                        }

                        uiState.items.forEachIndexed { index, item ->
                            if (index > 0) {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            }

                            InvoiceItemForm(
                                item = item,
                                index = index,
                                canRemove = uiState.items.size > 1,
                                onDescriptionChange = { viewModel.updateItem(item.id, description = it) },
                                onHsnSacChange = { viewModel.updateItem(item.id, hsnSac = it) },
                                onGstRateChange = { viewModel.updateItem(item.id, gstRate = it) },
                                onTaxableAmountChange = { viewModel.updateItem(item.id, taxableAmount = it) },
                                onRemove = { viewModel.removeItem(item.id) }
                            )
                        }
                    }
                }

                // Summary
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Summary",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        SummaryRow("Subtotal", currencyFormat.format(viewModel.calculateSubtotal()))
                        SummaryRow("GST", currencyFormat.format(viewModel.calculateTax()))
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        SummaryRow(
                            "Total",
                            currencyFormat.format(viewModel.calculateTotal()),
                            isBold = true
                        )
                    }
                }

                // Additional Fields
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Additional Information",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = uiState.paymentTerms,
                            onValueChange = { viewModel.updatePaymentTerms(it) },
                            label = { Text("Payment Terms") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = uiState.notes,
                            onValueChange = { viewModel.updateNotes(it) },
                            label = { Text("Notes") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3,
                            maxLines = 5
                        )
                    }
                }

                // Save Button
                Button(
                    onClick = { viewModel.saveInvoice() },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isSaving
                ) {
                    if (uiState.isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (isEditing) "Update Invoice" else "Create Invoice")
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClientDropdown(
    clients: List<Client>,
    selectedClient: Client?,
    isLoading: Boolean,
    onClientSelected: (Client?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Client *",
                style = MaterialTheme.typography.labelLarge,
                color = Primary
            )
            Spacer(modifier = Modifier.height(8.dp))

            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = selectedClient?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    placeholder = { Text("Select a client") },
                    trailingIcon = {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )

                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    clients.forEach { client ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(client.name)
                                    client.email?.let {
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            },
                            onClick = {
                                onClientSelected(client)
                                expanded = false
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DateField(
    label: String,
    value: String,
    onDateSelected: (String) -> Unit
) {
    val context = LocalContext.current
    val calendar = remember { Calendar.getInstance() }

    // Parse existing value
    LaunchedEffect(value) {
        if (value.isNotBlank()) {
            try {
                val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(value)
                date?.let { calendar.time = it }
            } catch (e: Exception) { }
        }
    }

    OutlinedTextField(
        value = value,
        onValueChange = {},
        label = { Text(label) },
        readOnly = true,
        trailingIcon = {
            IconButton(
                onClick = {
                    DatePickerDialog(
                        context,
                        { _, year, month, day ->
                            val formatted = String.format("%04d-%02d-%02d", year, month + 1, day)
                            onDateSelected(formatted)
                        },
                        calendar.get(Calendar.YEAR),
                        calendar.get(Calendar.MONTH),
                        calendar.get(Calendar.DAY_OF_MONTH)
                    ).show()
                }
            ) {
                Icon(Icons.Default.CalendarToday, contentDescription = "Select date")
            }
        },
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun InvoiceItemForm(
    item: InvoiceFormItem,
    index: Int,
    canRemove: Boolean,
    onDescriptionChange: (String) -> Unit,
    onHsnSacChange: (String) -> Unit,
    onGstRateChange: (String) -> Unit,
    onTaxableAmountChange: (String) -> Unit,
    onRemove: () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Item ${index + 1}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium
            )
            if (canRemove) {
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Remove item",
                        tint = Error
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = item.description,
            onValueChange = onDescriptionChange,
            label = { Text("Description *") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = item.hsnSac,
                onValueChange = onHsnSacChange,
                label = { Text("HSN/SAC") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )

            OutlinedTextField(
                value = item.gstRate,
                onValueChange = { newValue ->
                    if (newValue.isEmpty() || newValue.matches(Regex("^\\d{0,2}$"))) {
                        onGstRateChange(newValue)
                    }
                },
                label = { Text("GST %") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = item.taxableAmount,
            onValueChange = { newValue ->
                if (newValue.isEmpty() || newValue.matches(Regex("^\\d*\\.?\\d{0,2}$"))) {
                    onTaxableAmountChange(newValue)
                }
            },
            label = { Text("Taxable Amount *") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            leadingIcon = { Text("₹") },
            singleLine = true
        )
    }
}

@Composable
private fun SummaryRow(
    label: String,
    value: String,
    isBold: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = if (isBold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            text = value,
            style = if (isBold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = if (isBold) Primary else MaterialTheme.colorScheme.onSurface
        )
    }
}
