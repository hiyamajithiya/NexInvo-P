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
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { gstCorrectionAPI, invoiceAPI } from '../services/api';

const GstCorrectionDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [correctionData, setCorrectionData] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [downloadComplete, setDownloadComplete] = useState(false);

  useEffect(() => {
    if (open) {
      checkGstCorrections();
      setDownloadComplete(false);
      setDownloadedCount(0);
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

  const downloadSinglePDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await invoiceAPI.generatePDF(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoiceNumber}_Corrected.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error(`Failed to download invoice ${invoiceNumber}:`, err);
      return false;
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice to download');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadedCount(0);
    setError(null);

    const selectedInvoiceDetails = correctionData.invoices.filter(inv =>
      selectedInvoices.includes(inv.id)
    );

    let successCount = 0;
    for (let i = 0; i < selectedInvoiceDetails.length; i++) {
      const invoice = selectedInvoiceDetails[i];
      const success = await downloadSinglePDF(invoice.id, invoice.invoice_number);
      if (success) successCount++;
      setDownloadedCount(i + 1);
      setDownloadProgress(((i + 1) / selectedInvoiceDetails.length) * 100);
      // Small delay between downloads to prevent overwhelming the browser
      if (i < selectedInvoiceDetails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setDownloading(false);
    setDownloadComplete(true);

    if (successCount === selectedInvoiceDetails.length) {
      // All downloads successful - mark as checked
      localStorage.setItem('gst_correction_checked', new Date().toISOString());
    } else {
      setError(`Downloaded ${successCount} of ${selectedInvoiceDetails.length} invoices. Some downloads failed.`);
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

        {downloadComplete && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully downloaded {downloadedCount} corrected invoice PDFs! The GST breakdown (CGST/SGST or IGST) is now correct based on client state.
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> We found {correctionData.invoices_to_review} invoices that need GST type correction.
            Your company state code is <strong>{correctionData.company_state_code}</strong>.
            Download the corrected PDFs below to get invoices with proper GST breakdown.
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

        {downloading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Downloading invoices... ({downloadedCount} of {selectedInvoices.length})
            </Typography>
            <LinearProgress variant="determinate" value={downloadProgress} />
          </Box>
        )}

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
                      disabled={downloading}
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
                    onClick={() => !downloading && handleSelectInvoice(invoice.id)}
                    sx={{ cursor: downloading ? 'default' : 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        disabled={downloading}
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
            <strong>Action:</strong> Click "Download Corrected PDFs" to download invoices with the correct GST breakdown.
            If you've already sent invoices to clients, you may need to re-send the corrected versions.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleSkip} color="inherit" disabled={downloading}>
          Skip for Now
        </Button>
        <Button
          onClick={handleDownloadSelected}
          variant="contained"
          color="primary"
          disabled={downloading || selectedInvoices.length === 0}
          startIcon={downloading ? <CircularProgress size={20} /> : <DownloadIcon />}
        >
          {downloading
            ? `Downloading (${downloadedCount}/${selectedInvoices.length})...`
            : `Download Corrected PDFs (${selectedInvoices.length})`
          }
        </Button>
        {downloadComplete && (
          <Button onClick={handleClose} variant="contained" color="success">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GstCorrectionDialog;
