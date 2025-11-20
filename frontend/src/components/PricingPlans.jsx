import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Star as StarIcon,
  LocalOffer as CouponIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const PricingPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [openSubscribeDialog, setOpenSubscribeDialog] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponData, setCouponData] = useState(null);
  const [discountInfo, setDiscountInfo] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/subscription-plans/public/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
      showSnackbar('Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubscribeDialog = (plan) => {
    setSelectedPlan(plan);
    setCouponCode('');
    setCouponData(null);
    setDiscountInfo(null);
    setOpenSubscribeDialog(true);
  };

  const handleCloseSubscribeDialog = () => {
    setOpenSubscribeDialog(false);
    setSelectedPlan(null);
    setCouponCode('');
    setCouponData(null);
    setDiscountInfo(null);
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      showSnackbar('Please enter a coupon code', 'warning');
      return;
    }

    setValidatingCoupon(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/coupons/validate/`,
        {
          code: couponCode.toUpperCase(),
          plan_id: selectedPlan.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCouponData(response.data.coupon);
      setDiscountInfo(response.data.discount);
      showSnackbar('Coupon applied successfully!', 'success');
    } catch (error) {
      console.error('Error validating coupon:', error);
      showSnackbar(error.response?.data?.error || 'Invalid coupon code', 'error');
      setCouponData(null);
      setDiscountInfo(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API_BASE_URL}/subscriptions/subscribe/`,
        {
          plan_id: selectedPlan.id,
          coupon_code: couponCode.toUpperCase() || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSnackbar(response.data.message || 'Subscription successful!', 'success');
      handleCloseSubscribeDialog();
      // You might want to refresh the page or redirect to current subscription
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error subscribing:', error);
      showSnackbar(error.response?.data?.error || 'Failed to subscribe', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getFinalPrice = () => {
    if (!selectedPlan) return 0;
    if (discountInfo) {
      return discountInfo.final_price;
    }
    return selectedPlan.price;
  };

  const getDiscountAmount = () => {
    if (!discountInfo) return 0;
    return discountInfo.discount_amount;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 4, borderRadius: 3, mb: 4, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
          Choose Your Plan
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', maxWidth: '600px', margin: '0 auto' }}>
          Select the perfect subscription plan for your business needs. Upgrade or downgrade anytime.
        </Typography>
      </Paper>

      {/* Pricing Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 4 }}>
        {plans.map((plan) => (
          <Card
            key={plan.id}
            sx={{
              position: 'relative',
              borderRadius: 3,
              border: plan.highlight ? '3px solid #8b5cf6' : '1px solid #e5e7eb',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
              },
            }}
          >
            {plan.highlight && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -12,
                  right: 20,
                  bgcolor: '#8b5cf6',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <StarIcon fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  POPULAR
                </Typography>
              </Box>
            )}

            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                {plan.name}
              </Typography>
              {plan.description && (
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                  {plan.description}
                </Typography>
              )}

              <Box sx={{ mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#111827', display: 'inline' }}>
                  ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', display: 'inline', ml: 1 }}>
                  / {plan.billing_cycle === 'monthly' ? 'month' : 'year'}
                </Typography>
              </Box>

              {plan.trial_days > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  {plan.trial_days} days free trial included
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
                Plan Includes:
              </Typography>

              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={`Up to ${plan.max_users} user${plan.max_users > 1 ? 's' : ''}`} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={`${plan.max_invoices_per_month} invoices per month`} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={`${plan.max_storage_gb} GB storage`} />
                </ListItem>
                {plan.features && plan.features.map((feature, idx) => (
                  <ListItem key={idx} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </CardContent>

            <CardActions sx={{ p: 3, pt: 0 }}>
              <Button
                fullWidth
                variant={plan.highlight ? 'contained' : 'outlined'}
                onClick={() => handleOpenSubscribeDialog(plan)}
                sx={{
                  py: 1.5,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  ...(plan.highlight ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  } : {}),
                }}
              >
                Subscribe Now
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Subscribe Dialog */}
      <Dialog
        open={openSubscribeDialog}
        onClose={handleCloseSubscribeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Subscribe to {selectedPlan?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Plan Summary */}
            <Paper sx={{ p: 3, bgcolor: '#f9fafb', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
                Plan Details
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
                {selectedPlan?.name}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Base Price:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                  ₹{parseFloat(selectedPlan?.price || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>
              {discountInfo && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#10b981' }}>
                      Discount:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                      - ₹{getDiscountAmount().toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                  {discountInfo.extended_days > 0 && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      +{discountInfo.extended_days} extra days included!
                    </Alert>
                  )}
                  <Divider sx={{ my: 1 }} />
                </>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#111827' }}>
                  Final Price:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8b5cf6' }}>
                  ₹{getFinalPrice().toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Paper>

            {/* Coupon Code */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
              Have a coupon code?
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CouponIcon />
                    </InputAdornment>
                  ),
                }}
                disabled={!!couponData}
              />
              <Button
                variant="outlined"
                onClick={handleValidateCoupon}
                disabled={validatingCoupon || !!couponData}
                sx={{ minWidth: '120px' }}
              >
                {validatingCoupon ? <CircularProgress size={24} /> : couponData ? 'Applied' : 'Apply'}
              </Button>
            </Box>

            {couponData && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Coupon "{couponData.code}" applied successfully!
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseSubscribeDialog} disabled={subscribing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubscribe}
            disabled={subscribing}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              minWidth: '140px',
            }}
          >
            {subscribing ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Confirm Subscription'}
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

export default PricingPlans;
