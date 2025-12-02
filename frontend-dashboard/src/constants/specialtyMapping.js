// frontend-dashboard/src/constants/specialtyMapping.js
/**
 * Specialty Mapping - Chuẩn hóa specialty codes
 * Map từ các format khác nhau về format chuẩn của EHR Schema
 */

export const SPECIALTY_CODES = {
  // Format chuẩn (dùng trong EHR Schema) - Chỉ hỗ trợ Nội tổng quát
  INTERNAL: 'internal'
};

/**
 * Map từ database/API format sang EHR Schema format
 */
export const normalizeSpecialty = (specialty) => {
  if (!specialty) return SPECIALTY_CODES.INTERNAL;
  
  const normalized = specialty.toString().toLowerCase().trim();
  
  // Mapping table - Chỉ giữ Nội tổng quát
  const mappings = {
    // Nội tổng quát
    'general_medicine': SPECIALTY_CODES.INTERNAL,
    'internal': SPECIALTY_CODES.INTERNAL,
    'internal_medicine': SPECIALTY_CODES.INTERNAL,
    'nội tổng quát': SPECIALTY_CODES.INTERNAL,
    'noi tong quat': SPECIALTY_CODES.INTERNAL,
    'cardiology': SPECIALTY_CODES.INTERNAL,
    'gastroenterology': SPECIALTY_CODES.INTERNAL,
    'nephrology': SPECIALTY_CODES.INTERNAL,
    'endocrinology': SPECIALTY_CODES.INTERNAL
  };
  
  return mappings[normalized] || SPECIALTY_CODES.INTERNAL;
};

/**
 * Get display name for specialty
 */
export const getSpecialtyDisplayName = (specialty) => {
  const normalized = normalizeSpecialty(specialty);
  
  const displayNames = {
    [SPECIALTY_CODES.INTERNAL]: 'Nội tổng quát'
  };
  
  return displayNames[normalized] || 'Nội tổng quát';
};

/**
 * Get icon for specialty
 */
export const getSpecialtyIcon = (specialty) => {
  const normalized = normalizeSpecialty(specialty);
  
  const icons = {
    [SPECIALTY_CODES.INTERNAL]: '🏥'
  };
  
  return icons[normalized] || '🏥';
};

/**
 * Check if specialty requires specific fields
 */
export const getRequiredFields = (specialty) => {
  // Chỉ hỗ trợ Nội tổng quát
  return [];
};

export default {
  SPECIALTY_CODES,
  normalizeSpecialty,
  getSpecialtyDisplayName,
  getSpecialtyIcon,
  getRequiredFields
};
