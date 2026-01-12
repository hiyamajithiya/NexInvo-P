import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Avatar,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  AttachMoney as AttachMoneyIcon,
  Support as SupportIcon,
  Sell as SalesIcon,
} from '@mui/icons-material';
import { superadminAPI, subscriptionAPI, organizationAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SubscriptionPlans from './SubscriptionPlans';
import CouponManagement from './CouponManagement';
import StaffManagement from './StaffManagement';
import BulkEmailManager from './BulkEmailManager';
import PaymentSettingsAdmin from './PaymentSettingsAdmin';
import PaymentRequestsAdmin from './PaymentRequestsAdmin';
import ReviewsAdmin from './ReviewsAdmin';
import './Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

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

  // Search states
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [orgStatusFilter, setOrgStatusFilter] = useState('all');
  const [orgPlanFilter, setOrgPlanFilter] = useState('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Filtered data
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
                          org.slug?.toLowerCase().includes(orgSearchTerm.toLowerCase());
    const matchesStatus = orgStatusFilter === 'all' ||
                          (orgStatusFilter === 'active' && org.is_active) ||
                          (orgStatusFilter === 'inactive' && !org.is_active);
    const matchesPlan = orgPlanFilter === 'all' || org.plan === orgPlanFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesStatus = userStatusFilter === 'all' ||
                          (userStatusFilter === 'active' && user.is_active) ||
                          (userStatusFilter === 'inactive' && !user.is_active);
    const matchesRole = userRoleFilter === 'all' ||
                        (userRoleFilter === 'superadmin' && user.is_superuser) ||
                        (userRoleFilter === 'admin' && user.role === 'admin' && !user.is_superuser) ||
                        (userRoleFilter === 'user' && user.role !== 'admin' && !user.is_superuser);
    return matchesSearch && matchesStatus && matchesRole;
  });

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
      const token = sessionStorage.getItem('access_token');

      // Get superadmin statistics
      const statsResponse = await axios.get(`${API_BASE_URL}/superadmin/stats/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsResponse.data);

      // Get all organizations
      const orgsResponse = await axios.get(`${API_BASE_URL}/organizations/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/subscription-plans/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionPlans(response.data);
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    }
  };

  const loadEmailConfig = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/superadmin/email-config/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = sessionStorage.getItem('access_token');
      await axios.patch(
        `${API_BASE_URL}/organizations/${selectedOrg.id}/`,
        { plan: selectedPlan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      await axios.patch(
        `${API_BASE_URL}/organizations/${selectedOrg.id}/`,
        { is_active: !selectedOrg.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      await axios.patch(
        `${API_BASE_URL}/users/${selectedUser.id}/`,
        { is_active: !selectedUser.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(
        `${API_BASE_URL}/organizations/${selectedOrg.id}/members/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(
        `${API_BASE_URL}/users/${selectedUser.id}/organizations/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      await axios.delete(
        `${API_BASE_URL}/users/${deleteUserDialog.user.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      await axios.post(
        `${API_BASE_URL}/users/${selectedUser.id}/reset-password/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      const [staffResponse, couponsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/staff-profiles/?staff_type=sales`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/coupons/`, { headers: { Authorization: `Bearer ${token}` } }),
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
      const token = sessionStorage.getItem('access_token');
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

      await axios.patch(
        `${API_BASE_URL}/organizations/${acquisitionDialog.org.id}/`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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

  const renderDashboardContent = () => {
    const planData = stats?.planBreakdown ? Object.entries(stats.planBreakdown).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    })) : [];

    const activityData = [
      { name: 'Active (30d)', value: stats?.activeOrganizations || 0 },
      { name: 'New (7d)', value: stats?.recentOrganizations || 0 },
      { name: 'Inactive', value: (stats?.totalOrganizations || 0) - (stats?.activeOrganizations || 0) },
    ];

    return (
      <>
        {/* Statistics Cards */}
        <div className="stats-container">
          <div className="stat-card purple" onClick={() => setActiveMenu('organizations')}>
            <div className="stat-header">
              <div className="stat-icon-wrapper purple-bg">
                <span className="stat-icon-lg">🏢</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Total Organizations</h3>
              <p className="stat-number">{stats?.totalOrganizations || 0}</p>
              <p className="stat-label">{stats?.activeOrganizations || 0} active this month</p>
            </div>
          </div>

          <div className="stat-card blue" onClick={() => setActiveMenu('users')}>
            <div className="stat-header">
              <div className="stat-icon-wrapper blue-bg">
                <span className="stat-icon-lg">👥</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Total Users</h3>
              <p className="stat-number">{stats?.totalUsers || 0}</p>
              <p className="stat-label">Across all organizations</p>
            </div>
          </div>

          <div className="stat-card green" onClick={() => setActiveMenu('billing')}>
            <div className="stat-header">
              <div className="stat-icon-wrapper green-bg">
                <span className="stat-icon-lg">💰</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">MRR</h3>
              <p className="stat-number">₹{(stats?.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}</p>
              <p className="stat-label">Monthly Recurring Revenue</p>
            </div>
          </div>

          <div className="stat-card orange" onClick={() => setActiveMenu('analytics')}>
            <div className="stat-header">
              <div className="stat-icon-wrapper orange-bg">
                <span className="stat-icon-lg">📊</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Paid Subscriptions</h3>
              <p className="stat-number">{stats?.paidSubscriptions || 0}</p>
              <p className="stat-label">Active paid plans</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          {/* Subscription Plans Chart */}
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>
              Subscription Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* Activity Chart */}
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>
              Organization Activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </div>

        {/* Quick Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginTop: '24px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 2,
                p: 1.5,
                border: '2px solid #10b981'
              }}>
                <CheckCircleIcon sx={{ fontSize: 32, color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                  {stats?.activeOrganizations || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Active Organizations (30 days)
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(stats?.activeOrganizations / stats?.totalOrganizations * 100) || 0}
              sx={{ mt: 2, height: 6, borderRadius: 3, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }}
            />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 2,
                p: 1.5,
                border: '2px solid #3b82f6'
              }}>
                <TrendingUpIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                  {stats?.recentOrganizations || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  New Organizations (7 days)
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#10b981', mt: 2, display: 'block' }}>
              ↑ Growing steadily
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 2,
                p: 1.5,
                border: '2px solid #ef4444'
              }}>
                <BlockIcon sx={{ fontSize: 32, color: '#ef4444' }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                  {(stats?.totalOrganizations - stats?.activeOrganizations) || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Inactive Organizations
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#6b7280', mt: 2, display: 'block' }}>
              Needs attention
            </Typography>
          </Paper>
        </div>
      </>
    );
  };

  const renderOrganizationsContent = () => {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
            All Organizations ({filteredOrganizations.length})
          </Typography>
          <Button variant="contained" sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none'
          }}>
            Export Data
          </Button>
        </Box>

        {/* Search and Filter Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name or slug..."
            value={orgSearchTerm}
            onChange={(e) => setOrgSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250, flex: 1 }}
            InputProps={{
              startAdornment: <Box sx={{ mr: 1, color: '#9ca3af' }}>🔍</Box>
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={orgStatusFilter}
              label="Status"
              onChange={(e) => setOrgStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Plan</InputLabel>
            <Select
              value={orgPlanFilter}
              label="Plan"
              onChange={(e) => setOrgPlanFilter(e.target.value)}
            >
              <MenuItem value="all">All Plans</MenuItem>
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="professional">Professional</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>
          {(orgSearchTerm || orgStatusFilter !== 'all' || orgPlanFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setOrgSearchTerm('');
                setOrgStatusFilter('all');
                setOrgPlanFilter('all');
              }}
              sx={{ textTransform: 'none' }}
            >
              Clear Filters
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Members</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#6b7280' }}>
                      {organizations.length === 0 ? 'No organizations found' : 'No organizations match your search criteria'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredOrganizations.map((org) => (
                <TableRow key={org.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{
                        bgcolor: '#8b5cf6',
                        width: 40,
                        height: 40
                      }}>
                        {org.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {org.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {org.slug}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.plan.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor:
                          org.plan === 'enterprise' ? '#fef3c7' :
                          org.plan === 'professional' ? '#ddd6fe' :
                          org.plan === 'basic' ? '#dbeafe' : '#f3f4f6',
                        color:
                          org.plan === 'enterprise' ? '#92400e' :
                          org.plan === 'professional' ? '#5b21b6' :
                          org.plan === 'basic' ? '#1e40af' : '#374151',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.acquisition_source_display || 'Organic'}
                      size="small"
                      sx={{
                        bgcolor:
                          org.acquisition_source === 'sales' ? '#ddd6fe' :
                          org.acquisition_source === 'advertisement' ? '#fef3c7' :
                          org.acquisition_source === 'referral' ? '#e0e7ff' :
                          org.acquisition_source === 'coupon' ? '#fef3c7' :
                          '#d1fae5',
                        color:
                          org.acquisition_source === 'sales' ? '#5b21b6' :
                          org.acquisition_source === 'advertisement' ? '#92400e' :
                          org.acquisition_source === 'referral' ? '#3730a3' :
                          org.acquisition_source === 'coupon' ? '#92400e' :
                          '#065f46',
                        fontWeight: 500,
                        fontSize: '0.7rem'
                      }}
                    />
                    {org.acquired_by_name && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mt: 0.5 }}>
                        {org.acquired_by_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.member_count}
                      size="small"
                      icon={<PeopleIcon />}
                      sx={{ bgcolor: '#f3f4f6' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      icon={org.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                      sx={{
                        bgcolor: org.is_active ? '#d1fae5' : '#fee2e2',
                        color: org.is_active ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#6b7280' }}>
                    {formatDate(org.created_at)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleOrgMenuOpen(e, org)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Organization Action Menu */}
        <Menu
          anchorEl={orgMenuAnchor}
          open={Boolean(orgMenuAnchor)}
          onClose={handleOrgMenuClose}
          slotProps={{
            paper: { sx: { boxShadow: 3, borderRadius: 2 } }
          }}
        >
          <MenuItem onClick={handleViewOrgDetails}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon fontSize="small" sx={{ color: '#6b7280' }} />
              <Typography>View Details</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleViewOrgMembers}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon fontSize="small" sx={{ color: '#6b7280' }} />
              <Typography>View Members</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleChangePlan}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
              <Typography>Change Plan</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleOpenAcquisitionDialog}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SalesIcon fontSize="small" sx={{ color: '#f59e0b' }} />
              <Typography>Edit Acquisition</Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleToggleOrgStatus}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon fontSize="small" sx={{ color: '#ef4444' }} />
              <Typography sx={{ color: '#ef4444' }}>
                {selectedOrg?.is_active ? 'Deactivate' : 'Activate'}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={handleOpenDeleteDialog}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon fontSize="small" sx={{ color: '#dc2626' }} />
              <Typography sx={{ color: '#dc2626', fontWeight: 600 }}>
                Delete Organization
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Paper>
    );
  };

  const renderUsersContent = () => {
    return (
      <>
        {/* User Statistics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #8b5cf6' }}>
                <PeopleIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Total Users</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.totalUsers || 0}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #10b981' }}>
                <CheckCircleIcon sx={{ fontSize: 28, color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Active Users</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.activeUsers || 0}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #f59e0b' }}>
                <BusinessIcon sx={{ fontSize: 28, color: '#f59e0b' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Org Admins</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.orgAdmins || 0}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #3b82f6' }}>
                <AccountCircleIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Super Admins</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.superAdmins || 0}</Typography>
              </Box>
            </Box>
          </Paper>
        </div>

        {/* Users Table */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>All System Users ({filteredUsers.length})</Typography>
            <Button
              variant="contained"
              sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textTransform: 'none' }}
              onClick={() => alert('Add New User feature coming soon! Users can currently register through the registration page.')}
            >
              Add New User
            </Button>
          </Box>

          {/* Search and Filter Section */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search by username or email..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 250, flex: 1 }}
              InputProps={{
                startAdornment: <Box sx={{ mr: 1, color: '#9ca3af' }}>🔍</Box>
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={userStatusFilter}
                label="Status"
                onChange={(e) => setUserStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={userRoleFilter}
                label="Role"
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="superadmin">Super Admin</MenuItem>
                <MenuItem value="admin">Org Admin</MenuItem>
                <MenuItem value="user">Regular User</MenuItem>
              </Select>
            </FormControl>
            {(userSearchTerm || userStatusFilter !== 'all' || userRoleFilter !== 'all') && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setUserSearchTerm('');
                  setUserStatusFilter('all');
                  setUserRoleFilter('all');
                }}
                sx={{ textTransform: 'none' }}
              >
                Clear Filters
              </Button>
            )}
          </Box>

          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organizations</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Joined</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ color: '#6b7280' }}>
                          {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.map((user) => (
                    <TableRow key={user.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#8b5cf6', width: 36, height: 36 }}>
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: '#111827' }}>{user.username}</Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>ID: {user.id}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_superuser ? 'SUPERADMIN' : user.role?.toUpperCase() || 'USER'}
                          size="small"
                          sx={{
                            bgcolor: user.is_superuser ? '#fef3c7' : user.role === 'admin' ? '#ddd6fe' : '#f3f4f6',
                            color: user.is_superuser ? '#92400e' : user.role === 'admin' ? '#5b21b6' : '#374151',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={user.organization_count || 0} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          icon={user.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                          sx={{
                            bgcolor: user.is_active ? '#d1fae5' : '#fee2e2',
                            color: user.is_active ? '#065f46' : '#991b1b',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>
                        {formatDate(user.date_joined)}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleUserMenuOpen(e, user)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* User Action Menu */}
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            slotProps={{
              paper: { sx: { boxShadow: 3, borderRadius: 2 } }
            }}
          >
            <MenuItem onClick={handleViewUserProfile}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountCircleIcon fontSize="small" sx={{ color: '#6b7280' }} />
                <Typography>View Profile</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleViewUserOrganizations}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon fontSize="small" sx={{ color: '#6b7280' }} />
                <Typography>View Organizations</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleResetPassword}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon fontSize="small" sx={{ color: '#6b7280' }} />
                <Typography>Reset Password</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleToggleUserStatus}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BlockIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                <Typography sx={{ color: '#f59e0b' }}>
                  {selectedUser?.is_active ? 'Deactivate User' : 'Activate User'}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleOpenDeleteUserDialog}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BlockIcon fontSize="small" sx={{ color: '#dc2626' }} />
                <Typography sx={{ color: '#dc2626' }}>
                  Delete User
                </Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Paper>
      </>
    );
  };

  const renderAnalyticsContent = () => {
    // Use real revenue trends from API or fallback to empty array
    const revenueData = stats?.revenueTrends || [];

    // Use real top organizations from API or fallback to first 5 orgs
    const topOrganizations = stats?.topOrganizations || organizations.slice(0, 5);

    return (
      <>
        {/* Analytics Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #10b981' }}>
                <TrendingUpIcon sx={{ fontSize: 28, color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Revenue</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</Typography>
              </Box>
            </Box>
            {stats?.revenueGrowth !== undefined && (
              <Typography variant="caption" sx={{ color: stats.revenueGrowth >= 0 ? '#10b981' : '#ef4444' }}>
                {stats.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth).toFixed(1)}% from last month
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #3b82f6' }}>
                <AttachMoneyIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Monthly Recurring Revenue</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>₹{(stats?.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}</Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>Subscription revenue stream</Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #8b5cf6' }}>
                <SpeedIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Avg. Processing Time</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.avgProcessingTime || 0}s</Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>System response time</Typography>
          </Paper>
        </div>

        {/* Revenue Chart */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>Subscription Revenue Trends (Last 6 Months)</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Subscription Revenue (₹)" />
              <Bar dataKey="users" fill="#3b82f6" radius={[8, 8, 0, 0]} name="New Users" />
              <Bar dataKey="organizations" fill="#10b981" radius={[8, 8, 0, 0]} name="New Organizations" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Recent Organizations */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>Recent Organizations</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Users</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topOrganizations.map((org, index) => (
                  <TableRow key={org.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>
                      <Chip
                        label={`${index + 1}`}
                        size="small"
                        sx={{
                          bgcolor: index === 0 ? '#fef3c7' : index === 1 ? '#ddd6fe' : '#f3f4f6',
                          color: index === 0 ? '#92400e' : index === 1 ? '#5b21b6' : '#374151',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#8b5cf6', width: 36, height: 36 }}>{org.name.charAt(0)}</Avatar>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{org.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={org.plan.toUpperCase()} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280' }}>{org.user_count || 0} users</TableCell>
                    <TableCell sx={{ color: '#6b7280' }}>
                      {org.created_at ? formatDate(org.created_at) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </>
    );
  };

  const renderBillingContent = () => {
    // Map organization plan types to display info
    const planColorMap = {
      'free': '#6b7280',
      'basic': '#3b82f6',
      'professional': '#8b5cf6',
      'enterprise': '#f59e0b'
    };

    // Build plan breakdown array from stats for display
    const planBreakdownDisplay = Object.entries(stats?.planBreakdown || {}).map(([planKey, count]) => ({
      name: planKey.charAt(0).toUpperCase() + planKey.slice(1),
      users: count,
      color: planColorMap[planKey] || '#6b7280'
    }));

    // Calculate monthly revenue from revenue trends (last month)
    const lastMonthRevenue = stats?.revenueTrends?.length > 0
      ? stats.revenueTrends[stats.revenueTrends.length - 1]?.revenue || 0
      : 0;

    // Get recent transactions from API
    const recentTransactions = stats?.recentTransactions || [];

    return (
      <>
        {/* Billing Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #10b981' }}>
                <AttachMoneyIcon sx={{ fontSize: 28, color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Monthly Revenue</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>₹{lastMonthRevenue.toLocaleString('en-IN')}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #3b82f6' }}>
                <CheckCircleIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Paid Subscriptions</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.paidSubscriptions || 0}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #f59e0b' }}>
                <TrendingUpIcon sx={{ fontSize: 28, color: '#f59e0b' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Monthly Recurring Revenue</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>₹{(stats?.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #8b5cf6' }}>
                <CheckCircleIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Active Orgs</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.activeOrganizations || 0}</Typography>
              </Box>
            </Box>
          </Paper>
        </div>

        {/* Subscription Plans */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>Subscription Plans Overview</Typography>
          {planBreakdownDisplay.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'inline-flex', p: 3, bgcolor: '#f3f4f6', borderRadius: '50%' }}>
                  <Typography sx={{ fontSize: 48 }}>📋</Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
                No Subscription Plans Created Yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                Create subscription plans to start managing organization subscriptions
              </Typography>
              <Button
                variant="contained"
                onClick={() => setActiveMenu('subscription-plans')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  fontWeight: 'bold',
                  px: 4
                }}
              >
                Create Subscription Plan
              </Button>
            </Box>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              {planBreakdownDisplay.map((plan) => (
                <Paper key={plan.name} sx={{ p: 3, border: '2px solid', borderColor: plan.color, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: plan.color, color: 'white', px: 2, py: 0.5, borderBottomLeftRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{plan.users} Orgs</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: plan.color, mb: 1 }}>{plan.name}</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
                    {plan.users}
                    <Typography component="span" variant="body2" sx={{ color: '#6b7280' }}> organizations</Typography>
                  </Typography>
                </Paper>
              ))}
            </div>
          )}
        </Paper>

        {/* Recent Transactions */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>Recent Transactions</Typography>
          {recentTransactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" sx={{ color: '#6b7280', mb: 2 }}>
                No recent subscription transactions
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Subscription payments will appear here once organizations start subscribing
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Transaction ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTransactions.map((txn) => (
                    <TableRow key={txn.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell sx={{ color: '#6b7280', fontFamily: 'monospace' }}>#{txn.id.substring(0, 8)}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#111827' }}>{txn.organization}</TableCell>
                      <TableCell>
                        <Chip label={txn.plan} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#111827' }}>₹{txn.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>{formatDate(txn.date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={txn.status.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: txn.status === 'completed' ? '#d1fae5' : txn.status === 'pending' ? '#fed7aa' : '#fee2e2',
                            color: txn.status === 'completed' ? '#065f46' : txn.status === 'pending' ? '#92400e' : '#991b1b',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </>
    );
  };

  const handleEmailConfigChange = (field, value) => {
    setEmailConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEmailConfig = async () => {
    setSavingEmail(true);
    try {
      const token = sessionStorage.getItem('access_token');
      await axios.post(
        `${API_BASE_URL}/superadmin/email-config/`,
        emailConfig,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = sessionStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/superadmin/email-config/test/`,
        { recipient_email: testEmailRecipient },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  const renderSettingsContent = () => {
    return (
      <>
        {/* Email Configuration */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>Email Configuration</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                Configure SMTP settings for sending emails (password reset, notifications, etc.)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setShowTestEmailDialog(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 'bold',
                  borderColor: '#6366f1',
                  color: '#6366f1',
                  '&:hover': {
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(99, 102, 241, 0.04)'
                  }
                }}
              >
                Send Test Email
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveEmailConfig}
                disabled={savingEmail}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                {savingEmail ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Configuration'}
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Host"
                value={emailConfig.host}
                onChange={(e) => handleEmailConfigChange('host', e.target.value)}
                placeholder="smtp.gmail.com"
                helperText="SMTP server hostname"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Port"
                type="number"
                value={emailConfig.port}
                onChange={(e) => handleEmailConfigChange('port', e.target.value)}
                placeholder="587"
                helperText="Usually 587 for TLS or 465 for SSL"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username / Email"
                value={emailConfig.username}
                onChange={(e) => handleEmailConfigChange('username', e.target.value)}
                placeholder="your-email@example.com"
                helperText="SMTP authentication username"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={emailConfig.password}
                onChange={(e) => handleEmailConfigChange('password', e.target.value)}
                placeholder="••••••••"
                helperText="SMTP authentication password"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From Email"
                value={emailConfig.from_email}
                onChange={(e) => handleEmailConfigChange('from_email', e.target.value)}
                placeholder="noreply@nexinvo.com"
                helperText="Default sender email address"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>Use TLS</Typography>
                  <Chip
                    label={emailConfig.use_tls ? "ON" : "OFF"}
                    onClick={() => handleEmailConfigChange('use_tls', !emailConfig.use_tls)}
                    sx={{
                      bgcolor: emailConfig.use_tls ? '#d1fae5' : '#fee2e2',
                      color: emailConfig.use_tls ? '#065f46' : '#991b1b',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Settings Categories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Feature Flags */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>Feature Flags</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {stats?.featureFlags && (
                <>
                  {stats.featureFlags.organizationInvites !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Organization Invites</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Allow users to invite members</Typography>
                      </Box>
                      <Chip
                        label={stats.featureFlags.organizationInvites ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          bgcolor: stats.featureFlags.organizationInvites ? '#d1fae5' : '#fee2e2',
                          color: stats.featureFlags.organizationInvites ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  )}
                  {stats.featureFlags.apiAccess !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>API Access</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Enable API for integrations</Typography>
                      </Box>
                      <Chip
                        label={stats.featureFlags.apiAccess ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          bgcolor: stats.featureFlags.apiAccess ? '#d1fae5' : '#fee2e2',
                          color: stats.featureFlags.apiAccess ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  )}
                  {stats.featureFlags.trialPeriod !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Trial Period</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>14-day trial for new signups</Typography>
                      </Box>
                      <Chip
                        label={stats.featureFlags.trialPeriod ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          bgcolor: stats.featureFlags.trialPeriod ? '#d1fae5' : '#fee2e2',
                          color: stats.featureFlags.trialPeriod ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  )}
                  {stats.featureFlags.analyticsTracking !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Analytics Tracking</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Google Analytics integration</Typography>
                      </Box>
                      <Chip
                        label={stats.featureFlags.analyticsTracking ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          bgcolor: stats.featureFlags.analyticsTracking ? '#d1fae5' : '#fee2e2',
                          color: stats.featureFlags.analyticsTracking ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  )}
                  {stats.featureFlags.emailNotifications !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Email Notifications</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Automated email alerts</Typography>
                      </Box>
                      <Chip
                        label={stats.featureFlags.emailNotifications ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          bgcolor: stats.featureFlags.emailNotifications ? '#d1fae5' : '#fee2e2',
                          color: stats.featureFlags.emailNotifications ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  )}
                  {stats.featureFlags.autoBackup !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Auto Backup</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Automated database backups</Typography>
                      </Box>
                      <Chip
                        label={stats.featureFlags.autoBackup ? "ON" : "OFF"}
                        size="small"
                        sx={{
                          bgcolor: stats.featureFlags.autoBackup ? '#d1fae5' : '#fee2e2',
                          color: stats.featureFlags.autoBackup ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Paper>

          {/* System Information */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>System Information</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {stats?.systemInfo && (
                <>
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Application Version</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.appVersion || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Database Size</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.databaseSize || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Server Uptime</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.serverUptime || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Environment</Typography>
                    <Chip
                      label={stats.systemInfo.environment || 'Unknown'}
                      size="small"
                      sx={{
                        bgcolor: stats.systemInfo.environment === 'Production' ? '#d1fae5' : '#dbeafe',
                        color: stats.systemInfo.environment === 'Production' ? '#065f46' : '#1e40af',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Python Version</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.pythonVersion || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Django Version</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.djangoVersion || 'N/A'}</Typography>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </div>
      </>
    );
  };

  const renderUpgradeRequestsContent = () => {
    const pendingRequests = upgradeRequests.filter(r => r.status === 'pending');
    const processedRequests = upgradeRequests.filter(r => r.status !== 'pending');

    return (
      <>
        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Notifications</Typography>
              {unreadNotificationCount > 0 && (
                <Button size="small" onClick={handleMarkAllNotificationsAsRead}>
                  Mark All as Read
                </Button>
              )}
            </div>
            <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
              {notifications.slice(0, 5).map((notification) => (
                <Box
                  key={notification.id}
                  sx={{
                    p: 2,
                    borderBottom: '1px solid #e5e7eb',
                    bgcolor: notification.is_read ? 'white' : '#fef3c7',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827' }}>
                      {notification.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1, display: 'block' }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!notification.is_read && (
                      <Button size="small" onClick={() => handleMarkNotificationAsRead(notification.id)}>
                        Mark Read
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => handleDeleteNotification(notification.id)}>
                      🗑️
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Paper>
          </div>
        )}

        {/* Pending Upgrade Requests */}
        <div style={{ marginBottom: '24px' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#dc2626' }}>
            Pending Approval ({pendingRequests.length})
          </Typography>
          {loadingUpgradeRequests ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : pendingRequests.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography sx={{ color: '#6b7280' }}>No pending upgrade requests</Typography>
            </Paper>
          ) : (
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f9fafb' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Requested By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Current Plan</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Requested Plan</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Coupon</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id} hover>
                        <TableCell>{request.organization_name}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{request.requested_by_name}</Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>{request.requested_by_email}</Typography>
                        </TableCell>
                        <TableCell>{request.current_plan_name || 'None'}</TableCell>
                        <TableCell>
                          <Chip label={request.requested_plan_name} color="primary" size="small" />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#059669' }}>₹{parseFloat(request.amount).toFixed(2)}</TableCell>
                        <TableCell>{request.coupon_code || '-'}</TableCell>
                        <TableCell>{formatDate(request.created_at)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => {
                                setApproveDialog({ open: true, request });
                                setAdminNotes('');
                                setPaymentReference('');
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => {
                                setRejectDialog({ open: true, request });
                                setAdminNotes('');
                              }}
                            >
                              Reject
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </div>

        {/* Processed Requests History */}
        <div>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Request History ({processedRequests.length})
          </Typography>
          {processedRequests.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography sx={{ color: '#6b7280' }}>No processed requests yet</Typography>
            </Paper>
          ) : (
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f9fafb' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Requested Plan</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Processed</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {processedRequests.slice(0, 10).map((request) => (
                      <TableRow key={request.id} hover>
                        <TableCell>{request.organization_name}</TableCell>
                        <TableCell>{request.requested_plan_name}</TableCell>
                        <TableCell>₹{parseFloat(request.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={request.status.toUpperCase()}
                            color={request.status === 'approved' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {request.approved_at ? formatDate(request.approved_at) : '-'}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {request.admin_notes || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </div>
      </>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'organizations':
        return renderOrganizationsContent();
      case 'users':
        return renderUsersContent();
      case 'staff':
        return <StaffManagement />;
      case 'analytics':
        return renderAnalyticsContent();
      case 'billing':
        return renderBillingContent();
      case 'subscription-plans':
        return <SubscriptionPlans />;
      case 'coupons':
        return <CouponManagement />;
      case 'upgrade-requests':
        return renderUpgradeRequestsContent();
      case 'payment-requests':
        return <PaymentRequestsAdmin />;
      case 'payment-settings':
        return <PaymentSettingsAdmin />;
      case 'bulk-email':
        return <BulkEmailManager />;
      case 'reviews':
        return <ReviewsAdmin />;
      case 'settings':
        return renderSettingsContent();
      default:
        return renderDashboardContent();
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

      {/* Plan Change Dialog */}
      <Dialog
        open={planChangeDialog}
        onClose={() => setPlanChangeDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Change Organization Plan
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
              Select a new subscription plan for <strong>{selectedOrg?.name}</strong>
            </Typography>
            <Grid container spacing={2}>
              {subscriptionPlans.map((plan) => (
                <Grid item xs={12} sm={6} key={plan.id}>
                  <Paper
                    elevation={selectedPlan === plan.name.toLowerCase() ? 4 : 1}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      border: selectedPlan === plan.name.toLowerCase() ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={() => setSelectedPlan(plan.name.toLowerCase())}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        {plan.name}
                      </Typography>
                      {plan.highlight && (
                        <Chip label="POPULAR" size="small" sx={{ bgcolor: '#f59e0b', color: 'white', fontWeight: 'bold' }} />
                      )}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#8b5cf6', mb: 1 }}>
                      ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                      <Typography component="span" variant="body2" sx={{ color: '#6b7280', ml: 1 }}>
                        / {plan.billing_cycle}
                      </Typography>
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                        👥 {plan.max_users} users
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                        📄 {plan.max_invoices_per_month} invoices/month
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                        💾 {plan.max_storage_gb} GB storage
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setPlanChangeDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePlanChangeSubmit}
            disabled={!selectedPlan}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Update Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Organization Details Dialog */}
      <Dialog
        open={orgDetailsDialog}
        onClose={() => { setOrgDetailsDialog(false); setOrgDetails(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          fontWeight: 'bold',
          color: '#111827',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusinessIcon />
            Organization Details
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {orgDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : orgDetails ? (
            <Box>
              {/* Header Section */}
              <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                      {orgDetails.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={orgDetails.plan?.toUpperCase() || 'FREE'}
                        size="small"
                        sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                      />
                      <Chip
                        label={orgDetails.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: orgDetails.is_active ? '#d1fae5' : '#fee2e2',
                          color: orgDetails.is_active ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                      <Chip
                        label={orgDetails.business_type_display || 'Service Provider'}
                        size="small"
                        sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Owner Section */}
              {orgDetails.owner && (
                <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountCircleIcon fontSize="small" /> Owner Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Name</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{orgDetails.owner.full_name}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Email</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{orgDetails.owner.email}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Joined</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.owner.date_joined ? new Date(orgDetails.owner.date_joined).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Last Login</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.owner.last_login ? new Date(orgDetails.owner.last_login).toLocaleString('en-IN') : 'Never'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Subscription Section */}
              {orgDetails.subscription_info && (
                <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon fontSize="small" /> Subscription Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Plan</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{orgDetails.subscription_info.plan_name || 'N/A'}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Status</Typography>
                        <Chip
                          label={orgDetails.subscription_info.status?.toUpperCase() || 'N/A'}
                          size="small"
                          sx={{
                            bgcolor: orgDetails.subscription_info.status === 'active' ? '#d1fae5' :
                                    orgDetails.subscription_info.status === 'trial' ? '#fef3c7' : '#fee2e2',
                            color: orgDetails.subscription_info.status === 'active' ? '#065f46' :
                                   orgDetails.subscription_info.status === 'trial' ? '#92400e' : '#991b1b',
                            fontWeight: 'bold'
                          }}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Amount Paid</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.amount_paid ? `₹${parseFloat(orgDetails.subscription_info.amount_paid).toLocaleString('en-IN')}` : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Start Date</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.start_date ? new Date(orgDetails.subscription_info.start_date).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>End Date</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.end_date ? new Date(orgDetails.subscription_info.end_date).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Auto Renew</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.auto_renew ? 'Yes' : 'No'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Statistics Section */}
              {orgDetails.stats && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon fontSize="small" /> Organization Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1d4ed8' }}>{orgDetails.stats.total_clients}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Clients</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#16a34a' }}>{orgDetails.stats.total_invoices}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Invoices</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#faf5ff', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#7c3aed' }}>
                          ₹{parseFloat(orgDetails.stats.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Revenue</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d97706' }}>{orgDetails.stats.pending_invoices}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Pending Invoices</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#d1fae5', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#059669' }}>{orgDetails.stats.paid_invoices}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Paid Invoices</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Acquisition Info Section */}
              {orgDetails.acquisition_info && (
                <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SalesIcon fontSize="small" /> Acquisition Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Source</Typography>
                        <Chip
                          label={orgDetails.acquisition_info.source_display}
                          size="small"
                          sx={{
                            bgcolor: orgDetails.acquisition_info.source === 'sales' ? '#ddd6fe' :
                                    orgDetails.acquisition_info.source === 'organic' ? '#d1fae5' :
                                    orgDetails.acquisition_info.source === 'advertisement' ? '#fef3c7' :
                                    orgDetails.acquisition_info.source === 'referral' ? '#e0e7ff' :
                                    '#f3f4f6',
                            color: orgDetails.acquisition_info.source === 'sales' ? '#5b21b6' :
                                   orgDetails.acquisition_info.source === 'organic' ? '#065f46' :
                                   orgDetails.acquisition_info.source === 'advertisement' ? '#92400e' :
                                   orgDetails.acquisition_info.source === 'referral' ? '#3730a3' :
                                   '#374151',
                            fontWeight: 'bold'
                          }}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Acquisition Date</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.acquisition_info.date ? new Date(orgDetails.acquisition_info.date).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    {orgDetails.acquisition_info.sales_person && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#ddd6fe', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Sales Person</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#5b21b6' }}>
                            {orgDetails.acquisition_info.sales_person.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7c3aed' }}>
                            {orgDetails.acquisition_info.sales_person.email}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.referred_by && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Referred By</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#3730a3' }}>
                            {orgDetails.acquisition_info.referred_by.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.coupon && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Coupon Used</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#92400e' }}>
                            {orgDetails.acquisition_info.coupon.code}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#b45309' }}>
                            {orgDetails.acquisition_info.coupon.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.campaign && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Campaign</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#92400e' }}>
                            {orgDetails.acquisition_info.campaign}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.notes && (
                      <Grid item xs={12}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Notes</Typography>
                          <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                            {orgDetails.acquisition_info.notes}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Organization Info Section */}
              <Box sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
                  Additional Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Organization ID</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827', fontSize: '0.875rem', wordBreak: 'break-all' }}>{orgDetails.id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Members</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827' }}>{orgDetails.member_count} member(s)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Created</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                      {new Date(orgDetails.created_at).toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Last Updated</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                      {new Date(orgDetails.updated_at).toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Typography sx={{ color: '#6b7280' }}>No details available</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={() => { setOrgDetailsDialog(false); setOrgDetails(null); }}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Organization Members Dialog */}
      <Dialog
        open={orgMembersDialog}
        onClose={() => setOrgMembersDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Organization Members - {selectedOrg?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {orgMembers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#6b7280' }}>No members found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orgMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user?.username || 'N/A'}</TableCell>
                      <TableCell>{member.user?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={member.role.toUpperCase()} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: member.is_active ? '#d1fae5' : '#fee2e2',
                            color: member.is_active ? '#065f46' : '#991b1b'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setOrgMembersDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog
        open={userProfileDialog}
        onClose={() => setUserProfileDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          User Profile
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedUser && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#8b5cf6', width: 56, height: 56, fontSize: '1.5rem' }}>
                      {selectedUser.username?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        {selectedUser.username}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>{selectedUser.email}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>User ID</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{selectedUser.id}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Role</Typography>
                    <Chip
                      label={selectedUser.is_superuser ? 'SUPERADMIN' : selectedUser.role?.toUpperCase() || 'USER'}
                      size="small"
                      sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Status</Typography>
                    <Chip
                      label={selectedUser.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: selectedUser.is_active ? '#d1fae5' : '#fee2e2',
                        color: selectedUser.is_active ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Organizations</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                      {selectedUser.organization_count || 0} organizations
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Date Joined</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                      {new Date(selectedUser.date_joined).toLocaleString('en-IN')}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setUserProfileDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Organizations Dialog */}
      <Dialog
        open={userOrgsDialog}
        onClose={() => setUserOrgsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          User Organizations - {selectedUser?.username}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {userOrganizations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#6b7280' }}>User is not a member of any organizations</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userOrganizations.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>{membership.organization?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={membership.role.toUpperCase()} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={membership.organization?.plan?.toUpperCase() || 'N/A'} size="small" sx={{ bgcolor: '#ddd6fe', color: '#5b21b6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={membership.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: membership.is_active ? '#d1fae5' : '#fee2e2',
                            color: membership.is_active ? '#065f46' : '#991b1b'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setUserOrgsDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Organization Confirmation Dialog */}
      <Dialog
        open={deleteOrgDialog.open}
        onClose={() => !deleteOrgDialog.loading && setDeleteOrgDialog({ open: false, org: null, loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#dc2626' }}>
          Delete Organization
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to permanently delete the organization <strong>"{deleteOrgDialog.org?.name}"</strong>?
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
            This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ color: '#6b7280', fontSize: '0.875rem', mt: 1 }}>
            <li>All invoices and receipts</li>
            <li>All clients and their data</li>
            <li>All user memberships</li>
            <li>All settings and configurations</li>
            <li>Subscription information</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteOrgDialog({ open: false, org: null, loading: false })}
            variant="outlined"
            disabled={deleteOrgDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteOrganization}
            variant="contained"
            color="error"
            disabled={deleteOrgDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            {deleteOrgDialog.loading ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteUserDialog.open}
        onClose={() => !deleteUserDialog.loading && setDeleteUserDialog({ open: false, user: null, loading: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#dc2626' }}>
          Delete User
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to permanently delete the user <strong>"{deleteUserDialog.user?.email}"</strong>?
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
            This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ color: '#6b7280', fontSize: '0.875rem', mt: 1 }}>
            <li>User account and profile</li>
            <li>All organization memberships</li>
            <li>All user activity and logs</li>
            <li>Staff profile (if applicable)</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteUserDialog({ open: false, user: null, loading: false })}
            variant="outlined"
            disabled={deleteUserDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={deleteUserDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            {deleteUserDialog.loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Acquisition Dialog */}
      <Dialog
        open={acquisitionDialog.open}
        onClose={() => !acquisitionDialog.loading && setAcquisitionDialog({ open: false, org: null, loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', bgcolor: '#fef3c7', color: '#92400e' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SalesIcon />
            Edit Acquisition - {acquisitionDialog.org?.name}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Acquisition Source</InputLabel>
                <Select
                  value={acquisitionForm.acquisition_source}
                  label="Acquisition Source"
                  onChange={(e) => setAcquisitionForm({ ...acquisitionForm, acquisition_source: e.target.value })}
                >
                  <MenuItem value="organic">Direct/Organic</MenuItem>
                  <MenuItem value="sales">Sales Team</MenuItem>
                  <MenuItem value="advertisement">Advertisement</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                  <MenuItem value="coupon">Coupon Campaign</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {acquisitionForm.acquisition_source === 'sales' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sales Person</InputLabel>
                  <Select
                    value={acquisitionForm.acquired_by}
                    label="Sales Person"
                    onChange={(e) => setAcquisitionForm({ ...acquisitionForm, acquired_by: e.target.value })}
                  >
                    <MenuItem value="">-- Select Sales Person --</MenuItem>
                    {salesStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.user}>
                        {staff.user_name} ({staff.user_email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {acquisitionForm.acquisition_source === 'referral' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Referred By Organization</InputLabel>
                  <Select
                    value={acquisitionForm.referred_by}
                    label="Referred By Organization"
                    onChange={(e) => setAcquisitionForm({ ...acquisitionForm, referred_by: e.target.value })}
                  >
                    <MenuItem value="">-- Select Organization --</MenuItem>
                    {organizations.filter(org => org.id !== acquisitionDialog.org?.id).map((org) => (
                      <MenuItem key={org.id} value={org.id}>
                        {org.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {['coupon', 'advertisement'].includes(acquisitionForm.acquisition_source) && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Coupon/Campaign Code</InputLabel>
                  <Select
                    value={acquisitionForm.acquisition_coupon}
                    label="Coupon/Campaign Code"
                    onChange={(e) => setAcquisitionForm({ ...acquisitionForm, acquisition_coupon: e.target.value })}
                  >
                    <MenuItem value="">-- Select Coupon --</MenuItem>
                    {coupons.map((coupon) => (
                      <MenuItem key={coupon.id} value={coupon.id}>
                        {coupon.code} - {coupon.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {acquisitionForm.acquisition_source === 'advertisement' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Campaign Name"
                  value={acquisitionForm.acquisition_campaign}
                  onChange={(e) => setAcquisitionForm({ ...acquisitionForm, acquisition_campaign: e.target.value })}
                  placeholder="e.g., Google Ads Jan 2026"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={acquisitionForm.acquisition_notes}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, acquisition_notes: e.target.value })}
                placeholder="Additional details about how this tenant was acquired..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
          <Button
            onClick={() => setAcquisitionDialog({ open: false, org: null, loading: false })}
            variant="outlined"
            disabled={acquisitionDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAcquisition}
            variant="contained"
            disabled={acquisitionDialog.loading}
            sx={{ textTransform: 'none', bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            {acquisitionDialog.loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog
        open={showTestEmailDialog}
        onClose={() => setShowTestEmailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Send Test Email
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Enter the recipient email address to send a test email and verify your SMTP configuration.
          </Typography>
          <TextField
            fullWidth
            label="Recipient Email"
            type="email"
            value={testEmailRecipient}
            onChange={(e) => setTestEmailRecipient(e.target.value)}
            placeholder="test@example.com"
            helperText="The email address where the test email will be sent"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={() => {
              setShowTestEmailDialog(false);
              setTestEmailRecipient('');
            }}
            sx={{ textTransform: 'none', color: '#6b7280' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail || !testEmailRecipient}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {sendingTestEmail ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Upgrade Request Dialog */}
      <Dialog open={approveDialog.open} onClose={() => setApproveDialog({ open: false, request: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Approve Upgrade Request</DialogTitle>
        <DialogContent>
          {approveDialog.request && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Organization:</strong> {approveDialog.request.organization_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Requested Plan:</strong> {approveDialog.request.requested_plan_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Amount:</strong> ₹{parseFloat(approveDialog.request.amount).toFixed(2)}
              </Typography>
              {approveDialog.request.coupon_code && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Coupon Applied:</strong> {approveDialog.request.coupon_code}
                </Typography>
              )}
              <TextField
                fullWidth
                label="Payment Reference/Transaction ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Enter payment transaction ID for verification"
              />
              <TextField
                fullWidth
                label="Admin Notes"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApproveDialog({ open: false, request: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApproveRequest}
          >
            Confirm Approval
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Upgrade Request Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, request: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#dc2626' }}>Reject Upgrade Request</DialogTitle>
        <DialogContent>
          {rejectDialog.request && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Organization:</strong> {rejectDialog.request.organization_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Requested Plan:</strong> {rejectDialog.request.requested_plan_name}
              </Typography>
              <TextField
                fullWidth
                label="Reason for Rejection"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialog({ open: false, request: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectRequest}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

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
