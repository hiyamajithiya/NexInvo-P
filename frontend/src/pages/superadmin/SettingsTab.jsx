import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Button,
  TextField,
} from '@mui/material';

const SettingsTab = ({
  emailConfig,
  onEmailConfigChange,
  savingEmail,
  onSaveEmailConfig,
  showTestEmailDialog,
  onShowTestEmailDialog,
  testEmailRecipient,
  onTestEmailRecipientChange,
  sendingTestEmail,
  onSendTestEmail,
  stats,
}) => {
  return (
    <>
      {/* Email Configuration */}
      <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>Email Configuration</Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
              Configure SMTP settings for sending emails (password reset, notifications, etc.)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => onShowTestEmailDialog(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
                borderColor: '#6366f1',
                color: '#6366f1',
                '&:hover': {
                  borderColor: '#4f46e5',
                  backgroundColor: 'rgba(99, 102, 241, 0.04)'
                }
              }}
            >
              Send Test Email
            </Button>
            <Button
              variant="contained"
              onClick={onSaveEmailConfig}
              disabled={savingEmail}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 'bold'
              }}
            >
              {savingEmail ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Configuration'}
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Host"
              value={emailConfig.host}
              onChange={(e) => onEmailConfigChange('host', e.target.value)}
              placeholder="smtp.gmail.com"
              helperText="SMTP server hostname"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Port"
              type="number"
              value={emailConfig.port}
              onChange={(e) => onEmailConfigChange('port', e.target.value)}
              placeholder="587"
              helperText="Usually 587 for TLS or 465 for SSL"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Username / Email"
              value={emailConfig.username}
              onChange={(e) => onEmailConfigChange('username', e.target.value)}
              placeholder="your-email@example.com"
              helperText="SMTP authentication username"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={emailConfig.password}
              onChange={(e) => onEmailConfigChange('password', e.target.value)}
              placeholder="••••••••"
              helperText="SMTP authentication password"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="From Email"
              value={emailConfig.from_email}
              onChange={(e) => onEmailConfigChange('from_email', e.target.value)}
              placeholder="noreply@nexinvo.com"
              helperText="Default sender email address"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontWeight: 600, color: '#111827' }}>Use TLS</Typography>
                <Chip
                  label={emailConfig.use_tls ? "ON" : "OFF"}
                  onClick={() => onEmailConfigChange('use_tls', !emailConfig.use_tls)}
                  sx={{
                    bgcolor: emailConfig.use_tls ? '#d1fae5' : '#fee2e2',
                    color: emailConfig.use_tls ? '#065f46' : '#991b1b',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Settings Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Feature Flags */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>Feature Flags</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats?.featureFlags && (
              <>
                {stats.featureFlags.organizationInvites !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>Organization Invites</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Allow users to invite members</Typography>
                    </Box>
                    <Chip
                      label={stats.featureFlags.organizationInvites ? "ON" : "OFF"}
                      size="small"
                      sx={{
                        bgcolor: stats.featureFlags.organizationInvites ? '#d1fae5' : '#fee2e2',
                        color: stats.featureFlags.organizationInvites ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                )}
                {stats.featureFlags.apiAccess !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>API Access</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Enable API for integrations</Typography>
                    </Box>
                    <Chip
                      label={stats.featureFlags.apiAccess ? "ON" : "OFF"}
                      size="small"
                      sx={{
                        bgcolor: stats.featureFlags.apiAccess ? '#d1fae5' : '#fee2e2',
                        color: stats.featureFlags.apiAccess ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                )}
                {stats.featureFlags.trialPeriod !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>Trial Period</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>14-day trial for new signups</Typography>
                    </Box>
                    <Chip
                      label={stats.featureFlags.trialPeriod ? "ON" : "OFF"}
                      size="small"
                      sx={{
                        bgcolor: stats.featureFlags.trialPeriod ? '#d1fae5' : '#fee2e2',
                        color: stats.featureFlags.trialPeriod ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                )}
                {stats.featureFlags.analyticsTracking !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>Analytics Tracking</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Google Analytics integration</Typography>
                    </Box>
                    <Chip
                      label={stats.featureFlags.analyticsTracking ? "ON" : "OFF"}
                      size="small"
                      sx={{
                        bgcolor: stats.featureFlags.analyticsTracking ? '#d1fae5' : '#fee2e2',
                        color: stats.featureFlags.analyticsTracking ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                )}
                {stats.featureFlags.emailNotifications !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>Email Notifications</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Automated email alerts</Typography>
                    </Box>
                    <Chip
                      label={stats.featureFlags.emailNotifications ? "ON" : "OFF"}
                      size="small"
                      sx={{
                        bgcolor: stats.featureFlags.emailNotifications ? '#d1fae5' : '#fee2e2',
                        color: stats.featureFlags.emailNotifications ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                )}
                {stats.featureFlags.autoBackup !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#111827' }}>Auto Backup</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Automated database backups</Typography>
                    </Box>
                    <Chip
                      label={stats.featureFlags.autoBackup ? "ON" : "OFF"}
                      size="small"
                      sx={{
                        bgcolor: stats.featureFlags.autoBackup ? '#d1fae5' : '#fee2e2',
                        color: stats.featureFlags.autoBackup ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </Paper>

        {/* System Information */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: '#111827' }}>System Information</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats?.systemInfo && (
              <>
                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Application Version</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.appVersion || 'N/A'}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Database Size</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.databaseSize || 'N/A'}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Server Uptime</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.serverUptime || 'N/A'}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Environment</Typography>
                  <Chip
                    label={stats.systemInfo.environment || 'Unknown'}
                    size="small"
                    sx={{
                      bgcolor: stats.systemInfo.environment === 'Production' ? '#d1fae5' : '#dbeafe',
                      color: stats.systemInfo.environment === 'Production' ? '#065f46' : '#1e40af',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Python Version</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.pythonVersion || 'N/A'}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Django Version</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#111827' }}>{stats.systemInfo.djangoVersion || 'N/A'}</Typography>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </div>
    </>
  );
};

export default SettingsTab;
