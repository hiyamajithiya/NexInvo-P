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
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const BulkEmailManager = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  // Dialog states
  const [templateDialog, setTemplateDialog] = useState(false);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [sendDialog, setSendDialog] = useState(false);
  const [viewCampaignDialog, setViewCampaignDialog] = useState(false);

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
    { value: 'announcement', label: 'General Announcement' },
    { value: 'plan_change', label: 'Plan/Pricing Change' },
    { value: 'new_feature', label: 'New Feature' },
    { value: 'maintenance', label: 'Scheduled Maintenance' },
    { value: 'security', label: 'Security Update' },
    { value: 'policy_update', label: 'Policy Update' },
    { value: 'custom', label: 'Custom' },
  ];

  const recipientTypes = [
    { value: 'all_users', label: 'All Users' },
    { value: 'all_admins', label: 'Organization Admins/Owners Only' },
    { value: 'active_users', label: 'Active Users Only' },
    { value: 'inactive_users', label: 'Inactive Users Only' },
  ];

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
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
      setAlert({ open: true, message: 'Failed to load recipient preview', severity: 'error' });
    }
    setLoading(false);
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
        setAlert({ open: true, message: 'Template updated successfully', severity: 'success' });
      } else {
        await axios.post(
          `${API_BASE_URL}/superadmin/bulk-email/templates/`,
          currentTemplate,
          getAuthHeaders()
        );
        setAlert({ open: true, message: 'Template created successfully', severity: 'success' });
      }
      fetchTemplates();
      setTemplateDialog(false);
      setCurrentTemplate({ name: '', template_type: 'announcement', subject: '', body: '' });
    } catch (error) {
      console.error('Error saving template:', error);
      setAlert({ open: true, message: 'Failed to save template', severity: 'error' });
    }
    setLoading(false);
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/superadmin/bulk-email/templates/${id}/`, getAuthHeaders());
      setAlert({ open: true, message: 'Template deleted successfully', severity: 'success' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      setAlert({ open: true, message: 'Failed to delete template', severity: 'error' });
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
      setAlert({ open: true, message: 'Campaign created successfully', severity: 'success' });
      fetchCampaigns();
      setCampaignDialog(false);
      setCurrentCampaign({ name: '', subject: '', body: '', recipient_type: 'all_users', template_id: '' });

      // Open send dialog for the newly created campaign
      setSelectedCampaign({ id: response.data.id, ...currentCampaign });
      setSendDialog(true);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setAlert({ open: true, message: 'Failed to create campaign', severity: 'error' });
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
      setAlert({
        open: true,
        message: `Campaign sent! ${response.data.sent_count} emails sent, ${response.data.failed_count} failed`,
        severity: response.data.failed_count > 0 ? 'warning' : 'success'
      });
      fetchCampaigns();
      setSendDialog(false);
    } catch (error) {
      console.error('Error sending campaign:', error);
      setAlert({
        open: true,
        message: error.response?.data?.error || 'Failed to send campaign',
        severity: 'error'
      });
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'sending': return 'warning';
      case 'failed': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const renderTemplatesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Email Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setCurrentTemplate({ name: '', template_type: 'announcement', subject: '', body: '' });
            setTemplateDialog(true);
          }}
          sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          New Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem' }}>{template.name}</Typography>
                  <Chip
                    label={template.template_type_display}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Subject:</strong> {template.subject}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                  dangerouslySetInnerHTML={{ __html: template.body.substring(0, 150) + '...' }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCurrentTemplate(template);
                        setTemplateDialog(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Use in Campaign">
                    <IconButton
                      size="small"
                      color="primary"
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
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {templates.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <TemplateIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">No templates yet. Create your first template!</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderCampaignsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Email Campaigns</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCampaigns}
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
            sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            New Campaign
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Campaign Name</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Recipients</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent/Total</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>{campaign.name}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {campaign.subject}
                </TableCell>
                <TableCell>{campaign.recipient_type_display}</TableCell>
                <TableCell>
                  <Chip
                    label={campaign.status_display}
                    color={getStatusColor(campaign.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {campaign.sent_count}/{campaign.total_recipients}
                  {campaign.failed_count > 0 && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      ({campaign.failed_count} failed)
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => handleViewCampaign(campaign)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {campaign.status === 'draft' && (
                    <Tooltip title="Send Campaign">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setSendDialog(true);
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CampaignIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">No campaigns yet. Create your first campaign!</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderQuickSendTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Quick Send Email</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Template (Optional)</InputLabel>
              <Select
                value={currentCampaign.template_id}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                label="Select Template (Optional)"
              >
                <MenuItem value="">None - Write Custom</MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={() => fetchRecipientPreview(currentCampaign.recipient_type)}
              disabled={loading}
            >
              Preview Recipients ({currentCampaign.recipient_type})
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
              helperText="Available placeholders: {{user_name}}, {{organization_name}}, {{email}}"
            />
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Placeholders:</strong> Use {'{{user_name}}'}, {'{{organization_name}}'}, {'{{email}}'} to personalize emails
            </Alert>
          </Grid>
          <Grid item xs={12}>
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
              sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {sendingCampaign ? 'Sending...' : 'Send Email'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Bulk Email Manager
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SendIcon />} label="Quick Send" iconPosition="start" />
          <Tab icon={<CampaignIcon />} label="Campaigns" iconPosition="start" />
          <Tab icon={<TemplateIcon />} label="Templates" iconPosition="start" />
        </Tabs>
      </Paper>

      {activeTab === 0 && renderQuickSendTab()}
      {activeTab === 1 && renderCampaignsTab()}
      {activeTab === 2 && renderTemplatesTab()}

      {/* Template Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{currentTemplate.id ? 'Edit Template' : 'Create New Template'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Template Name"
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
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
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
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
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={10}
                label="Email Body (HTML supported)"
                value={currentTemplate.body}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                helperText="Available placeholders: {{user_name}}, {{organization_name}}, {{email}}"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={loading || !currentTemplate.name || !currentTemplate.subject || !currentTemplate.body}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={campaignDialog} onClose={() => setCampaignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Email Campaign</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Name"
                value={currentCampaign.name}
                onChange={(e) => setCurrentCampaign({ ...currentCampaign, name: e.target.value })}
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
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                sx={{ height: '56px' }}
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
                rows={8}
                label="Email Body (HTML supported)"
                value={currentCampaign.body}
                onChange={(e) => setCurrentCampaign({ ...currentCampaign, body: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCampaign}
            variant="contained"
            disabled={loading || !currentCampaign.name || !currentCampaign.subject || !currentCampaign.body}
          >
            {loading ? <CircularProgress size={20} /> : 'Create & Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog open={sendDialog} onClose={() => setSendDialog(false)}>
        <DialogTitle>Confirm Send Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to send this campaign?
          </Typography>
          {selectedCampaign && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2"><strong>Campaign:</strong> {selectedCampaign.name}</Typography>
              <Typography variant="body2"><strong>Subject:</strong> {selectedCampaign.subject}</Typography>
              <Typography variant="body2"><strong>Recipients:</strong> {selectedCampaign.recipient_type}</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Emails will be sent immediately to all selected recipients.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialog(false)} disabled={sendingCampaign}>Cancel</Button>
          <Button
            onClick={() => handleSendCampaign(selectedCampaign?.id)}
            variant="contained"
            color="primary"
            disabled={sendingCampaign}
            startIcon={sendingCampaign ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          >
            {sendingCampaign ? 'Sending...' : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Recipients Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Recipient Preview
          {recipientPreview && ` (${recipientPreview.total_count} total, showing ${recipientPreview.showing})`}
        </DialogTitle>
        <DialogContent>
          {recipientPreview && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Organization</TableCell>
                    <TableCell>Status</TableCell>
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
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* View Campaign Details Dialog */}
      <Dialog open={viewCampaignDialog} onClose={() => setViewCampaignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Campaign Details</DialogTitle>
        <DialogContent>
          {selectedCampaign && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Campaign Name</Typography>
                  <Typography variant="body1">{selectedCampaign.name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip label={selectedCampaign.status_display} color={getStatusColor(selectedCampaign.status)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Subject</Typography>
                  <Typography variant="body1">{selectedCampaign.subject}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Total Recipients</Typography>
                  <Typography variant="h6">{selectedCampaign.total_recipients}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Sent</Typography>
                  <Typography variant="h6" color="success.main">{selectedCampaign.sent_count}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Failed</Typography>
                  <Typography variant="h6" color="error.main">{selectedCampaign.failed_count}</Typography>
                </Grid>
              </Grid>

              {selectedCampaign.recipients && selectedCampaign.recipients.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Recipients (First 100)</Typography>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Sent At</TableCell>
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
                                color={recipient.status === 'sent' ? 'success' : recipient.status === 'failed' ? 'error' : 'default'}
                                size="small"
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
                  <Alert severity="error">
                    <Typography variant="subtitle2">Errors:</Typography>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{selectedCampaign.error_message}</pre>
                  </Alert>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewCampaignDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      {alert.open && (
        <Alert
          severity={alert.severity}
          onClose={() => setAlert({ ...alert, open: false })}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}
        >
          {alert.message}
        </Alert>
      )}
    </Box>
  );
};

export default BulkEmailManager;
