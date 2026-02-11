/**
 * Shared formatting utilities for the mobile app.
 * Replaces duplicate formatCurrency/formatDate/getStatusColor across screens.
 */

export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num || 0);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getStatusColor = (status: string): { bg: string; text: string } => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return { bg: '#dcfce7', text: '#166534' };
    case 'sent':
      return { bg: '#dbeafe', text: '#1e40af' };
    case 'pending':
      return { bg: '#fef3c7', text: '#92400e' };
    case 'overdue':
      return { bg: '#fee2e2', text: '#991b1b' };
    case 'draft':
      return { bg: '#f1f5f9', text: '#475569' };
    case 'cancelled':
      return { bg: '#fce7f3', text: '#9d174d' };
    default:
      return { bg: '#f1f5f9', text: '#475569' };
  }
};

export const getPaymentMethodColor = (method: string): { bg: string; text: string } => {
  switch (method?.toLowerCase()) {
    case 'cash':
      return { bg: '#dcfce7', text: '#166534' };
    case 'bank_transfer':
    case 'bank transfer':
      return { bg: '#dbeafe', text: '#1e40af' };
    case 'cheque':
      return { bg: '#fef3c7', text: '#92400e' };
    case 'upi':
      return { bg: '#e0e7ff', text: '#3730a3' };
    case 'card':
      return { bg: '#fce7f3', text: '#9d174d' };
    default:
      return { bg: '#f1f5f9', text: '#475569' };
  }
};
