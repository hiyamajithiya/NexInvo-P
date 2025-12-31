// NexInvo Mobile App Theme - Matching Web Application
// DocMold Indigo/Purple Professional Theme

export const colors = {
  // Primary Colors - Indigo/Purple Theme
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // Main Primary
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Secondary Colors - Purple
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Accent Colors
  accent: {
    purple: '#8b5cf6',
    violet: '#7c3aed',
    fuchsia: '#a855f7',
  },

  // Status Colors
  success: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#059669',
  },

  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#d97706',
  },

  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#dc2626',
  },

  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#2563eb',
  },

  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Text Colors
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    muted: '#94a3b8',
  },

  // Background Colors
  background: {
    default: '#fafbff',
    paper: '#ffffff',
    elevated: 'rgba(255, 255, 255, 0.98)',
  },

  // Dashboard Stat Card Background Colors
  statCards: {
    invoices: {
      bg: '#eef2ff',
      text: '#4f46e5',
      iconBg: '#6366f1',
    },
    clients: {
      bg: '#d1fae5',
      text: '#059669',
      iconBg: '#10b981',
    },
    monthly: {
      bg: '#fef3c7',
      text: '#d97706',
      iconBg: '#f59e0b',
    },
    subscription: {
      bg: '#f3e8ff',
      text: '#7c3aed',
      iconBg: '#8b5cf6',
    },
  },

  // Status Badge Colors
  status: {
    paid: {
      bg: '#d1fae5',
      text: '#059669',
    },
    sent: {
      bg: '#dbeafe',
      text: '#2563eb',
    },
    draft: {
      bg: '#f5f5f5',
      text: '#6b7280',
    },
    overdue: {
      bg: '#fee2e2',
      text: '#dc2626',
    },
    pending: {
      bg: '#fef3c7',
      text: '#d97706',
    },
  },
};

// Theme object for React Native Paper customization
export const paperTheme = {
  colors: {
    primary: colors.primary[500],
    primaryContainer: colors.primary[100],
    secondary: colors.secondary[500],
    secondaryContainer: colors.secondary[100],
    tertiary: colors.accent.purple,
    tertiaryContainer: colors.secondary[100],
    surface: colors.background.paper,
    surfaceVariant: colors.gray[100],
    surfaceDisabled: colors.gray[200],
    background: colors.background.default,
    error: colors.error.main,
    errorContainer: colors.error.light,
    onPrimary: colors.white,
    onPrimaryContainer: colors.primary[900],
    onSecondary: colors.white,
    onSecondaryContainer: colors.secondary[900],
    onTertiary: colors.white,
    onTertiaryContainer: colors.secondary[900],
    onSurface: colors.text.primary,
    onSurfaceVariant: colors.text.secondary,
    onSurfaceDisabled: colors.gray[400],
    onError: colors.white,
    onErrorContainer: colors.error.dark,
    onBackground: colors.text.primary,
    outline: colors.gray[300],
    outlineVariant: colors.gray[200],
    inverseSurface: colors.gray[900],
    inverseOnSurface: colors.white,
    inversePrimary: colors.primary[200],
    shadow: colors.black,
    scrim: colors.black,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    elevation: {
      level0: 'transparent',
      level1: colors.background.paper,
      level2: colors.background.paper,
      level3: colors.background.paper,
      level4: colors.background.paper,
      level5: colors.background.paper,
    },
  },
};

export default colors;
