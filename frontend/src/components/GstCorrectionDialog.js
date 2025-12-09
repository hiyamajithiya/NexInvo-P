import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { gstCorrectionAPI } from '../services/api';

const GstCorrectionDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [correctionData, setCorrectionData] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (open) {
      checkGstCorrections();
    }
  }, [open]);

  const checkGstCorrections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gstCorrectionAPI.checkCorrections();
      setCorrectionData(response.data);
      // Pre-select all invoices
      if (response.data.invoices) {
        setSelectedInvoices(response.data.invoices.map(inv => inv.id));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check GST corrections');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedInvoices(correctionData.invoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleAcknowledge = async () => {
    try {
      setAcknowledging(true);
      await gstCorrectionAPI.acknowledgeCorrections(selectedInvoices);
      // Mark as checked in localStorage
      localStorage.setItem('gst_correction_checked', new Date().toISOString());
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge corrections');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleSkip = () => {
    // Mark as checked in localStorage even if skipped
    localStorage.setItem('gst_correction_checked', new Date().toISOString());
    onClose(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography ml={2}>Checking invoices for GST corrections...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!correctionData?.needs_correction) {
    return (
      <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" />
          GST Check Complete
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mt: 1 }}>
            {correctionData?.message || 'All your invoices have the correct GST type (CGST/SGST or IGST) based on client state.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(false)} variant="contained">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
        <WarningIcon />
        GST Type Correction Required
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> We found {correctionData.invoices_to_review} invoices that may have incorrect GST type.
            The GST type (CGST/SGST vs IGST) is determined by comparing your company state code
            (<strong>{correctionData.company_state_code}</strong>) with the client's state code.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
            GST Rules:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            - <strong>Same State (Local)</strong>: CGST + SGST (tax split equally)
            <br />
            - <strong>Different State (Interstate)</strong>: IGST (full tax amount)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Invoices to Review ({correctionData.invoices.length})
          </Typography>
          <IconButton onClick={() => setShowDetails(!showDetails)} size="small">
            {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={showDetails}>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedInvoices.length === correctionData.invoices.length}
                      indeterminate={selectedInvoices.length > 0 && selectedInvoices.length < correctionData.invoices.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Client State</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Correct GST</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {correctionData.invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    hover
                    onClick={() => handleSelectInvoice(invoice.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleSelectInvoice(invoice.id)}
                      />
                    </TableCell>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.invoice_type === 'proforma' ? 'Proforma' : 'Tax'}
                        size="small"
                        color={invoice.invoice_type === 'proforma' ? 'warning' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>{invoice.invoice_date}</TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell>{invoice.client_state_code}</TableCell>
                    <TableCell align="right">{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.correct_gst_type}
                        size="small"
                        color={invoice.is_interstate ? 'error' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>

        {!showDetails && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary">
              Click the expand button above to see the full list of {correctionData.invoices.length} invoices.
            </Typography>
          </Paper>
        )}

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Action Required:</strong> Please regenerate/download the PDF for these invoices to get the corrected GST breakdown.
            The system will now automatically calculate the correct GST type based on client state.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleSkip} color="inherit">
          Skip for Now
        </Button>
        <Button
          onClick={handleAcknowledge}
          variant="contained"
          color="primary"
          disabled={acknowledging || selectedInvoices.length === 0}
        >
          {acknowledging ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          Acknowledge & Continue ({selectedInvoices.length} selected)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GstCorrectionDialog;
