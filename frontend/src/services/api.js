import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token, session token, and organization context to requests
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add session token for single device login validation
    const sessionToken = sessionStorage.getItem('session_token');
    if (sessionToken) {
      config.headers['X-Session-Token'] = sessionToken;
    }

    // Add organization context header
    const orgId = localStorage.getItem('current_org_id');
    if (orgId) {
      config.headers['X-Organization-ID'] = orgId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401 errors and session invalidation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip interceptor logic for auth endpoints (login, register, OTP, etc.)
    // These endpoints should pass errors directly to the calling code
    // Note: Don't include /token/refresh/ as that's handled separately
    const authEndpoints = ['token/', 'register/', 'send-otp/', 'verify-otp/', 'resend-otp/'];
    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint = authEndpoints.some(endpoint =>
      requestUrl.endsWith(endpoint) || requestUrl.includes(endpoint + '?')
    ) && !requestUrl.includes('token/refresh');

    if (isAuthEndpoint) {
      // Don't intercept auth endpoint errors - let them bubble up to the calling code
      return Promise.reject(error);
    }

    // Check for session invalidation (logged in from another device)
    if (error.response?.status === 401 && error.response?.data?.error === 'session_invalid') {
      // Clear all auth data
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('session_token');
      localStorage.removeItem('current_org_id');

      // Store the logout reason to show message on login page
      localStorage.setItem('logout_reason', 'session_invalid');

      // Redirect to login page
      window.location.href = '/';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = sessionStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        sessionStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, logout user
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('session_token');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  refresh: (refresh) => api.post('/token/refresh/', { refresh }),
  register: (data) => api.post('/register/', data),
  logout: () => api.post('/logout/'),
  // OTP verification for registration
  sendOTP: (email) => api.post('/send-otp/', { email }),
  verifyOTP: (email, otp) => api.post('/verify-otp/', { email, otp }),
  resendOTP: (email) => api.post('/resend-otp/', { email }),
  // Forgot Password
  forgotPasswordSendOTP: (email) => api.post('/forgot-password/send-otp/', { email }),
  forgotPasswordVerifyOTP: (email, otp) => api.post('/forgot-password/verify-otp/', { email, otp }),
  forgotPasswordReset: (email, otp, new_password, confirm_password) =>
    api.post('/forgot-password/reset/', { email, otp, new_password, confirm_password }),
};

// Organization APIs
export const organizationAPI = {
  getAll: () => api.get('/organizations/'),
  getById: (id) => api.get(`/organizations/${id}/`),
  getDetails: (id) => api.get(`/organizations/${id}/details/`),
  create: (data) => api.post('/organizations/', data),
  update: (id, data) => api.put(`/organizations/${id}/`, data),
  patch: (id, data) => api.patch(`/organizations/${id}/`, data),
  delete: (id, confirm = false) => api.delete(`/organizations/${id}/${confirm ? "?confirm=true" : ""}`),
  switch: (id) => api.post(`/organizations/${id}/switch/`),
  getLimits: () => api.get('/organizations/limits/'),
  getMembers: (id) => api.get(`/organizations/${id}/members/`),
  inviteMember: (id, data) => api.post(`/organizations/${id}/invite/`, data),
  updateMember: (orgId, userId, data) => api.put(`/organizations/${orgId}/members/${userId}/`, data),
  removeMember: (orgId, userId) => api.delete(`/organizations/${orgId}/members/${userId}/`),
  updateAcquisition: (id, data) => api.patch(`/organizations/${id}/`, data),
};

// Settings APIs
export const settingsAPI = {
  getCompanySettings: () => api.get('/settings/company/'),
  updateCompanySettings: (data) => api.put('/settings/company/', data),
  getInvoiceSettings: () => api.get('/settings/invoice/'),
  updateInvoiceSettings: (data) => api.put('/settings/invoice/', data),
  getEmailSettings: () => api.get('/settings/email/'),
  updateEmailSettings: (data) => api.put('/settings/email/', data),
  testEmail: () => api.post('/settings/email/test/'),
  getInvoiceFormatSettings: () => api.get('/settings/invoice-format/'),
  updateInvoiceFormatSettings: (data) => api.put('/settings/invoice-format/', data),
  exportData: (format, type) => api.get('/export/', {
    params: { format, type },
    responseType: 'blob'
  }),
};

// Invoice APIs
export const invoiceAPI = {
  getAll: (params) => api.get('/invoices/', { params }),
  getById: (id) => api.get(`/invoices/${id}/`),
  create: (data) => api.post('/invoices/', data),
  update: (id, data) => api.put(`/invoices/${id}/`, data),
  delete: (id) => api.delete(`/invoices/${id}/`),
  generatePDF: (id) => api.get(`/invoices/${id}/pdf/`, { responseType: 'blob' }),
  sendEmail: (id) => api.post(`/invoices/${id}/send_email/`),
  bulkSendEmail: (ids) => api.post('/invoices/bulk_send_email/', { invoice_ids: ids }),
  convertToTaxInvoice: (id) => api.post(`/invoices/${id}/convert_to_tax_invoice/`),
  importInvoices: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/invoices/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  downloadImportTemplate: () => api.get('/invoices/import-template/', { responseType: 'blob' }),
};

// Client APIs
export const clientAPI = {
  getAll: (params) => api.get('/clients/', { params }),
  getById: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.put(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/clients/bulk_upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Service Item APIs
export const serviceItemAPI = {
  getAll: (params) => api.get('/service-items/', { params }),
  getById: (id) => api.get(`/service-items/${id}/`),
  create: (data) => api.post('/service-items/', data),
  update: (id, data) => api.put(`/service-items/${id}/`, data),
  delete: (id) => api.delete(`/service-items/${id}/`),
};

// Payment Term APIs
export const paymentTermAPI = {
  getAll: (params) => api.get('/payment-terms/', { params }),
  getById: (id) => api.get(`/payment-terms/${id}/`),
  create: (data) => api.post('/payment-terms/', data),
  update: (id, data) => api.put(`/payment-terms/${id}/`, data),
  delete: (id) => api.delete(`/payment-terms/${id}/`),
};

// Payment APIs
export const paymentAPI = {
  getAll: (params) => api.get('/payments/', { params }),
  getById: (id) => api.get(`/payments/${id}/`),
  create: (data) => api.post('/payments/', data),
  update: (id, data) => api.put(`/payments/${id}/`, data),
  delete: (id) => api.delete(`/payments/${id}/`),
};

// Receipt APIs
export const receiptAPI = {
  getAll: (params) => api.get('/receipts/', { params }),
  getById: (id) => api.get(`/receipts/${id}/`),
  download: (id) => api.get(`/receipts/${id}/download/`, { responseType: 'blob' }),
  resendEmail: (id) => api.post(`/receipts/${id}/resend_email/`),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

// Reports APIs
export const reportsAPI = {
  sendEmail: (data) => api.post('/reports/send-email/', data),
};

// User Profile APIs
export const profileAPI = {
  getProfile: () => api.get('/profile/'),
  updateProfile: (data) => api.put('/profile/', data),
  changePassword: (data) => api.post('/profile/change-password/', data),
  // DPDP Act compliance - Right to Erasure and Data Portability
  deleteAccount: (data) => api.post('/profile/delete-account/', data),
  exportPersonalData: () => api.get('/profile/export-data/', { responseType: 'blob' }),
};

// User Management APIs
export const userAPI = {
  getAll: (params) => api.get('/users/', { params }),
  getById: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  patch: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  getOrganizations: (id) => api.get(`/users/${id}/organizations/`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password/`),
};

// SuperAdmin APIs
export const superadminAPI = {
  getStats: () => api.get('/superadmin/stats/'),
  getEmailConfig: () => api.get('/superadmin/email-config/'),
  updateEmailConfig: (data) => api.post('/superadmin/email-config/', data),
  testEmail: (data) => api.post('/superadmin/email-config/test/', data),
  // Notifications
  getNotifications: (params) => api.get('/superadmin/notifications/', { params }),
  getUnreadCount: () => api.get('/superadmin/notifications/unread-count/'),
  markAsRead: (id) => api.post(`/superadmin/notifications/${id}/mark-read/`),
  markAllAsRead: () => api.post('/superadmin/notifications/mark-all-read/'),
  deleteNotification: (id) => api.delete(`/superadmin/notifications/${id}/delete/`),
};


// Staff Management API (Support & Sales Team)
export const staffAPI = {
  getAll: (staffType = null) => api.get('/staff-profiles/', { params: { staff_type: staffType } }),
  getById: (id) => api.get(`/staff-profiles/${id}/`),
  create: (data) => api.post('/staff-profiles/', data),
  update: (id, data) => api.put(`/staff-profiles/${id}/`, data),
  delete: (id) => api.delete(`/staff-profiles/${id}/`),
  getStats: () => api.get('/staff-profiles/stats/'),
  getSalesPerformance: () => api.get('/staff-profiles/sales_performance/'),
  getMyPerformance: () => api.get('/staff-profiles/my_performance/'),
};

// Subscription APIs
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription-plans/'),
  getCurrentSubscription: () => api.get('/subscriptions/'),
  getMySubscription: () => api.get('/subscriptions/my_subscription/'),
  validateCoupon: (code, planId) => api.post('/coupons/validate/', { code, plan_id: planId }),
  createUpgradeRequest: (data) => api.post('/subscription-upgrade-requests/', data),
  getUpgradeRequests: (params) => api.get('/subscription-upgrade-requests/', { params }),
  approveUpgradeRequest: (id, data) => api.post(`/subscription-upgrade-requests/${id}/approve/`, data),
  rejectUpgradeRequest: (id, data) => api.post(`/subscription-upgrade-requests/${id}/reject/`, data),
};

// Tally Sync APIs - NOTE: These are now used by Setu desktop app only
// The web frontend uses SetuDownload component which just shows download instructions
// Backend endpoints are still needed for Setu desktop connector


// Setu Desktop Connector APIs (for remote Tally via desktop connector)
export const setuAPI = {
  // Check if Setu connector is online
  checkConnector: () => api.get('/setu/status/'),
  // Request Tally connection check via Setu
  checkTallyConnection: () => api.post('/setu/check-tally/'),
  // Request ledgers from Tally via Setu
  getLedgers: () => api.post('/setu/get-ledgers/'),
  // Sync invoices via Setu connector
  syncInvoices: (startDate, endDate, forceResync = false, invoiceIds = []) => api.post('/setu/sync-invoices/', {
    start_date: startDate,
    end_date: endDate,
    force_resync: forceResync,
    invoice_ids: invoiceIds
  }),
  // Get sync operation status
  getSyncStatus: (syncId) => api.get(`/setu/sync-status/${syncId}/`),
  // Feature 1: Company Info Import
  getCompanyInfo: () => api.get('/tally-sync/company-info/'),
  importCompanyInfo: (data) => api.post('/tally-sync/import-company-info/', data),
  // Feature 2: Opening Balances Import
  getLedgersWithBalances: () => api.get('/tally-sync/ledgers-with-balances/'),
  previewOpeningBalances: (ledgers) => api.post('/tally-sync/preview-opening-balances/', { ledgers }),
  importOpeningBalances: (balances) => api.post('/tally-sync/import-opening-balances/', { balances }),
  // Feature 3: All Vouchers Import
  getAllVouchers: (startDate, endDate) => api.get('/tally-sync/all-vouchers/', { params: { start_date: startDate, end_date: endDate } }),
  previewImportVouchers: (vouchers, voucherTypes) => api.post('/tally-sync/preview-import-vouchers/', { vouchers, voucher_types: voucherTypes }),
  importVouchers: (vouchers, autoCreateLedgers) => api.post('/tally-sync/import-vouchers/', { vouchers, auto_create_ledgers: autoCreateLedgers }),
  // Feature 4: Real-Time Sync
  getRealtimeSyncConfig: () => api.get('/tally-sync/realtime-config/'),
  updateRealtimeSyncConfig: (data) => api.post('/tally-sync/realtime-config/', data),
  getRealtimeSyncStatus: () => api.get('/tally-sync/realtime-status/'),
  getRealtimeSyncLog: (page, pageSize) => api.get('/tally-sync/realtime-log/', { params: { page, page_size: pageSize } }),
  getPendingChanges: () => api.get('/tally-sync/pending-changes/'),
  markChangesSynced: (changeIds) => api.post('/tally-sync/mark-changes-synced/', { change_ids: changeIds }),
};

// Scheduled Invoice APIs
export const scheduledInvoiceAPI = {
  getAll: (params) => api.get('/scheduled-invoices/', { params }),
  getById: (id) => api.get(`/scheduled-invoices/${id}/`),
  create: (data) => api.post('/scheduled-invoices/', data),
  update: (id, data) => api.put(`/scheduled-invoices/${id}/`, data),
  delete: (id) => api.delete(`/scheduled-invoices/${id}/`),
  pause: (id) => api.post(`/scheduled-invoices/${id}/pause/`),
  resume: (id) => api.post(`/scheduled-invoices/${id}/resume/`),
  cancel: (id) => api.post(`/scheduled-invoices/${id}/cancel/`),
  getLogs: (id) => api.get(`/scheduled-invoices/${id}/logs/`),
  generateNow: (id) => api.post(`/scheduled-invoices/${id}/generate_now/`),
  getStats: () => api.get('/scheduled-invoices/stats/'),
};

// ==================== GOODS TRADER APIs ====================

// Unit of Measurement APIs
export const unitAPI = {
  getAll: (params) => api.get('/units/', { params }),
  getPredefined: () => api.get('/units/predefined/'),
  getById: (id) => api.get(`/units/${id}/`),
  create: (data) => api.post('/units/', data),
  update: (id, data) => api.put(`/units/${id}/`, data),
  delete: (id) => api.delete(`/units/${id}/`),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products/', { params }),
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
  adjustStock: (id, data) => api.post(`/products/${id}/adjust_stock/`, data),
  getLowStock: () => api.get('/products/low_stock/'),
};

// Supplier APIs
export const supplierAPI = {
  getAll: (params) => api.get('/suppliers/', { params }),
  getById: (id) => api.get(`/suppliers/${id}/`),
  create: (data) => api.post('/suppliers/', data),
  update: (id, data) => api.put(`/suppliers/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/${id}/`),
  getStatement: (id, params) => api.get(`/suppliers/${id}/statement/`, { params }),
};

// Purchase APIs
export const purchaseAPI = {
  getAll: (params) => api.get('/purchases/', { params }),
  getById: (id) => api.get(`/purchases/${id}/`),
  create: (data) => api.post('/purchases/', data),
  update: (id, data) => api.put(`/purchases/${id}/`, data),
  delete: (id) => api.delete(`/purchases/${id}/`),
  markReceived: (id) => api.post(`/purchases/${id}/mark_received/`),
  generatePDF: (id) => api.get(`/purchases/${id}/pdf/`, { responseType: 'blob' }),
};

// Inventory Movement APIs
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory-movements/', { params }),
  getById: (id) => api.get(`/inventory-movements/${id}/`),
  create: (data) => api.post('/inventory-movements/', data),
  getByProduct: (productId) => api.get('/inventory-movements/', { params: { product: productId } }),
};

// Supplier Payment APIs
export const supplierPaymentAPI = {
  getAll: (params) => api.get('/supplier-payments/', { params }),
  getById: (id) => api.get(`/supplier-payments/${id}/`),
  create: (data) => api.post('/supplier-payments/', data),
  update: (id, data) => api.put(`/supplier-payments/${id}/`, data),
  delete: (id) => api.delete(`/supplier-payments/${id}/`),
};

// Expense/Outgoing Payment APIs (payments made by business - cash, bank, etc.)
export const expensePaymentAPI = {
  getAll: (params) => api.get('/expense-payments/', { params }),
  getById: (id) => api.get(`/expense-payments/${id}/`),
  create: (data) => api.post('/expense-payments/', data),
  update: (id, data) => api.put(`/expense-payments/${id}/`, data),
  delete: (id) => api.delete(`/expense-payments/${id}/`),
};

// =============================================================================
// ACCOUNTING MODULE APIs
// =============================================================================

// Financial Year APIs
export const financialYearAPI = {
  getAll: (params) => api.get('/financial-years/', { params }),
  getById: (id) => api.get(`/financial-years/${id}/`),
  create: (data) => api.post('/financial-years/', data),
  update: (id, data) => api.put(`/financial-years/${id}/`, data),
  delete: (id) => api.delete(`/financial-years/${id}/`),
  getCurrent: () => api.get('/financial-years/current/'),
  createIndianFY: (year) => api.post('/financial-years/create_indian_fy/', { year }),
};

// Account Group APIs (Chart of Accounts hierarchy)
export const accountGroupAPI = {
  getAll: (params) => api.get('/account-groups/', { params }),
  getById: (id) => api.get(`/account-groups/${id}/`),
  create: (data) => api.post('/account-groups/', data),
  update: (id, data) => api.put(`/account-groups/${id}/`, data),
  delete: (id) => api.delete(`/account-groups/${id}/`),
  getTree: () => api.get('/account-groups/tree/'),
};

// Ledger Account APIs (Chart of Accounts)
export const ledgerAccountAPI = {
  getAll: (params) => api.get('/ledger-accounts/', { params }),
  getById: (id) => api.get(`/ledger-accounts/${id}/`),
  create: (data) => api.post('/ledger-accounts/', data),
  update: (id, data) => api.put(`/ledger-accounts/${id}/`, data),
  patch: (id, data) => api.patch(`/ledger-accounts/${id}/`, data),
  delete: (id) => api.delete(`/ledger-accounts/${id}/`),
  getByGroup: () => api.get('/ledger-accounts/by_group/'),
  getStatement: (id, params) => api.get(`/ledger-accounts/${id}/statement/`, { params }),
  getCashOrBank: () => api.get('/ledger-accounts/', { params: { cash_or_bank: true, minimal: true } }),
  getParties: (type) => api.get('/ledger-accounts/', { params: { party_type: type, minimal: true } }),
  recalculateBalances: () => api.post('/accounting/recalculate-balances/'),
};

// Voucher APIs (all transaction types)
export const voucherAPI = {
  getAll: (params) => api.get('/vouchers/', { params }),
  getById: (id) => api.get(`/vouchers/${id}/`),
  create: (data) => api.post('/vouchers/', data),
  update: (id, data) => api.put(`/vouchers/${id}/`, data),
  delete: (id) => api.delete(`/vouchers/${id}/`),
  post: (id) => api.post(`/vouchers/${id}/post_voucher/`),
  cancel: (id) => api.post(`/vouchers/${id}/cancel_voucher/`),
  getDayBook: (date) => api.get('/vouchers/day_book/', { params: { date } }),
};

// Bank Reconciliation APIs
export const bankReconciliationAPI = {
  getAll: (params) => api.get('/bank-reconciliations/', { params }),
  getById: (id) => api.get(`/bank-reconciliations/${id}/`),
  create: (data) => api.post('/bank-reconciliations/', data),
  update: (id, data) => api.put(`/bank-reconciliations/${id}/`, data),
  delete: (id) => api.delete(`/bank-reconciliations/${id}/`),
  getUnreconciledEntries: (bank_account) => api.get('/bank-reconciliations/unreconciled_entries/', { params: { bank_account } }),
  reconcileItem: (id, item_id, is_reconciled) => api.post(`/bank-reconciliations/${id}/reconcile_item/`, { item_id, is_reconciled }),
};

// Coupon Management APIs
export const couponAPI = {
  getAll: (params) => api.get('/coupons/', { params }),
  getById: (id) => api.get(`/coupons/${id}/`),
  create: (data) => api.post('/coupons/', data),
  update: (id, data) => api.put(`/coupons/${id}/`, data),
  delete: (id) => api.delete(`/coupons/${id}/`),
  validate: (code) => api.post(`/coupons/${code}/validate/`),
};

// Bulk Email APIs (SuperAdmin)
export const bulkEmailAPI = {
  getTemplates: () => api.get('/superadmin/bulk-email/templates/'),
  createTemplate: (data) => api.post('/superadmin/bulk-email/templates/', data),
  updateTemplate: (id, data) => api.put(`/superadmin/bulk-email/templates/${id}/`, data),
  deleteTemplate: (id) => api.delete(`/superadmin/bulk-email/templates/${id}/`),
  getCampaigns: () => api.get('/superadmin/bulk-email/campaigns/'),
  createCampaign: (data) => api.post('/superadmin/bulk-email/campaigns/', data),
  sendCampaign: (id) => api.post(`/superadmin/bulk-email/campaigns/${id}/send/`),
  previewCampaign: (id) => api.get(`/superadmin/bulk-email/campaigns/${id}/preview/`),
  previewRecipients: (params) => api.get('/superadmin/bulk-email/preview-recipients/', { params }),
};

// Payment Reminder APIs
export const paymentReminderAPI = {
  getInvoices: (params) => api.get('/invoices/', { params }),
  getPurchaseBills: (params) => api.get('/purchases/', { params }),
  getScheduled: () => api.get('/payment-reminders/scheduled/'),
  getHistory: () => api.get('/payment-reminders/history/'),
  send: (data) => api.post('/payment-reminders/send/', data),
  delete: (id) => api.delete(`/payment-reminders/${id}/`),
  updateSettings: (data) => api.post('/payment-reminders/settings/', data),
};

// Review APIs
export const reviewAPI = {
  getPublic: () => api.get('/reviews/public/'),
  checkEligibility: () => api.get('/reviews/check-eligibility/'),
  dismissPrompt: () => api.post('/reviews/dismiss-prompt/'),
  submit: (data) => api.post('/reviews/submit/', data),
};

export default api;
