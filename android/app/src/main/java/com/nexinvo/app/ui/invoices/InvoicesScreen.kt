package com.nexinvo.app.ui.invoices

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nexinvo.app.data.model.Invoice
import com.nexinvo.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoicesScreen(
    onNavigateToDetail: (Int) -> Unit,
    onNavigateToForm: (Int?) -> Unit,
    viewModel: InvoicesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale("en", "IN")) }

    LaunchedEffect(Unit) {
        viewModel.loadInvoices()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoices") },
                actions = {
                    IconButton(onClick = { viewModel.loadInvoices() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { onNavigateToForm(null) }) {
                Icon(Icons.Default.Add, contentDescription = "Add Invoice")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Bar
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = { viewModel.updateSearch(it) },
                placeholder = { Text("Search invoices...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (uiState.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.updateSearch("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = uiState.statusFilter == null,
                    onClick = { viewModel.updateStatusFilter(null) },
                    label = { Text("All") }
                )
                FilterChip(
                    selected = uiState.statusFilter == "draft",
                    onClick = { viewModel.updateStatusFilter("draft") },
                    label = { Text("Draft") }
                )
                FilterChip(
                    selected = uiState.statusFilter == "sent",
                    onClick = { viewModel.updateStatusFilter("sent") },
                    label = { Text("Sent") }
                )
                FilterChip(
                    selected = uiState.statusFilter == "paid",
                    onClick = { viewModel.updateStatusFilter("paid") },
                    label = { Text("Paid") }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                uiState.error != null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(uiState.error!!, color = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { viewModel.loadInvoices() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                uiState.invoices.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.Receipt,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "No invoices found",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { onNavigateToForm(null) }) {
                                Text("Create Invoice")
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.invoices) { invoice ->
                            InvoiceCard(
                                invoice = invoice,
                                currencyFormat = currencyFormat,
                                onClick = { onNavigateToDetail(invoice.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InvoiceCard(
    invoice: Invoice,
    currencyFormat: NumberFormat,
    onClick: () -> Unit
) {
    val statusColor = when (invoice.status) {
        "draft" -> StatusDraft
        "sent" -> StatusSent
        "paid" -> StatusPaid
        "cancelled" -> StatusCancelled
        else -> StatusDraft
    }

    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = invoice.invoiceNumber,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = invoice.client?.name ?: "Unknown Client",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = statusColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = invoice.status.replaceFirstChar { it.uppercase() },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = statusColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Date",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = invoice.invoiceDate,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Amount",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = currencyFormat.format(invoice.totalAmount.toDoubleOrNull() ?: 0.0),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
            }
        }
    }
}
