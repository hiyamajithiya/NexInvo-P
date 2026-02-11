/**
 * Format a number in Indian numbering system (XX,XX,XXX.XX)
 * Used across all Tally-style accounting reports.
 */
export const formatIndianNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '';
  const n = Math.abs(parseFloat(num));
  if (n === 0) return '';

  const parts = n.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian grouping: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = grouped + ',' + last3;
  }

  return intPart + '.' + decPart;
};

/**
 * Format balance with Dr/Cr suffix (Tally style)
 */
export const formatBalance = (amount, balanceType) => {
  const num = parseFloat(amount) || 0;
  if (num === 0) return '';
  return formatIndianNumber(num) + ' ' + (balanceType || 'Dr');
};

/**
 * Format date as DD-Mon-YYYY (Tally style)
 */
export const formatTallyDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
};
