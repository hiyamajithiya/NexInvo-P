import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Icon = MaterialCommunityIcons;

import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import InvoicesScreen from '../screens/invoices/InvoicesScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';
import InvoiceFormScreen from '../screens/invoices/InvoiceFormScreen';
import ScheduledInvoicesScreen from '../screens/invoices/ScheduledInvoicesScreen';
import ScheduledInvoiceFormScreen from '../screens/invoices/ScheduledInvoiceFormScreen';
import ClientsScreen from '../screens/clients/ClientsScreen';
import ClientFormScreen from '../screens/clients/ClientFormScreen';
import ReceiptsScreen from '../screens/receipts/ReceiptsScreen';
import ReceiptDetailScreen from '../screens/receipts/ReceiptDetailScreen';
import RecordPaymentScreen from '../screens/payments/RecordPaymentScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import CompanySettingsScreen from '../screens/settings/CompanySettingsScreen';
import InvoiceSettingsScreen from '../screens/settings/InvoiceSettingsScreen';
import PaymentTermsScreen from '../screens/settings/PaymentTermsScreen';
import PaymentTermFormScreen from '../screens/settings/PaymentTermFormScreen';
import ServiceMasterScreen from '../screens/services/ServiceMasterScreen';
import ServiceFormScreen from '../screens/services/ServiceFormScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Invoices':
              iconName = focused ? 'file-document' : 'file-document-outline';
              break;
            case 'Clients':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Receipts':
              iconName = focused ? 'receipt' : 'receipt';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#1e293b',
        },
        headerTintColor: '#6366f1',
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: 'Invoices' }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{ title: 'Clients' }}
      />
      <Tab.Screen
        name="Receipts"
        component={ReceiptsScreen}
        options={{ title: 'Receipts' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafbff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#1e293b',
          },
          headerTintColor: '#6366f1',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InvoiceDetail"
              component={InvoiceDetailScreen}
              options={{ title: 'Invoice Details' }}
            />
            <Stack.Screen
              name="InvoiceForm"
              component={InvoiceFormScreen}
              options={({ route }) => ({
                title: route.params?.invoiceId ? 'Edit Invoice' : 'New Invoice',
              })}
            />
            <Stack.Screen
              name="ClientForm"
              component={ClientFormScreen}
              options={({ route }) => ({
                title: route.params?.clientId ? 'Edit Client' : 'New Client',
              })}
            />
            <Stack.Screen
              name="RecordPayment"
              component={RecordPaymentScreen}
              options={{ title: 'Record Payment' }}
            />
            <Stack.Screen
              name="ReceiptDetail"
              component={ReceiptDetailScreen}
              options={{ title: 'Receipt Details' }}
            />
            <Stack.Screen
              name="ScheduledInvoices"
              component={ScheduledInvoicesScreen}
              options={{ title: 'Scheduled Invoices' }}
            />
            <Stack.Screen
              name="ScheduledInvoiceForm"
              component={ScheduledInvoiceFormScreen}
              options={({ route }) => ({
                title: route.params?.scheduledInvoiceId
                  ? 'Edit Scheduled Invoice'
                  : 'New Scheduled Invoice',
              })}
            />
            <Stack.Screen
              name="ServiceMaster"
              component={ServiceMasterScreen}
              options={{ title: 'Service Master' }}
            />
            <Stack.Screen
              name="ServiceForm"
              component={ServiceFormScreen}
              options={({ route }) => ({
                title: route.params?.serviceId ? 'Edit Service' : 'New Service',
              })}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ title: 'Reports' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: 'Change Password' }}
            />
            <Stack.Screen
              name="CompanySettings"
              component={CompanySettingsScreen}
              options={{ title: 'Company Settings' }}
            />
            <Stack.Screen
              name="InvoiceSettings"
              component={InvoiceSettingsScreen}
              options={{ title: 'Invoice Settings' }}
            />
            <Stack.Screen
              name="PaymentTerms"
              component={PaymentTermsScreen}
              options={{ title: 'Payment Terms' }}
            />
            <Stack.Screen
              name="PaymentTermForm"
              component={PaymentTermFormScreen}
              options={({ route }) => ({
                title: route.params?.paymentTermId ? 'Edit Payment Term' : 'New Payment Term',
              })}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Create Account' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
