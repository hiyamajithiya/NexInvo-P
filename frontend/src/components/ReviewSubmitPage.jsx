import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Rating,
  Avatar,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  FormatQuote as QuoteIcon,
  Send as SendIcon,
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import api from '../services/api';

const ReviewSubmitPage = ({ onNavigate, onReviewSubmitted }) => {
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    content: '',
    display_name: '',
    designation: '',
    company_name: '',
    profile_image: '',
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const response = await api.get('/reviews/eligibility/');
      setEligibility(response.data);
      if (response.data.has_submitted) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      showSnackbar('Failed to check eligibility', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (event, newValue) => {
    setFormData(prev => ({ ...prev, rating: newValue }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showSnackbar('Image size should be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profile_image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim() || !formData.display_name.trim()) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews/submit/', formData);
      setSubmitted(true);
      // Notify parent that review was submitted
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      showSnackbar('Thank you for your review! It will be visible after approval.', 'success');
    } catch (error) {
      console.error('Error submitting review:', error);
      showSnackbar(error.response?.data?.error || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
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

  if (!eligibility?.eligible) {
    return (
      <Box>
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuoteIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
                Share Your Experience
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Your feedback helps us improve and helps others discover our service
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <QuoteIcon sx={{ fontSize: 60, color: '#d1d5db', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#374151', mb: 2 }}>
            Review Submission Unavailable
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {eligibility?.reason || 'You need an active subscription to submit a review.'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box>
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuoteIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
                Share Your Experience
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Your feedback helps us improve and helps others discover our service
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <SuccessIcon sx={{ fontSize: 40, color: '#10b981' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
            Thank You for Your Review!
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 3 }}>
            Your review has been submitted successfully and is pending approval.
            <br />
            Once approved, it will be displayed on our website.
          </Typography>
          <Button
            variant="contained"
            onClick={() => onNavigate && onNavigate('dashboard')}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              textTransform: 'none',
            }}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QuoteIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
              Share Your Experience
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Your feedback helps us improve and helps others discover our service
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Form */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <form onSubmit={handleSubmit}>
              {/* Rating */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 1 }}>
                  Your Rating *
                </Typography>
                <Rating
                  name="rating"
                  value={formData.rating}
                  onChange={handleRatingChange}
                  size="large"
                  sx={{ fontSize: '2.5rem' }}
                />
              </Box>

              {/* Title */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  required
                  label="Review Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Excellent invoicing solution!"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: '#8b5cf6' },
                      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                    },
                  }}
                />
              </Box>

              {/* Content */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Your Review"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Share your experience with our service..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: '#8b5cf6' },
                      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                    },
                  }}
                />
              </Box>

              {/* Display Name */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  required
                  label="Your Name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="e.g., John Doe"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: '#8b5cf6' },
                      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                    },
                  }}
                />
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Designation (Optional)"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g., CEO, Manager"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: '#8b5cf6' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Name (Optional)"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="e.g., ABC Corp"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: '#8b5cf6' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Profile Image */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#374151', mb: 1 }}>
                  Profile Photo (Optional)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={formData.profile_image}
                    sx={{ width: 60, height: 60, bgcolor: '#8b5cf6' }}
                  >
                    {formData.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Upload Photo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                </Box>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* Preview */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, position: 'sticky', top: 20, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827', mb: 3 }}>
              Preview
            </Typography>

            <Card sx={{ bgcolor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: 3, textAlign: 'center', overflow: 'hidden' }}>
                <Avatar
                  src={formData.profile_image}
                  sx={{ width: 70, height: 70, mx: 'auto', mb: 2, bgcolor: '#8b5cf6' }}
                >
                  {formData.display_name?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <Rating value={formData.rating} readOnly sx={{ mb: 2 }} />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 'bold',
                    color: '#111827',
                    mb: 1,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                  }}
                >
                  "{formData.title || 'Your review title...'}"
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#4b5563',
                    mb: 3,
                    fontStyle: 'italic',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  "{formData.content || 'Your review content will appear here...'}"
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 'bold',
                    color: '#111827',
                    wordBreak: 'break-word',
                  }}
                >
                  {formData.display_name || 'Your Name'}
                </Typography>
                {(formData.designation || formData.company_name) && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#6b7280',
                      wordBreak: 'break-word',
                      display: 'block',
                    }}
                  >
                    {formData.designation}
                    {formData.designation && formData.company_name ? ' at ' : ''}
                    {formData.company_name}
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="caption">
                Your review will be displayed on our website after approval.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>

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

export default ReviewSubmitPage;
