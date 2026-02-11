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
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { organizationAPI, superadminAPI } from '../services/api';

const SupportDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgsResponse, statsResponse] = await Promise.all([
        organizationAPI.getAll(),
        superadminAPI.getStats(),
      ]);
      setOrganizations(orgsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
          Support Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          View and assist organizations with their queries
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#3b82f6' }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e40af' }}>
                    {stats?.totalOrganizations || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#3b82f6' }}>
                    Total Organizations
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
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#166534' }}>
                    {stats?.activeOrganizations || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#22c55e' }}>
                    Active Organizations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#a855f7' }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#6b21a8' }}>
                    {stats?.totalUsers || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a855f7' }}>
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fef3c7', border: '1px solid #fde68a' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#f59e0b' }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#92400e' }}>
                    {stats?.recentOrganizations || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#f59e0b' }}>
                    New This Week
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Organizations Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Organizations ({filteredOrganizations.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search organizations..."
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
                <TableCell sx={{ fontWeight: 'bold' }}>Members</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6' }}>
                        {org.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 500 }}>{org.name}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {org.business_type_display || 'Service Provider'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.plan?.toUpperCase() || 'FREE'}
                      size="small"
                      sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>{org.member_count || 0}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SupportDashboard;
