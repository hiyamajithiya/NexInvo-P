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
  LinearProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { gstCorrectionAPI } from '../services/api';

const GstCorrectionDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [correctionData, setCorrectionData] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [fixComplete, setFixComplete] = useState(false);
  const [fixResult, setFixResult] = useState(null);

  useEffect(() => {
    if (open) {
      checkGstCorrections();
      setFixComplete(false);
      setFixResult(null);
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

  const handleFixSelected = async () => {
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice to fix');
      return;
    }

    setFixing(true);
    setError(null);

    try {
      const response = await gstCorrectionAPI.acknowledgeCorrections(selectedInvoices);
      setFixResult(response.data);
      setFixComplete(true);
      // Mark as checked in localStorage
      localStorage.setItem('gst_correction_checked', new Date().toISOString());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fix GST corrections');
    } finally {
      setFixing(false);
    }
  };

  const handleSkip = () => {
    // Mark as checked in localStorage even if skipped
    localStorage.setItem('gst_correction_checked', new Date().toISOString());
    onClose(false);
  };

  const handleClose = () => {
    localStorage.setItem('gst_correction_checked', new Date().toISOString());
    onClose(true);
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
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {fixComplete && fixResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              {fixResult.message}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              The GST breakdown (CGST/SGST or IGST) has been updated in the database for {fixResult.updated_count} invoices.
            </Typography>
          </Alert>
        )}

        {!fixComplete && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> We found {correctionData.invoices_to_review} invoices that need GST type correction.
                Your company state code is <strong>{correctionData.company_state_code}</strong>.
                Click "Fix Selected Invoices" to update the GST breakdown in the database.
              </Typography>
            </Alert>

            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                GST Rules Applied:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - <strong>Same State (Local)</strong>: CGST + SGST (tax split 50-50)
                <br />
                - <strong>Different State (Interstate)</strong>: IGST (full tax amount)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
              <Typography variant="subtitle1">
                Invoices to Correct ({correctionData.invoices.length})
              </Typography>
              <Box>
                <IconButton onClick={checkGstCorrections} size="small" title="Refresh list">
                  <RefreshIcon />
                </IconButton>
                <IconButton onClick={() => setShowDetails(!showDetails)} size="small">
                  {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>

            <Collapse in={showDetails}>
              <TableContainer component={Paper} sx={{ maxHeight: 350 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedInvoices.length === correctionData.invoices.length}
                          indeterminate={selectedInvoices.length > 0 && selectedInvoices.length < correctionData.invoices.length}
                          onChange={handleSelectAll}
                          disabled={fixing}
                        />
                      </TableCell>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Client State</TableCell>
                      <TableCell align="right">Tax Amount</TableCell>
                      <TableCell>Correct GST Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {correctionData.invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        hover
                        selected={selectedInvoices.includes(invoice.id)}
                        onClick={() => !fixing && handleSelectInvoice(invoice.id)}
                        sx={{ cursor: fixing ? 'default' : 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            disabled={fixing}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleSelectInvoice(invoice.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <strong>{invoice.invoice_number}</strong>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.invoice_type === 'proforma' ? 'Proforma' : 'Tax'}
                            size="small"
                            color={invoice.invoice_type === 'proforma' ? 'warning' : 'primary'}
                          />
                        </TableCell>
                        <TableCell>{invoice.invoice_date}</TableCell>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.client_state_code}
                            size="small"
                            variant="outlined"
                            color={invoice.client_state_code === correctionData.company_state_code ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(invoice.tax_amount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.correct_gst_type}
                            size="small"
                            color={invoice.is_interstate ? 'error' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Action:</strong> Click "Fix Selected Invoices" to update the GST breakdown in the database.
                This will set the correct CGST/SGST or IGST amounts for each invoice item.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {!fixComplete ? (
          <>
            <Button onClick={handleSkip} color="inherit" disabled={fixing}>
              Skip for Now
            </Button>
            <Button
              onClick={handleFixSelected}
              variant="contained"
              color="primary"
              disabled={fixing || selectedInvoices.length === 0}
              startIcon={fixing ? <CircularProgress size={20} /> : <BuildIcon />}
            >
              {fixing
                ? 'Fixing Invoices...'
                : `Fix Selected Invoices (${selectedInvoices.length})`
              }
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} variant="contained" color="success">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GstCorrectionDialog;
