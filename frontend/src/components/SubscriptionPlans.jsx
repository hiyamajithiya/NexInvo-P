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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly',
    trial_days: 0,
    max_users: 1,
    max_invoices_per_month: 100,
    max_storage_gb: 1,
    features: '',
    is_active: true,
    is_visible: true,
    highlight: false,
    sort_order: 0,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/subscription-plans/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      showSnackbar('Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plan = null) => {
    if (plan) {
      setEditMode(true);
      setCurrentPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billing_cycle: plan.billing_cycle,
        trial_days: plan.trial_days || 0,
        max_users: plan.max_users,
        max_invoices_per_month: plan.max_invoices_per_month,
        max_storage_gb: plan.max_storage_gb,
        features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
        is_active: plan.is_active,
        is_visible: plan.is_visible,
        highlight: plan.highlight || false,
        sort_order: plan.sort_order || 0,
      });
    } else {
      setEditMode(false);
      setCurrentPlan(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        billing_cycle: 'monthly',
        trial_days: 0,
        max_users: 1,
        max_invoices_per_month: 100,
        max_storage_gb: 1,
        features: '',
        is_active: true,
        is_visible: true,
        highlight: false,
        sort_order: plans.length,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentPlan(null);
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

      // Convert features from string to array
      const featuresArray = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const payload = {
        ...formData,
        features: featuresArray,
        price: parseFloat(formData.price),
        trial_days: parseInt(formData.trial_days),
        max_users: parseInt(formData.max_users),
        max_invoices_per_month: parseInt(formData.max_invoices_per_month),
        max_storage_gb: parseInt(formData.max_storage_gb),
        sort_order: parseInt(formData.sort_order),
      };

      if (editMode) {
        await axios.put(
          `${API_BASE_URL}/subscription-plans/${currentPlan.id}/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSnackbar('Subscription plan updated successfully', 'success');
      } else {
        await axios.post(
          `${API_BASE_URL}/subscription-plans/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSnackbar('Subscription plan created successfully', 'success');
      }

      handleCloseDialog();
      loadPlans();
    } catch (error) {
      console.error('Error saving subscription plan:', error);
      showSnackbar(error.response?.data?.error || 'Failed to save subscription plan', 'error');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/subscription-plans/${planId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Subscription plan deleted successfully', 'success');
      loadPlans();
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      showSnackbar('Failed to delete subscription plan', 'error');
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(
        `${API_BASE_URL}/subscription-plans/${plan.id}/`,
        { is_active: !plan.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`Plan ${!plan.is_active ? 'activated' : 'deactivated'} successfully`, 'success');
      loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      showSnackbar('Failed to update plan status', 'error');
    }
  };

  const handleToggleVisible = async (plan) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(
        `${API_BASE_URL}/subscription-plans/${plan.id}/`,
        { is_visible: !plan.is_visible },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`Plan visibility updated successfully`, 'success');
      loadPlans();
    } catch (error) {
      console.error('Error toggling plan visibility:', error);
      showSnackbar('Failed to update plan visibility', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
              Subscription Plans Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Create and manage subscription plans for your SaaS platform
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
            Add New Plan
          </Button>
        </Box>
      </Paper>

      {/* Plans Table */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Billing</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Limits</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Trial</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Visibility</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Featured</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body1" sx={{ color: '#6b7280', mb: 2 }}>
                      No subscription plans created yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog()}
                    >
                      Create Your First Plan
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>
                      <Chip
                        label={plan.sort_order}
                        size="small"
                        sx={{ bgcolor: '#f3f4f6', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {plan.name}
                        </Typography>
                        {plan.description && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {plan.description.substring(0, 50)}
                            {plan.description.length > 50 ? '...' : ''}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                        ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={plan.billing_cycle.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: plan.billing_cycle === 'yearly' ? '#ddd6fe' : '#dbeafe',
                          color: plan.billing_cycle === 'yearly' ? '#5b21b6' : '#1e40af',
                          fontWeight: 'bold',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          👥 {plan.max_users} users
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          📄 {plan.max_invoices_per_month} invoices/mo
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          💾 {plan.max_storage_gb} GB storage
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {plan.trial_days > 0 ? `${plan.trial_days} days` : 'No trial'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={plan.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        icon={plan.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                        onClick={() => handleToggleActive(plan)}
                        sx={{
                          bgcolor: plan.is_active ? '#d1fae5' : '#fee2e2',
                          color: plan.is_active ? '#065f46' : '#991b1b',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleVisible(plan)}
                        sx={{
                          color: plan.is_visible ? '#10b981' : '#6b7280',
                        }}
                      >
                        {plan.is_visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        sx={{
                          color: plan.highlight ? '#f59e0b' : '#6b7280',
                        }}
                      >
                        {plan.highlight ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(plan)}
                          sx={{ color: '#3b82f6' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(plan.id)}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
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
          {editMode ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
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
                label="Plan Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sort Order"
                name="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={handleInputChange}
                helperText="Lower numbers appear first"
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

            {/* Pricing */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Pricing
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Billing Cycle</InputLabel>
                <Select
                  name="billing_cycle"
                  value={formData.billing_cycle}
                  onChange={handleInputChange}
                  label="Billing Cycle"
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Trial Period (days)"
                name="trial_days"
                type="number"
                value={formData.trial_days}
                onChange={handleInputChange}
              />
            </Grid>

            {/* Limits */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Limits
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Users"
                name="max_users"
                type="number"
                value={formData.max_users}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Invoices/Month"
                name="max_invoices_per_month"
                type="number"
                value={formData.max_invoices_per_month}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Storage (GB)"
                name="max_storage_gb"
                type="number"
                value={formData.max_storage_gb}
                onChange={handleInputChange}
                required
              />
            </Grid>

            {/* Features */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Features
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Features"
                name="features"
                value={formData.features}
                onChange={handleInputChange}
                multiline
                rows={4}
                helperText="Enter one feature per line"
                placeholder="Basic Support&#10;Email Notifications&#10;Custom Branding"
              />
            </Grid>

            {/* Status & Visibility */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1, mt: 2 }}>
                Status & Visibility
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_visible}
                    onChange={handleInputChange}
                    name="is_visible"
                  />
                }
                label="Visible to Public"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.highlight}
                    onChange={handleInputChange}
                    name="highlight"
                  />
                }
                label="Featured Plan"
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
            {editMode ? 'Update Plan' : 'Create Plan'}
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

export default SubscriptionPlans;
