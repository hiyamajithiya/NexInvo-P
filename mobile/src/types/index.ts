// Auth Types
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  session_token: string;
  user: User;
  organization: Organization;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Organization {
  id: number;
  name: string;
}

export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface RegisterRequest {
  email: string;
  otp: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name: string;
  mobile_number: string;
}

// Dashboard Types - matches backend API response
export interface DashboardStats {
  totalInvoices: number;
  revenue: number;
  pending: number;
  clients: number;
  subscription: SubscriptionInfo | null;
}

export interface SubscriptionInfo {
  plan_name: string;
  status: 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled';
  is_active: boolean;
  total_days: number;
  days_remaining: number;
  days_elapsed: number;
  start_date: string;
  end_date: string;
  trial_end_date?: string;
  current_users: number;
  max_users: number;
  users_remaining: number;
  invoices_this_month: number;
  max_invoices_per_month: number;
  invoices_remaining: number;
  max_storage_gb: number;
  next_billing_date: string | null;
  auto_renew: boolean;
}

export interface SubscriptionWarning {
  in_grace_period: boolean;
  days_remaining: number;
  message: string;
  expired_on: string;
}

// Invoice Types
export interface Invoice {
  id: number;
  client: number;
  client_name: string;
  invoice_number: string;
  invoice_type: 'tax' | 'proforma';
  invoice_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: string;
  tax_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  is_interstate: boolean;
  round_off: string;
  total_amount: string;
  payment_terms: string;
  notes: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: number;
  description: string;
  hsn_sac: string;
  gst_rate: string;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_amount: string;
}

export interface InvoiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invoice[];
}

export interface InvoiceRequest {
  client: number;
  invoice_type: 'tax' | 'proforma';
  invoice_date: string;
  status?: string;
  payment_terms?: string;
  notes?: string;
  items: Omit<InvoiceItem, 'id' | 'cgst_amount' | 'sgst_amount' | 'igst_amount'>[];
}

// Client Types
export interface Client {
  id: number;
  name: string;
  code?: string;
  email: string;
  phone: string;
  mobile?: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  stateCode: string;
  gstin: string;
  pan: string;
  date_of_birth?: string;
  date_of_incorporation?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Client[];
}

export interface ClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  stateCode?: string;
  gstin?: string;
  pan?: string;
}

// Receipt Types - matches backend ReceiptSerializer
export interface Receipt {
  id: number;
  payment: number;
  invoice: number;
  invoice_number: string;
  client_name: string;
  receipt_number: string;
  receipt_date: string;
  amount_received: string;
  tds_amount: string;
  gst_tds_amount: string;
  total_amount: string;
  payment_method: string;
  received_from: string;
  towards: string;
  notes: string;
  payment_reference: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Receipt[];
}

// Payment Types - matches backend PaymentSerializer
export interface Payment {
  id: number;
  invoice: number;
  invoice_number: string;
  client_name: string;
  amount: string;
  tds_amount: string;
  gst_tds_amount: string;
  amount_received: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  receipt_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequest {
  invoice: number;
  amount: string;
  tds_amount?: string;
  gst_tds_amount?: string;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface PaymentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Payment[];
}

// Scheduled Invoice Types
export interface ScheduledInvoiceItem {
  id?: number;
  description: string;
  hsn_sac: string;
  gst_rate: string;
  taxable_amount: string;
  total_amount: string;
}

export interface ScheduledInvoice {
  id: number;
  name: string;
  client: number;
  client_name: string;
  client_email: string;
  invoice_type: 'tax' | 'proforma';
  frequency: 'monthly' | 'weekly' | 'yearly';
  frequency_display: string;
  day_of_month: number;
  day_of_week: number | null;
  month_of_year: number | null;
  start_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  payment_term: number | null;
  payment_term_name: string | null;
  notes: string;
  auto_send_email: boolean;
  email_subject: string;
  email_body: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  status_display: string;
  occurrences_generated: number;
  last_generated_date: string | null;
  next_generation_date: string | null;
  items: ScheduledInvoiceItem[];
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledInvoiceListItem {
  id: number;
  name: string;
  client: number;
  client_name: string;
  invoice_type: 'tax' | 'proforma';
  frequency: string;
  frequency_display: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  status: string;
  status_display: string;
  occurrences_generated: number;
  next_generation_date: string | null;
  auto_send_email: boolean;
  total_amount: number;
  items_count: number;
  created_at: string;
}

export interface ScheduledInvoiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ScheduledInvoiceListItem[];
}

export interface ScheduledInvoiceRequest {
  name: string;
  client: number;
  invoice_type: 'tax' | 'proforma';
  frequency: 'monthly' | 'weekly' | 'yearly';
  day_of_month: number;
  day_of_week?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  payment_term?: number;
  notes?: string;
  auto_send_email?: boolean;
  email_subject?: string;
  email_body?: string;
  items: Omit<ScheduledInvoiceItem, 'id'>[];
}

// Service Master Types
export interface ServiceItem {
  id: number;
  name: string;
  description: string;
  sac_code: string;
  gst_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceItemRequest {
  name: string;
  description?: string;
  sac_code?: string;
  gst_rate: number;
}

export interface ServiceItemListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceItem[];
}

// Settings Types
export interface UserProfile {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserProfileUpdate {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface CompanySettings {
  id: number;
  companyName: string;
  tradingName: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  stateCode: string;
  gstin: string;
  gstRegistrationDate: string | null;
  pan: string;
  phone: string;
  email: string;
  logo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsUpdate {
  companyName?: string;
  tradingName?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  stateCode?: string;
  gstin?: string;
  gstRegistrationDate?: string;
  pan?: string;
  phone?: string;
  email?: string;
}

export interface InvoiceSettings {
  id: number;
  invoicePrefix: string;
  startingNumber: number;
  proformaPrefix: string;
  proformaStartingNumber: number;
  receiptPrefix: string;
  receiptStartingNumber: number;
  gstEnabled: boolean;
  defaultGstRate: string;
  paymentDueDays: number;
  termsAndConditions: string;
  notes: string;
  enablePaymentReminders: boolean;
  reminderFrequencyDays: number;
  reminderEmailSubject: string;
  reminderEmailBody: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceSettingsUpdate {
  invoicePrefix?: string;
  startingNumber?: number;
  proformaPrefix?: string;
  proformaStartingNumber?: number;
  receiptPrefix?: string;
  receiptStartingNumber?: number;
  gstEnabled?: boolean;
  defaultGstRate?: string;
  paymentDueDays?: number;
  termsAndConditions?: string;
  notes?: string;
  enablePaymentReminders?: boolean;
  reminderFrequencyDays?: number;
  reminderEmailSubject?: string;
  reminderEmailBody?: string;
}

export interface PaymentTerm {
  id: number;
  term_name: string;
  days: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentTermRequest {
  term_name: string;
  days: number;
  description?: string;
  is_active?: boolean;
}

export interface PaymentTermListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PaymentTerm[];
}

// Navigation Types
// Email Settings Type
export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password?: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  email_signature: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  InvoiceDetail: { invoiceId: number };
  InvoiceForm: { invoiceId?: number };
  ClientForm: { clientId?: number };
  RecordPayment: { invoiceId?: number };
  ReceiptDetail: { receiptId: number };
  ScheduledInvoices: undefined;
  ScheduledInvoiceForm: { scheduledInvoiceId?: number };
  ScheduledInvoiceDetail: { scheduledInvoiceId: number };
  ServiceMaster: undefined;
  ServiceForm: { serviceId?: number };
  Reports: undefined;
  // Settings screens
  Profile: undefined;
  ChangePassword: undefined;
  CompanySettings: undefined;
  InvoiceSettings: undefined;
  PaymentTerms: undefined;
  PaymentTermForm: { paymentTermId?: number };
  EmailSettings: undefined;
  BackupData: undefined;
  // Legal screens
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  DPDPCompliance: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Invoices: { filter?: 'pending' | 'paid' | 'draft' | 'sent' | 'overdue' } | undefined;
  Clients: undefined;
  Receipts: undefined;
  Settings: undefined;
};
