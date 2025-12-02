/**
 * Date Utilities - Fix Timezone Issues
 * 
 * ⚠️ IMPORTANT: ALWAYS use these functions instead of toISOString() for dates
 * 
 * Problem: 
 * - new Date("2024-12-24").toISOString() → "2024-12-23T17:00:00.000Z" (Vietnam UTC+7)
 * - Causes off-by-one date errors
 * 
 * Solution:
 * - Use local date components directly
 * - Format as YYYY-MM-DD without timezone conversion
 */

/**
 * Convert Date object to local ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} - Local date string (YYYY-MM-DD)
 */
export const toLocalISODate = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date as local ISO string (YYYY-MM-DD)
 * @returns {string} - Today's date (YYYY-MM-DD)
 */
export const getTodayLocal = () => {
  return toLocalISODate(new Date());
};

/**
 * Get date N days from now as local ISO string
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} - Date string (YYYY-MM-DD)
 */
export const getDateFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
};

/**
 * Parse date string (YYYY-MM-DD) to Date object (local timezone)
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {Date} - Date object in local timezone
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Compare two dates (ignores time)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} - -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDates = (date1, date2) => {
  const str1 = typeof date1 === 'string' ? date1 : toLocalISODate(date1);
  const str2 = typeof date2 === 'string' ? date2 : toLocalISODate(date2);
  
  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
};

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export const isToday = (date) => {
  const dateStr = typeof date === 'string' ? date : toLocalISODate(date);
  return dateStr === getTodayLocal();
};

/**
 * Check if date is in the past (before today)
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export const isPast = (date) => {
  return compareDates(date, new Date()) < 0;
};

/**
 * Check if date is in the future (after today)
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export const isFuture = (date) => {
  return compareDates(date, new Date()) > 0;
};

/**
 * Format date to Vietnamese locale
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatVietnamese = (date, options = {}) => {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  if (!dateObj) return 'N/A';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString('vi-VN', defaultOptions);
};

/**
 * Format date to short Vietnamese format (dd/mm/yyyy)
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export const formatShortVietnamese = (date) => {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  if (!dateObj) return 'N/A';
  
  return dateObj.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Get first day of month (YYYY-MM-DD)
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {string}
 */
export const getFirstDayOfMonth = (year, month) => {
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

/**
 * Get last day of month (YYYY-MM-DD)
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {string}
 */
export const getLastDayOfMonth = (year, month) => {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

