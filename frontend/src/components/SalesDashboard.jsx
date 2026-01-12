import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Divider,
} from '@mui/material';
import {
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { staffAPI, organizationAPI } from '../services/api';

const SalesDashboard = ({ onLogout }) => {
  const [myPerformance, setMyPerformance] = useState(null);
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadData();
    // Get user name from session
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    setUserName(user.first_name || user.username || 'Sales User');
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [performanceResponse, orgsResponse] = await Promise.all([
        staffAPI.getMyPerformance(),
        organizationAPI.getAll(),
      ]);
      setMyPerformance(performanceResponse.data);
      setAllOrganizations(orgsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAcquisitions = myPerformance?.recent_acquisitions?.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
            Sales Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280' }}>
            Welcome back, {userName}! Track your performance and acquisitions.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
          sx={{ textTransform: 'none' }}
        >
          Logout
        </Button>
      </Box>

      {/* My Performance Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#ddd6fe', border: '1px solid #c4b5fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#8b5cf6' }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#5b21b6' }}>
                    {myPerformance?.total_acquisitions || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7c3aed' }}>
                    My Acquisitions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#d1fae5', border: '1px solid #a7f3d0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#10b981' }}>
                  <StarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#065f46' }}>
                    {myPerformance?.active_acquisitions || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#059669' }}>
                    Active Tenants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#22c55e' }}>
                  <MoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#166534' }}>
                    ₹{(myPerformance?.total_revenue || 0).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#22c55e' }}>
                    Revenue Generated
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#3b82f6' }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e40af' }}>
                    {allOrganizations.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#3b82f6' }}>
                    Total Tenants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: '#8b5cf6', width: 48, height: 48 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Performance Summary
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Your contribution to growth
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#6b7280' }}>Total Acquisitions</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#5b21b6' }}>
                  {myPerformance?.total_acquisitions || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#6b7280' }}>Active Tenants</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#059669' }}>
                  {myPerformance?.active_acquisitions || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#6b7280' }}>Revenue Generated</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#166534' }}>
                  ₹{(myPerformance?.total_revenue || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#6b7280' }}>Conversion Rate</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#1e40af' }}>
                  {myPerformance?.total_acquisitions > 0
                    ? ((myPerformance?.active_acquisitions / myPerformance?.total_acquisitions) * 100).toFixed(1)
                    : 0}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              All Organizations Overview
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {['organic', 'sales', 'advertisement', 'referral', 'coupon', 'other'].map((source) => {
                const count = allOrganizations.filter(org => org.acquisition_source === source).length;
                const colors = {
                  organic: { bg: '#d1fae5', color: '#065f46' },
                  sales: { bg: '#ddd6fe', color: '#5b21b6' },
                  advertisement: { bg: '#fef3c7', color: '#92400e' },
                  referral: { bg: '#e0e7ff', color: '#3730a3' },
                  coupon: { bg: '#fef3c7', color: '#92400e' },
                  other: { bg: '#f3f4f6', color: '#374151' },
                };
                return (
                  <Card key={source} sx={{ minWidth: 120, bgcolor: colors[source].bg }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: colors[source].color }}>
                        {count}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors[source].color, textTransform: 'capitalize' }}>
                        {source === 'organic' ? 'Direct' : source}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* My Acquisitions Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            My Recent Acquisitions ({filteredAcquisitions.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search acquisitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
            <IconButton onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acquired On</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAcquisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 8, color: '#6b7280' }}>
                    {myPerformance?.recent_acquisitions?.length === 0
                      ? "You haven't acquired any tenants yet. Start reaching out to potential customers!"
                      : 'No acquisitions match your search criteria'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAcquisitions.map((org) => (
                  <TableRow key={org.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6' }}>
                          {org.name.charAt(0)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 500 }}>{org.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={org.plan?.toUpperCase() || 'FREE'}
                        size="small"
                        sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={org.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: org.is_active ? '#d1fae5' : '#fee2e2',
                          color: org.is_active ? '#065f46' : '#991b1b',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SalesDashboard;
