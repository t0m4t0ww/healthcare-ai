// frontend-dashboard/src/utils/appointmentHelpers.js
import { Tag } from "antd";
import { STATUS_META } from "../constants/appointmentConstants";

/**
 * Format date string to Vietnamese format
 * @param {string|Date|object} dateStr - Date string (YYYY-MM-DD), Date object, or datetime object
 * @returns {string} Formatted date
 */
export const formatDateVN = (dateStr) => {
  if (!dateStr) return "N/A";
  
  let d;
  
  // Handle datetime object from MongoDB {$date: "..."}
  if (typeof dateStr === 'object' && dateStr.$date) {
    d = new Date(dateStr.$date);
  }
  // Handle ISO string or datetime string
  else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    d = new Date(dateStr);
  }
  // Handle Date object
  else if (dateStr instanceof Date) {
    d = dateStr;
  }
  // Handle YYYY-MM-DD format
  else if (typeof dateStr === 'string') {
    d = new Date(`${dateStr}T12:00:00`);
  }
  // Handle timestamp
  else if (typeof dateStr === 'number') {
    d = new Date(dateStr);
  }
  else {
    return "N/A";
  }
  
  // Check if valid date
  if (isNaN(d.getTime())) {
    console.warn('Invalid date:', dateStr);
    return "N/A";
  }
  
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format amount to VND currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export const formatVND = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0
  );

/**
 * Get status tag component
 * @param {string} status - Status string
 * @returns {JSX.Element} Tag component
 */
export const statusTag = (status) => {
  const meta = STATUS_META[status] || { color: "default", text: status };
  return <Tag color={meta.color}>{meta.text}</Tag>;
};

/**
 * Check if appointment date is today
 * @param {string|Date|object} dateStr - Date string, Date object, or datetime object
 * @returns {boolean}
 */
export const isAppointmentToday = (dateStr) => {
  if (!dateStr) return false;
  
  let d;
  if (typeof dateStr === 'object' && dateStr.$date) {
    d = new Date(dateStr.$date);
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    d = new Date(dateStr);
  } else if (dateStr instanceof Date) {
    d = dateStr;
  } else if (typeof dateStr === 'string') {
    d = new Date(`${dateStr}T12:00:00`);
  } else {
    return false;
  }
  
  if (isNaN(d.getTime())) return false;
  
  const todayStr = new Date().toDateString();
  return d.toDateString() === todayStr;
};

/**
 * Check if appointment date is in the past
 * @param {string|Date|object} dateStr - Date string, Date object, or datetime object
 * @returns {boolean}
 */
export const isAppointmentPast = (dateStr) => {
  if (!dateStr) return false;
  
  let d;
  if (typeof dateStr === 'object' && dateStr.$date) {
    d = new Date(dateStr.$date);
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    d = new Date(dateStr);
  } else if (dateStr instanceof Date) {
    d = dateStr;
  } else if (typeof dateStr === 'string') {
    d = new Date(`${dateStr}T12:00:00`);
  } else {
    return false;
  }
  
  if (isNaN(d.getTime())) return false;
  
  return d < new Date();
};

/**
 * Inject custom CSS styles into document head
 * @param {string} styles - CSS styles string
 * @param {string} id - Unique ID for style element
 */
export const injectStyles = (styles, id = 'custom-styles') => {
  if (typeof document === 'undefined') return;
  
  // Check if styles already injected
  if (document.head.querySelector(`style[data-id="${id}"]`)) return;
  
  const styleSheet = document.createElement("style");
  styleSheet.setAttribute('data-id', id);
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
};
