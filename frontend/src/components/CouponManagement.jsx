import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Autocomplete,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  LocalOffer as LocalOfferIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_types: ['percentage'], // Now supports multiple discount types
    discount_percentage: '',
    discount_fixed: '',
    discount_days: '',
    applicable_plans: [],
    valid_from: '',
    valid_until: '',
    max_total_uses: '',
    max_uses_per_user: 1,
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
    loadPlans();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/coupons/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(response.data);
    } catch (error) {
      console.error('Error loading coupons:', error);
      showSnackbar('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/subscription-plans/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleOpenDialog = (coupon = null) => {
    if (coupon) {
      setEditMode(true);
      setCurrentCoupon(coupon);

      // Format dates for datetime-local input
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      // Parse discount types from coupon data
      const discountTypes = coupon.discount_types || [coupon.discount_type];

      setFormData({
        code: coupon.code,
        name: coupon.name || '',
        description: coupon.description || '',
        discount_types: discountTypes,
        discount_percentage: coupon.discount_percentage || (coupon.discount_type === 'percentage' ? coupon.discount_value : ''),
        discount_fixed: coupon.discount_fixed || (coupon.discount_type === 'fixed' ? coupon.discount_value : ''),
        discount_days: coupon.discount_days || (coupon.discount_type === 'extended_period' ? coupon.discount_value : ''),
        applicable_plans: coupon.applicable_plans || [],
        valid_from: formatDate(coupon.valid_from),
        valid_until: formatDate(coupon.valid_until),
        max_total_uses: coupon.max_total_uses || '',
        max_uses_per_user: coupon.max_uses_per_user || 1,
        is_active: coupon.is_active,
      });
    } else {
      setEditMode(false);
      setCurrentCoupon(null);

      // Set default dates (today and 30 days from now)
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);

      setFormData({
        code: '',
        name: '',
        description: '',
        discount_types: [],
        discount_percentage: '',
        discount_fixed: '',
        discount_days: '',
        applicable_plans: [],
        valid_from: now.toISOString().slice(0, 16),
        valid_until: future.toISOString().slice(0, 16),
        max_total_uses: '',
        max_uses_per_user: 1,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentCoupon(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleDiscountTypeChange = (discountType) => {
    setFormData(prev => {
      const currentTypes = prev.discount_types || [];
      let newTypes;

      if (currentTypes.includes(discountType)) {
        // Remove if already selected
        newTypes = currentTypes.filter(t => t !== discountType);
      } else if (currentTypes.length < 2) {
        // Add if less than 2 selected
        newTypes = [...currentTypes, discountType];
      } else {
        // Already 2 selected, don't add more
        return prev;
      }

      return {
        ...prev,
        discount_types: newTypes,
      };
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // Validate at least one discount type is selected
      if (!formData.discount_types || formData.discount_types.length === 0) {
        showSnackbar('Please select at least one discount type', 'error');
        return;
      }

      // Convert dates to ISO format
      const payload = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_types: formData.discount_types,
        discount_percentage: formData.discount_types.includes('percentage') && formData.discount_percentage
          ? parseFloat(formData.discount_percentage) : null,
        discount_fixed: formData.discount_types.includes('fixed') && formData.discount_fixed
          ? parseFloat(formData.discount_fixed) : null,
        discount_days: formData.discount_types.includes('extended_period') && formData.discount_days
          ? parseInt(formData.discount_days) : null,
        applicable_plans: formData.applicable_plans,
        max_total_uses: formData.max_total_uses ? parseInt(formData.max_total_uses) : null,
        max_uses_per_user: parseInt(formData.max_uses_per_user),
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        is_active: formData.is_active,
      };

      if (editMode) {
        await axios.put(
          `${API_BASE_URL}/coupons/${currentCoupon.id}/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSnackbar('Coupon updated successfully', 'success');
      } else {
        await axios.post(
          `${API_BASE_URL}/coupons/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSnackbar('Coupon created successfully', 'success');
      }

      handleCloseDialog();
      loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      showSnackbar(error.response?.data?.error || 'Failed to save coupon', 'error');
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/coupons/${couponId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Coupon deleted successfully', 'success');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showSnackbar('Failed to delete coupon', 'error');
    }
  };

  const handleDeactivate = async (couponId) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_BASE_URL}/coupons/${couponId}/deactivate/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar('Coupon deactivated successfully', 'success');
      loadCoupons();
    } catch (error) {
      console.error('Error deactivating coupon:', error);
      showSnackbar('Failed to deactivate coupon', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getDiscountDisplay = (coupon) => {
    const discountParts = [];
    const discountTypes = coupon.discount_types || [coupon.discount_type];

    if (discountTypes.includes('percentage') && coupon.discount_percentage) {
      discountParts.push(`${coupon.discount_percentage}% OFF`);
    } else if (coupon.discount_type === 'percentage' && coupon.discount_value) {
      discountParts.push(`${coupon.discount_value}% OFF`);
    }

    if (discountTypes.includes('fixed') && coupon.discount_fixed) {
      discountParts.push(`₹${coupon.discount_fixed} OFF`);
    } else if (coupon.discount_type === 'fixed' && coupon.discount_value) {
      discountParts.push(`₹${coupon.discount_value} OFF`);
    }

    if (discountTypes.includes('extended_period') && coupon.discount_days) {
      discountParts.push(`+${coupon.discount_days} days`);
    } else if (coupon.discount_type === 'extended_period' && coupon.discount_value) {
      discountParts.push(`+${coupon.discount_value} days`);
    }

    return discountParts.length > 0 ? discountParts.join(' + ') : 'No discount';
  };

  const getValidityStatus = (coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (now < validFrom) {
      return { label: 'Upcoming', color: 'info' };
    } else if (now > validUntil) {
      return { label: 'Expired', color: 'error' };
    } else {
      return { label: 'Active', color: 'success' };
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
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
              Coupon Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Create and manage discount coupons for subscription plans
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 'bold',
            }}
          >
            Create Coupon
          </Button>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #8b5cf6' }}>
              <LocalOfferIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Total Coupons</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{coupons.length}</Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #10b981' }}>
              <CheckCircleIcon sx={{ fontSize: 28, color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Active Coupons</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                {coupons.filter(c => c.is_active).length}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #ef4444' }}>
              <BlockIcon sx={{ fontSize: 28, color: '#ef4444' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Expired</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                {coupons.filter(c => new Date(c.valid_until) < new Date()).length}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #3b82f6' }}>
              <CalendarIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Total Redemptions</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                {coupons.reduce((sum, c) => sum + (c.current_usage_count || 0), 0)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </div>

      {/* Coupons Table */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Discount</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Applicable Plans</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Validity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Usage</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body1" sx={{ color: '#6b7280', mb: 2 }}>
                      No coupons created yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog()}
                    >
                      Create Your First Coupon
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => {
                  const validityStatus = getValidityStatus(coupon);
                  return (
                    <TableRow key={coupon.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>
                        <Chip
                          label={coupon.code}
                          size="small"
                          sx={{
                            bgcolor: '#f3f4f6',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                            {coupon.name || coupon.code}
                          </Typography>
                          {coupon.description && (
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {coupon.description.substring(0, 50)}
                              {coupon.description.length > 50 ? '...' : ''}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getDiscountDisplay(coupon)}
                          size="small"
                          sx={{
                            bgcolor: coupon.discount_type === 'percentage' ? '#ddd6fe' :
                                     coupon.discount_type === 'fixed' ? '#dbeafe' : '#d1fae5',
                            color: coupon.discount_type === 'percentage' ? '#5b21b6' :
                                   coupon.discount_type === 'fixed' ? '#1e40af' : '#065f46',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          {coupon.applicable_plan_names?.join(', ') || 'All Plans'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            From: {new Date(coupon.valid_from).toLocaleDateString('en-IN')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            Until: {new Date(coupon.valid_until).toLocaleDateString('en-IN')}
                          </Typography>
                          <Chip
                            label={validityStatus.label}
                            size="small"
                            color={validityStatus.color}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                            {coupon.current_usage_count || 0}
                            {coupon.max_total_uses && ` / ${coupon.max_total_uses}`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            Max per user: {coupon.max_uses_per_user}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={coupon.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          icon={coupon.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                          sx={{
                            bgcolor: coupon.is_active ? '#d1fae5' : '#fee2e2',
                            color: coupon.is_active ? '#065f46' : '#991b1b',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(coupon)}
                            sx={{ color: '#3b82f6' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {coupon.is_active && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeactivate(coupon.id)}
                              sx={{ color: '#f59e0b' }}
                              title="Deactivate"
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(coupon.id)}
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 3
        }}>
          {editMode ? 'Edit Coupon' : 'Create New Coupon'}
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Grid container spacing={4} sx={{ mt: 0.5 }}>
            {/* Left Column */}
            <Grid item xs={12} md={6}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#8b5cf6', borderRadius: 1, mr: 2 }} />
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Coupon Code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      inputProps={{ style: { textTransform: 'uppercase' } }}
                      placeholder="e.g., WELCOME20, SAVE50"
                      helperText="Unique code for users to redeem"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Display Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Welcome Offer"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      multiline
                      rows={3}
                      placeholder="Describe the coupon offer and its terms"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Discount Settings Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#f0fdf4', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#10b981', borderRadius: 1, mr: 2 }} />
                  Discount Settings
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                  Select one or two discount types to combine (e.g., percentage + extra days)
                </Typography>
                <Grid container spacing={2}>
                  {/* Discount Type Checkboxes */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                      <FormGroup>
                        {/* Percentage Discount Option */}
                        <Box sx={{ mb: 2 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.discount_types?.includes('percentage') || false}
                                onChange={() => handleDiscountTypeChange('percentage')}
                                disabled={!formData.discount_types?.includes('percentage') && formData.discount_types?.length >= 2}
                                sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }}
                              />
                            }
                            label={
                              <Box>
                                <Typography sx={{ fontWeight: 600, color: '#111827' }}>Percentage Discount (%)</Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>Discount as a percentage of the plan price</Typography>
                              </Box>
                            }
                          />
                          {formData.discount_types?.includes('percentage') && (
                            <TextField
                              fullWidth
                              size="small"
                              label="Discount Percentage"
                              name="discount_percentage"
                              type="number"
                              value={formData.discount_percentage}
                              onChange={handleInputChange}
                              placeholder="e.g., 20"
                              InputProps={{
                                endAdornment: <Typography sx={{ ml: 1, fontWeight: 'bold' }}>%</Typography>,
                              }}
                              sx={{ mt: 1, ml: 4, maxWidth: '200px' }}
                            />
                          )}
                        </Box>

                        {/* Fixed Amount Option */}
                        <Box sx={{ mb: 2 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.discount_types?.includes('fixed') || false}
                                onChange={() => handleDiscountTypeChange('fixed')}
                                disabled={!formData.discount_types?.includes('fixed') && formData.discount_types?.length >= 2}
                                sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#3b82f6' } }}
                              />
                            }
                            label={
                              <Box>
                                <Typography sx={{ fontWeight: 600, color: '#111827' }}>Fixed Amount (₹)</Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>Fixed rupee discount off the plan price</Typography>
                              </Box>
                            }
                          />
                          {formData.discount_types?.includes('fixed') && (
                            <TextField
                              fullWidth
                              size="small"
                              label="Discount Amount"
                              name="discount_fixed"
                              type="number"
                              value={formData.discount_fixed}
                              onChange={handleInputChange}
                              placeholder="e.g., 500"
                              InputProps={{
                                startAdornment: <Typography sx={{ mr: 1, fontWeight: 'bold' }}>₹</Typography>,
                              }}
                              sx={{ mt: 1, ml: 4, maxWidth: '200px' }}
                            />
                          )}
                        </Box>

                        {/* Extended Period Option */}
                        <Box>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.discount_types?.includes('extended_period') || false}
                                onChange={() => handleDiscountTypeChange('extended_period')}
                                disabled={!formData.discount_types?.includes('extended_period') && formData.discount_types?.length >= 2}
                                sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }}
                              />
                            }
                            label={
                              <Box>
                                <Typography sx={{ fontWeight: 600, color: '#111827' }}>Extended Period (Days)</Typography>
                                <Typography variant="caption" sx={{ color: '#6b7280' }}>Add extra days to the subscription</Typography>
                              </Box>
                            }
                          />
                          {formData.discount_types?.includes('extended_period') && (
                            <TextField
                              fullWidth
                              size="small"
                              label="Additional Days"
                              name="discount_days"
                              type="number"
                              value={formData.discount_days}
                              onChange={handleInputChange}
                              placeholder="e.g., 30"
                              InputProps={{
                                endAdornment: <Typography sx={{ ml: 1, fontWeight: 'bold' }}>days</Typography>,
                              }}
                              sx={{ mt: 1, ml: 4, maxWidth: '200px' }}
                            />
                          )}
                        </Box>
                      </FormGroup>
                      {formData.discount_types?.length >= 2 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          Maximum 2 discount types can be selected. Uncheck one to select a different type.
                        </Alert>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={plans}
                      getOptionLabel={(option) => option.name}
                      value={plans.filter(plan => formData.applicable_plans.includes(plan.id))}
                      onChange={(event, newValue) => {
                        setFormData({
                          ...formData,
                          applicable_plans: newValue.map(plan => plan.id)
                        });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Applicable Plans"
                          helperText="Leave empty to apply to all plans"
                          sx={{ bgcolor: 'white' }}
                        />
                      )}
                      sx={{ bgcolor: 'white', borderRadius: 1 }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Validity Period Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#fef3c7', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#f59e0b', borderRadius: 1, mr: 2 }} />
                  Validity Period
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Valid From"
                      name="valid_from"
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={handleInputChange}
                      required
                      InputLabelProps={{ shrink: true }}
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Valid Until"
                      name="valid_until"
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={handleInputChange}
                      required
                      InputLabelProps={{ shrink: true }}
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              {/* Usage Limits Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#dbeafe', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#3b82f6', borderRadius: 1, mr: 2 }} />
                  Usage Limits
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Max Total Uses"
                      name="max_total_uses"
                      type="number"
                      value={formData.max_total_uses}
                      onChange={handleInputChange}
                      placeholder="Leave empty for unlimited"
                      helperText="Maximum total redemptions across all users"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Max Uses Per User"
                      name="max_uses_per_user"
                      type="number"
                      value={formData.max_uses_per_user}
                      onChange={handleInputChange}
                      required
                      helperText="How many times each user can use this coupon"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Status Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#f3e8ff', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#8b5cf6', borderRadius: 1, mr: 2 }} />
                  Status
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>Active</Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Coupon can be redeemed by users</Typography>
                  </Box>
                  <Switch
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    name="is_active"
                    color="success"
                  />
                </Box>
              </Paper>

              {/* Preview Card */}
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, border: '2px solid #8b5cf6' }}>
                <Typography variant="caption" sx={{ color: '#6b7280', mb: 1, display: 'block' }}>Preview</Typography>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Chip
                    label={formData.code || 'COUPON CODE'}
                    sx={{
                      bgcolor: '#8b5cf6',
                      color: 'white',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      px: 2,
                      py: 2.5,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                    {formData.name || 'Coupon Name'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 2 }}>
                    {formData.discount_types?.includes('percentage') && formData.discount_percentage && (
                      <Chip
                        label={`${formData.discount_percentage}% OFF`}
                        sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold', fontSize: '0.9rem' }}
                      />
                    )}
                    {formData.discount_types?.includes('fixed') && formData.discount_fixed && (
                      <Chip
                        label={`₹${formData.discount_fixed} OFF`}
                        sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 'bold', fontSize: '0.9rem' }}
                      />
                    )}
                    {formData.discount_types?.includes('extended_period') && formData.discount_days && (
                      <Chip
                        label={`+${formData.discount_days} Days Free`}
                        sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 'bold', fontSize: '0.9rem' }}
                      />
                    )}
                    {(!formData.discount_types || formData.discount_types.length === 0) && (
                      <Chip
                        label="Select Discount Type"
                        sx={{ bgcolor: '#f3f4f6', color: '#6b7280', fontWeight: 'bold', fontSize: '0.9rem' }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {formData.description || 'Coupon description will appear here'}
                  </Typography>
                  {formData.valid_from && formData.valid_until && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                        Valid: {new Date(formData.valid_from).toLocaleDateString('en-IN')} - {new Date(formData.valid_until).toLocaleDateString('en-IN')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 'bold',
              px: 4,
              py: 1,
            }}
          >
            {editMode ? 'Update Coupon' : 'Create Coupon'}
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

export default CouponManagement;
