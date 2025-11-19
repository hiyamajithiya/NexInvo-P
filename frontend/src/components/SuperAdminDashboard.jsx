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

  useEffect(() => {
    loadData();
  }, []);

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

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Dashboard Overview';
      case 'organizations': return 'Organizations Management';
      case 'users': return 'User Management';
      case 'analytics': return 'Analytics & Reports';
      case 'billing': return 'Billing & Subscriptions';
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

          <div className="stat-card green" onClick={() => setActiveMenu('analytics')}>
            <div className="stat-header">
              <div className="stat-icon-wrapper green-bg">
                <span className="stat-icon-lg">📄</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Total Invoices</h3>
              <p className="stat-number">{stats?.totalInvoices || 0}</p>
              <p className="stat-label">System-wide invoices</p>
            </div>
          </div>

          <div className="stat-card orange" onClick={() => setActiveMenu('billing')}>
            <div className="stat-header">
              <div className="stat-icon-wrapper orange-bg">
                <span className="stat-icon-lg">💰</span>
              </div>
            </div>
            <div className="stat-body">
              <h3 className="stat-title">Total Revenue</h3>
              <p className="stat-number">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</p>
              <p className="stat-label">Processed through platform</p>
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
                    <IconButton size="small">
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'organizations':
        return renderOrganizationsContent();
      case 'users':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#6b7280' }}>User Management - Coming Soon</Typography>
          </div>
        );
      case 'analytics':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#6b7280' }}>Analytics & Reports - Coming Soon</Typography>
          </div>
        );
      case 'billing':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#6b7280' }}>Billing & Subscriptions - Coming Soon</Typography>
          </div>
        );
      case 'settings':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#6b7280' }}>System Settings - Coming Soon</Typography>
          </div>
        );
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
          <p className="company-subtitle">Chinmay Technosoft Private Limited</p>
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
    </div>
  );
};

export default SuperAdminDashboard;
