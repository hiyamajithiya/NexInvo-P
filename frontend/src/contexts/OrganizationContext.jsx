import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { organizationAPI } from '../services/api';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load organizations from API
  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await organizationAPI.getAll();
      setOrganizations(response.data);

      // Set current organization from localStorage or use first one
      const storedOrgId = localStorage.getItem('current_org_id');
      if (storedOrgId) {
        const org = response.data.find(o => String(o.id) === String(storedOrgId));
        if (org) {
          setCurrentOrganization(org);
        } else if (response.data.length > 0) {
          // If stored org not found, use first one
          setCurrentOrganization(response.data[0]);
          localStorage.setItem('current_org_id', response.data[0].id);
        }
      } else if (response.data.length > 0) {
        // No stored org, use first one
        setCurrentOrganization(response.data[0]);
        localStorage.setItem('current_org_id', response.data[0].id);
      }

      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load organizations');
      setLoading(false);
    }
  }, []);

  // Switch to a different organization
  const switchOrganization = useCallback(async (orgId) => {
    try {
      const response = await organizationAPI.switch(orgId);
      const org = organizations.find(o => o.id === orgId);
      if (org) {
        setCurrentOrganization(org);
        localStorage.setItem('current_org_id', orgId);
        // Reload the page to refresh data for new organization
        window.location.reload();
      }
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [organizations]);

  // Create a new organization
  const createOrganization = useCallback(async (data) => {
    try {
      const response = await organizationAPI.create(data);
      await loadOrganizations(); // Reload organizations
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [loadOrganizations]);

  // Update current organization
  const updateOrganization = useCallback(async (id, data) => {
    try {
      const response = await organizationAPI.update(id, data);
      await loadOrganizations(); // Reload organizations
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [loadOrganizations]);

  // Invite member to organization
  const inviteMember = useCallback(async (orgId, email, role = 'user') => {
    try {
      const response = await organizationAPI.inviteMember(orgId, { email, role });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // Get organization members
  const getMembers = useCallback(async (orgId) => {
    try {
      const response = await organizationAPI.getMembers(orgId);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // Update member role
  const updateMember = useCallback(async (orgId, userId, data) => {
    try {
      const response = await organizationAPI.updateMember(orgId, userId, data);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // Remove member from organization
  const removeMember = useCallback(async (orgId, userId) => {
    try {
      await organizationAPI.removeMember(orgId, userId);
    } catch (err) {
      throw err;
    }
  }, []);

  // Load organizations on mount
  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      loadOrganizations();
    } else {
      setLoading(false);
    }
  }, [loadOrganizations]);

  const value = {
    organizations,
    currentOrganization,
    loading,
    error,
    switchOrganization,
    createOrganization,
    updateOrganization,
    inviteMember,
    getMembers,
    updateMember,
    removeMember,
    refreshOrganizations: loadOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;
