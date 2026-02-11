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
  CircularProgress,
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
  Business as BusinessIcon,
  People as PeopleIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormat';

const UsersTab = ({
  users,
  stats,
  loadingUsers,
  userMenuAnchor,
  selectedUser,
  onUserMenuOpen,
  onUserMenuClose,
  onViewUserProfile,
  onViewUserOrganizations,
  onResetPassword,
  onToggleUserStatus,
  onOpenDeleteUserDialog,
}) => {
  // Internal search/filter state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Filtered data computed internally
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            user.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
      const matchesStatus = userStatusFilter === 'all' ||
                            (userStatusFilter === 'active' && user.is_active) ||
                            (userStatusFilter === 'inactive' && !user.is_active);
      const matchesRole = userRoleFilter === 'all' ||
                          (userRoleFilter === 'superadmin' && user.is_superuser) ||
                          (userRoleFilter === 'admin' && user.role === 'admin' && !user.is_superuser) ||
                          (userRoleFilter === 'user' && user.role !== 'admin' && !user.is_superuser);
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, userSearchTerm, userStatusFilter, userRoleFilter]);

  return (
    <>
      {/* User Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #8b5cf6' }}>
              <PeopleIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Total Users</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.totalUsers || 0}</Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #10b981' }}>
              <CheckCircleIcon sx={{ fontSize: 28, color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Active Users</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.activeUsers || 0}</Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #f59e0b' }}>
              <BusinessIcon sx={{ fontSize: 28, color: '#f59e0b' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Org Admins</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.orgAdmins || 0}</Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, p: 1.5, border: '2px solid #3b82f6' }}>
              <AccountCircleIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Super Admins</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{stats?.superAdmins || 0}</Typography>
            </Box>
          </Box>
        </Paper>
      </div>

      {/* Users Table */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>All System Users ({filteredUsers.length})</Typography>
          <Button
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textTransform: 'none' }}
            onClick={() => alert('Add New User feature coming soon! Users can currently register through the registration page.')}
          >
            Add New User
          </Button>
        </Box>

        {/* Search and Filter Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by username or email..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250, flex: 1 }}
            InputProps={{
              startAdornment: <Box sx={{ mr: 1, color: '#9ca3af' }}>🔍</Box>
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={userStatusFilter}
              label="Status"
              onChange={(e) => setUserStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={userRoleFilter}
              label="Role"
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="superadmin">Super Admin</MenuItem>
              <MenuItem value="admin">Org Admin</MenuItem>
              <MenuItem value="user">Regular User</MenuItem>
            </Select>
          </FormControl>
          {(userSearchTerm || userStatusFilter !== 'all' || userRoleFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setUserSearchTerm('');
                setUserStatusFilter('all');
                setUserRoleFilter('all');
              }}
              sx={{ textTransform: 'none' }}
            >
              Clear Filters
            </Button>
          )}
        </Box>

        {loadingUsers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organizations</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ color: '#6b7280' }}>
                        {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.map((user) => (
                  <TableRow key={user.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#8b5cf6', width: 36, height: 36 }}>
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#111827' }}>{user.username}</Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>ID: {user.id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280' }}>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_superuser ? 'SUPERADMIN' : user.role?.toUpperCase() || 'USER'}
                        size="small"
                        sx={{
                          bgcolor: user.is_superuser ? '#fef3c7' : user.role === 'admin' ? '#ddd6fe' : '#f3f4f6',
                          color: user.is_superuser ? '#92400e' : user.role === 'admin' ? '#5b21b6' : '#374151',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={user.organization_count || 0} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        icon={user.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                        sx={{
                          bgcolor: user.is_active ? '#d1fae5' : '#fee2e2',
                          color: user.is_active ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280' }}>
                      {formatDate(user.date_joined)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => onUserMenuOpen(e, user)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* User Action Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={onUserMenuClose}
          slotProps={{
            paper: { sx: { boxShadow: 3, borderRadius: 2 } }
          }}
        >
          <MenuItem onClick={onViewUserProfile}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountCircleIcon fontSize="small" sx={{ color: '#6b7280' }} />
              <Typography>View Profile</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={onViewUserOrganizations}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon fontSize="small" sx={{ color: '#6b7280' }} />
              <Typography>View Organizations</Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem onClick={onResetPassword}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon fontSize="small" sx={{ color: '#6b7280' }} />
              <Typography>Reset Password</Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem onClick={onToggleUserStatus}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon fontSize="small" sx={{ color: '#f59e0b' }} />
              <Typography sx={{ color: '#f59e0b' }}>
                {selectedUser?.is_active ? 'Deactivate User' : 'Activate User'}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={onOpenDeleteUserDialog}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon fontSize="small" sx={{ color: '#dc2626' }} />
              <Typography sx={{ color: '#dc2626' }}>
                Delete User
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Paper>
    </>
  );
};

export default UsersTab;
