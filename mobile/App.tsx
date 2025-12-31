import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Custom theme - Matching web app's Indigo/Purple DocMold theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Primary - Indigo
    primary: '#6366f1',
    primaryContainer: '#e0e7ff',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#312e81',
    // Secondary - Purple
    secondary: '#8b5cf6',
    secondaryContainer: '#f3e8ff',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#581c87',
    // Tertiary - Accent Purple
    tertiary: '#a855f7',
    tertiaryContainer: '#faf5ff',
    // Status colors
    error: '#ef4444',
    errorContainer: '#fee2e2',
    // Backgrounds
    background: '#fafbff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    // Text
    onBackground: '#1e293b',
    onSurface: '#1e293b',
    onSurfaceVariant: '#64748b',
    outline: '#e5e7eb',
    // Elevation
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#ffffff',
      level2: '#fafafa',
      level3: '#f5f5f5',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
