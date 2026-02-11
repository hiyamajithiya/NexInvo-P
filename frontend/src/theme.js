import { createTheme } from '@mui/material/styles';

// DocMold Theme - Modern Professional Theme System
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },

  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      light: '#8b5cf6',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#764ba2',
      light: '#9c7bb8',
      dark: '#5d3a7f',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafbff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    grey: {
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
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1e293b',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#1e293b',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#1e293b',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#1e293b',
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#1e293b',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: '#1e293b',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      color: '#475569',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      color: '#64748b',
      lineHeight: 1.6,
    },
    button: {
      fontSize: '1rem',
      fontWeight: 600,
      textTransform: 'none',
      lineHeight: 1.4,
    },
  },

  shape: {
    borderRadius: 12,
  },

  spacing: 8,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fafbff',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:disabled': {
            background: '#d1d5db',
            color: '#9ca3af',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#6366f1',
          color: '#6366f1',
          borderWidth: 2,
          '&:hover': {
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            borderWidth: 2,
          },
        },
        text: {
          color: '#6366f1',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
          backgroundColor: '#ffffff',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        },
        elevation4: {
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        },
        elevation8: {
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        },
        elevation24: {
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.98)',
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#fafafa',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#f0f0f0',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
            },
            '& fieldset': {
              borderColor: '#e5e7eb',
            },
            '&:hover fieldset': {
              borderColor: '#6366f1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366f1',
              borderWidth: 2,
            },
          },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          marginTop: 8,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '10px 12px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(99, 102, 241, 0.16)',
            },
          },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#ffffff',
          borderRadius: '0 16px 16px 0',
          border: 'none',
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 16px',
          padding: '12px 16px',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#991b1b',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#92400e',
          border: '1px solid rgba(245, 158, 11, 0.2)',
        },
        standardInfo: {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          color: '#1e40af',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#065f46',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
        },
        filled: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#ffffff',
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#ffffff',
          fontWeight: 600,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.95rem',
          borderRadius: 8,
          margin: '0 4px',
          minHeight: 48,
          '&.Mui-selected': {
            color: '#6366f1',
            fontWeight: 600,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#6366f1',
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#9ca3af',
          '&.Mui-checked': {
            color: '#6366f1',
          },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#9ca3af',
          '&.Mui-checked': {
            color: '#6366f1',
          },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .Mui-checked': {
            color: '#6366f1',
            '& + .MuiSwitch-track': {
              backgroundColor: '#6366f1',
            },
          },
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            color: '#1e293b',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderBottom: '2px solid #e2e8f0',
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
          padding: 16,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1e293b',
          borderRadius: 8,
          fontSize: '0.8125rem',
          padding: '8px 12px',
        },
      },
    },

    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-root': {
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          },
        },
      },
    },
  },
});

export default theme;
