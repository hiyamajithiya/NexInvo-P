import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token and organization context to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Handle token refresh on 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
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
};

// Organization APIs
export const organizationAPI = {
  getAll: () => api.get('/organizations/'),
  getById: (id) => api.get(`/organizations/${id}/`),
  create: (data) => api.post('/organizations/', data),
  update: (id, data) => api.put(`/organizations/${id}/`, data),
  delete: (id) => api.delete(`/organizations/${id}/`),
  switch: (id) => api.post(`/organizations/${id}/switch/`),
  getMembers: (id) => api.get(`/organizations/${id}/members/`),
  inviteMember: (id, data) => api.post(`/organizations/${id}/invite/`, data),
  updateMember: (orgId, userId, data) => api.put(`/organizations/${orgId}/members/${userId}/`, data),
  removeMember: (orgId, userId) => api.delete(`/organizations/${orgId}/members/${userId}/`),
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

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

// User Profile APIs
export const profileAPI = {
  getProfile: () => api.get('/profile/'),
  updateProfile: (data) => api.put('/profile/', data),
  changePassword: (data) => api.post('/profile/change-password/', data),
};

// User Management APIs
export const userAPI = {
  getAll: (params) => api.get('/users/', { params }),
  getById: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
};

export default api;
