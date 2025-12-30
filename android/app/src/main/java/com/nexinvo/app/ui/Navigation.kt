package com.nexinvo.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.nexinvo.app.ui.auth.LoginScreen
import com.nexinvo.app.ui.auth.LoginViewModel
import com.nexinvo.app.ui.auth.RegisterScreen
import com.nexinvo.app.ui.dashboard.DashboardScreen
import com.nexinvo.app.ui.invoices.InvoiceDetailScreen
import com.nexinvo.app.ui.invoices.InvoiceFormScreen
import com.nexinvo.app.ui.invoices.InvoicesScreen
import com.nexinvo.app.ui.clients.ClientsScreen
import com.nexinvo.app.ui.clients.ClientFormScreen
import com.nexinvo.app.ui.receipts.ReceiptsScreen
import com.nexinvo.app.ui.settings.SettingsScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Register : Screen("register")
    object Main : Screen("main")
    object Dashboard : Screen("dashboard")
    object Invoices : Screen("invoices")
    object InvoiceDetail : Screen("invoice/{invoiceId}") {
        fun createRoute(invoiceId: Int) = "invoice/$invoiceId"
    }
    object InvoiceForm : Screen("invoice/form?invoiceId={invoiceId}") {
        fun createRoute(invoiceId: Int? = null) =
            if (invoiceId != null) "invoice/form?invoiceId=$invoiceId" else "invoice/form"
    }
    object Clients : Screen("clients")
    object ClientForm : Screen("client/form?clientId={clientId}") {
        fun createRoute(clientId: Int? = null) =
            if (clientId != null) "client/form?clientId=$clientId" else "client/form"
    }
    object Receipts : Screen("receipts")
    object Settings : Screen("settings")
}

@Composable
fun NexInvoNavHost(
    navController: NavHostController = rememberNavController(),
    loginViewModel: LoginViewModel = hiltViewModel()
) {
    val isLoggedIn by loginViewModel.isLoggedIn.collectAsState(initial = false)

    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) Screen.Main.route else Screen.Login.route
    ) {
        // Auth Screens
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                }
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // Main App with Bottom Navigation
        composable(Screen.Main.route) {
            MainScreen(
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
