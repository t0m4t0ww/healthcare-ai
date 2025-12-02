// frontend-dashboard/src/utils/dashboardHelpers.js
import { getAllProfileFields, PRIORITY_ORDER } from '../constants/dashboardConstants';

/**
 * Get nested object value by path (e.g., "emergency_contact.name")
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path
 * @returns {*} Value or undefined
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Check if a field has valid value
 * @param {*} value - Field value
 * @returns {boolean}
 */
const hasValidValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !isNaN(value);
  return true;
};

/**
 * Get value from field configuration
 * @param {Object} patientData - Patient data
 * @param {Object} field - Field configuration
 * @returns {*} Field value
 */
const getFieldValue = (patientData, field) => {
  // Try primary key
  let value = getNestedValue(patientData, field.key);
  if (hasValidValue(value)) return value;
  
  // Try alt key
  if (field.altKey) {
    value = getNestedValue(patientData, field.altKey);
    if (hasValidValue(value)) return value;
  }
  
  // Try alt keys (array)
  if (field.altKeys && Array.isArray(field.altKeys)) {
    for (const altKey of field.altKeys) {
      value = getNestedValue(patientData, altKey);
      if (hasValidValue(value)) return value;
    }
  }
  
  return null;
};

/**
 * Calculate profile completion percentage and missing fields
 * @param {Object} patientData - Patient data object
 * @returns {Object} { percentage, missingFields, criticalMissing, totalFields, filledCount }
 */
export const calculateProfileCompletion = (patientData) => {
  if (!patientData) {
    return { 
      percentage: 0, 
      missingFields: [], 
      criticalMissing: [],
      totalFields: 21, 
      filledCount: 0 
    };
  }
  
  const allFields = getAllProfileFields();
  
  // Calculate filled and missing fields
  const filledFields = allFields.filter(field => {
    const value = getFieldValue(patientData, field);
    return hasValidValue(value);
  });
  
  const missingFields = allFields
    .filter(field => {
      const value = getFieldValue(patientData, field);
      return !hasValidValue(value);
    })
    .map(field => ({ 
      label: field.label, 
      priority: field.priority 
    }));
  
  // Get top 5 most critical missing fields
  const criticalMissing = missingFields
    .sort((a, b) => {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    })
    .slice(0, 5);
  
  const percentage = Math.round((filledFields.length / allFields.length) * 100);
  
  return { 
    percentage, 
    missingFields, 
    criticalMissing,
    totalFields: allFields.length, 
    filledCount: filledFields.length 
  };
};

/**
 * Inject custom CSS styles into document head
 * @param {string} styles - CSS styles string
 * @param {string} id - Unique ID for style element
 */
export const injectDashboardStyles = (styles, id = 'dashboard-styles') => {
  if (typeof document === 'undefined') return;
  
  // Check if styles already injected
  if (document.head.querySelector(`style[data-id="${id}"]`)) return;
  
  const styleSheet = document.createElement("style");
  styleSheet.setAttribute('data-id', id);
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
};

/**
 * Parse Vietnamese date format (dd/mm/yyyy) or ISO format
 * @param {string} dobString - Date string
 * @returns {string} Formatted date or "N/A"
 */
export const parseDOB = (dobString) => {
  if (!dobString) return "N/A";
  
  // If already in ISO format (yyyy-mm-dd), parse normally
  if (dobString.includes("-")) {
    const date = new Date(dobString);
    return isNaN(date) ? "N/A" : date.toLocaleDateString("vi-VN");
  }
  
  // Parse dd/mm/yyyy format
  const parts = dobString.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return isNaN(date) ? "N/A" : date.toLocaleDateString("vi-VN");
  }
  
  return dobString; // Return as-is if can't parse
};

/**
 * Get room location display string
 * @param {Object} appointment - Appointment object
 * @returns {string} Location string
 */
export const getRoomLocation = (appointment) => {
  // Ưu tiên hiển thị room info
  if (appointment.room_info) {
    const { name, floor, building } = appointment.room_info;
    const parts = [];
    if (name) parts.push(name);
    if (floor) parts.push(`Tầng ${floor}`);
    if (building) parts.push(building);
    if (parts.length > 0) return parts.join(', ');
  }
  
  // Fallback về slot_info location
  if (appointment.slot_info?.location) {
    return appointment.slot_info.location;
  }
  
  // Fallback về location trực tiếp
  if (appointment.location) {
    return appointment.location;
  }
  
  return "Chưa xác định";
};
