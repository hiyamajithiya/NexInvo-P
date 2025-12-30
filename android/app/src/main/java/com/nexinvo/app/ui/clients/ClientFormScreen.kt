package com.nexinvo.app.ui.clients

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
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nexinvo.app.data.model.IndianStates
import com.nexinvo.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientFormScreen(
    clientId: Int?,
    onNavigateBack: () -> Unit,
    onClientSaved: () -> Unit,
    viewModel: ClientFormViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isEditing = clientId != null

    LaunchedEffect(clientId) {
        if (clientId != null) {
            viewModel.loadClient(clientId)
        }
    }

    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            onClientSaved()
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
                title = { Text(if (isEditing) "Edit Client" else "New Client") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.saveClient() },
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
                // Basic Information
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Basic Information",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = uiState.name,
                            onValueChange = { viewModel.updateName(it) },
                            label = { Text("Client Name *") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            isError = uiState.nameError != null,
                            supportingText = uiState.nameError?.let { { Text(it) } },
                            leadingIcon = {
                                Icon(Icons.Default.Person, contentDescription = null)
                            }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = uiState.email,
                            onValueChange = { viewModel.updateEmail(it) },
                            label = { Text("Email") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            isError = uiState.emailError != null,
                            supportingText = uiState.emailError?.let { { Text(it) } },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            leadingIcon = {
                                Icon(Icons.Default.Email, contentDescription = null)
                            }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = uiState.phone,
                                onValueChange = { viewModel.updatePhone(it) },
                                label = { Text("Phone") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                leadingIcon = {
                                    Icon(Icons.Default.Phone, contentDescription = null)
                                }
                            )

                            OutlinedTextField(
                                value = uiState.mobile,
                                onValueChange = { viewModel.updateMobile(it) },
                                label = { Text("Mobile") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                            )
                        }
                    }
                }

                // Address Information
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Address",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = uiState.address,
                            onValueChange = { viewModel.updateAddress(it) },
                            label = { Text("Street Address") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 3,
                            leadingIcon = {
                                Icon(Icons.Default.LocationOn, contentDescription = null)
                            }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = uiState.city,
                                onValueChange = { viewModel.updateCity(it) },
                                label = { Text("City") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )

                            OutlinedTextField(
                                value = uiState.pinCode,
                                onValueChange = { viewModel.updatePinCode(it) },
                                label = { Text("PIN Code") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        StateDropdown(
                            selectedState = uiState.state,
                            onStateSelected = { viewModel.updateState(it) }
                        )
                    }
                }

                // Tax Information
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Tax Information",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = uiState.gstin,
                            onValueChange = { viewModel.updateGstin(it) },
                            label = { Text("GSTIN") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            isError = uiState.gstinError != null,
                            supportingText = uiState.gstinError?.let { { Text(it) } }
                                ?: { Text("15-character GST Identification Number") },
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.Characters
                            ),
                            placeholder = { Text("22AAAAA0000A1Z5") }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = uiState.pan,
                            onValueChange = { viewModel.updatePan(it) },
                            label = { Text("PAN") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            isError = uiState.panError != null,
                            supportingText = uiState.panError?.let { { Text(it) } }
                                ?: { Text("10-character Permanent Account Number") },
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.Characters
                            ),
                            placeholder = { Text("AAAAA0000A") }
                        )
                    }
                }

                // Additional Information
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Additional Information",
                            style = MaterialTheme.typography.labelLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        DateField(
                            label = "Date of Birth (Individual)",
                            value = uiState.dateOfBirth,
                            onDateSelected = { viewModel.updateDateOfBirth(it) }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        DateField(
                            label = "Date of Incorporation (Company)",
                            value = uiState.dateOfIncorporation,
                            onDateSelected = { viewModel.updateDateOfIncorporation(it) }
                        )
                    }
                }

                // Save Button
                Button(
                    onClick = { viewModel.saveClient() },
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
                    Text(if (isEditing) "Update Client" else "Create Client")
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StateDropdown(
    selectedState: String,
    onStateSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = selectedState,
            onValueChange = {},
            readOnly = true,
            label = { Text("State") },
            placeholder = { Text("Select state") },
            trailingIcon = {
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor()
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            IndianStates.states.forEach { (code, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = {
                        onStateSelected(name)
                        expanded = false
                    },
                    leadingIcon = {
                        Text(
                            text = code,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                )
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
            Row {
                if (value.isNotBlank()) {
                    IconButton(onClick = { onDateSelected("") }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                    }
                }
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
            }
        },
        modifier = Modifier.fillMaxWidth()
    )
}
