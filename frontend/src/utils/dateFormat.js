/**
 * Centralized date formatting utilities for NexInvo
 * Standard format: dd/mm/yyyy
 */

/**
 * Format a date string or Date object to dd/mm/yyyy format
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string (dd/mm/yyyy) or empty string if invalid
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    return '';
  }
};
