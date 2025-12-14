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

/**
 * Format a date string or Date object to dd/mm/yyyy HH:MM format
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string (dd/mm/yyyy HH:MM) or empty string if invalid
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
};

/**
 * Format a date string or Date object to dd/mm/yyyy hh:mm AM/PM format
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string or empty string if invalid
 */
export const formatDateTimeAMPM = (dateInput) => {
  if (!dateInput) return '';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return '';
  }
};

/**
 * Format date using toLocaleDateString with en-IN locale but dd/mm/yyyy format
 * @param {string|Date} dateInput - The date to format
 * @param {Object} options - Additional options like { day: 'numeric', month: 'short', year: 'numeric' }
 * @returns {string} Formatted date string or empty string if invalid
 */
export const formatDateLocale = (dateInput, options = {}) => {
  if (!dateInput) return '';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    // Default to dd/mm/yyyy format
    const defaultOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const mergedOptions = { ...defaultOptions, ...options };

    return date.toLocaleDateString('en-GB', mergedOptions);
  } catch (error) {
    return '';
  }
};

export default {
  formatDate,
  formatDateTime,
  formatDateTimeAMPM,
  formatDateLocale
};
