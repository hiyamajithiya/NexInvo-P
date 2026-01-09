import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateFormat';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useOrganization } from '../contexts/OrganizationContext';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const OrganizationSettings = () => {
  const {
    currentOrganization,
    updateOrganization,
    getMembers,
    inviteMember,
    updateMember,
    removeMember,
  } = useOrganization();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Organization details state
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  // Edit member dialog state
  const [editMemberDialog, setEditMemberDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('user');

  // Load organization details
  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setOrgSlug(currentOrganization.slug);
    }
  }, [currentOrganization]);

  // Load members
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentOrganization) {
      loadMembers();
    }
  }, [currentOrganization]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getMembers(currentOrganization.id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateOrganization(currentOrganization.id, {
        name: orgName,
        slug: orgSlug,
      });
      setSuccess('Organization updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      setError('Email is required');
      return;
    }

    setInviting(true);
    setError('');

    try {
      await inviteMember(currentOrganization.id, inviteEmail, inviteRole);
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      loadMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditMemberDialog(true);
  };

  const handleSaveEditMember = async () => {
    setSaving(true);
    setError('');

    try {
      await updateMember(currentOrganization.id, editingMember.user, {
        role: editRole,
        is_active: true,
      });
      setSuccess('Member updated successfully');
      setEditMemberDialog(false);
      loadMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.user_email} from the organization?`)) {
      return;
    }

    try {
      await removeMember(currentOrganization.id, member.user);
      setSuccess('Member removed successfully');
      loadMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'warning';
      case 'viewer':
        return 'info';
      default:
        return 'default';
    }
  };

  if (!currentOrganization) {
    return (
      <Container>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Organization Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your organization details and team members
        </Typography>

        {success && (
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="General" />
            <Tab label="Team Members" />
          </Tabs>

          {/* General Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ maxWidth: 600, px: 3 }}>
              <TextField
                label="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                fullWidth
                margin="normal"
                helperText="URL-friendly identifier for your organization"
              />
              <TextField
                label="Plan"
                value={currentOrganization.plan.toUpperCase()}
                fullWidth
                margin="normal"
                disabled
                helperText="Contact support to upgrade your plan"
              />
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveOrganization}
                  disabled={saving}
                  startIcon={<SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </TabPanel>

          {/* Team Members Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ px: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Team Members</Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setInviteDialogOpen(true)}
                >
                  Invite Member
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.user_name || '-'}</TableCell>
                          <TableCell>{member.user_email}</TableCell>
                          <TableCell>
                            <Chip
                              label={member.role.toUpperCase()}
                              size="small"
                              color={getRoleColor(member.role)}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(member.joined_at)}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditMember(member)}
                              disabled={member.role === 'owner'}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveMember(member)}
                              disabled={member.role === 'owner'}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>
        </Paper>
      </Box>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                label="Role"
              >
                <MenuItem value="viewer">Viewer (Read-only access for shared accountants/CAs)</MenuItem>
                <MenuItem value="user">User (Standard access)</MenuItem>
                <MenuItem value="admin">Admin (Full management access)</MenuItem>
                <MenuItem value="owner">Owner (Complete control)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Viewer role allows read-only access. Useful when the same accountant or CA works with multiple organizations.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
            Cancel
          </Button>
          <Button onClick={handleInviteMember} variant="contained" disabled={inviting}>
            {inviting ? 'Inviting...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberDialog} onClose={() => setEditMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Member Role</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                label="Role"
              >
                <MenuItem value="viewer">Viewer (Read-only access)</MenuItem>
                <MenuItem value="user">User (Standard access)</MenuItem>
                <MenuItem value="admin">Admin (Full management access)</MenuItem>
                <MenuItem value="owner">Owner (Complete control)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMemberDialog(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveEditMember} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrganizationSettings;
