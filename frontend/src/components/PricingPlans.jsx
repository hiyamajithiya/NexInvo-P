import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
  Grid,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Star as StarIcon,
  LocalOffer as CouponIcon,
  AccountBalance as BankIcon,
  ContentCopy as CopyIcon,
  CloudUpload as UploadIcon,
  Send as SendIcon,
} from '@mui/icons-material';

const PricingPlans = ({ onNavigate }) => {
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

  // Payment workflow state
  const [activeStep, setActiveStep] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    payment_screenshot: '',
    user_notes: '',
  });

  const steps = ['Select Plan', 'Make Payment', 'Submit Proof'];

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscription-plans/public/');
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
      showSnackbar('Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettings = async () => {
    setLoadingPaymentSettings(true);
    try {
      const response = await api.get('/payment-settings/');
      setPaymentSettings(response.data.settings);
    } catch (error) {
      console.error('Error loading payment settings:', error);
      showSnackbar('Failed to load payment details', 'error');
    } finally {
      setLoadingPaymentSettings(false);
    }
  };

  const handleOpenSubscribeDialog = (plan) => {
    setSelectedPlan(plan);
    setCouponCode('');
    setCouponData(null);
    setDiscountInfo(null);
    setActiveStep(0);
    setPaymentForm({
      transaction_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      payment_screenshot: '',
      user_notes: '',
    });
    setOpenSubscribeDialog(true);
  };

  const handleCloseSubscribeDialog = () => {
    setOpenSubscribeDialog(false);
    setSelectedPlan(null);
    setCouponCode('');
    setCouponData(null);
    setDiscountInfo(null);
    setActiveStep(0);
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      showSnackbar('Please enter a coupon code', 'warning');
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await api.post('/coupons/validate/', {
        code: couponCode.toUpperCase(),
        plan_id: selectedPlan.id
      });

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

  const handleNext = async () => {
    if (activeStep === 0) {
      // Check if final price is 0 (100% discount) - skip payment step
      if (getFinalPrice() === 0) {
        // Skip directly to submission step
        setActiveStep(2);
      } else {
        // Moving to payment step - load bank details
        await loadPaymentSettings();
        setActiveStep(1);
      }
    } else if (activeStep === 1) {
      // Moving to submission step
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    // If on step 2 and amount is 0, go back to step 0 (skip step 1)
    if (activeStep === 2 && getFinalPrice() === 0) {
      setActiveStep(0);
    } else {
      setActiveStep((prevStep) => prevStep - 1);
    }
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showSnackbar('File size should be less than 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentForm(prev => ({ ...prev, payment_screenshot: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async () => {
    // Validate form
    if (!paymentForm.transaction_id.trim()) {
      showSnackbar('Please enter the transaction ID', 'error');
      return;
    }
    if (!paymentForm.payment_date) {
      showSnackbar('Please enter the payment date', 'error');
      return;
    }

    setSubscribing(true);
    try {
      await api.post('/payment-requests/submit/', {
        plan_id: selectedPlan.id,
        coupon_code: couponCode.toUpperCase() || undefined,
        discount_amount: getDiscountAmount(),
        final_amount: getFinalPrice(),
        ...paymentForm,
      });

      showSnackbar('Payment request submitted successfully! You will be notified once approved.', 'success');
      handleCloseSubscribeDialog();
      // Navigate to subscription page
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('subscription');
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting payment request:', error);
      showSnackbar(error.response?.data?.error || 'Failed to submit payment request', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Copied to clipboard!', 'success');
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

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
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
                  Amount to Pay:
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
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            {loadingPaymentSettings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !paymentSettings ? (
              <Alert severity="error">
                Payment settings not configured. Please contact support.
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Please make a payment of <strong>₹{getFinalPrice().toLocaleString('en-IN')}</strong> using the bank details below.
                </Alert>

                <Paper sx={{ p: 3, bgcolor: '#f0fdf4', border: '1px solid #10b981', borderRadius: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <BankIcon sx={{ color: '#10b981', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#065f46' }}>
                      Bank Account Details
                    </Typography>
                  </Box>

                  {/* Account Holder */}
                  <Box sx={{ py: 1.5, borderBottom: '1px solid #d1fae5' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Account Holder
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, color: '#111827', wordBreak: 'break-word' }}>
                        {paymentSettings.account_holder_name}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => copyToClipboard(paymentSettings.account_holder_name)}
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        <CopyIcon fontSize="small" />
                      </Button>
                    </Box>
                  </Box>

                  {/* Account Number */}
                  <Box sx={{ py: 1.5, borderBottom: '1px solid #d1fae5' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Account Number
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {paymentSettings.account_number}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => copyToClipboard(paymentSettings.account_number)}
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        <CopyIcon fontSize="small" />
                      </Button>
                    </Box>
                  </Box>

                  {/* IFSC Code */}
                  <Box sx={{ py: 1.5, borderBottom: '1px solid #d1fae5' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      IFSC Code
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {paymentSettings.ifsc_code}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => copyToClipboard(paymentSettings.ifsc_code)}
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        <CopyIcon fontSize="small" />
                      </Button>
                    </Box>
                  </Box>

                  {/* Bank & Branch */}
                  <Box sx={{ py: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Bank & Branch
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                      {paymentSettings.bank_name}{paymentSettings.branch_name ? ` - ${paymentSettings.branch_name}` : ''}
                    </Typography>
                  </Box>

                  {paymentSettings.upi_id && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #d1fae5' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#065f46', mb: 1 }}>
                        Or Pay via UPI
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                          {paymentSettings.upi_id}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => copyToClipboard(paymentSettings.upi_id)}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          <CopyIcon fontSize="small" />
                        </Button>
                      </Box>
                      {paymentSettings.upi_qr_code && (
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                          <img
                            src={paymentSettings.upi_qr_code}
                            alt="UPI QR Code"
                            style={{ maxWidth: '180px', borderRadius: '8px' }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>

                {paymentSettings.payment_instructions && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">{paymentSettings.payment_instructions}</Typography>
                  </Alert>
                )}

                <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center' }}>
                  After making the payment, click "Next" to submit your payment proof.
                </Typography>
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            {/* Order Summary Card */}
            <Paper
              sx={{
                p: 0,
                mb: 3,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  p: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)', letterSpacing: 2 }}>
                  ORDER SUMMARY
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      Selected Plan
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                      {selectedPlan?.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedPlan?.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                    size="small"
                    sx={{
                      bgcolor: '#7c3aed',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ color: '#374151', fontWeight: 500 }}>
                    Total Amount
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    ₹{getFinalPrice().toLocaleString('en-IN')}
                  </Typography>
                </Box>
                {discountInfo && (
                  <Box sx={{ mt: 1, textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                      You saved ₹{getDiscountAmount().toLocaleString('en-IN')}!
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Show different UI for free upgrade (amount = 0) vs paid upgrade */}
            {getFinalPrice() === 0 ? (
              <>
                {/* Free Upgrade - No payment needed */}
                <Alert
                  severity="success"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': { alignItems: 'center' },
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No payment required! Your coupon covers the full amount.
                  </Typography>
                </Alert>

                {/* Additional Notes for free upgrade */}
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
                    Additional Notes (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={paymentForm.user_notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, user_notes: e.target.value }))}
                    placeholder="Any additional information..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: '#8b5cf6' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                      },
                    }}
                  />
                </Paper>

                {/* Info Alert */}
                <Alert
                  severity="info"
                  sx={{
                    mt: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': { alignItems: 'center' },
                  }}
                >
                  <Typography variant="body2">
                    Click "Submit Request" to activate your free subscription.
                  </Typography>
                </Alert>
              </>
            ) : (
              <>
                {/* Payment Details Form */}
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <BankIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        Payment Details
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        Enter your transaction information
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Transaction ID / UTR Number"
                        value={paymentForm.transaction_id}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                        placeholder="e.g., UTR123456789"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': { borderColor: '#8b5cf6' },
                            '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        type="date"
                        label="Payment Date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': { borderColor: '#8b5cf6' },
                            '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={paymentForm.payment_method}
                          label="Payment Method"
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                          sx={{
                            borderRadius: 2,
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                          }}
                        >
                          <MenuItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                          <MenuItem value="upi">UPI</MenuItem>
                          <MenuItem value="cheque">Cheque</MenuItem>
                          <MenuItem value="cash">Cash Deposit</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Screenshot Upload Section */}
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <UploadIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        Payment Proof
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        Upload a screenshot of your payment (optional but recommended)
                      </Typography>
                    </Box>
                  </Box>

                  {!paymentForm.payment_screenshot ? (
                    <Box
                      component="label"
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 4,
                        border: '2px dashed #d1d5db',
                        borderRadius: 3,
                        bgcolor: '#fafafa',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#8b5cf6',
                          bgcolor: '#f5f3ff',
                        },
                      }}
                    >
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                      />
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          bgcolor: '#ede9fe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <UploadIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
                        Click to upload screenshot
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        PNG, JPG up to 5MB
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          position: 'relative',
                          display: 'inline-block',
                          p: 2,
                          border: '2px solid #10b981',
                          borderRadius: 3,
                          bgcolor: '#f0fdf4',
                        }}
                      >
                        <img
                          src={paymentForm.payment_screenshot}
                          alt="Payment Screenshot"
                          style={{
                            maxWidth: '250px',
                            maxHeight: '250px',
                            borderRadius: '8px',
                            display: 'block',
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            bgcolor: '#10b981',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckIcon sx={{ color: 'white', fontSize: 18 }} />
                        </Box>
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          component="label"
                          size="small"
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                          }}
                        >
                          Change Image
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                          />
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Paper>

                {/* Additional Notes */}
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
                    Additional Notes (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={paymentForm.user_notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, user_notes: e.target.value }))}
                    placeholder="Any additional information about your payment..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: '#8b5cf6' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                      },
                    }}
                  />
                </Paper>

                {/* Info Alert */}
                <Alert
                  severity="info"
                  sx={{
                    mt: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': { alignItems: 'center' },
                  }}
                >
                  <Typography variant="body2">
                    Your subscription will be activated within 24 hours after payment verification.
                  </Typography>
                </Alert>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
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
      <Paper sx={{ p: 4, borderRadius: 3, mb: 4, textAlign: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
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
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible',
              mt: plan.highlight ? 2 : 0,
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
                  top: -16,
                  right: 20,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                  zIndex: 1,
                }}
              >
                <StarIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  POPULAR
                </Typography>
              </Box>
            )}

            <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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

              <List dense sx={{ flexGrow: 1 }}>
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
                {plan.features && plan.features
                  .filter(feature => {
                    const lowerFeature = feature.toLowerCase();
                    return !lowerFeature.includes('invoice') &&
                           !lowerFeature.includes('user') &&
                           !lowerFeature.includes('storage');
                  })
                  .map((feature, idx) => (
                    <ListItem key={idx} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
              </List>
            </CardContent>

            <CardActions sx={{ p: 3, pt: 0, mt: 'auto' }}>
              <Button
                fullWidth
                variant={plan.highlight ? 'contained' : 'outlined'}
                onClick={() => handleOpenSubscribeDialog(plan)}
                sx={{
                  py: 1.5,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  ...(plan.highlight ? {
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  } : {}),
                }}
              >
                Subscribe Now
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Subscribe Dialog with Stepper */}
      <Dialog
        open={openSubscribeDialog}
        onClose={handleCloseSubscribeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Subscribe to {selectedPlan?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent()}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={handleCloseSubscribeDialog} disabled={subscribing}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={subscribing}>
              Back
            </Button>
          )}
          {activeStep < 2 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={activeStep === 1 && !paymentSettings}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                textTransform: 'none',
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmitPayment}
              disabled={subscribing || (getFinalPrice() > 0 && !paymentForm.transaction_id)}
              startIcon={subscribing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                textTransform: 'none',
                minWidth: '180px',
              }}
            >
              {subscribing ? 'Submitting...' : getFinalPrice() === 0 ? 'Submit Request' : 'Submit Payment Request'}
            </Button>
          )}
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
