import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Avatar,
  Snackbar,
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Campaign as CampaignIcon,
  Description as TemplateIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  ContentCopy as CopyIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const BulkEmailManager = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialog states
  const [templateDialog, setTemplateDialog] = useState(false);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [sendDialog, setSendDialog] = useState(false);
  const [viewCampaignDialog, setViewCampaignDialog] = useState(false);
  const [emailPreviewDialog, setEmailPreviewDialog] = useState(false);

  // Form states
  const [currentTemplate, setCurrentTemplate] = useState({
    name: '',
    template_type: 'announcement',
    subject: '',
    body: '',
  });
  const [currentCampaign, setCurrentCampaign] = useState({
    name: '',
    subject: '',
    body: '',
    recipient_type: 'all_users',
    template_id: '',
  });
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [sendingCampaign, setSendingCampaign] = useState(false);

  const templateTypes = [
    { value: 'announcement', label: 'General Announcement', icon: '📢', color: '#6366f1' },
    { value: 'plan_change', label: 'Plan/Pricing Change', icon: '💰', color: '#f59e0b' },
    { value: 'new_feature', label: 'New Feature', icon: '✨', color: '#10b981' },
    { value: 'maintenance', label: 'Scheduled Maintenance', icon: '🔧', color: '#8b5cf6' },
    { value: 'security', label: 'Security Update', icon: '🔒', color: '#ef4444' },
    { value: 'policy_update', label: 'Policy Update', icon: '📋', color: '#3b82f6' },
    { value: 'custom', label: 'Custom', icon: '✉️', color: '#6b7280' },
  ];

  const recipientTypes = [
    { value: 'all_users', label: 'All Users', description: 'Send to all registered users', icon: '👥' },
    { value: 'all_admins', label: 'Organization Admins', description: 'Only organization owners and admins', icon: '👔' },
    { value: 'active_users', label: 'Active Users', description: 'Users who logged in recently', icon: '✅' },
    { value: 'inactive_users', label: 'Inactive Users', description: 'Users who haven\'t logged in recently', icon: '💤' },
  ];

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  });

  useEffect(() => {
    fetchTemplates();
    fetchCampaigns();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/superadmin/bulk-email/templates/`, getAuthHeaders());
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/superadmin/bulk-email/campaigns/`, getAuthHeaders());
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchRecipientPreview = async (recipientType) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/superadmin/bulk-email/preview-recipients/?recipient_type=${recipientType}`,
        getAuthHeaders()
      );
      setRecipientPreview(response.data);
      setPreviewDialog(true);
    } catch (error) {
      console.error('Error fetching preview:', error);
      showSnackbar('Failed to load recipient preview', 'error');
    }
    setLoading(false);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    try {
      if (currentTemplate.id) {
        await axios.put(
          `${API_BASE_URL}/superadmin/bulk-email/templates/${currentTemplate.id}/`,
          currentTemplate,
          getAuthHeaders()
        );
        showSnackbar('Template updated successfully');
      } else {
        await axios.post(
          `${API_BASE_URL}/superadmin/bulk-email/templates/`,
          currentTemplate,
          getAuthHeaders()
        );
        showSnackbar('Template created successfully');
      }
      fetchTemplates();
      setTemplateDialog(false);
      setCurrentTemplate({ name: '', template_type: 'announcement', subject: '', body: '' });
    } catch (error) {
      console.error('Error saving template:', error);
      showSnackbar('Failed to save template', 'error');
    }
    setLoading(false);
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/superadmin/bulk-email/templates/${id}/`, getAuthHeaders());
      showSnackbar('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showSnackbar('Failed to delete template', 'error');
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/superadmin/bulk-email/campaigns/`,
        currentCampaign,
        getAuthHeaders()
      );
      showSnackbar('Campaign created successfully');
      fetchCampaigns();
      setCampaignDialog(false);
      setCurrentCampaign({ name: '', subject: '', body: '', recipient_type: 'all_users', template_id: '' });
      setSelectedCampaign({ id: response.data.id, ...currentCampaign });
      setSendDialog(true);
    } catch (error) {
      console.error('Error creating campaign:', error);
      showSnackbar('Failed to create campaign', 'error');
    }
    setLoading(false);
  };

  const handleSendCampaign = async (campaignId) => {
    setSendingCampaign(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/superadmin/bulk-email/campaigns/${campaignId}/send/`,
        {},
        getAuthHeaders()
      );
      showSnackbar(
        `Campaign sent! ${response.data.sent_count} emails sent, ${response.data.failed_count} failed`,
        response.data.failed_count > 0 ? 'warning' : 'success'
      );
      fetchCampaigns();
      setSendDialog(false);
    } catch (error) {
      console.error('Error sending campaign:', error);
      showSnackbar(error.response?.data?.error || 'Failed to send campaign', 'error');
    }
    setSendingCampaign(false);
  };

  const handleViewCampaign = async (campaign) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/superadmin/bulk-email/campaigns/${campaign.id}/`,
        getAuthHeaders()
      );
      setSelectedCampaign(response.data);
      setViewCampaignDialog(true);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setCurrentCampaign({
        ...currentCampaign,
        template_id: templateId,
        subject: template.subject,
        body: template.body,
      });
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed': return { color: '#10b981', bgColor: '#d1fae5', icon: <CheckCircleIcon fontSize="small" />, label: 'Completed' };
      case 'sending': return { color: '#f59e0b', bgColor: '#fef3c7', icon: <ScheduleIcon fontSize="small" />, label: 'Sending' };
      case 'failed': return { color: '#ef4444', bgColor: '#fee2e2', icon: <ErrorIcon fontSize="small" />, label: 'Failed' };
      case 'draft': return { color: '#6b7280', bgColor: '#f3f4f6', icon: <EditIcon fontSize="small" />, label: 'Draft' };
      default: return { color: '#6b7280', bgColor: '#f3f4f6', icon: null, label: status };
    }
  };

  const getTemplateTypeInfo = (type) => {
    return templateTypes.find(t => t.value === type) || { icon: '✉️', color: '#6b7280', label: type };
  };

  // Calculate stats
  const totalCampaigns = campaigns.length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  const totalEmailsSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalTemplates = templates.length;

  // Stats Card Component
  const StatCard = ({ icon, title, value, color, bgColor }) => (
    <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          bgcolor: bgColor,
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${color}`
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#111827' }}>{value}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  // Quick Send Tab
  const renderQuickSendTab = () => (
    <Box>
      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CampaignIcon sx={{ fontSize: 28, color: '#6366f1' }} />}
            title="Total Campaigns"
            value={totalCampaigns}
            color="#6366f1"
            bgColor="rgba(99, 102, 241, 0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CheckCircleIcon sx={{ fontSize: 28, color: '#10b981' }} />}
            title="Completed"
            value={completedCampaigns}
            color="#10b981"
            bgColor="rgba(16, 185, 129, 0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<EmailIcon sx={{ fontSize: 28, color: '#8b5cf6' }} />}
            title="Emails Sent"
            value={totalEmailsSent}
            color="#8b5cf6"
            bgColor="rgba(139, 92, 246, 0.1)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TemplateIcon sx={{ fontSize: 28, color: '#f59e0b' }} />}
            title="Templates"
            value={totalTemplates}
            color="#f59e0b"
            bgColor="rgba(245, 158, 11, 0.1)"
          />
        </Grid>
      </Grid>

      {/* Quick Send Form */}
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <SendIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
              Quick Send Email
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Send emails instantly to your users
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Template Selection */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2 }}>
                📋 Select Template (Optional)
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={currentCampaign.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  displayEmpty
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="">
                    <em>None - Write Custom Email</em>
                  </MenuItem>
                  {templates.map((template) => {
                    const typeInfo = getTemplateTypeInfo(template.template_type);
                    return (
                      <MenuItem key={template.id} value={template.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{typeInfo.icon}</span>
                          <span>{template.name}</span>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Paper>
          </Grid>

          {/* Recipients Selection */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2 }}>
                👥 Select Recipients
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={currentCampaign.recipient_type}
                  onChange={(e) => setCurrentCampaign({ ...currentCampaign, recipient_type: e.target.value })}
                  sx={{ bgcolor: 'white' }}
                >
                  {recipientTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{type.icon}</span>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{type.label}</Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>{type.description}</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PeopleIcon />}
                onClick={() => fetchRecipientPreview(currentCampaign.recipient_type)}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Preview Recipients
              </Button>
            </Paper>
          </Grid>

          {/* Subject */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Subject"
              value={currentCampaign.subject}
              onChange={(e) => setCurrentCampaign({ ...currentCampaign, subject: e.target.value })}
              placeholder="Enter a compelling subject line..."
              InputProps={{
                sx: { bgcolor: 'white' }
              }}
            />
          </Grid>

          {/* Body */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={12}
              label="Email Body"
              value={currentCampaign.body}
              onChange={(e) => setCurrentCampaign({ ...currentCampaign, body: e.target.value })}
              placeholder="Write your email content here... HTML is supported."
              InputProps={{
                sx: { bgcolor: 'white', fontFamily: 'monospace' }
              }}
            />
          </Grid>

          {/* Placeholders Info */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e40af', mb: 1 }}>
                💡 Available Placeholders
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {['{{user_name}}', '{{organization_name}}', '{{email}}'].map(placeholder => (
                  <Chip
                    key={placeholder}
                    label={placeholder}
                    size="small"
                    sx={{ fontFamily: 'monospace', bgcolor: 'white' }}
                    onClick={() => {
                      setCurrentCampaign({
                        ...currentCampaign,
                        body: currentCampaign.body + placeholder
                      });
                    }}
                    icon={<CopyIcon fontSize="small" />}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => setEmailPreviewDialog(true)}
                disabled={!currentCampaign.subject || !currentCampaign.body}
              >
                Preview Email
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={sendingCampaign ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={() => {
                  setCurrentCampaign({
                    ...currentCampaign,
                    name: `Quick Send - ${new Date().toLocaleString()}`,
                  });
                  setCampaignDialog(true);
                }}
                disabled={!currentCampaign.subject || !currentCampaign.body || sendingCampaign}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  px: 4,
                  py: 1.5,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                {sendingCampaign ? 'Sending...' : 'Send Email'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // Campaigns Tab
  const renderCampaignsTab = () => (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CampaignIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                Email Campaigns
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Manage and track your email campaigns
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchCampaigns}
              sx={{ textTransform: 'none' }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setCurrentCampaign({ name: '', subject: '', body: '', recipient_type: 'all_users', template_id: '' });
                setCampaignDialog(true);
              }}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              New Campaign
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Campaigns Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Campaign</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Recipients</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => {
                const statusInfo = getStatusInfo(campaign.status);
                const progress = campaign.total_recipients > 0
                  ? (campaign.sent_count / campaign.total_recipients) * 100
                  : 0;
                return (
                  <TableRow key={campaign.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          width: 36,
                          height: 36
                        }}>
                          <CampaignIcon fontSize="small" />
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {campaign.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#6b7280'
                      }}>
                        {campaign.subject}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={campaign.recipient_type_display}
                        size="small"
                        sx={{ bgcolor: '#f3f4f6', color: '#374151' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusInfo.icon}
                        label={statusInfo.label}
                        size="small"
                        sx={{
                          bgcolor: statusInfo.bgColor,
                          color: statusInfo.color,
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: statusInfo.color }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {campaign.sent_count}/{campaign.total_recipients}
                          </Typography>
                          {campaign.failed_count > 0 && (
                            <Typography variant="caption" sx={{ color: '#ef4444' }}>
                              {campaign.failed_count} failed
                            </Typography>
                          )}
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: campaign.failed_count > 0 ? '#f59e0b' : '#10b981',
                              borderRadius: 3
                            }
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {new Date(campaign.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewCampaign(campaign)}>
                            <VisibilityIcon fontSize="small" sx={{ color: '#6366f1' }} />
                          </IconButton>
                        </Tooltip>
                        {campaign.status === 'draft' && (
                          <Tooltip title="Send Campaign">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setSendDialog(true);
                              }}
                            >
                              <SendIcon fontSize="small" sx={{ color: '#10b981' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 8 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CampaignIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                        No campaigns yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                        Create your first email campaign to start reaching your users
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCampaignDialog(true)}
                        sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                      >
                        Create Campaign
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  // Templates Tab
  const renderTemplatesTab = () => (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TemplateIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                Email Templates
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Create reusable email templates for your campaigns
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentTemplate({ name: '', template_type: 'announcement', subject: '', body: '' });
              setTemplateDialog(true);
            }}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            New Template
          </Button>
        </Box>
      </Paper>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {templates.map((template) => {
          const typeInfo = getTemplateTypeInfo(template.template_type);
          return (
            <Grid item xs={12} sm={6} lg={4} key={template.id}>
              <Paper sx={{
                p: 3,
                borderRadius: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: `${typeInfo.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {typeInfo.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        {template.name}
                      </Typography>
                      <Chip
                        label={typeInfo.label}
                        size="small"
                        sx={{
                          bgcolor: `${typeInfo.color}15`,
                          color: typeInfo.color,
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ flex: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, mb: 1 }}>
                    {template.subject}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {template.body.replace(/<[^>]*>/g, '').substring(0, 120)}...
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Edit Template">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setCurrentTemplate(template);
                          setTemplateDialog(true);
                        }}
                        sx={{
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' }
                        }}
                      >
                        <EditIcon fontSize="small" sx={{ color: '#6366f1' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Template">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTemplate(template.id)}
                        sx={{
                          bgcolor: 'rgba(239, 68, 68, 0.1)',
                          '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' }
                        }}
                      >
                        <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SendIcon />}
                    onClick={() => {
                      setCurrentCampaign({
                        name: `Campaign - ${template.name}`,
                        subject: template.subject,
                        body: template.body,
                        recipient_type: 'all_users',
                        template_id: template.id,
                      });
                      setCampaignDialog(true);
                    }}
                    sx={{
                      textTransform: 'none',
                      borderColor: '#6366f1',
                      color: '#6366f1',
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' }
                    }}
                  >
                    Use Template
                  </Button>
                </Box>
              </Paper>
            </Grid>
          );
        })}

        {templates.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 8, borderRadius: 3, textAlign: 'center' }}>
              <TemplateIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                No templates yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                Create your first template to speed up your email campaigns
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTemplateDialog(true)}
                sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                Create Template
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  return (
    <Box>
      {/* Page Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 0.5 }}>
              Bulk Email Manager
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Send targeted emails to your users and manage email campaigns
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 64,
              fontSize: '0.95rem'
            },
            '& .Mui-selected': {
              color: '#6366f1 !important'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#6366f1',
              height: 3,
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          <Tab icon={<SendIcon />} label="Quick Send" iconPosition="start" />
          <Tab icon={<CampaignIcon />} label="Campaigns" iconPosition="start" />
          <Tab icon={<TemplateIcon />} label="Templates" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && renderQuickSendTab()}
      {activeTab === 1 && renderCampaignsTab()}
      {activeTab === 2 && renderTemplatesTab()}

      {/* Template Dialog */}
      <Dialog
        open={templateDialog}
        onClose={() => setTemplateDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          py: 2.5
        }}>
          {currentTemplate.id ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Template Name"
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                placeholder="e.g., Welcome Email"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Template Type</InputLabel>
                <Select
                  value={currentTemplate.template_type}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, template_type: e.target.value })}
                  label="Template Type"
                >
                  {templateTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Subject"
                value={currentTemplate.subject}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                placeholder="Enter subject line..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={12}
                label="Email Body (HTML supported)"
                value={currentTemplate.body}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                placeholder="Write your email content here..."
                InputProps={{ sx: { fontFamily: 'monospace' } }}
                helperText="Available placeholders: {{user_name}}, {{organization_name}}, {{email}}"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f9fafb' }}>
          <Button onClick={() => setTemplateDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={loading || !currentTemplate.name || !currentTemplate.subject || !currentTemplate.body}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog
        open={campaignDialog}
        onClose={() => setCampaignDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          py: 2.5
        }}>
          Create Email Campaign
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Name"
                value={currentCampaign.name}
                onChange={(e) => setCurrentCampaign({ ...currentCampaign, name: e.target.value })}
                placeholder="e.g., December Newsletter"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select
                  value={currentCampaign.recipient_type}
                  onChange={(e) => setCurrentCampaign({ ...currentCampaign, recipient_type: e.target.value })}
                  label="Recipients"
                >
                  {recipientTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                sx={{ height: '56px' }}
                startIcon={<PeopleIcon />}
                onClick={() => fetchRecipientPreview(currentCampaign.recipient_type)}
              >
                Preview Recipients
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Subject"
                value={currentCampaign.subject}
                onChange={(e) => setCurrentCampaign({ ...currentCampaign, subject: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={10}
                label="Email Body (HTML supported)"
                value={currentCampaign.body}
                onChange={(e) => setCurrentCampaign({ ...currentCampaign, body: e.target.value })}
                InputProps={{ sx: { fontFamily: 'monospace' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f9fafb' }}>
          <Button onClick={() => setCampaignDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateCampaign}
            variant="contained"
            disabled={loading || !currentCampaign.name || !currentCampaign.subject || !currentCampaign.body}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Create & Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog
        open={sendDialog}
        onClose={() => setSendDialog(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Send Campaign</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to send this campaign?
          </Typography>
          {selectedCampaign && (
            <Paper sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Campaign:</strong> {selectedCampaign.name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Subject:</strong> {selectedCampaign.subject}
              </Typography>
              <Typography variant="body2">
                <strong>Recipients:</strong> {selectedCampaign.recipient_type}
              </Typography>
            </Paper>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Emails will be sent immediately to all selected recipients.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSendDialog(false)} disabled={sendingCampaign} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSendCampaign(selectedCampaign?.id)}
            variant="contained"
            disabled={sendingCampaign}
            startIcon={sendingCampaign ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {sendingCampaign ? 'Sending...' : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Recipients Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white'
        }}>
          Recipient Preview
          {recipientPreview && (
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {recipientPreview.total_count} total recipients (showing {recipientPreview.showing})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {recipientPreview && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recipientPreview.preview.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.organization}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: user.is_active ? '#d1fae5' : '#f3f4f6',
                            color: user.is_active ? '#065f46' : '#6b7280'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPreviewDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Campaign Details Dialog */}
      <Dialog
        open={viewCampaignDialog}
        onClose={() => setViewCampaignDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white'
        }}>
          Campaign Details
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedCampaign && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Campaign Name</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{selectedCampaign.name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Status</Typography>
                  {(() => {
                    const statusInfo = getStatusInfo(selectedCampaign.status);
                    return (
                      <Chip
                        icon={statusInfo.icon}
                        label={statusInfo.label}
                        sx={{
                          bgcolor: statusInfo.bgColor,
                          color: statusInfo.color,
                          fontWeight: 600
                        }}
                      />
                    );
                  })()}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Subject</Typography>
                  <Typography variant="body1">{selectedCampaign.subject}</Typography>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                      {selectedCampaign.total_recipients}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Recipients</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#3b82f6' }}>
                      {selectedCampaign.sent_count}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Sent</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ef4444' }}>
                      {selectedCampaign.failed_count}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Failed</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {selectedCampaign.recipients && selectedCampaign.recipients.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Recipients (First 100)
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb' }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb' }}>Sent At</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedCampaign.recipients.map((recipient, index) => (
                          <TableRow key={index}>
                            <TableCell>{recipient.user_name}</TableCell>
                            <TableCell>{recipient.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={recipient.status}
                                size="small"
                                sx={{
                                  bgcolor: recipient.status === 'sent' ? '#d1fae5' : recipient.status === 'failed' ? '#fee2e2' : '#f3f4f6',
                                  color: recipient.status === 'sent' ? '#065f46' : recipient.status === 'failed' ? '#991b1b' : '#6b7280'
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {recipient.sent_at ? new Date(recipient.sent_at).toLocaleString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {selectedCampaign.error_message && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Errors:</Typography>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', margin: 0 }}>
                      {selectedCampaign.error_message}
                    </pre>
                  </Alert>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f9fafb' }}>
          <Button onClick={() => setViewCampaignDialog(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog
        open={emailPreviewDialog}
        onClose={() => setEmailPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white'
        }}>
          Email Preview
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, bgcolor: '#f9fafb' }}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Subject</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                {currentCampaign.subject || 'No subject'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{ lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{
                  __html: currentCampaign.body
                    .replace(/\{\{user_name\}\}/g, '<strong>[User Name]</strong>')
                    .replace(/\{\{organization_name\}\}/g, '<strong>[Organization Name]</strong>')
                    .replace(/\{\{email\}\}/g, '<strong>[User Email]</strong>')
                }}
              />
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEmailPreviewDialog(false)} sx={{ textTransform: 'none' }}>
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
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BulkEmailManager;
