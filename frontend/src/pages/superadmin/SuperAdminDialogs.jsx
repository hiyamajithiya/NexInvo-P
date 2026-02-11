import React from 'react';
import {
  Box,
  Grid,
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
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  AccountCircle as AccountCircleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Sell as SalesIcon,
} from '@mui/icons-material';

const SuperAdminDialogs = ({
  // Plan Change Dialog
  planChangeDialog,
  onClosePlanChangeDialog,
  selectedOrg,
  selectedPlan,
  onSelectedPlanChange,
  subscriptionPlans,
  onPlanChangeSubmit,
  // Organization Details Dialog
  orgDetailsDialog,
  onCloseOrgDetailsDialog,
  orgDetails,
  orgDetailsLoading,
  // Organization Members Dialog
  orgMembersDialog,
  onCloseOrgMembersDialog,
  orgMembers,
  // User Profile Dialog
  userProfileDialog,
  onCloseUserProfileDialog,
  selectedUser,
  // User Organizations Dialog
  userOrgsDialog,
  onCloseUserOrgsDialog,
  userOrganizations,
  // Delete Organization Dialog
  deleteOrgDialog,
  onCloseDeleteOrgDialog,
  onDeleteOrganization,
  // Delete User Dialog
  deleteUserDialog,
  onCloseDeleteUserDialog,
  onDeleteUser,
  // Acquisition Dialog
  acquisitionDialog,
  onCloseAcquisitionDialog,
  acquisitionForm,
  onAcquisitionFormChange,
  salesStaff,
  coupons,
  organizations,
  onSaveAcquisition,
  // Test Email Dialog
  showTestEmailDialog,
  onCloseTestEmailDialog,
  testEmailRecipient,
  onTestEmailRecipientChange,
  sendingTestEmail,
  onSendTestEmail,
  // Approve Dialog
  approveDialog,
  onCloseApproveDialog,
  adminNotes,
  onAdminNotesChange,
  paymentReference,
  onPaymentReferenceChange,
  onApproveRequest,
  // Reject Dialog
  rejectDialog,
  onCloseRejectDialog,
  onRejectRequest,
}) => {
  return (
    <>
      {/* Plan Change Dialog */}
      <Dialog
        open={planChangeDialog}
        onClose={onClosePlanChangeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Change Organization Plan
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
              Select a new subscription plan for <strong>{selectedOrg?.name}</strong>
            </Typography>
            <Grid container spacing={2}>
              {subscriptionPlans.map((plan) => (
                <Grid item xs={12} sm={6} key={plan.id}>
                  <Paper
                    elevation={selectedPlan === plan.name.toLowerCase() ? 4 : 1}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      border: selectedPlan === plan.name.toLowerCase() ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={() => onSelectedPlanChange(plan.name.toLowerCase())}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        {plan.name}
                      </Typography>
                      {plan.highlight && (
                        <Chip label="POPULAR" size="small" sx={{ bgcolor: '#f59e0b', color: 'white', fontWeight: 'bold' }} />
                      )}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#8b5cf6', mb: 1 }}>
                      {'\u20B9'}{parseFloat(plan.price).toLocaleString('en-IN')}
                      <Typography component="span" variant="body2" sx={{ color: '#6b7280', ml: 1 }}>
                        / {plan.billing_cycle}
                      </Typography>
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                        {'\uD83D\uDC65'} {plan.max_users} users
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                        {'\uD83D\uDCC4'} {plan.max_invoices_per_month} invoices/month
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                        {'\uD83D\uDCBE'} {plan.max_storage_gb} GB storage
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={onClosePlanChangeDialog}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onPlanChangeSubmit}
            disabled={!selectedPlan}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Update Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Organization Details Dialog */}
      <Dialog
        open={orgDetailsDialog}
        onClose={onCloseOrgDetailsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          fontWeight: 'bold',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusinessIcon />
            Organization Details
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {orgDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : orgDetails ? (
            <Box>
              {/* Header Section */}
              <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827', mb: 1 }}>
                      {orgDetails.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={orgDetails.plan?.toUpperCase() || 'FREE'}
                        size="small"
                        sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                      />
                      <Chip
                        label={orgDetails.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: orgDetails.is_active ? '#d1fae5' : '#fee2e2',
                          color: orgDetails.is_active ? '#065f46' : '#991b1b',
                          fontWeight: 'bold'
                        }}
                      />
                      <Chip
                        label={orgDetails.business_type_display || 'Service Provider'}
                        size="small"
                        sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Owner Section */}
              {orgDetails.owner && (
                <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountCircleIcon fontSize="small" /> Owner Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Name</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{orgDetails.owner.full_name}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Email</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{orgDetails.owner.email}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Joined</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.owner.date_joined ? new Date(orgDetails.owner.date_joined).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Last Login</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.owner.last_login ? new Date(orgDetails.owner.last_login).toLocaleString('en-IN') : 'Never'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Subscription Section */}
              {orgDetails.subscription_info && (
                <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon fontSize="small" /> Subscription Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Plan</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{orgDetails.subscription_info.plan_name || 'N/A'}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Status</Typography>
                        <Chip
                          label={orgDetails.subscription_info.status?.toUpperCase() || 'N/A'}
                          size="small"
                          sx={{
                            bgcolor: orgDetails.subscription_info.status === 'active' ? '#d1fae5' :
                                    orgDetails.subscription_info.status === 'trial' ? '#fef3c7' : '#fee2e2',
                            color: orgDetails.subscription_info.status === 'active' ? '#065f46' :
                                   orgDetails.subscription_info.status === 'trial' ? '#92400e' : '#991b1b',
                            fontWeight: 'bold'
                          }}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Amount Paid</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.amount_paid ? `\u20B9${parseFloat(orgDetails.subscription_info.amount_paid).toLocaleString('en-IN')}` : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Start Date</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.start_date ? new Date(orgDetails.subscription_info.start_date).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>End Date</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.end_date ? new Date(orgDetails.subscription_info.end_date).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Auto Renew</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.subscription_info.auto_renew ? 'Yes' : 'No'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Statistics Section */}
              {orgDetails.stats && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon fontSize="small" /> Organization Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1d4ed8' }}>{orgDetails.stats.total_clients}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Clients</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#16a34a' }}>{orgDetails.stats.total_invoices}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Invoices</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#faf5ff', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#7c3aed' }}>
                          {'\u20B9'}{parseFloat(orgDetails.stats.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Total Revenue</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d97706' }}>{orgDetails.stats.pending_invoices}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Pending Invoices</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#d1fae5', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#059669' }}>{orgDetails.stats.paid_invoices}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>Paid Invoices</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Acquisition Info Section */}
              {orgDetails.acquisition_info && (
                <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SalesIcon fontSize="small" /> Acquisition Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Source</Typography>
                        <Chip
                          label={orgDetails.acquisition_info.source_display}
                          size="small"
                          sx={{
                            bgcolor: orgDetails.acquisition_info.source === 'sales' ? '#ddd6fe' :
                                    orgDetails.acquisition_info.source === 'organic' ? '#d1fae5' :
                                    orgDetails.acquisition_info.source === 'advertisement' ? '#fef3c7' :
                                    orgDetails.acquisition_info.source === 'referral' ? '#e0e7ff' :
                                    '#f3f4f6',
                            color: orgDetails.acquisition_info.source === 'sales' ? '#5b21b6' :
                                   orgDetails.acquisition_info.source === 'organic' ? '#065f46' :
                                   orgDetails.acquisition_info.source === 'advertisement' ? '#92400e' :
                                   orgDetails.acquisition_info.source === 'referral' ? '#3730a3' :
                                   '#374151',
                            fontWeight: 'bold'
                          }}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Acquisition Date</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                          {orgDetails.acquisition_info.date ? new Date(orgDetails.acquisition_info.date).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    {orgDetails.acquisition_info.sales_person && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#ddd6fe', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Sales Person</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#5b21b6' }}>
                            {orgDetails.acquisition_info.sales_person.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7c3aed' }}>
                            {orgDetails.acquisition_info.sales_person.email}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.referred_by && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Referred By</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#3730a3' }}>
                            {orgDetails.acquisition_info.referred_by.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.coupon && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Coupon Used</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#92400e' }}>
                            {orgDetails.acquisition_info.coupon.code}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#b45309' }}>
                            {orgDetails.acquisition_info.coupon.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.campaign && (
                      <Grid item xs={12} sm={4}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Campaign</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#92400e' }}>
                            {orgDetails.acquisition_info.campaign}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {orgDetails.acquisition_info.notes && (
                      <Grid item xs={12}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Notes</Typography>
                          <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                            {orgDetails.acquisition_info.notes}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Organization Info Section */}
              <Box sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#374151', mb: 2 }}>
                  Additional Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Organization ID</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827', fontSize: '0.875rem', wordBreak: 'break-all' }}>{orgDetails.id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Members</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827' }}>{orgDetails.member_count} member(s)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Created</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                      {new Date(orgDetails.created_at).toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>Last Updated</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                      {new Date(orgDetails.updated_at).toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Typography sx={{ color: '#6b7280' }}>No details available</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={onCloseOrgDetailsDialog}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Organization Members Dialog */}
      <Dialog
        open={orgMembersDialog}
        onClose={onCloseOrgMembersDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Organization Members - {selectedOrg?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {orgMembers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#6b7280' }}>No members found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orgMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user?.username || 'N/A'}</TableCell>
                      <TableCell>{member.user?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={member.role.toUpperCase()} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: member.is_active ? '#d1fae5' : '#fee2e2',
                            color: member.is_active ? '#065f46' : '#991b1b'
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
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={onCloseOrgMembersDialog} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog
        open={userProfileDialog}
        onClose={onCloseUserProfileDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          User Profile
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedUser && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#8b5cf6', width: 56, height: 56, fontSize: '1.5rem' }}>
                      {selectedUser.username?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        {selectedUser.username}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>{selectedUser.email}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>User ID</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>{selectedUser.id}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Role</Typography>
                    <Chip
                      label={selectedUser.is_superuser ? 'SUPERADMIN' : selectedUser.role?.toUpperCase() || 'USER'}
                      size="small"
                      sx={{ bgcolor: '#ddd6fe', color: '#5b21b6', fontWeight: 'bold' }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Status</Typography>
                    <Chip
                      label={selectedUser.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: selectedUser.is_active ? '#d1fae5' : '#fee2e2',
                        color: selectedUser.is_active ? '#065f46' : '#991b1b',
                        fontWeight: 'bold'
                      }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Organizations</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                      {selectedUser.organization_count || 0} organizations
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>Date Joined</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#111827' }}>
                      {new Date(selectedUser.date_joined).toLocaleString('en-IN')}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={onCloseUserProfileDialog} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Organizations Dialog */}
      <Dialog
        open={userOrgsDialog}
        onClose={onCloseUserOrgsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          User Organizations - {selectedUser?.username}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {userOrganizations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#6b7280' }}>User is not a member of any organizations</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Organization</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userOrganizations.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>{membership.organization?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={membership.role.toUpperCase()} size="small" sx={{ bgcolor: '#f3f4f6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={membership.organization?.plan?.toUpperCase() || 'N/A'} size="small" sx={{ bgcolor: '#ddd6fe', color: '#5b21b6' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={membership.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: membership.is_active ? '#d1fae5' : '#fee2e2',
                            color: membership.is_active ? '#065f46' : '#991b1b'
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
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={onCloseUserOrgsDialog} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Organization Confirmation Dialog */}
      <Dialog
        open={deleteOrgDialog.open}
        onClose={() => !deleteOrgDialog.loading && onCloseDeleteOrgDialog()}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#dc2626' }}>
          Delete Organization
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to permanently delete the organization <strong>"{deleteOrgDialog.org?.name}"</strong>?
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
            This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ color: '#6b7280', fontSize: '0.875rem', mt: 1 }}>
            <li>All invoices and receipts</li>
            <li>All clients and their data</li>
            <li>All user memberships</li>
            <li>All settings and configurations</li>
            <li>Subscription information</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
          <Button
            onClick={onCloseDeleteOrgDialog}
            variant="outlined"
            disabled={deleteOrgDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={onDeleteOrganization}
            variant="contained"
            color="error"
            disabled={deleteOrgDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            {deleteOrgDialog.loading ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteUserDialog.open}
        onClose={() => !deleteUserDialog.loading && onCloseDeleteUserDialog()}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#dc2626' }}>
          Delete User
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to permanently delete the user <strong>"{deleteUserDialog.user?.email}"</strong>?
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
            This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ color: '#6b7280', fontSize: '0.875rem', mt: 1 }}>
            <li>User account and profile</li>
            <li>All organization memberships</li>
            <li>All user activity and logs</li>
            <li>Staff profile (if applicable)</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
          <Button
            onClick={onCloseDeleteUserDialog}
            variant="outlined"
            disabled={deleteUserDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={onDeleteUser}
            variant="contained"
            color="error"
            disabled={deleteUserDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            {deleteUserDialog.loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Acquisition Dialog */}
      <Dialog
        open={acquisitionDialog.open}
        onClose={() => !acquisitionDialog.loading && onCloseAcquisitionDialog()}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', bgcolor: '#fef3c7', color: '#92400e' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SalesIcon />
            Edit Acquisition - {acquisitionDialog.org?.name}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Acquisition Source</InputLabel>
                <Select
                  value={acquisitionForm.acquisition_source}
                  label="Acquisition Source"
                  onChange={(e) => onAcquisitionFormChange({ ...acquisitionForm, acquisition_source: e.target.value })}
                >
                  <MenuItem value="organic">Direct/Organic</MenuItem>
                  <MenuItem value="sales">Sales Team</MenuItem>
                  <MenuItem value="advertisement">Advertisement</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                  <MenuItem value="coupon">Coupon Campaign</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {acquisitionForm.acquisition_source === 'sales' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sales Person</InputLabel>
                  <Select
                    value={acquisitionForm.acquired_by}
                    label="Sales Person"
                    onChange={(e) => onAcquisitionFormChange({ ...acquisitionForm, acquired_by: e.target.value })}
                  >
                    <MenuItem value="">-- Select Sales Person --</MenuItem>
                    {salesStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.user}>
                        {staff.user_name} ({staff.user_email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {acquisitionForm.acquisition_source === 'referral' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Referred By Organization</InputLabel>
                  <Select
                    value={acquisitionForm.referred_by}
                    label="Referred By Organization"
                    onChange={(e) => onAcquisitionFormChange({ ...acquisitionForm, referred_by: e.target.value })}
                  >
                    <MenuItem value="">-- Select Organization --</MenuItem>
                    {organizations.filter(org => org.id !== acquisitionDialog.org?.id).map((org) => (
                      <MenuItem key={org.id} value={org.id}>
                        {org.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {['coupon', 'advertisement'].includes(acquisitionForm.acquisition_source) && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Coupon/Campaign Code</InputLabel>
                  <Select
                    value={acquisitionForm.acquisition_coupon}
                    label="Coupon/Campaign Code"
                    onChange={(e) => onAcquisitionFormChange({ ...acquisitionForm, acquisition_coupon: e.target.value })}
                  >
                    <MenuItem value="">-- Select Coupon --</MenuItem>
                    {coupons.map((coupon) => (
                      <MenuItem key={coupon.id} value={coupon.id}>
                        {coupon.code} - {coupon.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {acquisitionForm.acquisition_source === 'advertisement' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Campaign Name"
                  value={acquisitionForm.acquisition_campaign}
                  onChange={(e) => onAcquisitionFormChange({ ...acquisitionForm, acquisition_campaign: e.target.value })}
                  placeholder="e.g., Google Ads Jan 2026"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={acquisitionForm.acquisition_notes}
                onChange={(e) => onAcquisitionFormChange({ ...acquisitionForm, acquisition_notes: e.target.value })}
                placeholder="Additional details about how this tenant was acquired..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
          <Button
            onClick={onCloseAcquisitionDialog}
            variant="outlined"
            disabled={acquisitionDialog.loading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={onSaveAcquisition}
            variant="contained"
            disabled={acquisitionDialog.loading}
            sx={{ textTransform: 'none', bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            {acquisitionDialog.loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog
        open={showTestEmailDialog}
        onClose={onCloseTestEmailDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb' }}>
          Send Test Email
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Enter the recipient email address to send a test email and verify your SMTP configuration.
          </Typography>
          <TextField
            fullWidth
            label="Recipient Email"
            type="email"
            value={testEmailRecipient}
            onChange={(e) => onTestEmailRecipientChange(e.target.value)}
            placeholder="test@example.com"
            helperText="The email address where the test email will be sent"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e5e7eb' }}>
          <Button
            onClick={onCloseTestEmailDialog}
            sx={{ textTransform: 'none', color: '#6b7280' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSendTestEmail}
            disabled={sendingTestEmail || !testEmailRecipient}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            {sendingTestEmail ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Upgrade Request Dialog */}
      <Dialog open={approveDialog.open} onClose={onCloseApproveDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Approve Upgrade Request</DialogTitle>
        <DialogContent>
          {approveDialog.request && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Organization:</strong> {approveDialog.request.organization_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Requested Plan:</strong> {approveDialog.request.requested_plan_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Amount:</strong> {'\u20B9'}{parseFloat(approveDialog.request.amount).toFixed(2)}
              </Typography>
              {approveDialog.request.coupon_code && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Coupon Applied:</strong> {approveDialog.request.coupon_code}
                </Typography>
              )}
              <TextField
                fullWidth
                label="Payment Reference/Transaction ID"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Enter payment transaction ID for verification"
              />
              <TextField
                fullWidth
                label="Admin Notes"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => onAdminNotesChange(e.target.value)}
                placeholder="Add any notes about this approval..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onCloseApproveDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={onApproveRequest}
          >
            Confirm Approval
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Upgrade Request Dialog */}
      <Dialog open={rejectDialog.open} onClose={onCloseRejectDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#dc2626' }}>Reject Upgrade Request</DialogTitle>
        <DialogContent>
          {rejectDialog.request && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Organization:</strong> {rejectDialog.request.organization_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Requested Plan:</strong> {rejectDialog.request.requested_plan_name}
              </Typography>
              <TextField
                fullWidth
                label="Reason for Rejection"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => onAdminNotesChange(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onCloseRejectDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={onRejectRequest}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SuperAdminDialogs;
