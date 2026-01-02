import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User, Organization, LoginRequest, SubscriptionWarning } from '../types';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  organization: Organization | null;
  subscriptionWarning: SubscriptionWarning | null;
  clearSubscriptionWarning: () => void;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscriptionWarning, setSubscriptionWarning] = useState<SubscriptionWarning | null>(null);

  const clearSubscriptionWarning = () => {
    setSubscriptionWarning(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const authenticated = await api.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Load user data from secure storage
        const userData = await SecureStore.getItemAsync('user');
        const orgData = await SecureStore.getItemAsync('organization');
        if (userData) setUser(JSON.parse(userData));
        if (orgData) setOrganization(JSON.parse(orgData));
      }

      return authenticated;
    } catch (error) {
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    const response = await api.login(data);
    setUser(response.user);
    setOrganization(response.organization);
    setIsAuthenticated(true);

    // Check for subscription warning (grace period)
    if (response.subscription_warning) {
      setSubscriptionWarning(response.subscription_warning);
    }

    // Save user data
    await SecureStore.setItemAsync('user', JSON.stringify(response.user));
    await SecureStore.setItemAsync('organization', JSON.stringify(response.organization));
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setOrganization(null);
    setSubscriptionWarning(null);
    setIsAuthenticated(false);
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('organization');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        organization,
        subscriptionWarning,
        clearSubscriptionWarning,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
