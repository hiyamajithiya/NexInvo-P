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
  Button,
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormat';

const BillingTab = ({ stats, onNavigate }) => {
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
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{'\u20B9'}{lastMonthRevenue.toLocaleString('en-IN')}</Typography>
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
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{'\u20B9'}{(stats?.monthlyRecurringRevenue || 0).toLocaleString('en-IN')}</Typography>
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
                <Typography sx={{ fontSize: 48 }}>{'📋'}</Typography>
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
              onClick={() => onNavigate('subscription-plans')}
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
                    <TableCell sx={{ fontWeight: 600, color: '#111827' }}>{'\u20B9'}{txn.amount.toLocaleString('en-IN')}</TableCell>
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

export default BillingTab;
