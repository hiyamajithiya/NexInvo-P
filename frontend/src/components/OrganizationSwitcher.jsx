import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Business as BusinessIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Add as AddIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useOrganization } from '../contexts/OrganizationContext';

const OrganizationSwitcher = () => {
  const {
    organizations,
    currentOrganization,
    loading,
    switchOrganization,
    createOrganization,
  } = useOrganization();

  const [anchorEl, setAnchorEl] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSwitch = async (orgId) => {
    handleClose();
    try {
      await switchOrganization(orgId);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  const handleCreateDialogOpen = () => {
    handleClose();
    setCreateDialogOpen(true);
    setNewOrgName('');
    setNewOrgSlug('');
    setCreateError('');
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setNewOrgName('');
    setNewOrgSlug('');
    setCreateError('');
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      setCreateError('Organization name is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      // Generate slug from name if not provided
      const slug = newOrgSlug.trim() || newOrgName.toLowerCase().replace(/\s+/g, '-');
      await createOrganization({
        name: newOrgName.trim(),
        slug: slug,
        plan: 'free',
      });
      handleCreateDialogClose();
    } catch (error) {
      console.error('Failed to create organization:', error);
      setCreateError(error.response?.data?.error || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!currentOrganization) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        startIcon={<BusinessIcon />}
        endIcon={<ArrowDownIcon />}
        sx={{
          textTransform: 'none',
          borderColor: 'divider',
          color: 'text.primary',
          justifyContent: 'space-between',
          minWidth: 200,
        }}
      >
        <Box sx={{ textAlign: 'left', flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {currentOrganization.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentOrganization.plan.toUpperCase()} Plan
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 250 },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            SWITCH ORGANIZATION
          </Typography>
        </Box>

        {organizations.map((org) => (
          <MenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            selected={org.id === currentOrganization.id}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">{org.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {org.member_count} {org.member_count === 1 ? 'member' : 'members'}
                </Typography>
              </Box>
              {org.id === currentOrganization.id && (
                <CheckIcon fontSize="small" color="primary" />
              )}
            </Box>
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={handleCreateDialogOpen}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          Create New Organization
        </MenuItem>
      </Menu>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Organization</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Organization Name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Acme Inc."
            />
            <TextField
              label="Slug (URL-friendly name)"
              value={newOrgSlug}
              onChange={(e) => setNewOrgSlug(e.target.value)}
              fullWidth
              placeholder="acme-inc"
              helperText="Leave empty to auto-generate from name"
            />
            {createError && (
              <Typography color="error" variant="body2">
                {createError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrganization}
            variant="contained"
            disabled={creating || !newOrgName.trim()}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OrganizationSwitcher;
