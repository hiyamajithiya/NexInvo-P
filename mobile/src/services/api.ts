import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  LoginRequest,
  LoginResponse,
  SendOtpRequest,
  VerifyOtpRequest,
  RegisterRequest,
  DashboardStats,
  Invoice,
  InvoiceListResponse,
  InvoiceRequest,
  Client,
  ClientListResponse,
  ClientRequest,
  Receipt,
  ReceiptListResponse,
  Payment,
  PaymentRequest,
  PaymentListResponse,
  ScheduledInvoice,
  ScheduledInvoiceListItem,
  ScheduledInvoiceListResponse,
  ScheduledInvoiceRequest,
  ServiceItem,
  ServiceItemRequest,
  ServiceItemListResponse,
  UserProfile,
  UserProfileUpdate,
  ChangePasswordRequest,
  CompanySettings,
  CompanySettingsUpdate,
  InvoiceSettings,
  InvoiceSettingsUpdate,
  PaymentTerm,
  PaymentTermRequest,
  PaymentTermListResponse,
} from '../types';

// Use your server URL - for local testing use your computer's IP
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.214:8000/api/' // Local development server
  : 'https://api.nexinvo.com/api/';

class ApiService {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private sessionToken: string | null = null;
  private organizationId: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Ensure tokens are loaded before making requests
        if (!this.accessToken) {
          await this.loadTokens();
        }

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        if (this.sessionToken) {
          config.headers['X-Session-Token'] = this.sessionToken;
        }
        if (this.organizationId) {
          config.headers['X-Organization-ID'] = this.organizationId;
        }

        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          hasAuth: !!this.accessToken,
          hasSession: !!this.sessionToken,
          orgId: this.organizationId,
        });

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed && error.config) {
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.api.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );

    // Load tokens on init
    this.loadTokens();
  }

  private async loadTokens() {
    try {
      this.accessToken = await SecureStore.getItemAsync('accessToken');
      this.sessionToken = await SecureStore.getItemAsync('sessionToken');
      this.organizationId = await SecureStore.getItemAsync('organizationId');
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  private async saveTokens(access: string, session: string, orgId: string) {
    try {
      await SecureStore.setItemAsync('accessToken', access);
      await SecureStore.setItemAsync('sessionToken', session);
      await SecureStore.setItemAsync('organizationId', orgId);
      this.accessToken = access;
      this.sessionToken = session;
      this.organizationId = orgId;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private async clearTokens() {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('sessionToken');
      await SecureStore.deleteItemAsync('organizationId');
      await SecureStore.deleteItemAsync('refreshToken');
      this.accessToken = null;
      this.sessionToken = null;
      this.organizationId = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return false;

      const response = await axios.post(`${API_BASE_URL}token/refresh/`, {
        refresh: refreshToken,
      });

      if (response.data.access) {
        this.accessToken = response.data.access;
        await SecureStore.setItemAsync('accessToken', response.data.access);
        return true;
      }
      return false;
    } catch (error) {
      await this.clearTokens();
      return false;
    }
  }

  // ==================== Auth ====================

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('token/', data);
    const { access, refresh, session_token, organization } = response.data;
    const orgId = organization?.id?.toString() || '';
    await this.saveTokens(access, session_token, orgId);
    await SecureStore.setItemAsync('refreshToken', refresh);
    return response.data;
  }

  async sendOtp(data: SendOtpRequest): Promise<any> {
    const response = await this.api.post('send-otp/', data);
    return response.data;
  }

  async verifyOtp(data: VerifyOtpRequest): Promise<any> {
    const response = await this.api.post('verify-otp/', data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<any> {
    const response = await this.api.post('register/', data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('logout/');
    } catch (error) {
      // Ignore logout errors
    }
    await this.clearTokens();
  }

  async isAuthenticated(): Promise<boolean> {
    await this.loadTokens();
    return !!this.accessToken;
  }

  // ==================== Dashboard ====================

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.api.get<DashboardStats>('dashboard/stats/');
    return response.data;
  }

  // ==================== Invoices ====================

  async getInvoices(params?: {
    page?: number;
    status?: string;
    invoice_type?: string;
    client?: number;
    search?: string;
  }): Promise<InvoiceListResponse> {
    const response = await this.api.get<InvoiceListResponse | Invoice[]>('invoices/', { params });
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async getInvoice(id: number): Promise<Invoice> {
    const response = await this.api.get<Invoice>(`invoices/${id}/`);
    return response.data;
  }

  async createInvoice(data: InvoiceRequest): Promise<Invoice> {
    const response = await this.api.post<Invoice>('invoices/', data);
    return response.data;
  }

  async updateInvoice(id: number, data: InvoiceRequest): Promise<Invoice> {
    const response = await this.api.put<Invoice>(`invoices/${id}/`, data);
    return response.data;
  }

  async deleteInvoice(id: number): Promise<void> {
    await this.api.delete(`invoices/${id}/`);
  }

  async sendInvoiceEmail(id: number): Promise<any> {
    const response = await this.api.post(`invoices/${id}/send_email/`);
    return response.data;
  }

  async getInvoicePDFUrl(id: number): Promise<string> {
    // Return the full URL with auth headers for download
    await this.loadTokens();
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${baseUrl}/invoices/${id}/pdf/`;
  }

  async getAuthHeaders(): Promise<{ Authorization?: string; 'X-Session-Token'?: string; 'X-Organization-ID'?: string }> {
    await this.loadTokens();
    const headers: { Authorization?: string; 'X-Session-Token'?: string; 'X-Organization-ID'?: string } = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    if (this.sessionToken) {
      headers['X-Session-Token'] = this.sessionToken;
    }
    if (this.organizationId) {
      headers['X-Organization-ID'] = this.organizationId;
    }
    return headers;
  }

  // ==================== Clients ====================

  async getClients(params?: { page?: number; search?: string }): Promise<ClientListResponse> {
    const response = await this.api.get<ClientListResponse | Client[]>('clients/', { params });
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async getClient(id: number): Promise<Client> {
    const response = await this.api.get<Client>(`clients/${id}/`);
    return response.data;
  }

  async createClient(data: ClientRequest): Promise<Client> {
    const response = await this.api.post<Client>('clients/', data);
    return response.data;
  }

  async updateClient(id: number, data: ClientRequest): Promise<Client> {
    const response = await this.api.put<Client>(`clients/${id}/`, data);
    return response.data;
  }

  async deleteClient(id: number): Promise<void> {
    await this.api.delete(`clients/${id}/`);
  }

  // ==================== Receipts ====================

  async getReceipts(params?: { page?: number; search?: string }): Promise<ReceiptListResponse> {
    const response = await this.api.get<ReceiptListResponse | Receipt[]>('receipts/', { params });
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async getReceipt(id: number): Promise<Receipt> {
    const response = await this.api.get<Receipt>(`receipts/${id}/`);
    return response.data;
  }

  async getReceiptPDFUrl(id: number): Promise<string> {
    // Return the full URL with auth headers for download
    await this.loadTokens();
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${baseUrl}/receipts/${id}/download/`;
  }

  // ==================== Payments ====================

  async getPayments(params?: { page?: number; search?: string }): Promise<PaymentListResponse> {
    const response = await this.api.get<PaymentListResponse | Payment[]>('payments/', { params });
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async createPayment(data: PaymentRequest): Promise<Payment> {
    const response = await this.api.post<Payment>('payments/', data);
    return response.data;
  }

  async getUnpaidInvoices(): Promise<InvoiceListResponse> {
    const response = await this.api.get<InvoiceListResponse | Invoice[]>('invoices/', {
      params: { unpaid_only: true }
    });
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  // ==================== Scheduled Invoices ====================

  async getScheduledInvoices(params?: {
    page?: number;
    status?: string;
    search?: string;
  }): Promise<ScheduledInvoiceListResponse> {
    const response = await this.api.get<ScheduledInvoiceListResponse | ScheduledInvoiceListItem[]>(
      'scheduled-invoices/',
      { params }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async getScheduledInvoice(id: number): Promise<ScheduledInvoice> {
    const response = await this.api.get<ScheduledInvoice>(`scheduled-invoices/${id}/`);
    return response.data;
  }

  async createScheduledInvoice(data: ScheduledInvoiceRequest): Promise<ScheduledInvoice> {
    const response = await this.api.post<ScheduledInvoice>('scheduled-invoices/', data);
    return response.data;
  }

  async updateScheduledInvoice(id: number, data: ScheduledInvoiceRequest): Promise<ScheduledInvoice> {
    const response = await this.api.put<ScheduledInvoice>(`scheduled-invoices/${id}/`, data);
    return response.data;
  }

  async deleteScheduledInvoice(id: number): Promise<void> {
    await this.api.delete(`scheduled-invoices/${id}/`);
  }

  async pauseScheduledInvoice(id: number): Promise<ScheduledInvoice> {
    const response = await this.api.post<ScheduledInvoice>(`scheduled-invoices/${id}/pause/`);
    return response.data;
  }

  async resumeScheduledInvoice(id: number): Promise<ScheduledInvoice> {
    const response = await this.api.post<ScheduledInvoice>(`scheduled-invoices/${id}/resume/`);
    return response.data;
  }

  async generateScheduledInvoice(id: number): Promise<any> {
    const response = await this.api.post(`scheduled-invoices/${id}/generate/`);
    return response.data;
  }

  // ==================== Service Master ====================

  async getServiceItems(params?: {
    page?: number;
    search?: string;
  }): Promise<ServiceItemListResponse> {
    const response = await this.api.get<ServiceItemListResponse | ServiceItem[]>(
      'service-items/',
      { params }
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async getServiceItem(id: number): Promise<ServiceItem> {
    const response = await this.api.get<ServiceItem>(`service-items/${id}/`);
    return response.data;
  }

  async createServiceItem(data: ServiceItemRequest): Promise<ServiceItem> {
    const response = await this.api.post<ServiceItem>('service-items/', data);
    return response.data;
  }

  async updateServiceItem(id: number, data: ServiceItemRequest): Promise<ServiceItem> {
    const response = await this.api.put<ServiceItem>(`service-items/${id}/`, data);
    return response.data;
  }

  async deleteServiceItem(id: number): Promise<void> {
    await this.api.delete(`service-items/${id}/`);
  }

  // ==================== User Profile ====================

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>('profile/');
    return response.data;
  }

  async updateUserProfile(data: UserProfileUpdate): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>('profile/', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('profile/change-password/', data);
    return response.data;
  }

  // ==================== Company Settings ====================

  async getCompanySettings(): Promise<CompanySettings> {
    const response = await this.api.get<CompanySettings>('settings/company/');
    return response.data;
  }

  async updateCompanySettings(data: CompanySettingsUpdate): Promise<CompanySettings> {
    const response = await this.api.put<CompanySettings>('settings/company/', data);
    return response.data;
  }

  // ==================== Invoice Settings ====================

  async getInvoiceSettings(): Promise<InvoiceSettings> {
    const response = await this.api.get<InvoiceSettings>('settings/invoice/');
    return response.data;
  }

  async updateInvoiceSettings(data: InvoiceSettingsUpdate): Promise<InvoiceSettings> {
    const response = await this.api.put<InvoiceSettings>('settings/invoice/', data);
    return response.data;
  }

  // ==================== Payment Terms ====================

  async getPaymentTerms(params?: { page?: number; search?: string }): Promise<PaymentTermListResponse> {
    const response = await this.api.get<PaymentTermListResponse | PaymentTerm[]>('payment-terms/', { params });
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }
    return response.data;
  }

  async getPaymentTerm(id: number): Promise<PaymentTerm> {
    const response = await this.api.get<PaymentTerm>(`payment-terms/${id}/`);
    return response.data;
  }

  async createPaymentTerm(data: PaymentTermRequest): Promise<PaymentTerm> {
    const response = await this.api.post<PaymentTerm>('payment-terms/', data);
    return response.data;
  }

  async updatePaymentTerm(id: number, data: PaymentTermRequest): Promise<PaymentTerm> {
    const response = await this.api.put<PaymentTerm>(`payment-terms/${id}/`, data);
    return response.data;
  }

  async deletePaymentTerm(id: number): Promise<void> {
    await this.api.delete(`payment-terms/${id}/`);
  }
}

export const api = new ApiService();
export default api;
