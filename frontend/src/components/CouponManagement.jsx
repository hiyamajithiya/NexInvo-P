import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Autocomplete,
  Checkbox,
  FormGroup,
  InputAdornment,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  LocalOffer as LocalOfferIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ContentCopy as CopyIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Percent as PercentIcon,
  CurrencyRupee as RupeeIcon,
  EventAvailable as EventAvailableIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_types: [],
    discount_percentage: '',
    discount_fixed: '',
    discount_days: '',
    applicable_plans: [],
    valid_from: '',
    valid_until: '',
    max_total_uses: '',
    max_uses_per_user: 1,
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
    loadPlans();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/coupons/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(response.data);
    } catch (error) {
      console.error('Error loading coupons:', error);
      showSnackbar('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/subscription-plans/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleOpenDialog = (coupon = null) => {
    if (coupon) {
      setEditMode(true);
      setCurrentCoupon(coupon);

      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      const discountTypes = coupon.discount_types || [coupon.discount_type];

      setFormData({
        code: coupon.code,
        name: coupon.name || '',
        description: coupon.description || '',
        discount_types: discountTypes,
        discount_percentage: coupon.discount_percentage || (coupon.discount_type === 'percentage' ? coupon.discount_value : ''),
        discount_fixed: coupon.discount_fixed || (coupon.discount_type === 'fixed' ? coupon.discount_value : ''),
        discount_days: coupon.discount_days || (coupon.discount_type === 'extended_period' ? coupon.discount_value : ''),
        applicable_plans: coupon.applicable_plans || [],
        valid_from: formatDate(coupon.valid_from),
        valid_until: formatDate(coupon.valid_until),
        max_total_uses: coupon.max_total_uses || '',
        max_uses_per_user: coupon.max_uses_per_user || 1,
        is_active: coupon.is_active,
      });
    } else {
      setEditMode(false);
      setCurrentCoupon(null);

      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 30);

      setFormData({
        code: '',
        name: '',
        description: '',
        discount_types: [],
        discount_percentage: '',
        discount_fixed: '',
        discount_days: '',
        applicable_plans: [],
        valid_from: now.toISOString().slice(0, 16),
        valid_until: future.toISOString().slice(0, 16),
        max_total_uses: '',
        max_uses_per_user: 1,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentCoupon(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleDiscountTypeChange = (discountType) => {
    setFormData(prev => {
      const currentTypes = prev.discount_types || [];
      let newTypes;

      if (currentTypes.includes(discountType)) {
        newTypes = currentTypes.filter(t => t !== discountType);
      } else if (currentTypes.length < 2) {
        newTypes = [...currentTypes, discountType];
      } else {
        return prev;
      }

      return {
        ...prev,
        discount_types: newTypes,
      };
    });
  };

  const handleSubmit = async () => {
    try {
      const token = sessionStorage.getItem('access_token');

      if (!formData.discount_types || formData.discount_types.length === 0) {
        showSnackbar('Please select at least one discount type', 'error');
        return;
      }

      const payload = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_types: formData.discount_types,
        discount_percentage: formData.discount_types.includes('percentage') && formData.discount_percentage
          ? parseFloat(formData.discount_percentage) : null,
        discount_fixed: formData.discount_types.includes('fixed') && formData.discount_fixed
          ? parseFloat(formData.discount_fixed) : null,
        discount_days: formData.discount_types.includes('extended_period') && formData.discount_days
          ? parseInt(formData.discount_days) : null,
        applicable_plans: formData.applicable_plans,
        max_total_uses: formData.max_total_uses ? parseInt(formData.max_total_uses) : null,
        max_uses_per_user: parseInt(formData.max_uses_per_user),
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        is_active: formData.is_active,
      };

      if (editMode) {
        await axios.put(
          `${API_BASE_URL}/coupons/${currentCoupon.id}/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSnackbar('Coupon updated successfully', 'success');
      } else {
        await axios.post(
          `${API_BASE_URL}/coupons/`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSnackbar('Coupon created successfully', 'success');
      }

      handleCloseDialog();
      loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      showSnackbar(error.response?.data?.error || 'Failed to save coupon', 'error');
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/coupons/${couponId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Coupon deleted successfully', 'success');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showSnackbar('Failed to delete coupon', 'error');
    }
  };

  const handleDeactivate = async (couponId) => {
    try {
      const token = sessionStorage.getItem('access_token');
      await axios.post(
        `${API_BASE_URL}/coupons/${couponId}/deactivate/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar('Coupon deactivated successfully', 'success');
      loadCoupons();
    } catch (error) {
      console.error('Error deactivating coupon:', error);
      showSnackbar('Failed to deactivate coupon', 'error');
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    showSnackbar('Coupon code copied!', 'success');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getDiscountDisplay = (coupon) => {
    const discountParts = [];
    const discountTypes = coupon.discount_types || [coupon.discount_type];

    if (discountTypes.includes('percentage') && coupon.discount_percentage) {
      discountParts.push(`${coupon.discount_percentage}%`);
    } else if (coupon.discount_type === 'percentage' && coupon.discount_value) {
      discountParts.push(`${coupon.discount_value}%`);
    }

    if (discountTypes.includes('fixed') && coupon.discount_fixed) {
      discountParts.push(`₹${coupon.discount_fixed}`);
    } else if (coupon.discount_type === 'fixed' && coupon.discount_value) {
      discountParts.push(`₹${coupon.discount_value}`);
    }

    if (discountTypes.includes('extended_period') && coupon.discount_days) {
      discountParts.push(`+${coupon.discount_days} days`);
    } else if (coupon.discount_type === 'extended_period' && coupon.discount_value) {
      discountParts.push(`+${coupon.discount_value} days`);
    }

    return discountParts.length > 0 ? discountParts.join(' + ') : 'No discount';
  };

  const getValidityStatus = (coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (!coupon.is_active) {
      return { label: 'Inactive', color: '#6b7280', bgColor: '#f3f4f6' };
    } else if (now < validFrom) {
      return { label: 'Upcoming', color: '#3b82f6', bgColor: '#dbeafe' };
    } else if (now > validUntil) {
      return { label: 'Expired', color: '#ef4444', bgColor: '#fee2e2' };
    } else {
      return { label: 'Active', color: '#10b981', bgColor: '#d1fae5' };
    }
  };

  const getUsagePercentage = (coupon) => {
    if (!coupon.max_total_uses) return 0;
    return Math.min(((coupon.current_usage_count || 0) / coupon.max_total_uses) * 100, 100);
  };

  const getDaysRemaining = (coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.valid_until);
    const diff = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Filter coupons based on tab and search
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (coupon.name && coupon.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const status = getValidityStatus(coupon);

    if (activeTab === 0) return matchesSearch; // All
    if (activeTab === 1) return matchesSearch && status.label === 'Active'; // Active
    if (activeTab === 2) return matchesSearch && status.label === 'Upcoming'; // Upcoming
    if (activeTab === 3) return matchesSearch && (status.label === 'Expired' || status.label === 'Inactive'); // Expired/Inactive

    return matchesSearch;
  });

  // Calculate stats
  const activeCoupons = coupons.filter(c => {
    const status = getValidityStatus(c);
    return status.label === 'Active';
  }).length;

  const expiredCoupons = coupons.filter(c => {
    const status = getValidityStatus(c);
    return status.label === 'Expired' || status.label === 'Inactive';
  }).length;

  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.current_usage_count || 0), 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -50, right: -50, opacity: 0.1 }}>
          <LocalOfferIcon sx={{ fontSize: 250 }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'white' }}>
              Coupon Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Create, manage, and track discount coupons for your subscription plans
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              border: '2px solid rgba(255,255,255,0.5)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
              },
              transition: 'all 0.2s ease',
              '& .MuiSvgIcon-root': {
                color: '#ffffff',
              },
            }}
          >
            Create New Coupon
          </Button>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#ede9fe', width: 56, height: 56 }}>
                <LocalOfferIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>Total Coupons</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>{coupons.length}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #fff 0%, #f0fdf4 100%)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#d1fae5', width: 56, height: 56 }}>
                <CheckCircleIcon sx={{ fontSize: 28, color: '#10b981' }} />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>Active</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>{activeCoupons}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#fee2e2', width: 56, height: 56 }}>
                <BlockIcon sx={{ fontSize: 28, color: '#ef4444' }} />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>Expired/Inactive</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>{expiredCoupons}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #fff 0%, #eff6ff 100%)',
              transition: 'all 0.2s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#dbeafe', width: 56, height: 56 }}>
                <TrendingUpIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>Total Redemptions</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>{totalRedemptions}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Search and Filter Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minWidth: 100,
              },
              '& .Mui-selected': {
                color: '#6366f1',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6366f1',
              },
            }}
          >
            <Tab label={`All (${coupons.length})`} />
            <Tab label={`Active (${activeCoupons})`} />
            <Tab label={`Upcoming (${coupons.filter(c => getValidityStatus(c).label === 'Upcoming').length})`} />
            <Tab label={`Expired (${expiredCoupons})`} />
          </Tabs>

          <TextField
            placeholder="Search coupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
              width: 280,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': { borderColor: '#6366f1' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* Coupons Grid */}
      {filteredCoupons.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 3,
            border: '2px dashed #e5e7eb',
            textAlign: 'center',
          }}
        >
          <LocalOfferIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
            {searchTerm ? 'No coupons found' : 'No coupons created yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
            {searchTerm ? 'Try a different search term' : 'Create your first coupon to start offering discounts'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ color: 'white' }} />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                textTransform: 'none',
                fontWeight: 700,
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: 2,
              }}
            >
              Create Your First Coupon
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredCoupons.map((coupon) => {
            const status = getValidityStatus(coupon);
            const usagePercent = getUsagePercentage(coupon);
            const daysRemaining = getDaysRemaining(coupon);

            return (
              <Grid item xs={12} sm={6} lg={4} key={coupon.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    borderRadius: 3,
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(99, 102, 241, 0.15)',
                      borderColor: '#6366f1',
                    },
                  }}
                >
                  {/* Card Header */}
                  <Box
                    sx={{
                      p: 3,
                      background: status.label === 'Active'
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : status.label === 'Upcoming'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                        : 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                      color: 'white',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              letterSpacing: 1,
                              color: 'white',
                            }}
                          >
                            {coupon.code}
                          </Typography>
                          <Tooltip title="Copy code">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(coupon.code)}
                              sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: 'white' } }}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                          {coupon.name || 'Untitled Coupon'}
                        </Typography>
                      </Box>
                      <Chip
                        label={status.label}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.3)',
                          color: 'white',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                      />
                    </Box>

                    {/* Discount Display */}
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {(coupon.discount_types || [coupon.discount_type]).includes('percentage') &&
                       (coupon.discount_percentage || coupon.discount_value) && (
                        <Chip
                          icon={<PercentIcon sx={{ fontSize: 16, color: 'white !important' }} />}
                          label={`${coupon.discount_percentage || coupon.discount_value}% OFF`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0,0,0,0.2)',
                            color: 'white',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.3)',
                            '& .MuiChip-icon': { color: 'white' },
                          }}
                        />
                      )}
                      {(coupon.discount_types || [coupon.discount_type]).includes('fixed') &&
                       (coupon.discount_fixed || (coupon.discount_type === 'fixed' && coupon.discount_value)) && (
                        <Chip
                          icon={<RupeeIcon sx={{ fontSize: 16, color: 'white !important' }} />}
                          label={`₹${coupon.discount_fixed || coupon.discount_value} OFF`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0,0,0,0.2)',
                            color: 'white',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.3)',
                            '& .MuiChip-icon': { color: 'white' },
                          }}
                        />
                      )}
                      {(coupon.discount_types || [coupon.discount_type]).includes('extended_period') &&
                       (coupon.discount_days || (coupon.discount_type === 'extended_period' && coupon.discount_value)) && (
                        <Chip
                          icon={<EventAvailableIcon sx={{ fontSize: 16, color: 'white !important' }} />}
                          label={`+${coupon.discount_days || coupon.discount_value} Days`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0,0,0,0.2)',
                            color: 'white',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.3)',
                            '& .MuiChip-icon': { color: 'white' },
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Card Body */}
                  <Box sx={{ p: 3 }}>
                    {/* Description */}
                    {coupon.description && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4b5563',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5,
                        }}
                      >
                        {coupon.description}
                      </Typography>
                    )}

                    {/* Applicable Plans */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Applicable Plans
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#1f2937', mt: 0.5, fontWeight: 500 }}>
                        {coupon.applicable_plan_names?.length > 0
                          ? coupon.applicable_plan_names.join(', ')
                          : 'All Plans'}
                      </Typography>
                    </Box>

                    {/* Usage Progress */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Usage
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#374151', fontWeight: 700 }}>
                          {coupon.current_usage_count || 0}
                          {coupon.max_total_uses ? ` / ${coupon.max_total_uses}` : ' (Unlimited)'}
                        </Typography>
                      </Box>
                      {coupon.max_total_uses && (
                        <LinearProgress
                          variant="determinate"
                          value={usagePercent}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background: usagePercent >= 90
                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                : usagePercent >= 70
                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            },
                          }}
                        />
                      )}
                    </Box>

                    {/* Validity Info */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Valid From
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#1f2937', fontWeight: 600 }}>
                          {new Date(coupon.valid_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Valid Until
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#1f2937', fontWeight: 600 }}>
                          {new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Days Remaining Badge */}
                    {status.label === 'Active' && (
                      <Chip
                        icon={<ScheduleIcon sx={{ fontSize: 16, color: 'white !important' }} />}
                        label={daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expires today'}
                        size="small"
                        sx={{
                          bgcolor: daysRemaining <= 7 ? '#f59e0b' : '#6366f1',
                          color: 'white',
                          fontWeight: 700,
                          mb: 2,
                          '& .MuiChip-icon': { color: 'white !important' },
                        }}
                      />
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PeopleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                        <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 500 }}>
                          Max {coupon.max_uses_per_user}/user
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(coupon)}
                            sx={{
                              color: '#6366f1',
                              '&:hover': { bgcolor: '#ede9fe' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {coupon.is_active && status.label !== 'Expired' && (
                          <Tooltip title="Deactivate">
                            <IconButton
                              size="small"
                              onClick={() => handleDeactivate(coupon.id)}
                              sx={{
                                color: '#f59e0b',
                                '&:hover': { bgcolor: '#fef3c7' },
                              }}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(coupon.id)}
                            sx={{
                              color: '#ef4444',
                              '&:hover': { bgcolor: '#fee2e2' },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          py: 3,
          px: 4,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <LocalOfferIcon sx={{ color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>
                {editMode ? 'Edit Coupon' : 'Create New Coupon'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {editMode ? 'Update coupon details and settings' : 'Set up a new discount coupon for your customers'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 4, bgcolor: '#f8fafc' }}>
          <Grid container spacing={4} sx={{ mt: 0 }}>
            {/* Left Column */}
            <Grid item xs={12} md={6}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: 3, mb: 3, border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 24, bgcolor: '#8b5cf6', borderRadius: 1, mr: 2 }} />
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Coupon Code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      inputProps={{ style: { textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 } }}
                      placeholder="e.g., WELCOME20"
                      helperText="Unique code for users to redeem"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Display Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Welcome Offer"
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
                      placeholder="Describe the coupon offer and its terms"
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Discount Settings Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: 3, mb: 3, border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 24, bgcolor: '#10b981', borderRadius: 1, mr: 2 }} />
                  Discount Settings
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                  Select one or two discount types to combine
                </Typography>
                <FormGroup>
                  {/* Percentage Discount Option */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: formData.discount_types?.includes('percentage') ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                      bgcolor: formData.discount_types?.includes('percentage') ? '#faf5ff' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.discount_types?.includes('percentage') || false}
                          onChange={() => handleDiscountTypeChange('percentage')}
                          disabled={!formData.discount_types?.includes('percentage') && formData.discount_types?.length >= 2}
                          sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }}
                        />
                      }
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#111827' }}>Percentage Discount</Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>Discount as a percentage of the plan price</Typography>
                        </Box>
                      }
                    />
                    {formData.discount_types?.includes('percentage') && (
                      <TextField
                        size="small"
                        label="Percentage"
                        name="discount_percentage"
                        type="number"
                        value={formData.discount_percentage}
                        onChange={handleInputChange}
                        placeholder="20"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        sx={{ mt: 2, width: 150 }}
                      />
                    )}
                  </Paper>

                  {/* Fixed Amount Option */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: formData.discount_types?.includes('fixed') ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      bgcolor: formData.discount_types?.includes('fixed') ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.discount_types?.includes('fixed') || false}
                          onChange={() => handleDiscountTypeChange('fixed')}
                          disabled={!formData.discount_types?.includes('fixed') && formData.discount_types?.length >= 2}
                          sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#3b82f6' } }}
                        />
                      }
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#111827' }}>Fixed Amount</Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>Fixed rupee discount off the plan price</Typography>
                        </Box>
                      }
                    />
                    {formData.discount_types?.includes('fixed') && (
                      <TextField
                        size="small"
                        label="Amount"
                        name="discount_fixed"
                        type="number"
                        value={formData.discount_fixed}
                        onChange={handleInputChange}
                        placeholder="500"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        sx={{ mt: 2, width: 150 }}
                      />
                    )}
                  </Paper>

                  {/* Extended Period Option */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: formData.discount_types?.includes('extended_period') ? '2px solid #10b981' : '1px solid #e5e7eb',
                      bgcolor: formData.discount_types?.includes('extended_period') ? '#f0fdf4' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.discount_types?.includes('extended_period') || false}
                          onChange={() => handleDiscountTypeChange('extended_period')}
                          disabled={!formData.discount_types?.includes('extended_period') && formData.discount_types?.length >= 2}
                          sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }}
                        />
                      }
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#111827' }}>Extended Period</Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>Add extra days to the subscription</Typography>
                        </Box>
                      }
                    />
                    {formData.discount_types?.includes('extended_period') && (
                      <TextField
                        size="small"
                        label="Days"
                        name="discount_days"
                        type="number"
                        value={formData.discount_days}
                        onChange={handleInputChange}
                        placeholder="30"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">days</InputAdornment>,
                        }}
                        sx={{ mt: 2, width: 150 }}
                      />
                    )}
                  </Paper>
                </FormGroup>
                {formData.discount_types?.length >= 2 && (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    Maximum 2 discount types can be selected.
                  </Alert>
                )}

                <Box sx={{ mt: 3 }}>
                  <Autocomplete
                    multiple
                    options={plans}
                    getOptionLabel={(option) => option.name}
                    value={plans.filter(plan => formData.applicable_plans.includes(plan.id))}
                    onChange={(event, newValue) => {
                      setFormData({
                        ...formData,
                        applicable_plans: newValue.map(plan => plan.id)
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Applicable Plans"
                        helperText="Leave empty to apply to all plans"
                      />
                    )}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              {/* Validity Period Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: 3, mb: 3, border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 24, bgcolor: '#f59e0b', borderRadius: 1, mr: 2 }} />
                  Validity Period
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Valid From"
                      name="valid_from"
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={handleInputChange}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Valid Until"
                      name="valid_until"
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={handleInputChange}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Usage Limits Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: 3, mb: 3, border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 24, bgcolor: '#3b82f6', borderRadius: 1, mr: 2 }} />
                  Usage Limits
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Max Total Uses"
                      name="max_total_uses"
                      type="number"
                      value={formData.max_total_uses}
                      onChange={handleInputChange}
                      placeholder="Leave empty for unlimited"
                      helperText="Maximum total redemptions across all users"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Max Uses Per User"
                      name="max_uses_per_user"
                      type="number"
                      value={formData.max_uses_per_user}
                      onChange={handleInputChange}
                      required
                      helperText="How many times each user can use this coupon"
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Status Section */}
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: 3, mb: 3, border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 24, bgcolor: '#8b5cf6', borderRadius: 1, mr: 2 }} />
                  Status
                </Typography>
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: formData.is_active ? '#f0fdf4' : '#f9fafb',
                }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>Active</Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Coupon can be redeemed by users</Typography>
                  </Box>
                  <Switch
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    name="is_active"
                    color="success"
                  />
                </Box>
              </Paper>

              {/* Preview Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '2px solid #6366f1',
                  background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
                }}
              >
                <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 2, letterSpacing: 1 }}>
                  Live Preview
                </Typography>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Chip
                    label={formData.code || 'COUPON CODE'}
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      px: 3,
                      py: 3,
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                    {formData.name || 'Coupon Name'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 2 }}>
                    {formData.discount_types?.includes('percentage') && formData.discount_percentage && (
                      <Chip
                        label={`${formData.discount_percentage}% OFF`}
                        sx={{ bgcolor: '#7c3aed', color: 'white', fontWeight: 700 }}
                      />
                    )}
                    {formData.discount_types?.includes('fixed') && formData.discount_fixed && (
                      <Chip
                        label={`₹${formData.discount_fixed} OFF`}
                        sx={{ bgcolor: '#2563eb', color: 'white', fontWeight: 700 }}
                      />
                    )}
                    {formData.discount_types?.includes('extended_period') && formData.discount_days && (
                      <Chip
                        label={`+${formData.discount_days} Days Free`}
                        sx={{ bgcolor: '#059669', color: 'white', fontWeight: 700 }}
                      />
                    )}
                    {(!formData.discount_types || formData.discount_types.length === 0) && (
                      <Chip
                        label="Select Discount Type"
                        sx={{ bgcolor: '#6366f1', color: 'white', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 500 }}>
                    {formData.description || 'Coupon description will appear here'}
                  </Typography>
                  {formData.valid_from && formData.valid_until && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.8)', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: '#374151', fontWeight: 600, display: 'block' }}>
                        Valid: {new Date(formData.valid_from).toLocaleDateString('en-IN')} - {new Date(formData.valid_until).toLocaleDateString('en-IN')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
              },
            }}
          >
            {editMode ? 'Update Coupon' : 'Create Coupon'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            borderRadius: 2,
            fontWeight: 500,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CouponManagement;
