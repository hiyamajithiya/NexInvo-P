import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ToastProvider } from './components/Toast';
import { authAPI } from './services/api';
import versionCheckService from './services/versionCheck';
import './theme.css';
import './App.css';

// Lazy load heavy components for faster initial load and smaller bundles
const LandingPage = lazy(() => import('./components/LandingPage'));
const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
  }}>
    <div style={{ textAlign: 'center', color: '#fff' }}>
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading...</div>
      <div style={{ fontSize: '14px', opacity: 0.8 }}>Please wait</div>
    </div>
  </div>
);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  // Check for existing authentication on mount
  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      checkUserStatus(token);
      setShowLanding(false); // Skip landing if already logged in
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
      await axios.get(`${API_BASE_URL}/superadmin/stats/`, {
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
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
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
    sessionStorage.setItem('access_token', userData.access);
    sessionStorage.setItem('refresh_token', userData.refresh);
    if (userData.session_token) {
      sessionStorage.setItem('session_token', userData.session_token);
    }

    // Store subscription warning if present (for grace period)
    if (userData.subscription_warning) {
      sessionStorage.setItem('subscription_warning', JSON.stringify(userData.subscription_warning));
    } else {
      sessionStorage.removeItem('subscription_warning');
    }

    // Check if logged in user is superadmin
    await checkUserStatus(userData.access);

    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = async () => {
    // Call the backend to clear the session first
    try {
      await authAPI.logout();
      console.log('Session invalidated on server');
    } catch (error) {
      // Even if the API call fails, proceed with local logout
      console.warn('Logout API call failed:', error);
    }

    // Clear local state and storage
    setIsAuthenticated(false);
    setIsSuperAdmin(false);
    setUser(null);
    setShowLanding(true); // Show landing page after logout
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('session_token');
    localStorage.removeItem('current_org_id');
    // Clear onboarding state so next user sees wizard from start
    localStorage.removeItem('onboarding_wizard_seen');
    localStorage.removeItem('onboarding_completed');
  };

  // Navigate from landing to login
  const handleNavigateToLogin = () => {
    setShowLanding(false);
    setShowSignup(false);
  };

  // Navigate from landing to signup
  const handleNavigateToSignup = () => {
    setShowLanding(false);
    setShowSignup(true);
  };

  // Navigate back to landing
  const handleBackToLanding = () => {
    setShowLanding(true);
    setShowSignup(false);
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
        <Suspense fallback={<LoadingFallback />}>
          <div className="App">
            {/* Show Landing Page first for non-authenticated users */}
            {!isAuthenticated && showLanding ? (
              <LandingPage
                onNavigateToLogin={handleNavigateToLogin}
                onNavigateToSignup={handleNavigateToSignup}
              />
            ) : !isAuthenticated ? (
              <Login
                onLogin={handleLogin}
                initialMode={showSignup ? 'register' : 'login'}
                onBackToLanding={handleBackToLanding}
              />
            ) : isSuperAdmin ? (
              <SuperAdminDashboard onLogout={handleLogout} />
            ) : (
              <OrganizationProvider>
                <Dashboard user={user} onLogout={handleLogout} />
              </OrganizationProvider>
            )}
          </div>
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
