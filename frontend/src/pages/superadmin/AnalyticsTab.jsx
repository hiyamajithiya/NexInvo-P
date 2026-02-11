import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../../utils/dateFormat';

const AnalyticsTab = ({ stats, organizations }) => {
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

export default AnalyticsTab;
