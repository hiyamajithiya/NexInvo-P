/**
 * Format a number as Indian Rupee currency (INR).
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "₹1,23,456")
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};
