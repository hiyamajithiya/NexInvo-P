import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ToastProvider } from './components/Toast';
import versionCheckService from './services/versionCheck';
import './theme.css';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      checkUserStatus(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Start version checking for auto-refresh on updates
  useEffect(() => {
    versionCheckService.start();
    return () => versionCheckService.stop();
  }, []);

  const checkUserStatus = async (token) => {
    try {
      // Check if user is superadmin by trying to access superadmin stats
      const response = await axios.get(`${API_BASE_URL}/superadmin/stats/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // If the request succeeds, user is superadmin
      setIsSuperAdmin(true);
      setIsAuthenticated(true);
    } catch (error) {
      // If forbidden, user is regular user (not a superadmin)
      if (error.response?.status === 403) {
        setIsSuperAdmin(false);
        setIsAuthenticated(true);
      } else if (error.response?.status === 401) {
        // Only logout on 401 (Unauthorized - invalid/expired token)
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } else {
        // For other errors (500, network issues, etc.), assume regular user
        // Don't logout - the token might still be valid
        console.warn('Error checking superadmin status:', error);
        setIsSuperAdmin(false);
        setIsAuthenticated(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    localStorage.setItem('access_token', userData.access);
    localStorage.setItem('refresh_token', userData.refresh);

    // Check if logged in user is superadmin
    await checkUserStatus(userData.access);

    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsSuperAdmin(false);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_org_id');
    // Clear onboarding state so next user sees wizard from start
    localStorage.removeItem('onboarding_wizard_seen');
    localStorage.removeItem('onboarding_completed');
  };

  if (loading) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <div className="App">
          {!isAuthenticated ? (
            <Login onLogin={handleLogin} />
          ) : isSuperAdmin ? (
            <SuperAdminDashboard onLogout={handleLogout} />
          ) : (
            <OrganizationProvider>
              <Dashboard user={user} onLogout={handleLogout} />
            </OrganizationProvider>
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
