import React from 'react';
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
  IconButton,
  Button,
} from '@mui/material';
import { formatDate } from '../../utils/dateFormat';

const UpgradeRequestsTab = ({
  notifications,
  unreadNotificationCount,
  loadingNotifications,
  onMarkNotificationRead,
  onMarkAllRead,
  onDeleteNotification,
  upgradeRequests,
  loadingUpgradeRequests,
  onApproveDialogOpen,
  onRejectDialogOpen,
}) => {
  const pendingRequests = upgradeRequests.filter(r => r.status === 'pending');
  const processedRequests = upgradeRequests.filter(r => r.status !== 'pending');

  return (
    <>
      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Notifications</Typography>
            {unreadNotificationCount > 0 && (
              <Button size="small" onClick={onMarkAllRead}>
                Mark All as Read
              </Button>
            )}
          </div>
          <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
            {notifications.slice(0, 5).map((notification) => (
              <Box
                key={notification.id}
                sx={{
                  p: 2,
                  borderBottom: '1px solid #e5e7eb',
                  bgcolor: notification.is_read ? 'white' : '#fef3c7',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  '&:last-child': { borderBottom: 'none' }
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827' }}>
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1, display: 'block' }}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!notification.is_read && (
                    <Button size="small" onClick={() => onMarkNotificationRead(notification.id)}>
                      Mark Read
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => onDeleteNotification(notification.id)}>
                    {'\uD83D\uDDD1\uFE0F'}
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Paper>
        </div>
      )}

      {/* Pending Upgrade Requests */}
      <div style={{ marginBottom: '24px' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#dc2626' }}>
          Pending Approval ({pendingRequests.length})
        </Typography>
        {loadingUpgradeRequests ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : pendingRequests.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Typography sx={{ color: '#6b7280' }}>No pending upgrade requests</Typography>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Requested By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Current Plan</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Requested Plan</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Coupon</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.organization_name}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{request.requested_by_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>{request.requested_by_email}</Typography>
                      </TableCell>
                      <TableCell>{request.current_plan_name || 'None'}</TableCell>
                      <TableCell>
                        <Chip label={request.requested_plan_name} color="primary" size="small" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#059669' }}>{'\u20B9'}{parseFloat(request.amount).toFixed(2)}</TableCell>
                      <TableCell>{request.coupon_code || '-'}</TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => onApproveDialogOpen(request)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => onRejectDialogOpen(request)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </div>

      {/* Processed Requests History */}
      <div>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Request History ({processedRequests.length})
        </Typography>
        {processedRequests.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Typography sx={{ color: '#6b7280' }}>No processed requests yet</Typography>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Requested Plan</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Processed</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedRequests.slice(0, 10).map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.organization_name}</TableCell>
                      <TableCell>{request.requested_plan_name}</TableCell>
                      <TableCell>{'\u20B9'}{parseFloat(request.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.status.toUpperCase()}
                          color={request.status === 'approved' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {request.approved_at ? formatDate(request.approved_at) : '-'}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {request.admin_notes || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </div>
    </>
  );
};

export default UpgradeRequestsTab;
