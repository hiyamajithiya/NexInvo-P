import React, { useState, useMemo } from 'react';
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
  Avatar,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Divider,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Sell as SalesIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormat';

const OrganizationsTab = ({
  organizations,
  orgMenuAnchor,
  selectedOrg,
  onOrgMenuOpen,
  onOrgMenuClose,
  onViewOrgDetails,
  onViewOrgMembers,
  onChangePlan,
  onOpenAcquisitionDialog,
  onToggleOrgStatus,
  onOpenDeleteDialog,
}) => {
  // Internal search/filter state
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [orgStatusFilter, setOrgStatusFilter] = useState('all');
  const [orgPlanFilter, setOrgPlanFilter] = useState('all');

  // Filtered data computed internally
  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
                            org.slug?.toLowerCase().includes(orgSearchTerm.toLowerCase());
      const matchesStatus = orgStatusFilter === 'all' ||
                            (orgStatusFilter === 'active' && org.is_active) ||
                            (orgStatusFilter === 'inactive' && !org.is_active);
      const matchesPlan = orgPlanFilter === 'all' || org.plan === orgPlanFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [organizations, orgSearchTerm, orgStatusFilter, orgPlanFilter]);

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
          All Organizations ({filteredOrganizations.length})
        </Typography>
        <Button variant="contained" sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textTransform: 'none'
        }}>
          Export Data
        </Button>
      </Box>

      {/* Search and Filter Section */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name or slug..."
          value={orgSearchTerm}
          onChange={(e) => setOrgSearchTerm(e.target.value)}
          size="small"
          sx={{ minWidth: 250, flex: 1 }}
          InputProps={{
            startAdornment: <Box sx={{ mr: 1, color: '#9ca3af' }}>🔍</Box>
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={orgStatusFilter}
            label="Status"
            onChange={(e) => setOrgStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Plan</InputLabel>
          <Select
            value={orgPlanFilter}
            label="Plan"
            onChange={(e) => setOrgPlanFilter(e.target.value)}
          >
            <MenuItem value="all">All Plans</MenuItem>
            <MenuItem value="free">Free</MenuItem>
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="professional">Professional</MenuItem>
            <MenuItem value="enterprise">Enterprise</MenuItem>
          </Select>
        </FormControl>
        {(orgSearchTerm || orgStatusFilter !== 'all' || orgPlanFilter !== 'all') && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setOrgSearchTerm('');
              setOrgStatusFilter('all');
              setOrgPlanFilter('all');
            }}
            sx={{ textTransform: 'none' }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f9fafb' }}>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Members</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: '#6b7280' }}>
                    {organizations.length === 0 ? 'No organizations found' : 'No organizations match your search criteria'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredOrganizations.map((org) => (
              <TableRow key={org.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{
                      bgcolor: '#8b5cf6',
                      width: 40,
                      height: 40
                    }}>
                      {org.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                        {org.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {org.slug}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={org.plan.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor:
                        org.plan === 'enterprise' ? '#fef3c7' :
                        org.plan === 'professional' ? '#ddd6fe' :
                        org.plan === 'basic' ? '#dbeafe' : '#f3f4f6',
                      color:
                        org.plan === 'enterprise' ? '#92400e' :
                        org.plan === 'professional' ? '#5b21b6' :
                        org.plan === 'basic' ? '#1e40af' : '#374151',
                      fontWeight: 'bold'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={org.acquisition_source_display || 'Organic'}
                    size="small"
                    sx={{
                      bgcolor:
                        org.acquisition_source === 'sales' ? '#ddd6fe' :
                        org.acquisition_source === 'advertisement' ? '#fef3c7' :
                        org.acquisition_source === 'referral' ? '#e0e7ff' :
                        org.acquisition_source === 'coupon' ? '#fef3c7' :
                        '#d1fae5',
                      color:
                        org.acquisition_source === 'sales' ? '#5b21b6' :
                        org.acquisition_source === 'advertisement' ? '#92400e' :
                        org.acquisition_source === 'referral' ? '#3730a3' :
                        org.acquisition_source === 'coupon' ? '#92400e' :
                        '#065f46',
                      fontWeight: 500,
                      fontSize: '0.7rem'
                    }}
                  />
                  {org.acquired_by_name && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mt: 0.5 }}>
                      {org.acquired_by_name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={org.member_count}
                    size="small"
                    icon={<PeopleIcon />}
                    sx={{ bgcolor: '#f3f4f6' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={org.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    icon={org.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                    sx={{
                      bgcolor: org.is_active ? '#d1fae5' : '#fee2e2',
                      color: org.is_active ? '#065f46' : '#991b1b',
                      fontWeight: 'bold'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#6b7280' }}>
                  {formatDate(org.created_at)}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => onOrgMenuOpen(e, org)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Organization Action Menu */}
      <Menu
        anchorEl={orgMenuAnchor}
        open={Boolean(orgMenuAnchor)}
        onClose={onOrgMenuClose}
        slotProps={{
          paper: { sx: { boxShadow: 3, borderRadius: 2 } }
        }}
      >
        <MenuItem onClick={onViewOrgDetails}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon fontSize="small" sx={{ color: '#6b7280' }} />
            <Typography>View Details</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={onViewOrgMembers}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon fontSize="small" sx={{ color: '#6b7280' }} />
            <Typography>View Members</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={onChangePlan}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
            <Typography>Change Plan</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={onOpenAcquisitionDialog}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SalesIcon fontSize="small" sx={{ color: '#f59e0b' }} />
            <Typography>Edit Acquisition</Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onToggleOrgStatus}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BlockIcon fontSize="small" sx={{ color: '#ef4444' }} />
            <Typography sx={{ color: '#ef4444' }}>
              {selectedOrg?.is_active ? 'Deactivate' : 'Activate'}
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={onOpenDeleteDialog}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BlockIcon fontSize="small" sx={{ color: '#dc2626' }} />
            <Typography sx={{ color: '#dc2626', fontWeight: 600 }}>
              Delete Organization
            </Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default OrganizationsTab;
