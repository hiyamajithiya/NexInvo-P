import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateFormat';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocalOffer as CouponIcon,
  CurrencyRupee as RupeeIcon,
  Upgrade as UpgradeIcon,
  History as HistoryIcon,
  HourglassEmpty as PendingIcon,
  CheckCircleOutline as ApprovedIcon,
  HighlightOff as RejectedIcon,
} from '@mui/icons-material';

const MySubscription = ({ onNavigate }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    loadSubscription();
    loadPaymentRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions/my_subscription/');
      setSubscription(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setSubscription(null);
      } else {
        showSnackbar('Failed to load subscription', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await api.get('/payment-requests/');
      setPaymentRequests(response.data.requests || []);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await api.post(`/subscriptions/${subscription.id}/cancel/`);
      showSnackbar('Subscription cancelled successfully', 'success');
      setOpenCancelDialog(false);
      loadSubscription();
    } catch (error) {
      showSnackbar('Failed to cancel subscription', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return { bg: '#d1fae5', color: '#065f46', label: 'Active' };
      case 'trial': return { bg: '#dbeafe', color: '#1e40af', label: 'Trial' };
      case 'cancelled': return { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' };
      case 'expired': return { bg: '#f3f4f6', color: '#374151', label: 'Expired' };
      default: return { bg: '#f3f4f6', color: '#374151', label: status };
    }
  };

  const getDaysRemaining = () => {
    if (!subscription) return 0;
    const endDate = new Date(subscription.end_date);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTrialDaysRemaining = () => {
    if (!subscription || !subscription.trial_end_date) return 0;
    const trialEndDate = new Date(subscription.trial_end_date);
    const today = new Date();
    const diffTime = trialEndDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getProgressPercentage = () => {
    if (!subscription) return 0;
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);
    const today = new Date();

    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today - startDate) / (1000 * 60 * 60 * 24);

    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!subscription) {
    return (
      <Box>
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Box sx={{ mb: 3 }}>
            <UpgradeIcon sx={{ fontSize: 80, color: '#9ca3af' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
            No Active Subscription
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 4 }}>
            You don't have an active subscription yet. Choose a plan to get started!
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<UpgradeIcon />}
            onClick={() => onNavigate && onNavigate('pricing')}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              textTransform: 'none',
              fontWeight: 'bold',
              px: 4,
            }}
          >
            View Pricing Plans
          </Button>
        </Paper>
      </Box>
    );
  }

  const statusConfig = getStatusColor(subscription.status);

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 1 }}>
              My Subscription
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Manage your current subscription plan
            </Typography>
          </Box>
          <Chip
            label={statusConfig.label.toUpperCase()}
            sx={{
              bgcolor: statusConfig.bg,
              color: statusConfig.color,
              fontWeight: 'bold',
              px: 2,
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Left Column */}
        <Box>
          {/* Plan Details */}
          <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                  {subscription.plan_details?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {subscription.plan_details?.description}
                </Typography>
              </Box>
              <Chip
                label={subscription.plan_details?.billing_cycle.toUpperCase()}
                sx={{
                  bgcolor: '#ddd6fe',
                  color: '#5b21b6',
                  fontWeight: 'bold',
                }}
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Plan Features */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
              Plan Includes:
            </Typography>
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary={`Up to ${subscription.plan_details?.max_users} users`} />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary={`${subscription.plan_details?.max_invoices_per_month} invoices per month`} />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary={`${subscription.plan_details?.max_storage_gb} GB storage`} />
              </ListItem>
              {subscription.plan_details?.features?.map((feature, idx) => (
                <ListItem key={idx} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Subscription Period */}
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
              Subscription Period
            </Typography>

            {subscription.status === 'trial' && subscription.trial_end_date && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You are currently on a free trial. {getTrialDaysRemaining()} days remaining.
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Start Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                {formatDate(subscription.start_date)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                End Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                {formatDate(subscription.end_date)}
              </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Days Remaining
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#8b5cf6' }}>
                  {getDaysRemaining()} days
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#8b5cf6',
                    borderRadius: 4,
                  }
                }}
              />
            </Box>
          </Paper>
        </Box>

        {/* Right Column */}
        <Box>
          {/* Payment Info */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
              <RupeeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Payment Info
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                Amount Paid
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827' }}>
                ₹{parseFloat(subscription.amount_paid).toLocaleString('en-IN')}
              </Typography>
            </Box>

            {subscription.last_payment_date && (
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                  Last Payment
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#111827' }}>
                  {formatDate(subscription.last_payment_date)}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Coupon Info */}
          {subscription.coupon_applied && (
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3, bgcolor: '#f0fdf4' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
                <CouponIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#10b981' }} />
                Coupon Applied
              </Typography>
              <Chip
                label={subscription.coupon_applied.code}
                sx={{
                  bgcolor: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                }}
              />
            </Paper>
          )}

          {/* Actions */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
              Actions
            </Typography>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<UpgradeIcon />}
              onClick={() => onNavigate && onNavigate('pricing')}
              sx={{ mb: 2 }}
            >
              Upgrade Plan
            </Button>

            {subscription.status !== 'cancelled' && (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setOpenCancelDialog(true)}
              >
                Cancel Subscription
              </Button>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Payment Requests History */}
      {paymentRequests.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <HistoryIcon sx={{ mr: 1, color: '#6366f1' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
              Payment Request History
            </Typography>
          </Box>

          {loadingRequests ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {paymentRequests.map((request) => (
                <Paper
                  key={request.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: request.status === 'approved' ? '#f0fdf4' : request.status === 'rejected' ? '#fef2f2' : '#fefce8',
                    border: `1px solid ${request.status === 'approved' ? '#10b981' : request.status === 'rejected' ? '#ef4444' : '#f59e0b'}`,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {request.status === 'pending' && <PendingIcon sx={{ color: '#f59e0b', fontSize: 20 }} />}
                        {request.status === 'approved' && <ApprovedIcon sx={{ color: '#10b981', fontSize: 20 }} />}
                        {request.status === 'rejected' && <RejectedIcon sx={{ color: '#ef4444', fontSize: 20 }} />}
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#111827' }}>
                          {request.plan_name} Plan
                        </Typography>
                        <Chip
                          label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          size="small"
                          sx={{
                            bgcolor: request.status === 'approved' ? '#d1fae5' : request.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color: request.status === 'approved' ? '#065f46' : request.status === 'rejected' ? '#991b1b' : '#92400e',
                            fontWeight: 'bold',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Transaction: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{request.transaction_id}</span>
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Payment Date: {formatDate(request.payment_date)}
                      </Typography>
                      {request.rejection_reason && (
                        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                          <Typography variant="caption">{request.rejection_reason}</Typography>
                        </Alert>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        ₹{parseFloat(request.final_amount).toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        Submitted: {formatDate(request.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={openCancelDialog}
        onClose={() => setOpenCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Cancel Subscription
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to cancel your subscription?
          </Alert>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Your subscription will remain active until {formatDate(subscription.end_date)}, after which you will lose access to all premium features.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCancelDialog(false)} disabled={cancelling}>
            Keep Subscription
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelSubscription}
            disabled={cancelling}
          >
            {cancelling ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Box>
  );
};

export default MySubscription;
