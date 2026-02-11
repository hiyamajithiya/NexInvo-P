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
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { formatDate } from '../utils/dateFormat';

const PaymentRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [imageDialog, setImageDialog] = useState(false);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'all' ? '' : activeTab;
      const response = await api.get(`/superadmin/payment-requests/${statusFilter ? `?status=${statusFilter}` : ''}`);
      setRequests(response.data.requests);
      setCounts(response.data.counts);
    } catch (error) {
      showSnackbar('Failed to load payment requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      await api.post(`/superadmin/payment-requests/${selectedRequest.id}/approve/`, {
        admin_notes: adminNotes,
      });
      showSnackbar('Payment request approved successfully', 'success');
      setApproveDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
      loadRequests();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to approve request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setProcessing(true);

    try {
      await api.post(`/superadmin/payment-requests/${selectedRequest.id}/reject/`, {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
      });
      showSnackbar('Payment request rejected', 'success');
      setRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setAdminNotes('');
      loadRequests();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to reject request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 'bold' }}
      />
    );
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      bank_transfer: 'Bank Transfer',
      upi: 'UPI',
      cheque: 'Cheque',
      cash: 'Cash Deposit',
      other: 'Other',
    };
    return methods[method] || method;
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ReceiptIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
                Payment Requests
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Review and approve tenant payment submissions
              </Typography>
            </Box>
          </Box>
          {counts.pending > 0 && (
            <Chip
              label={`${counts.pending} Pending`}
              sx={{
                bgcolor: '#fef3c7',
                color: '#92400e',
                fontWeight: 'bold',
                fontSize: '14px',
                px: 2,
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#6366f1' }}>
                {counts.all}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Requests</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2, bgcolor: '#fef3c7' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#92400e' }}>
                {counts.pending}
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e' }}>Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2, bgcolor: '#d1fae5' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#065f46' }}>
                {counts.approved}
              </Typography>
              <Typography variant="body2" sx={{ color: '#065f46' }}>Approved</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderRadius: 2, bgcolor: '#fee2e2' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#991b1b' }}>
                {counts.rejected}
              </Typography>
              <Typography variant="body2" sx={{ color: '#991b1b' }}>Rejected</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: '1px solid #e5e7eb', px: 2 }}
        >
          <Tab value="pending" label={`Pending (${counts.pending})`} />
          <Tab value="approved" label={`Approved (${counts.approved})`} />
          <Tab value="rejected" label={`Rejected (${counts.rejected})`} />
          <Tab value="all" label={`All (${counts.all})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: '#6b7280' }}>No payment requests found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Transaction ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Payment Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Submitted</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                        {request.organization_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {request.requested_by}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.plan_name}
                        size="small"
                        sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                        ₹{parseFloat(request.final_amount).toLocaleString('en-IN')}
                      </Typography>
                      {parseFloat(request.discount_amount) > 0 && (
                        <Typography variant="caption" sx={{ color: '#10b981' }}>
                          Discount: ₹{parseFloat(request.discount_amount).toLocaleString('en-IN')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#111827' }}>
                        {request.transaction_id}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {getPaymentMethodLabel(request.payment_method)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(request.payment_date)}</TableCell>
                    <TableCell>{getStatusChip(request.status)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {formatDate(request.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => { setSelectedRequest(request); setViewDialog(true); }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {request.status === 'pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => { setSelectedRequest(request); setApproveDialog(true); }}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => { setSelectedRequest(request); setRejectDialog(true); }}
                              >
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Payment Request Details
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedRequest && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Organization</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{selectedRequest.organization_name}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Requested By</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{selectedRequest.requested_by}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Plan</Typography>
                  <Chip label={selectedRequest.plan_name} size="small" sx={{ bgcolor: '#ddd6fe', color: '#5b21b6' }} />
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Status</Typography>
                  {getStatusChip(selectedRequest.status)}
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Original Amount</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                    ₹{parseFloat(selectedRequest.amount).toLocaleString('en-IN')}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#d1fae5', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#065f46', mb: 0.5 }}>Discount</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#065f46' }}>
                    ₹{parseFloat(selectedRequest.discount_amount).toLocaleString('en-IN')}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#dbeafe', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#1e40af', mb: 0.5 }}>Final Amount</Typography>
                  <Typography sx={{ fontWeight: 700, color: '#1e40af', fontSize: '1.25rem' }}>
                    ₹{parseFloat(selectedRequest.final_amount).toLocaleString('en-IN')}
                  </Typography>
                </Paper>
              </Grid>
              {selectedRequest.coupon_code && (
                <Grid item xs={12}>
                  <Alert severity="success" icon={false}>
                    Coupon Applied: <strong>{selectedRequest.coupon_code}</strong>
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Transaction ID</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                    {selectedRequest.transaction_id}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Payment Method</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                    {getPaymentMethodLabel(selectedRequest.payment_method)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Payment Date</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                    {formatDate(selectedRequest.payment_date)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Submitted On</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                    {formatDate(selectedRequest.created_at)}
                  </Typography>
                </Paper>
              </Grid>
              {selectedRequest.user_notes && (
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>User Notes</Typography>
                    <Typography sx={{ color: '#111827' }}>{selectedRequest.user_notes}</Typography>
                  </Paper>
                </Grid>
              )}
              {selectedRequest.payment_screenshot && (
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={<ImageIcon />}
                    onClick={() => setImageDialog(true)}
                    fullWidth
                  >
                    View Payment Screenshot
                  </Button>
                </Grid>
              )}
              {selectedRequest.status !== 'pending' && (
                <>
                  {selectedRequest.admin_notes && (
                    <Grid item xs={12}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#dbeafe', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#1e40af', mb: 0.5 }}>Admin Notes</Typography>
                        <Typography sx={{ color: '#1e40af' }}>{selectedRequest.admin_notes}</Typography>
                      </Paper>
                    </Grid>
                  )}
                  {selectedRequest.rejection_reason && (
                    <Grid item xs={12}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#fee2e2', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#991b1b', mb: 0.5 }}>Rejection Reason</Typography>
                        <Typography sx={{ color: '#991b1b' }}>{selectedRequest.rejection_reason}</Typography>
                      </Paper>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => { setViewDialog(false); setApproveDialog(true); }}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => { setViewDialog(false); setRejectDialog(true); }}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Approve Payment Request
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Approving this request will activate the subscription for <strong>{selectedRequest?.organization_name}</strong>.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2, color: '#6b7280' }}>
            Plan: <strong>{selectedRequest?.plan_name}</strong><br />
            Amount: <strong>₹{selectedRequest && parseFloat(selectedRequest.final_amount).toLocaleString('en-IN')}</strong><br />
            Transaction ID: <strong>{selectedRequest?.transaction_id}</strong>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Admin Notes (Optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any notes for internal reference"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setApproveDialog(false)} disabled={processing}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <ApproveIcon />}
          >
            {processing ? 'Approving...' : 'Approve & Activate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Reject Payment Request
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            The organization will be notified of the rejection with the reason provided.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Payment not received, Invalid transaction ID, Amount mismatch"
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Admin Notes (Optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes (not visible to user)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => setRejectDialog(false)} disabled={processing}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={processing || !rejectionReason.trim()}
            startIcon={processing ? <CircularProgress size={20} /> : <RejectIcon />}
          >
            {processing ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialog} onClose={() => setImageDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Payment Screenshot
        </DialogTitle>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          {selectedRequest?.payment_screenshot && (
            <img
              src={selectedRequest.payment_screenshot}
              alt="Payment Screenshot"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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

export default PaymentRequestsAdmin;
