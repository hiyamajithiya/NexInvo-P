import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Avatar,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as PreviewIcon,
  FormatQuote as QuoteIcon,
} from '@mui/icons-material';
import api from '../services/api';

const ReviewsAdmin = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialog states
  const [rejectDialog, setRejectDialog] = useState({ open: false, review: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewDialog, setPreviewDialog] = useState({ open: false, review: null });
  const [processing, setProcessing] = useState(false);

  const tabFilters = ['all', 'pending', 'approved', 'rejected'];

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const statusFilter = tabFilters[activeTab] === 'all' ? '' : tabFilters[activeTab];
      const response = await api.get(`/superadmin/reviews/${statusFilter ? `?status=${statusFilter}` : ''}`);
      setReviews(response.data.reviews || []);
    } catch (error) {
      showSnackbar('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId) => {
    setProcessing(true);
    try {
      await api.post(`/superadmin/reviews/${reviewId}/approve/`);
      showSnackbar('Review approved successfully', 'success');
      loadReviews();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to approve review', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showSnackbar('Please provide a rejection reason', 'warning');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/superadmin/reviews/${rejectDialog.review.id}/reject/`, {
        rejection_reason: rejectionReason,
      });
      showSnackbar('Review rejected', 'success');
      setRejectDialog({ open: false, review: null });
      setRejectionReason('');
      loadReviews();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to reject review', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleFeatured = async (reviewId) => {
    try {
      const response = await api.post(`/superadmin/reviews/${reviewId}/toggle-featured/`);
      showSnackbar(response.data.message, 'success');
      loadReviews();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to update featured status', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return { bg: '#d1fae5', color: '#065f46' };
      case 'rejected': return { bg: '#fee2e2', color: '#991b1b' };
      case 'pending': return { bg: '#fef3c7', color: '#92400e' };
      default: return { bg: '#e5e7eb', color: '#374151' };
    }
  };

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QuoteIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
              Customer Reviews
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Manage and approve customer testimonials for the landing page
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: '1px solid #e5e7eb',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab label="All Reviews" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pending
                {pendingCount > 0 && (
                  <Chip
                    label={pendingCount}
                    size="small"
                    sx={{ bgcolor: '#f59e0b', color: 'white', height: 20, minWidth: 24 }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Approved" />
          <Tab label="Rejected" />
        </Tabs>
      </Paper>

      {/* Reviews List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <QuoteIcon sx={{ fontSize: 60, color: '#d1d5db', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6b7280' }}>
            No reviews found
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            {activeTab === 1 ? 'No pending reviews to approve' : 'Reviews will appear here once submitted'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {reviews.map((review) => (
            <Grid item xs={12} md={6} key={review.id}>
              <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={review.profile_image}
                        sx={{ width: 50, height: 50, bgcolor: '#8b5cf6' }}
                      >
                        {review.display_name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#111827' }}>
                          {review.display_name}
                        </Typography>
                        {review.designation && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {review.designation}{review.company_name ? ` at ${review.company_name}` : ''}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(review.status).bg,
                          color: getStatusColor(review.status).color,
                          fontWeight: 'bold',
                        }}
                      />
                      {review.is_featured && (
                        <Chip
                          icon={<StarIcon sx={{ fontSize: 16 }} />}
                          label="Featured"
                          size="small"
                          sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Rating */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating value={review.rating} readOnly size="small" />
                    <Typography variant="body2" sx={{ ml: 1, color: '#6b7280' }}>
                      ({review.rating}/5)
                    </Typography>
                  </Box>

                  {/* Review Content */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                    "{review.title}"
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#4b5563',
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {review.content}
                  </Typography>

                  {/* Meta Info */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      From: {review.organization_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {formatDate(review.created_at)}
                    </Typography>
                  </Box>

                  {/* Rejection Reason */}
                  {review.status === 'rejected' && review.rejection_reason && (
                    <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                      <Typography variant="caption">{review.rejection_reason}</Typography>
                    </Alert>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Tooltip title="Preview">
                      <IconButton
                        size="small"
                        onClick={() => setPreviewDialog({ open: true, review })}
                        sx={{ border: '1px solid #e5e7eb' }}
                      >
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {review.status === 'pending' && (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ApproveIcon />}
                          onClick={() => handleApprove(review.id)}
                          disabled={processing}
                          sx={{
                            bgcolor: '#10b981',
                            '&:hover': { bgcolor: '#059669' },
                            textTransform: 'none',
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<RejectIcon />}
                          onClick={() => setRejectDialog({ open: true, review })}
                          disabled={processing}
                          sx={{
                            borderColor: '#ef4444',
                            color: '#ef4444',
                            '&:hover': { borderColor: '#dc2626', bgcolor: '#fef2f2' },
                            textTransform: 'none',
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {review.status === 'approved' && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={review.is_featured ? <StarIcon /> : <StarBorderIcon />}
                        onClick={() => handleToggleFeatured(review.id)}
                        sx={{
                          borderColor: review.is_featured ? '#f59e0b' : '#d1d5db',
                          color: review.is_featured ? '#f59e0b' : '#6b7280',
                          textTransform: 'none',
                        }}
                      >
                        {review.is_featured ? 'Unfeature' : 'Feature'}
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => !processing && setRejectDialog({ open: false, review: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Reject Review
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Please provide a reason for rejecting this review. This will be recorded for internal purposes.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter the reason for rejection..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setRejectDialog({ open: false, review: null })}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReject}
            disabled={processing || !rejectionReason.trim()}
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
          >
            {processing ? <CircularProgress size={20} color="inherit" /> : 'Reject Review'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, review: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
          Preview: How it will appear on landing page
        </DialogTitle>
        <DialogContent>
          {previewDialog.review && (
            <Card sx={{ bgcolor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 3 }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar
                  src={previewDialog.review.profile_image}
                  sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: '#8b5cf6' }}
                >
                  {previewDialog.review.display_name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Rating value={previewDialog.review.rating} readOnly sx={{ mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                  "{previewDialog.review.title}"
                </Typography>
                <Typography variant="body2" sx={{ color: '#4b5563', mb: 3, fontStyle: 'italic' }}>
                  "{previewDialog.review.content}"
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#111827' }}>
                  {previewDialog.review.display_name}
                </Typography>
                {(previewDialog.review.designation || previewDialog.review.company_name) && (
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {previewDialog.review.designation}
                    {previewDialog.review.designation && previewDialog.review.company_name ? ' at ' : ''}
                    {previewDialog.review.company_name}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setPreviewDialog({ open: false, review: null })}>
            Close
          </Button>
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

export default ReviewsAdmin;
