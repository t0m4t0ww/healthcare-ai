// frontend-dashboard/src/constants/specialtyConstants.js
// ✅ Mapping specialty codes to Vietnamese names - SINGLE SOURCE OF TRUTH

/**
 * Map specialty code (from backend) to Vietnamese display name
 * This is the ONLY place where specialty mapping should be defined
 * to ensure consistency across the entire application.
 */
export const SPECIALTY_MAP = {
  'general_medicine': 'Nội tổng quát',
  'obstetrics': 'Sản phụ khoa',
  'pediatrics': 'Nhi khoa',
  'cardiology': 'Tim mạch',
  'dermatology': 'Da liễu',
  'neurology': 'Thần kinh',
  'orthopedics': 'Chấn thương chỉnh hình',
  'ophthalmology': 'Mắt',
  'ent': 'Tai mũi họng',
  'dentistry': 'Nha khoa',
  'psychiatry': 'Tâm thần',
  'surgery': 'Phẫu thuật',
  'urology': 'Tiết niệu',
  'gastroenterology': 'Tiêu hóa',
  'pulmonology': 'Hô hấp',
  'endocrinology': 'Nội tiết',
  'rheumatology': 'Khớp',
  'oncology': 'Ung bướu',
  'radiology': 'Chẩn đoán hình ảnh',
  'anesthesiology': 'Gây mê hồi sức',
};

/**
 * Get Vietnamese specialty name from code
 * @param {string} specialtyCode - Specialty code from backend (e.g., 'general_medicine')
 * @param {string} fallback - Fallback value if code not found
 * @returns {string} Vietnamese specialty name
 */
export const getSpecialtyName = (specialtyCode, fallback = 'Đa khoa') => {
  if (!specialtyCode) return fallback;
  return SPECIALTY_MAP[specialtyCode.toLowerCase()] || specialtyCode || fallback;
};

/**
 * Get all specialty options for Select/Dropdown
 * @returns {Array} Array of {value, label} objects
 */
export const getSpecialtyOptions = () => {
  return Object.entries(SPECIALTY_MAP).map(([code, name]) => ({
    value: code,
    label: name,
  }));
};

/**
 * Check if a specialty code exists
 * @param {string} specialtyCode
 * @returns {boolean}
 */
export const isValidSpecialty = (specialtyCode) => {
  return specialtyCode && SPECIALTY_MAP.hasOwnProperty(specialtyCode.toLowerCase());
};

