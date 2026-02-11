import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const DashboardOverviewTab = ({ stats, onNavigate }) => {
  const planData = stats?.planBreakdown
    ? Object.entries(stats.planBreakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  const activityData = [
    { name: 'Active (30d)', value: stats?.activeOrganizations || 0 },
    { name: 'New (7d)', value: stats?.recentOrganizations || 0 },
    { name: 'Inactive', value: (stats?.totalOrganizations || 0) - (stats?.activeOrganizations || 0) },
  ];

  return (
    <>
      {/* Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card purple" onClick={() => onNavigate('organizations')}>
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

        <div className="stat-card blue" onClick={() => onNavigate('users')}>
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

        <div className="stat-card green" onClick={() => onNavigate('billing')}>
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

        <div className="stat-card orange" onClick={() => onNavigate('analytics')}>
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

export default DashboardOverviewTab;
