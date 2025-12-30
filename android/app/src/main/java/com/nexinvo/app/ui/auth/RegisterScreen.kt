package com.nexinvo.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nexinvo.app.ui.theme.Primary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: RegisterViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    var passwordVisible by remember { mutableStateOf(false) }

    // Navigate on success
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onRegisterSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Account") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // Step Indicator
            Row(
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                StepIndicator(step = 1, currentStep = uiState.currentStep, label = "Email")
                Spacer(modifier = Modifier.width(8.dp))
                StepIndicator(step = 2, currentStep = uiState.currentStep, label = "Verify")
                Spacer(modifier = Modifier.width(8.dp))
                StepIndicator(step = 3, currentStep = uiState.currentStep, label = "Details")
            }

            Spacer(modifier = Modifier.height(32.dp))

            when (uiState.currentStep) {
                1 -> EmailStep(
                    email = uiState.email,
                    onEmailChange = { viewModel.updateEmail(it) },
                    emailError = uiState.emailError,
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    onSendOtp = { viewModel.sendOtp() }
                )
                2 -> OtpStep(
                    email = uiState.email,
                    otp = uiState.otp,
                    onOtpChange = { viewModel.updateOtp(it) },
                    otpError = uiState.otpError,
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    onVerifyOtp = { viewModel.verifyOtp() },
                    onResendOtp = { viewModel.sendOtp() }
                )
                3 -> DetailsStep(
                    name = uiState.name,
                    onNameChange = { viewModel.updateName(it) },
                    nameError = uiState.nameError,
                    organizationName = uiState.organizationName,
                    onOrganizationNameChange = { viewModel.updateOrganizationName(it) },
                    organizationError = uiState.organizationError,
                    password = uiState.password,
                    onPasswordChange = { viewModel.updatePassword(it) },
                    passwordError = uiState.passwordError,
                    confirmPassword = uiState.confirmPassword,
                    onConfirmPasswordChange = { viewModel.updateConfirmPassword(it) },
                    confirmPasswordError = uiState.confirmPasswordError,
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    onRegister = { viewModel.register() }
                )
            }
        }
    }
}

@Composable
private fun StepIndicator(step: Int, currentStep: Int, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier.size(32.dp),
            shape = MaterialTheme.shapes.extraLarge,
            color = if (step <= currentStep) Primary else MaterialTheme.colorScheme.surfaceVariant
        ) {
            Box(contentAlignment = Alignment.Center) {
                if (step < currentStep) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                } else {
                    Text(
                        text = step.toString(),
                        color = if (step == currentStep) MaterialTheme.colorScheme.onPrimary
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = if (step <= currentStep) Primary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EmailStep(
    email: String,
    onEmailChange: (String) -> Unit,
    emailError: String?,
    isLoading: Boolean,
    error: String?,
    onSendOtp: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    Text(
        text = "Enter your email",
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.SemiBold
    )

    Text(
        text = "We'll send you a verification code",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )

    Spacer(modifier = Modifier.height(32.dp))

    OutlinedTextField(
        value = email,
        onValueChange = onEmailChange,
        label = { Text("Email") },
        placeholder = { Text("Enter your email") },
        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
        isError = emailError != null,
        supportingText = emailError?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Done
        ),
        keyboardActions = KeyboardActions(
            onDone = {
                focusManager.clearFocus()
                onSendOtp()
            }
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )

    if (error != null) {
        Spacer(modifier = Modifier.height(16.dp))
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer
            )
        ) {
            Text(
                text = error,
                color = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.padding(12.dp)
            )
        }
    }

    Spacer(modifier = Modifier.height(32.dp))

    Button(
        onClick = onSendOtp,
        enabled = !isLoading,
        modifier = Modifier.fillMaxWidth().height(50.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Text("Send Verification Code")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OtpStep(
    email: String,
    otp: String,
    onOtpChange: (String) -> Unit,
    otpError: String?,
    isLoading: Boolean,
    error: String?,
    onVerifyOtp: () -> Unit,
    onResendOtp: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    Text(
        text = "Verify your email",
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.SemiBold
    )

    Text(
        text = "Enter the 6-digit code sent to\n$email",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(32.dp))

    OutlinedTextField(
        value = otp,
        onValueChange = { if (it.length <= 6) onOtpChange(it) },
        label = { Text("Verification Code") },
        placeholder = { Text("Enter 6-digit code") },
        leadingIcon = { Icon(Icons.Default.Pin, contentDescription = null) },
        isError = otpError != null,
        supportingText = otpError?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done
        ),
        keyboardActions = KeyboardActions(
            onDone = {
                focusManager.clearFocus()
                onVerifyOtp()
            }
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )

    if (error != null) {
        Spacer(modifier = Modifier.height(16.dp))
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer
            )
        ) {
            Text(
                text = error,
                color = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.padding(12.dp)
            )
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    TextButton(onClick = onResendOtp) {
        Text("Resend Code")
    }

    Spacer(modifier = Modifier.height(16.dp))

    Button(
        onClick = onVerifyOtp,
        enabled = !isLoading,
        modifier = Modifier.fillMaxWidth().height(50.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Text("Verify")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailsStep(
    name: String,
    onNameChange: (String) -> Unit,
    nameError: String?,
    organizationName: String,
    onOrganizationNameChange: (String) -> Unit,
    organizationError: String?,
    password: String,
    onPasswordChange: (String) -> Unit,
    passwordError: String?,
    confirmPassword: String,
    onConfirmPasswordChange: (String) -> Unit,
    confirmPasswordError: String?,
    isLoading: Boolean,
    error: String?,
    onRegister: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    var passwordVisible by remember { mutableStateOf(false) }

    Text(
        text = "Complete your profile",
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.SemiBold
    )

    Spacer(modifier = Modifier.height(24.dp))

    OutlinedTextField(
        value = name,
        onValueChange = onNameChange,
        label = { Text("Full Name") },
        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
        isError = nameError != null,
        supportingText = nameError?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        keyboardActions = KeyboardActions(
            onNext = { focusManager.moveFocus(FocusDirection.Down) }
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )

    Spacer(modifier = Modifier.height(16.dp))

    OutlinedTextField(
        value = organizationName,
        onValueChange = onOrganizationNameChange,
        label = { Text("Organization Name") },
        leadingIcon = { Icon(Icons.Default.Business, contentDescription = null) },
        isError = organizationError != null,
        supportingText = organizationError?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        keyboardActions = KeyboardActions(
            onNext = { focusManager.moveFocus(FocusDirection.Down) }
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )

    Spacer(modifier = Modifier.height(16.dp))

    OutlinedTextField(
        value = password,
        onValueChange = onPasswordChange,
        label = { Text("Password") },
        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
        trailingIcon = {
            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                Icon(
                    if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    contentDescription = null
                )
            }
        },
        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
        isError = passwordError != null,
        supportingText = passwordError?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Next
        ),
        keyboardActions = KeyboardActions(
            onNext = { focusManager.moveFocus(FocusDirection.Down) }
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )

    Spacer(modifier = Modifier.height(16.dp))

    OutlinedTextField(
        value = confirmPassword,
        onValueChange = onConfirmPasswordChange,
        label = { Text("Confirm Password") },
        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
        isError = confirmPasswordError != null,
        supportingText = confirmPasswordError?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Done
        ),
        keyboardActions = KeyboardActions(
            onDone = {
                focusManager.clearFocus()
                onRegister()
            }
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )

    if (error != null) {
        Spacer(modifier = Modifier.height(16.dp))
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.errorContainer
            )
        ) {
            Text(
                text = error,
                color = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.padding(12.dp)
            )
        }
    }

    Spacer(modifier = Modifier.height(32.dp))

    Button(
        onClick = onRegister,
        enabled = !isLoading,
        modifier = Modifier.fillMaxWidth().height(50.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Text("Create Account")
        }
    }

    Spacer(modifier = Modifier.height(24.dp))
}
