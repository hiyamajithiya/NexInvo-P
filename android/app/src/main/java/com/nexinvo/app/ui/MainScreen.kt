package com.nexinvo.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.nexinvo.app.ui.dashboard.DashboardScreen
import com.nexinvo.app.ui.invoices.InvoicesScreen
import com.nexinvo.app.ui.invoices.InvoiceDetailScreen
import com.nexinvo.app.ui.invoices.InvoiceFormScreen
import com.nexinvo.app.ui.clients.ClientsScreen
import com.nexinvo.app.ui.clients.ClientFormScreen
import com.nexinvo.app.ui.receipts.ReceiptsScreen
import com.nexinvo.app.ui.settings.SettingsScreen

sealed class BottomNavItem(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Dashboard : BottomNavItem(
        route = "dashboard",
        title = "Dashboard",
        selectedIcon = Icons.Filled.Dashboard,
        unselectedIcon = Icons.Outlined.Dashboard
    )
    object Invoices : BottomNavItem(
        route = "invoices",
        title = "Invoices",
        selectedIcon = Icons.Filled.Receipt,
        unselectedIcon = Icons.Outlined.Receipt
    )
    object Clients : BottomNavItem(
        route = "clients",
        title = "Clients",
        selectedIcon = Icons.Filled.People,
        unselectedIcon = Icons.Outlined.People
    )
    object Receipts : BottomNavItem(
        route = "receipts",
        title = "Receipts",
        selectedIcon = Icons.Filled.Payments,
        unselectedIcon = Icons.Outlined.Payments
    )
    object Settings : BottomNavItem(
        route = "settings",
        title = "Settings",
        selectedIcon = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings
    )
}

val bottomNavItems = listOf(
    BottomNavItem.Dashboard,
    BottomNavItem.Invoices,
    BottomNavItem.Clients,
    BottomNavItem.Receipts,
    BottomNavItem.Settings
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onLogout: () -> Unit,
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Determine if we should show bottom nav
    val showBottomNav = bottomNavItems.any { item ->
        currentDestination?.hierarchy?.any { it.route == item.route } == true
    }

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any {
                            it.route == item.route
                        } == true

                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.title
                                )
                            },
                            label = { Text(item.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomNavItem.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Dashboard
            composable(BottomNavItem.Dashboard.route) {
                DashboardScreen(
                    onNavigateToInvoices = {
                        navController.navigate(BottomNavItem.Invoices.route)
                    },
                    onNavigateToClients = {
                        navController.navigate(BottomNavItem.Clients.route)
                    }
                )
            }

            // Invoices List
            composable(BottomNavItem.Invoices.route) {
                InvoicesScreen(
                    onNavigateToDetail = { invoiceId ->
                        navController.navigate("invoice/$invoiceId")
                    },
                    onNavigateToForm = { invoiceId ->
                        val route = if (invoiceId != null) "invoice/form?invoiceId=$invoiceId" else "invoice/form"
                        navController.navigate(route)
                    }
                )
            }

            // Invoice Detail
            composable(
                route = "invoice/{invoiceId}",
                arguments = listOf(navArgument("invoiceId") { type = NavType.IntType })
            ) { backStackEntry ->
                val invoiceId = backStackEntry.arguments?.getInt("invoiceId") ?: return@composable
                InvoiceDetailScreen(
                    invoiceId = invoiceId,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToEdit = {
                        navController.navigate("invoice/form?invoiceId=$invoiceId")
                    }
                )
            }

            // Invoice Form (Create/Edit)
            composable(
                route = "invoice/form?invoiceId={invoiceId}",
                arguments = listOf(
                    navArgument("invoiceId") {
                        type = NavType.IntType
                        defaultValue = -1
                    }
                )
            ) { backStackEntry ->
                val invoiceId = backStackEntry.arguments?.getInt("invoiceId")
                    ?.takeIf { it != -1 }
                InvoiceFormScreen(
                    invoiceId = invoiceId,
                    onNavigateBack = { navController.popBackStack() },
                    onInvoiceSaved = { navController.popBackStack() }
                )
            }

            // Clients List
            composable(BottomNavItem.Clients.route) {
                ClientsScreen(
                    onNavigateToForm = { clientId ->
                        val route = if (clientId != null) "client/form?clientId=$clientId" else "client/form"
                        navController.navigate(route)
                    }
                )
            }

            // Client Form (Create/Edit)
            composable(
                route = "client/form?clientId={clientId}",
                arguments = listOf(
                    navArgument("clientId") {
                        type = NavType.IntType
                        defaultValue = -1
                    }
                )
            ) { backStackEntry ->
                val clientId = backStackEntry.arguments?.getInt("clientId")
                    ?.takeIf { it != -1 }
                ClientFormScreen(
                    clientId = clientId,
                    onNavigateBack = { navController.popBackStack() },
                    onClientSaved = { navController.popBackStack() }
                )
            }

            // Receipts
            composable(BottomNavItem.Receipts.route) {
                ReceiptsScreen()
            }

            // Settings
            composable(BottomNavItem.Settings.route) {
                SettingsScreen(
                    onLogout = onLogout
                )
            }
        }
    }
}
