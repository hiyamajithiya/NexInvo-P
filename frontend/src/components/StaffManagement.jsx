import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Avatar,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Support as SupportIcon,
  TrendingUp as SalesIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { staffAPI } from '../services/api';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [stats, setStats] = useState({ total_support: 0, total_sales: 0, total_staff: 0 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    staff_type: 'support',
    phone: '',
    department: '',
    employee_id: '',
    is_active: true,
    can_view_all_organizations: true,
    can_view_subscriptions: true,
    can_manage_tickets: true,
    can_view_revenue: false,
    can_manage_leads: false,
  });

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      const staffType = tabValue === 0 ? null : tabValue === 1 ? 'support' : 'sales';
      const [staffResponse, statsResponse] = await Promise.all([
        staffAPI.getAll(staffType),
        staffAPI.getStats(),
      ]);
      setStaffList(staffResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      showSnackbar('Failed to load staff data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (staff = null) => {
    if (staff) {
      setEditMode(true);
      setCurrentStaff(staff);
      setFormData({
        email: staff.user_email,
        password: '',
        first_name: staff.user_name?.split(' ')[0] || '',
        last_name: staff.user_name?.split(' ').slice(1).join(' ') || '',
        staff_type: staff.staff_type,
        phone: staff.phone || '',
        department: staff.department || '',
        employee_id: staff.employee_id || '',
        is_active: staff.is_active,
        can_view_all_organizations: staff.can_view_all_organizations,
        can_view_subscriptions: staff.can_view_subscriptions,
        can_manage_tickets: staff.can_manage_tickets,
        can_view_revenue: staff.can_view_revenue,
        can_manage_leads: staff.can_manage_leads,
      });
    } else {
      setEditMode(false);
      setCurrentStaff(null);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        staff_type: tabValue === 2 ? 'sales' : 'support',
        phone: '',
        department: '',
        employee_id: '',
        is_active: true,
        can_view_all_organizations: true,
        can_view_subscriptions: true,
        can_manage_tickets: true,
        can_view_revenue: false,
        can_manage_leads: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setCurrentStaff(null);
  };

  const handleSubmit = async () => {
    try {
      if (editMode) {
        await staffAPI.update(currentStaff.id, formData);
        showSnackbar('Staff member updated successfully');
      } else {
        await staffAPI.create(formData);
        showSnackbar('Staff member created successfully');
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to save staff member', 'error');
    }
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`Are you sure you want to delete ${staff.user_name}?`)) {
      return;
    }

    try {
      await staffAPI.delete(staff.id);
      showSnackbar('Staff member deleted successfully');
      loadData();
    } catch (error) {
      showSnackbar('Failed to delete staff member', 'error');
    }
  };

  const handleStaffTypeChange = (e) => {
    const staffType = e.target.value;
    setFormData(prev => ({
      ...prev,
      staff_type: staffType,
      can_manage_tickets: staffType === 'support',
      can_view_revenue: staffType === 'sales',
      can_manage_leads: staffType === 'sales',
    }));
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#8b5cf6', width: 56, height: 56 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                {stats.total_staff}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Staff</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#10b981', width: 56, height: 56 }}>
              <SupportIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                {stats.total_support}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>Support Team</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#f59e0b', width: 56, height: 56 }}>
              <SalesIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>
                {stats.total_sales}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>Sales Team</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="All Staff" />
            <Tab label="Support Team" icon={<SupportIcon />} iconPosition="start" />
            <Tab label="Sales Team" icon={<SalesIcon />} iconPosition="start" />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={loadData} title="Refresh">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ textTransform: 'none', bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
            >
              Add Staff
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#6b7280' }}>
                      No staff members found. Click "Add Staff" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((staff) => (
                    <TableRow key={staff.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: staff.staff_type === 'support' ? '#10b981' : '#f59e0b' }}>
                            {staff.user_name?.charAt(0) || 'S'}
                          </Avatar>
                          {staff.user_name}
                        </Box>
                      </TableCell>
                      <TableCell>{staff.user_email}</TableCell>
                      <TableCell>
                        <Chip
                          icon={staff.staff_type === 'support' ? <SupportIcon /> : <SalesIcon />}
                          label={staff.staff_type_display}
                          size="small"
                          sx={{
                            bgcolor: staff.staff_type === 'support' ? '#d1fae5' : '#fef3c7',
                            color: staff.staff_type === 'support' ? '#065f46' : '#92400e',
                          }}
                        />
                      </TableCell>
                      <TableCell>{staff.department || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={staff.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: staff.is_active ? '#d1fae5' : '#fee2e2',
                            color: staff.is_active ? '#065f46' : '#991b1b',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(staff.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenDialog(staff)} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(staff)} title="Delete" sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
          {editMode ? 'Edit Staff Member' : 'Add New Staff Member'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={editMode}
              />
            </Grid>
            {!editMode && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Staff Type</InputLabel>
                <Select
                  value={formData.staff_type}
                  label="Staff Type"
                  onChange={handleStaffTypeChange}
                  disabled={editMode}
                >
                  <MenuItem value="support">Support Team</MenuItem>
                  <MenuItem value="sales">Sales Team</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee ID"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </Grid>

            {/* Permissions */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>
                Permissions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.can_view_all_organizations}
                      onChange={(e) => setFormData({ ...formData, can_view_all_organizations: e.target.checked })}
                    />
                  }
                  label="View All Organizations"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.can_view_subscriptions}
                      onChange={(e) => setFormData({ ...formData, can_view_subscriptions: e.target.checked })}
                    />
                  }
                  label="View Subscriptions"
                />
                {formData.staff_type === 'support' && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.can_manage_tickets}
                        onChange={(e) => setFormData({ ...formData, can_manage_tickets: e.target.checked })}
                      />
                    }
                    label="Manage Tickets"
                  />
                )}
                {formData.staff_type === 'sales' && (
                  <>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.can_view_revenue}
                          onChange={(e) => setFormData({ ...formData, can_view_revenue: e.target.checked })}
                        />
                      }
                      label="View Revenue"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.can_manage_leads}
                          onChange={(e) => setFormData({ ...formData, can_manage_leads: e.target.checked })}
                        />
                      }
                      label="Manage Leads"
                    />
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ textTransform: 'none', bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
          >
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StaffManagement;
