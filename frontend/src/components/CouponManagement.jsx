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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

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
    discount_type: 'percentage',
    discount_value: '',
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

      setFormData({
        code: coupon.code,
        name: coupon.name || '',
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
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
        discount_type: 'percentage',
        discount_value: '',
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

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // Convert dates to ISO format
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        discount_value: parseFloat(formData.discount_value),
        max_total_uses: formData.max_total_uses ? parseInt(formData.max_total_uses) : null,
        max_uses_per_user: parseInt(formData.max_uses_per_user),
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
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
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else if (coupon.discount_type === 'fixed') {
      return `₹${coupon.discount_value} OFF`;
    } else {
      return `+${coupon.discount_value} days`;
    }
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          {editMode ? 'Edit Coupon' : 'Create New Coupon'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1 }}>
                Basic Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Coupon Code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
                helperText="Unique code (e.g., WELCOME20, SAVE50)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Display Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
                rows={2}
              />
            </Grid>

            {/* Discount Settings */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Discount Settings
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  name="discount_type"
                  value={formData.discount_type}
                  onChange={handleInputChange}
                  label="Discount Type"
                >
                  <MenuItem value="percentage">Percentage Discount (%)</MenuItem>
                  <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                  <MenuItem value="extended_period">Extended Period (Days)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={
                  formData.discount_type === 'percentage' ? 'Discount Percentage' :
                  formData.discount_type === 'fixed' ? 'Discount Amount (₹)' :
                  'Additional Days'
                }
                name="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: formData.discount_type === 'percentage' ?
                    null : formData.discount_type === 'fixed' ?
                    <Typography sx={{ mr: 1 }}>₹</Typography> : null,
                  endAdornment: formData.discount_type === 'percentage' ?
                    <Typography sx={{ ml: 1 }}>%</Typography> :
                    formData.discount_type === 'extended_period' ?
                    <Typography sx={{ ml: 1 }}>days</Typography> : null,
                }}
              />
            </Grid>

            {/* Applicable Plans */}
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
                  />
                )}
              />
            </Grid>

            {/* Validity Period */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Validity Period
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valid From"
                name="valid_from"
                type="datetime-local"
                value={formData.valid_from}
                onChange={handleInputChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valid Until"
                name="valid_until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={handleInputChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Usage Limits */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Usage Limits
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Total Uses"
                name="max_total_uses"
                type="number"
                value={formData.max_total_uses}
                onChange={handleInputChange}
                helperText="Leave empty for unlimited"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Uses Per User"
                name="max_uses_per_user"
                type="number"
                value={formData.max_uses_per_user}
                onChange={handleInputChange}
                required
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    name="is_active"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
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
