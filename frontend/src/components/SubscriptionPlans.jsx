import React, { useState, useEffect } from 'react';
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
import api, { subscriptionAPI } from '../services/api';

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
    max_organizations: 1,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await subscriptionAPI.getPlans();
      setPlans(response.data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (error) {
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
        max_organizations: plan.max_organizations || 1,
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
        max_organizations: 1,
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
        max_organizations: parseInt(formData.max_organizations),
        max_invoices_per_month: parseInt(formData.max_invoices_per_month),
        max_storage_gb: parseInt(formData.max_storage_gb),
        sort_order: parseInt(formData.sort_order),
      };

      if (editMode) {
        await api.put(`/subscription-plans/${currentPlan.id}/`, payload);
        showSnackbar('Subscription plan updated successfully', 'success');
      } else {
        await api.post('/subscription-plans/', payload);
        showSnackbar('Subscription plan created successfully', 'success');
      }

      handleCloseDialog();
      loadPlans();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to save subscription plan', 'error');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) {
      return;
    }

    try {
      await api.delete(`/subscription-plans/${planId}/`);
      showSnackbar('Subscription plan deleted successfully', 'success');
      loadPlans();
    } catch (error) {
      showSnackbar('Failed to delete subscription plan', 'error');
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      await api.patch(`/subscription-plans/${plan.id}/`, { is_active: !plan.is_active });
      showSnackbar(`Plan ${!plan.is_active ? 'activated' : 'deactivated'} successfully`, 'success');
      loadPlans();
    } catch (error) {
      showSnackbar('Failed to update plan status', 'error');
    }
  };

  const handleToggleVisible = async (plan) => {
    try {
      await api.patch(`/subscription-plans/${plan.id}/`, { is_visible: !plan.is_visible });
      showSnackbar(`Plan visibility updated successfully`, 'success');
      loadPlans();
    } catch (error) {
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
                          🏢 {plan.max_organizations || 1} organizations
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
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 3
        }}>
          {editMode ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Plan Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Professional Plan"
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
                      placeholder="Brief description of the plan features and benefits"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Sort Order"
                      name="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={handleInputChange}
                      helperText="Lower numbers appear first (0, 1, 2...)"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Pricing Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#f0fdf4', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#10b981', borderRadius: 1, mr: 2 }} />
                  Pricing
                </Typography>
                <Grid container spacing={2}>
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
                        startAdornment: <Typography sx={{ mr: 1, fontWeight: 'bold' }}>₹</Typography>,
                      }}
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ bgcolor: 'white' }}>
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Trial Period (days)"
                      name="trial_days"
                      type="number"
                      value={formData.trial_days}
                      onChange={handleInputChange}
                      helperText="Set to 0 for no trial period"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Features Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#fef3c7', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#f59e0b', borderRadius: 1, mr: 2 }} />
                  Features
                </Typography>
                <TextField
                  fullWidth
                  label="Plan Features"
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  multiline
                  rows={6}
                  helperText="Enter one feature per line"
                  placeholder={"Priority Support\nAPI Access\nCustom Branding\nAdvanced Analytics\n24/7 Customer Service"}
                  sx={{ bgcolor: 'white' }}
                />
              </Paper>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              {/* Limits Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#dbeafe', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#3b82f6', borderRadius: 1, mr: 2 }} />
                  Usage Limits
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Users"
                      name="max_users"
                      type="number"
                      value={formData.max_users}
                      onChange={handleInputChange}
                      required
                      helperText="Maximum users per organization"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Organizations"
                      name="max_organizations"
                      type="number"
                      value={formData.max_organizations}
                      onChange={handleInputChange}
                      required
                      helperText="Maximum organizations user can create"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Invoices Per Month"
                      name="max_invoices_per_month"
                      type="number"
                      value={formData.max_invoices_per_month}
                      onChange={handleInputChange}
                      required
                      helperText="Monthly invoice generation limit"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Storage (GB)"
                      name="max_storage_gb"
                      type="number"
                      value={formData.max_storage_gb}
                      onChange={handleInputChange}
                      required
                      helperText="Total storage space in gigabytes"
                      sx={{ bgcolor: 'white' }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Status & Visibility Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: '#f3e8ff', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 24, bgcolor: '#8b5cf6', borderRadius: 1, mr: 2 }} />
                  Status & Visibility
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Active</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Plan is available for subscription</Typography>
                      </Box>
                      <Switch
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        name="is_active"
                        color="success"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Visible to Public</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Show plan on pricing page</Typography>
                      </Box>
                      <Switch
                        checked={formData.is_visible}
                        onChange={handleInputChange}
                        name="is_visible"
                        color="primary"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>Featured Plan</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Highlight as recommended choice</Typography>
                      </Box>
                      <Switch
                        checked={formData.highlight}
                        onChange={handleInputChange}
                        name="highlight"
                        color="warning"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Preview Card */}
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, border: formData.highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
                <Typography variant="caption" sx={{ color: '#6b7280', mb: 1, display: 'block' }}>Preview</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                  {formData.name || 'Plan Name'}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#8b5cf6', display: 'inline' }}>
                    ₹{formData.price || '0'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280', display: 'inline', ml: 1 }}>
                    / {formData.billing_cycle === 'monthly' ? 'month' : 'year'}
                  </Typography>
                </Box>
                {formData.trial_days > 0 && (
                  <Chip
                    label={`${formData.trial_days} days free trial`}
                    size="small"
                    sx={{ mb: 2, bgcolor: '#dbeafe', color: '#1e40af' }}
                  />
                )}
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                  {formData.description || 'Plan description will appear here'}
                </Typography>
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
              py: 1
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
