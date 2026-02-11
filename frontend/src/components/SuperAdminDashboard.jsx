import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Snackbar,
  Alert,
} from '@mui/material';
import { superadminAPI, subscriptionAPI, organizationAPI, userAPI, staffAPI, couponAPI } from '../services/api';
import SubscriptionPlans from './SubscriptionPlans';
import CouponManagement from './CouponManagement';
import StaffManagement from './StaffManagement';
import BulkEmailManager from './BulkEmailManager';
import PaymentSettingsAdmin from './PaymentSettingsAdmin';
import PaymentRequestsAdmin from './PaymentRequestsAdmin';
import ReviewsAdmin from './ReviewsAdmin';
import './Dashboard.css';
import DashboardOverviewTab from '../pages/superadmin/DashboardOverviewTab';
import OrganizationsTab from '../pages/superadmin/OrganizationsTab';
import UsersTab from '../pages/superadmin/UsersTab';
import AnalyticsTab from '../pages/superadmin/AnalyticsTab';
import BillingTab from '../pages/superadmin/BillingTab';
import SettingsTab from '../pages/superadmin/SettingsTab';
import UpgradeRequestsTab from '../pages/superadmin/UpgradeRequestsTab';
import SuperAdminDialogs from '../pages/superadmin/SuperAdminDialogs';

const SuperAdminDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [orgMenuAnchor, setOrgMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [planChangeDialog, setPlanChangeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [orgDetailsDialog, setOrgDetailsDialog] = useState(false);
  const [orgDetails, setOrgDetails] = useState(null);
  const [orgDetailsLoading, setOrgDetailsLoading] = useState(false);
  const [orgMembersDialog, setOrgMembersDialog] = useState(false);
  const [orgMembers, setOrgMembers] = useState([]);
  const [userProfileDialog, setUserProfileDialog] = useState(false);
  const [userOrgsDialog, setUserOrgsDialog] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [deleteOrgDialog, setDeleteOrgDialog] = useState({ open: false, org: null, loading: false });
  const [deleteUserDialog, setDeleteUserDialog] = useState({ open: false, user: null, loading: false });
  const [acquisitionDialog, setAcquisitionDialog] = useState({ open: false, org: null, loading: false });
  const [acquisitionForm, setAcquisitionForm] = useState({
    acquisition_source: 'organic',
    acquired_by: '',
    referred_by: '',
    acquisition_coupon: '',
    acquisition_campaign: '',
    acquisition_notes: '',
  });
  const [salesStaff, setSalesStaff] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    use_tls: true,
    from_email: ''
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Upgrade requests state
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [loadingUpgradeRequests, setLoadingUpgradeRequests] = useState(false);
  const [approveDialog, setApproveDialog] = useState({ open: false, request: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, request: null });
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');


  // Ref for dropdown auto-hide timeout
  const dropdownTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auto-hide dropdown after 5 seconds of inactivity
  const resetDropdownTimer = useCallback(() => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowUserDropdown(false);
    }, 5000); // 5 seconds
  }, []);

  // Handle dropdown visibility and timer
  useEffect(() => {
    if (showUserDropdown) {
      resetDropdownTimer();
    }
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, [showUserDropdown, resetDropdownTimer]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
    loadSubscriptionPlans();
    loadNotifications();
    // Poll for notification count every 30 seconds
    const notificationInterval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(notificationInterval);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeMenu === 'users') {
      loadUsers();
    }
    if (activeMenu === 'settings') {
      loadEmailConfig();
    }
    if (activeMenu === 'upgrade-requests') {
      loadUpgradeRequests();
    }
  }, [activeMenu]);

  const loadData = async () => {
    try {
      // Get superadmin statistics
      const statsResponse = await superadminAPI.getStats();
      setStats(statsResponse.data);

      // Get all organizations
      const orgsResponse = await organizationAPI.getAll();
      setOrganizations(orgsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const response = await subscriptionAPI.getPlans();
      setSubscriptionPlans(response.data);
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    }
  };

  const loadEmailConfig = async () => {
    try {
      const response = await superadminAPI.getEmailConfig();
      // Map backend field names to frontend field names
      setEmailConfig({
        host: response.data.smtp_host || '',
        port: response.data.smtp_port || '',
        username: response.data.smtp_username || '',
        password: response.data.smtp_password || '',
        use_tls: response.data.use_tls !== undefined ? response.data.use_tls : true,
        from_email: response.data.from_email || ''
      });
    } catch (error) {
      console.error('Error loading email config:', error);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await superadminAPI.getNotifications({ limit: 50 });
      setNotifications(response.data.notifications || []);
      setUnreadNotificationCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await superadminAPI.getUnreadCount();
      setUnreadNotificationCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await superadminAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await superadminAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await superadminAPI.deleteNotification(notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const loadUpgradeRequests = async () => {
    setLoadingUpgradeRequests(true);
    try {
      const response = await subscriptionAPI.getUpgradeRequests();
      setUpgradeRequests(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error loading upgrade requests:', error);
    } finally {
      setLoadingUpgradeRequests(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!approveDialog.request) return;
    try {
      await subscriptionAPI.approveUpgradeRequest(approveDialog.request.id, {
        admin_notes: adminNotes,
        payment_reference: paymentReference
      });
      showSnackbar('Upgrade request approved successfully', 'success');
      setApproveDialog({ open: false, request: null });
      setAdminNotes('');
      setPaymentReference('');
      loadUpgradeRequests();
      loadNotifications();
    } catch (error) {
      console.error('Error approving request:', error);
      showSnackbar('Failed to approve request', 'error');
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectDialog.request) return;
    try {
      await subscriptionAPI.rejectUpgradeRequest(rejectDialog.request.id, {
        admin_notes: adminNotes
      });
      showSnackbar('Upgrade request rejected', 'success');
      setRejectDialog({ open: false, request: null });
      setAdminNotes('');
      loadUpgradeRequests();
      loadNotifications();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showSnackbar('Failed to reject request', 'error');
    }
  };

  const handleOrgMenuOpen = (event, org) => {
    setOrgMenuAnchor(event.currentTarget);
    setSelectedOrg(org);
  };

  const handleOrgMenuClose = () => {
    setOrgMenuAnchor(null);
    setSelectedOrg(null);
  };

  const handleUserMenuOpen = (event, user) => {
    setUserMenuAnchor(event.currentTarget);
    setSelectedUser(user);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
    setSelectedUser(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleChangePlan = () => {
    setOrgMenuAnchor(null);
    setSelectedPlan(selectedOrg?.plan || '');
    setPlanChangeDialog(true);
  };

  const handlePlanChangeSubmit = async () => {
    try {
      await organizationAPI.patch(selectedOrg.id, { plan: selectedPlan });
      showSnackbar('Organization plan updated successfully', 'success');
      setPlanChangeDialog(false);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating plan:', error);
      showSnackbar('Failed to update plan', 'error');
    }
  };

  const handleToggleOrgStatus = async () => {
    try {
      await organizationAPI.patch(selectedOrg.id, { is_active: !selectedOrg.is_active });
      showSnackbar(
        `Organization ${selectedOrg.is_active ? 'deactivated' : 'activated'} successfully`,
        'success'
      );
      handleOrgMenuClose();
      loadData();
    } catch (error) {
      console.error('Error toggling organization status:', error);
      showSnackbar('Failed to update organization status', 'error');
    }
  };

  const handleToggleUserStatus = async () => {
    try {
      await userAPI.patch(selectedUser.id, { is_active: !selectedUser.is_active });
      showSnackbar(
        `User ${selectedUser.is_active ? 'deactivated' : 'activated'} successfully`,
        'success'
      );
      handleUserMenuClose();
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showSnackbar('Failed to update user status', 'error');
    }
  };

  const handleViewOrgDetails = async () => {
    setOrgMenuAnchor(null);  // Close menu but keep selectedOrg
    setOrgDetailsDialog(true);
    setOrgDetailsLoading(true);
    setOrgDetails(null);

    try {
      const response = await organizationAPI.getDetails(selectedOrg.id);
      setOrgDetails(response.data);
    } catch (error) {
      console.error('Error loading organization details:', error);
      showSnackbar('Failed to load organization details', 'error');
    } finally {
      setOrgDetailsLoading(false);
    }
  };

  const handleViewOrgMembers = async () => {
    setOrgMenuAnchor(null);  // Close menu but keep selectedOrg
    try {
      const response = await organizationAPI.getMembers(selectedOrg.id);
      setOrgMembers(response.data);
      setOrgMembersDialog(true);
    } catch (error) {
      console.error('Error loading members:', error);
      showSnackbar('Failed to load organization members', 'error');
    }
  };

  const handleViewUserProfile = () => {
    handleUserMenuClose();
    setUserProfileDialog(true);
  };

  const handleViewUserOrganizations = async () => {
    handleUserMenuClose();
    try {
      const response = await userAPI.getOrganizations(selectedUser.id);
      setUserOrganizations(response.data);
      setUserOrgsDialog(true);
    } catch (error) {
      console.error('Error loading user organizations:', error);
      showSnackbar('Failed to load user organizations', 'error');
    }
  };

  const handleDeleteOrganization = async () => {
    if (!deleteOrgDialog.org) return;

    setDeleteOrgDialog(prev => ({ ...prev, loading: true }));
    try {
      await organizationAPI.delete(deleteOrgDialog.org.id, true);
      showSnackbar(`Organization "${deleteOrgDialog.org.name}" deleted successfully`, 'success');
      setDeleteOrgDialog({ open: false, org: null, loading: false });
      // Refresh organizations list
      loadData();
    } catch (error) {
      console.error('Error deleting organization:', error);
      showSnackbar(error.response?.data?.error || 'Failed to delete organization', 'error');
      setDeleteOrgDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenDeleteDialog = () => {
    setDeleteOrgDialog({ open: true, org: selectedOrg, loading: false });
    handleOrgMenuClose();
  };

  const handleOpenDeleteUserDialog = () => {
    setDeleteUserDialog({ open: true, user: selectedUser, loading: false });
    setUserMenuAnchor(null);  // Close menu but keep selectedUser for dialog
  };

  const handleDeleteUser = async () => {
    if (!deleteUserDialog.user) return;

    setDeleteUserDialog(prev => ({ ...prev, loading: true }));
    try {
      await userAPI.delete(deleteUserDialog.user.id);
      showSnackbar(`User "${deleteUserDialog.user.email}" deleted successfully`, 'success');
      setDeleteUserDialog({ open: false, user: null, loading: false });
      // Refresh users list
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar(error.response?.data?.error || 'Failed to delete user', 'error');
      setDeleteUserDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleResetPassword = async () => {
    handleUserMenuClose();
    try {
      await userAPI.resetPassword(selectedUser.id);
      showSnackbar(`Password reset email sent to ${selectedUser?.email}`, 'success');
    } catch (error) {
      console.error('Error sending password reset:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send password reset email. Please configure email settings first.';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleOpenAcquisitionDialog = async () => {
    setOrgMenuAnchor(null);
    // Load sales staff and coupons if not already loaded
    try {
      const [staffResponse, couponsResponse] = await Promise.all([
        staffAPI.getAll('sales'),
        couponAPI.getAll(),
      ]);
      setSalesStaff(staffResponse.data);
      setCoupons(couponsResponse.data);
    } catch (error) {
      console.error('Error loading acquisition data:', error);
    }

    // Set form values from selected org
    setAcquisitionForm({
      acquisition_source: selectedOrg?.acquisition_source || 'organic',
      acquired_by: selectedOrg?.acquired_by || '',
      referred_by: selectedOrg?.referred_by || '',
      acquisition_coupon: selectedOrg?.acquisition_coupon || '',
      acquisition_campaign: selectedOrg?.acquisition_campaign || '',
      acquisition_notes: selectedOrg?.acquisition_notes || '',
    });
    setAcquisitionDialog({ open: true, org: selectedOrg, loading: false });
  };

  const handleSaveAcquisition = async () => {
    if (!acquisitionDialog.org) return;

    setAcquisitionDialog(prev => ({ ...prev, loading: true }));
    try {
      const data = {
        acquisition_source: acquisitionForm.acquisition_source,
        acquisition_campaign: acquisitionForm.acquisition_campaign,
        acquisition_notes: acquisitionForm.acquisition_notes,
      };

      // Only include fields based on acquisition source
      if (acquisitionForm.acquisition_source === 'sales' && acquisitionForm.acquired_by) {
        data.acquired_by = acquisitionForm.acquired_by;
      } else {
        data.acquired_by = null;
      }

      if (acquisitionForm.acquisition_source === 'referral' && acquisitionForm.referred_by) {
        data.referred_by = acquisitionForm.referred_by;
      } else {
        data.referred_by = null;
      }

      if (['coupon', 'advertisement'].includes(acquisitionForm.acquisition_source) && acquisitionForm.acquisition_coupon) {
        data.acquisition_coupon = acquisitionForm.acquisition_coupon;
      } else {
        data.acquisition_coupon = null;
      }

      await organizationAPI.patch(acquisitionDialog.org.id, data);

      showSnackbar('Acquisition information updated successfully', 'success');
      setAcquisitionDialog({ open: false, org: null, loading: false });
      loadData();
    } catch (error) {
      console.error('Error updating acquisition:', error);
      showSnackbar(error.response?.data?.error || 'Failed to update acquisition information', 'error');
      setAcquisitionDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Dashboard Overview';
      case 'organizations': return 'Organizations Management';
      case 'staff': return 'Staff Management';
      case 'users': return 'User Management';
      case 'analytics': return 'Analytics & Reports';
      case 'billing': return 'Billing & Subscriptions';
      case 'subscription-plans': return 'Subscription Plans';
      case 'coupons': return 'Coupon Management';
      case 'upgrade-requests': return 'Upgrade Requests';
      case 'payment-requests': return 'Payment Requests';
      case 'payment-settings': return 'Payment Settings';
      case 'bulk-email': return 'Bulk Email Manager';
      case 'reviews': return 'Customer Reviews';
      case 'settings': return 'System Settings';
      default: return 'Super Admin Portal';
    }
  };


  // renderDashboardContent, renderOrganizationsContent, renderUsersContent, and
  // renderAnalyticsContent have been extracted to separate sub-components.
  // See: pages/superadmin/{DashboardOverviewTab,OrganizationsTab,UsersTab,AnalyticsTab}.jsx


  // renderBillingContent has been extracted to BillingTab component.
  // See: pages/superadmin/BillingTab.jsx

  const handleEmailConfigChange = (field, value) => {
    setEmailConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEmailConfig = async () => {
    setSavingEmail(true);
    try {
      await superadminAPI.updateEmailConfig(emailConfig);
      showSnackbar('Email configuration saved successfully', 'success');
    } catch (error) {
      console.error('Error saving email config:', error);
      showSnackbar('Failed to save email configuration', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      showSnackbar('Please enter a recipient email address', 'error');
      return;
    }
    setSendingTestEmail(true);
    try {
      const response = await superadminAPI.testEmail({ recipient_email: testEmailRecipient });
      showSnackbar(response.data.message || 'Test email sent successfully!', 'success');
      setShowTestEmailDialog(false);
      setTestEmailRecipient('');
    } catch (error) {
      console.error('Error sending test email:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send test email';
      showSnackbar(errorMsg, 'error');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // renderSettingsContent has been extracted to SettingsTab component.
  // See: pages/superadmin/SettingsTab.jsx

  // renderUpgradeRequestsContent has been extracted to UpgradeRequestsTab component.
  // See: pages/superadmin/UpgradeRequestsTab.jsx
  //
  // All dialogs have been extracted to SuperAdminDialogs component.
  // See: pages/superadmin/SuperAdminDialogs.jsx

  const renderContent = () => {
    switch (activeMenu) {
      case 'organizations':
        return (
          <OrganizationsTab
            organizations={organizations}
            orgMenuAnchor={orgMenuAnchor}
            selectedOrg={selectedOrg}
            onOrgMenuOpen={handleOrgMenuOpen}
            onOrgMenuClose={handleOrgMenuClose}
            onViewOrgDetails={handleViewOrgDetails}
            onViewOrgMembers={handleViewOrgMembers}
            onChangePlan={handleChangePlan}
            onOpenAcquisitionDialog={handleOpenAcquisitionDialog}
            onToggleOrgStatus={handleToggleOrgStatus}
            onOpenDeleteDialog={handleOpenDeleteDialog}
          />
        );
      case 'users':
        return (
          <UsersTab
            users={users}
            stats={stats}
            loadingUsers={loadingUsers}
            userMenuAnchor={userMenuAnchor}
            selectedUser={selectedUser}
            onUserMenuOpen={handleUserMenuOpen}
            onUserMenuClose={handleUserMenuClose}
            onViewUserProfile={handleViewUserProfile}
            onViewUserOrganizations={handleViewUserOrganizations}
            onResetPassword={handleResetPassword}
            onToggleUserStatus={handleToggleUserStatus}
            onOpenDeleteUserDialog={handleOpenDeleteUserDialog}
          />
        );
      case 'staff':
        return <StaffManagement />;
      case 'analytics':
        return (
          <AnalyticsTab
            stats={stats}
            organizations={organizations}
          />
        );
      case 'billing':
        return (
          <BillingTab
            stats={stats}
            onNavigate={setActiveMenu}
          />
        );
      case 'subscription-plans':
        return <SubscriptionPlans />;
      case 'coupons':
        return <CouponManagement />;
      case 'upgrade-requests':
        return (
          <UpgradeRequestsTab
            notifications={notifications}
            unreadNotificationCount={unreadNotificationCount}
            loadingNotifications={loadingNotifications}
            onMarkNotificationRead={handleMarkNotificationAsRead}
            onMarkAllRead={handleMarkAllNotificationsAsRead}
            onDeleteNotification={handleDeleteNotification}
            upgradeRequests={upgradeRequests}
            loadingUpgradeRequests={loadingUpgradeRequests}
            onApproveDialogOpen={(request) => {
              setApproveDialog({ open: true, request });
              setAdminNotes('');
              setPaymentReference('');
            }}
            onRejectDialogOpen={(request) => {
              setRejectDialog({ open: true, request });
              setAdminNotes('');
            }}
          />
        );
      case 'payment-requests':
        return <PaymentRequestsAdmin />;
      case 'payment-settings':
        return <PaymentSettingsAdmin />;
      case 'bulk-email':
        return <BulkEmailManager />;
      case 'reviews':
        return <ReviewsAdmin />;
      case 'settings':
        return (
          <SettingsTab
            emailConfig={emailConfig}
            onEmailConfigChange={handleEmailConfigChange}
            savingEmail={savingEmail}
            onSaveEmailConfig={handleSaveEmailConfig}
            showTestEmailDialog={showTestEmailDialog}
            onShowTestEmailDialog={setShowTestEmailDialog}
            testEmailRecipient={testEmailRecipient}
            onTestEmailRecipientChange={setTestEmailRecipient}
            sendingTestEmail={sendingTestEmail}
            onSendTestEmail={handleSendTestEmail}
            stats={stats}
          />
        );
      default:
        return (
          <DashboardOverviewTab
            stats={stats}
            onNavigate={setActiveMenu}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img
              src="/assets/NEXINVO_logo.png"
              alt="NexInvo Logo"
              style={{
                height: '60px',
                width: 'auto',
                objectFit: 'contain',
                marginBottom: '8px',
                maxWidth: '220px'
              }}
            />
          </div>
          <p className="company-subtitle">NexInvo - Admin Portal</p>
        </div>

        <nav className="sidebar-nav">
          <a
            href="#dashboard"
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('dashboard'); }}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Dashboard</span>
          </a>
          <a
            href="#organizations"
            className={`nav-item ${activeMenu === 'organizations' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('organizations'); }}
          >
            <span className="nav-icon">🏢</span>
            <span className="nav-text">Organizations</span>
          </a>
          <a
            href="#users"
            className={`nav-item ${activeMenu === 'users' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('users'); }}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">Users</span>
          </a>
          <a
            href="#staff"
            className={`nav-item ${activeMenu === 'staff' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('staff'); }}
          >
            <span className="nav-icon">🎧</span>
            <span className="nav-text">Staff Team</span>
          </a>
          <a
            href="#analytics"
            className={`nav-item ${activeMenu === 'analytics' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('analytics'); }}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Analytics</span>
          </a>
          <a
            href="#billing"
            className={`nav-item ${activeMenu === 'billing' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('billing'); }}
          >
            <span className="nav-icon">💳</span>
            <span className="nav-text">Billing</span>
          </a>
          <a
            href="#subscription-plans"
            className={`nav-item ${activeMenu === 'subscription-plans' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('subscription-plans'); }}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Subscription Plans</span>
          </a>
          <a
            href="#coupons"
            className={`nav-item ${activeMenu === 'coupons' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('coupons'); }}
          >
            <span className="nav-icon">🎟️</span>
            <span className="nav-text">Coupons</span>
          </a>
          <a
            href="#upgrade-requests"
            className={`nav-item ${activeMenu === 'upgrade-requests' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('upgrade-requests'); }}
            style={{ position: 'relative' }}
          >
            <span className="nav-icon">📬</span>
            <span className="nav-text">Upgrade Requests</span>
            {unreadNotificationCount > 0 && (
              <span style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#ef4444',
                color: 'white',
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </a>
          <a
            href="#payment-requests"
            className={`nav-item ${activeMenu === 'payment-requests' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('payment-requests'); }}
          >
            <span className="nav-icon">💳</span>
            <span className="nav-text">Payment Requests</span>
          </a>
          <a
            href="#bulk-email"
            className={`nav-item ${activeMenu === 'bulk-email' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('bulk-email'); }}
          >
            <span className="nav-icon">📧</span>
            <span className="nav-text">Bulk Email</span>
          </a>
          <a
            href="#payment-settings"
            className={`nav-item ${activeMenu === 'payment-settings' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('payment-settings'); }}
          >
            <span className="nav-icon">🏦</span>
            <span className="nav-text">Payment Settings</span>
          </a>
          <a
            href="#reviews"
            className={`nav-item ${activeMenu === 'reviews' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('reviews'); }}
          >
            <span className="nav-icon">⭐</span>
            <span className="nav-text">Customer Reviews</span>
          </a>
          <a
            href="#settings"
            className={`nav-item ${activeMenu === 'settings' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveMenu('settings'); }}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator"></div>
            <span>System Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="page-subtitle">Welcome back, Super Administrator</p>
          </div>
          <div className="header-right">
            <div className="user-menu" ref={dropdownRef}>
              <div
                className="user-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ cursor: 'pointer' }}
              >
                SA
              </div>
              {showUserDropdown && (
                <div
                  className="user-dropdown"
                  onMouseEnter={resetDropdownTimer}
                  onMouseMove={resetDropdownTimer}
                >
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">Super Admin</div>
                  </div>
                  <button
                    className="user-dropdown-item logout"
                    onClick={onLogout}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {renderContent()}
        </div>

        {/* Footer with Branding */}
        <footer className="app-footer">
          <p>© {new Date().getFullYear()} Chinmay Technosoft Private Limited. All rights reserved.</p>
        </footer>
      </div>

      {/* All Dialogs - extracted to SuperAdminDialogs component */}
      <SuperAdminDialogs
        // Plan Change Dialog
        planChangeDialog={planChangeDialog}
        onClosePlanChangeDialog={() => setPlanChangeDialog(false)}
        selectedOrg={selectedOrg}
        selectedPlan={selectedPlan}
        onSelectedPlanChange={setSelectedPlan}
        subscriptionPlans={subscriptionPlans}
        onPlanChangeSubmit={handlePlanChangeSubmit}
        // Organization Details Dialog
        orgDetailsDialog={orgDetailsDialog}
        onCloseOrgDetailsDialog={() => { setOrgDetailsDialog(false); setOrgDetails(null); }}
        orgDetails={orgDetails}
        orgDetailsLoading={orgDetailsLoading}
        // Organization Members Dialog
        orgMembersDialog={orgMembersDialog}
        onCloseOrgMembersDialog={() => setOrgMembersDialog(false)}
        orgMembers={orgMembers}
        // User Profile Dialog
        userProfileDialog={userProfileDialog}
        onCloseUserProfileDialog={() => setUserProfileDialog(false)}
        selectedUser={selectedUser}
        // User Organizations Dialog
        userOrgsDialog={userOrgsDialog}
        onCloseUserOrgsDialog={() => setUserOrgsDialog(false)}
        userOrganizations={userOrganizations}
        // Delete Organization Dialog
        deleteOrgDialog={deleteOrgDialog}
        onCloseDeleteOrgDialog={() => setDeleteOrgDialog({ open: false, org: null, loading: false })}
        onDeleteOrganization={handleDeleteOrganization}
        // Delete User Dialog
        deleteUserDialog={deleteUserDialog}
        onCloseDeleteUserDialog={() => setDeleteUserDialog({ open: false, user: null, loading: false })}
        onDeleteUser={handleDeleteUser}
        // Acquisition Dialog
        acquisitionDialog={acquisitionDialog}
        onCloseAcquisitionDialog={() => setAcquisitionDialog({ open: false, org: null, loading: false })}
        acquisitionForm={acquisitionForm}
        onAcquisitionFormChange={setAcquisitionForm}
        salesStaff={salesStaff}
        coupons={coupons}
        organizations={organizations}
        onSaveAcquisition={handleSaveAcquisition}
        // Test Email Dialog
        showTestEmailDialog={showTestEmailDialog}
        onCloseTestEmailDialog={() => { setShowTestEmailDialog(false); setTestEmailRecipient(''); }}
        testEmailRecipient={testEmailRecipient}
        onTestEmailRecipientChange={setTestEmailRecipient}
        sendingTestEmail={sendingTestEmail}
        onSendTestEmail={handleSendTestEmail}
        // Approve Dialog
        approveDialog={approveDialog}
        onCloseApproveDialog={() => setApproveDialog({ open: false, request: null })}
        adminNotes={adminNotes}
        onAdminNotesChange={setAdminNotes}
        paymentReference={paymentReference}
        onPaymentReferenceChange={setPaymentReference}
        onApproveRequest={handleApproveRequest}
        // Reject Dialog
        rejectDialog={rejectDialog}
        onCloseRejectDialog={() => setRejectDialog({ open: false, request: null })}
        onRejectRequest={handleRejectRequest}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </div>
  );
};

export default SuperAdminDashboard;
