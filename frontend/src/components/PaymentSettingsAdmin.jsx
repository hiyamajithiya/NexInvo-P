import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Save as SaveIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import api from '../services/api';

const PaymentSettingsAdmin = () => {
  const [settings, setSettings] = useState({
    account_holder_name: '',
    account_number: '',
    bank_name: '',
    branch_name: '',
    ifsc_code: '',
    upi_id: '',
    upi_qr_code: '',
    payment_instructions: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/superadmin/payment-settings/');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
      showSnackbar('Failed to load payment settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/superadmin/payment-settings/', settings);
      showSnackbar('Payment settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      showSnackbar(error.response?.data?.error || 'Failed to save payment settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQrCodeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, upi_qr_code: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
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
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BankIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
              Payment Settings
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Configure bank account details for tenant payments
            </Typography>
          </Box>
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Bank Account Details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
                Bank Account Details
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Account Holder Name"
                    name="account_holder_name"
                    value={settings.account_holder_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Chinmay Technosoft Private Limited"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Number"
                    name="account_number"
                    value={settings.account_number}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 50200092327034"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="IFSC Code"
                    name="ifsc_code"
                    value={settings.ifsc_code}
                    onChange={handleChange}
                    required
                    placeholder="e.g., HDFC0000006"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bank Name"
                    name="bank_name"
                    value={settings.bank_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., HDFC Bank"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Branch Name"
                    name="branch_name"
                    value={settings.branch_name}
                    onChange={handleChange}
                    placeholder="e.g., Navrangpura"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
                UPI Details (Optional)
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="UPI ID"
                    name="upi_id"
                    value={settings.upi_id}
                    onChange={handleChange}
                    placeholder="e.g., company@upi"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<QrCodeIcon />}
                    sx={{ height: '56px', width: '100%' }}
                  >
                    Upload UPI QR Code
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleQrCodeUpload}
                    />
                  </Button>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
                Payment Instructions
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Additional Instructions"
                name="payment_instructions"
                value={settings.payment_instructions}
                onChange={handleChange}
                placeholder="Enter any additional instructions for payment (e.g., payment reference format, contact details)"
              />

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={saving}
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    px: 4,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Preview Card */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
                Preview (Tenant View)
              </Typography>

              <Card sx={{ bgcolor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
                    Bank Account Details
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>Account Holder</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                      {settings.account_holder_name || '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>Account Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                      {settings.account_number || '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>IFSC Code</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                      {settings.ifsc_code || '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>Bank</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                      {settings.bank_name}{settings.branch_name ? `, ${settings.branch_name}` : ''}
                    </Typography>
                  </Box>

                  {settings.upi_id && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>UPI ID</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                        {settings.upi_id}
                      </Typography>
                    </Box>
                  )}

                  {settings.upi_qr_code && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <img
                        src={settings.upi_qr_code}
                        alt="UPI QR Code"
                        style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px' }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>

              {settings.payment_instructions && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    {settings.payment_instructions}
                  </Typography>
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </form>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentSettingsAdmin;
