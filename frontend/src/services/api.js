import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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
  delete: (id) => api.delete(`/users/${id}/`),
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

// Tally Sync APIs
export const tallySyncAPI = {
  checkConnection: (data) => api.post('/tally-sync/check-connection/', data || {}),
  getTallyLedgers: () => api.get('/tally-sync/tally-ledgers/'),
  getMappings: () => api.get('/tally-sync/mappings/'),
  saveMappings: (data) => api.post('/tally-sync/mappings/', data),
  syncInvoices: (startDate, endDate, forceResync = false) => api.post('/tally-sync/sync-invoices/', {
    start_date: startDate,
    end_date: endDate,
    force_resync: forceResync
  }),
  getSyncHistory: () => api.get('/tally-sync/sync-history/'),
};


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

export default api;
