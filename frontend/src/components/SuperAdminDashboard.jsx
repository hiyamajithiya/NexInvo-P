import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
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
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SubscriptionPlans from './SubscriptionPlans';
import CouponManagement from './CouponManagement';
import './Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const SuperAdminDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeMenu === 'users') {
      loadUsers();
    }
  }, [activeMenu]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('access_token');

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
      const token = localStorage.getItem('access_token');
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

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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
      const token = localStorage.getItem('access_token');
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
      const token = localStorage.getItem('access_token');
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
      const token = localStorage.getItem('access_token');
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

  const handleViewOrgDetails = () => {
    handleOrgMenuClose();
    showSnackbar(`Viewing details for ${selectedOrg?.name}`, 'info');
  };

  const handleViewOrgMembers = () => {
    handleOrgMenuClose();
    showSnackbar(`Viewing members for ${selectedOrg?.name}`, 'info');
  };

  const handleViewUserProfile = () => {
    handleUserMenuClose();
    showSnackbar(`Viewing profile for ${selectedUser?.username}`, 'info');
  };

  const handleViewUserOrganizations = () => {
    handleUserMenuClose();
    showSnackbar(`Viewing organizations for ${selectedUser?.username}`, 'info');
  };

  const handleResetPassword = () => {
    handleUserMenuClose();
    showSnackbar(`Password reset email sent to ${selectedUser?.email}`, 'info');
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Dashboard Overview';
      case 'organizations': return 'Organizations Management';
      case 'users': return 'User Management';
      case 'analytics': return 'Analytics & Reports';
      case 'billing': return 'Billing & Subscriptions';
      case 'subscription-plans': return 'Subscription Plans';
      case 'coupons': return 'Coupon Management';
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
            All Organizations
          </Typography>
          <Button variant="contained" sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none'
          }}>
            Export Data
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Members</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
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
                    {new Date(org.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
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
          <Divider />
          <MenuItem onClick={handleToggleOrgStatus}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon fontSize="small" sx={{ color: '#ef4444' }} />
              <Typography sx={{ color: '#ef4444' }}>
                {selectedOrg?.is_active ? 'Deactivate' : 'Activate'}
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
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>All System Users</Typography>
            <Button
              variant="contained"
              sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textTransform: 'none' }}
              onClick={() => alert('Add New User feature coming soon! Users can currently register through the registration page.')}
            >
              Add New User
            </Button>
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
                  {users.map((user) => (
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
                        {new Date(user.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                <BlockIcon fontSize="small" sx={{ color: '#ef4444' }} />
                <Typography sx={{ color: '#ef4444' }}>
                  {selectedUser?.is_active ? 'Deactivate User' : 'Activate User'}
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
                      {org.created_at ? new Date(org.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : '-'}
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

    // Build subscription plans array from plan breakdown data
    const subscriptionPlans = Object.entries(stats?.planBreakdown || {}).map(([planKey, count]) => ({
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
          {subscriptionPlans.length === 0 ? (
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
              {subscriptionPlans.map((plan) => (
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
                      <TableCell sx={{ color: '#6b7280' }}>{new Date(txn.date).toLocaleDateString('en-IN')}</TableCell>
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

  const renderSettingsContent = () => {
    return (
      <>
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

  const renderContent = () => {
    switch (activeMenu) {
      case 'organizations':
        return renderOrganizationsContent();
      case 'users':
        return renderUsersContent();
      case 'analytics':
        return renderAnalyticsContent();
      case 'billing':
        return renderBillingContent();
      case 'subscription-plans':
        return <SubscriptionPlans />;
      case 'coupons':
        return <CouponManagement />;
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
            <div className="logo-icon">⚡</div>
            <h2 className="logo-text">Super Admin</h2>
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
            <div className="search-box">
              <input type="text" placeholder="Search..." />
              <span className="search-icon">🔍</span>
            </div>
            <div className="user-menu">
              <div
                className="user-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ cursor: 'pointer' }}
              >
                SA
              </div>
              {showUserDropdown && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">Super Admin</div>
                  </div>
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setActiveMenu('settings');
                      setShowUserDropdown(false);
                    }}
                  >
                    <span>⚙️</span> Settings
                  </button>
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
      </div>

      {/* Plan Change Dialog */}
      <Dialog
        open={planChangeDialog}
        onClose={() => setPlanChangeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Change Organization Plan
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Select a new plan for <strong>{selectedOrg?.name}</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Subscription Plan</InputLabel>
              <Select
                value={selectedPlan}
                label="Subscription Plan"
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <MenuItem value="free">Free Trial</MenuItem>
                <MenuItem value="basic">Basic Plan</MenuItem>
                <MenuItem value="professional">Professional Plan</MenuItem>
                <MenuItem value="enterprise">Enterprise Plan</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPlanChangeDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePlanChangeSubmit}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Update Plan
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
