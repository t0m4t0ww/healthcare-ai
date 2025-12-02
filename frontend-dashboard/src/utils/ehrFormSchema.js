// frontend-dashboard/src/utils/ehrFormSchema.js
/**
 * EHR Form Schema - Medical Examination Form Agent (Frontend)
 * Tạo và validate form khám bệnh theo chuyên khoa
 */

export const SPECIALTIES = {
  INTERNAL: 'internal'
};

/**
 * Tạo base schema cho mọi chuyên khoa
 */
export const getBaseSchema = () => ({
  specialty: '',
  common_exam: {
    chief_complaint: '',
    subjective: '',
    vital_signs: {
      temperature: null,
      heart_rate: null,
      blood_pressure: '',
      respiratory_rate: null,
      spo2: null,
      weight: null,
      height: null
    },
    general_exam: '',
    diagnosis: ''
  },
  specialty_exam: {},
  prescriptions: [],
  follow_up: ''
});

/**
 * Schema Nội tổng quát
 */
export const getInternalSchema = () => ({
  respiratory: '',
  cardiovascular: '',
  gastrointestinal: '',
  urinary: '',
  endocrine: '',
  labs: [],
  imaging: []
});



/**
 * Tạo EHR record hoàn chỉnh theo chuyên khoa
 */
export const createEHRRecord = (specialty, partialData = {}) => {
  if (!Object.values(SPECIALTIES).includes(specialty)) {
    throw new Error(`Invalid specialty: ${specialty}. Must be one of: ${Object.values(SPECIALTIES).join(', ')}`);
  }

  const ehrRecord = getBaseSchema();
  ehrRecord.specialty = specialty;

  // Thêm specialty_exam tương ứng - chỉ support internal
  if (specialty === SPECIALTIES.INTERNAL) {
    ehrRecord.specialty_exam.internal = getInternalSchema();
  }

  // Merge partial data
  return mergeData(ehrRecord, partialData);
};

/**
 * Merge partial data vào base structure
 */
const mergeData = (base, partial) => {
  const result = { ...base };
  
  for (const [key, value] of Object.entries(partial)) {
    if (key in result) {
      if (typeof result[key] === 'object' && result[key] !== null && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = mergeData(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
};

/**
 * Validate EHR record
 */
export const validateRecord = (record) => {
  const warnings = [];

  // Check specialty
  const specialty = record.specialty || '';
  if (!Object.values(SPECIALTIES).includes(specialty)) {
    return { isValid: false, warnings: [`Invalid specialty: ${specialty}`] };
  }

  // Check required fields
  if (!record.common_exam?.chief_complaint) {
    warnings.push('Thiếu triệu chứng chính (chief_complaint)');
  }

  if (!record.common_exam?.diagnosis) {
    warnings.push('Thiếu chẩn đoán (diagnosis)');
  }

  // Validate specialty-specific data
  const specialtyExam = record.specialty_exam || {};

  if (specialty === SPECIALTIES.INTERNAL) {
    if (!specialtyExam.internal) {
      warnings.push('Thiếu dữ liệu khám Nội tổng quát');
    }
  }

  // Check vital signs
  const vitalSigns = record.common_exam?.vital_signs || {};
  if (!vitalSigns.blood_pressure) {
    warnings.push('Thiếu huyết áp (blood_pressure)');
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
};

/**
 * Điền placeholder cho các field rỗng
 */
export const fillPlaceholders = (record) => {
  const result = { ...record };

  // Common exam
  if (!result.common_exam.diagnosis) {
    result.common_exam.diagnosis = 'Chưa cập nhật';
  }
  if (!result.common_exam.general_exam) {
    result.common_exam.general_exam = 'Chưa khám';
  }

  // Specialty exam placeholders - chỉ support internal
  const specialty = result.specialty;
  const specialtyExam = result.specialty_exam;

  if (specialty === SPECIALTIES.INTERNAL && specialtyExam.internal) {
    const internal = specialtyExam.internal;
    ['respiratory', 'cardiovascular', 'gastrointestinal', 'urinary', 'endocrine'].forEach(key => {
      if (!internal[key]) {
        internal[key] = 'Không có bất thường';
      }
    });
  }

  return result;
};

/**
 * Main entry point - Tạo form EHR hoàn chỉnh
 */
export const createEHRForm = (specialty, partialData = {}) => {
  // Tạo structure
  let ehrRecord = createEHRRecord(specialty, partialData);

  // Fill placeholders
  ehrRecord = fillPlaceholders(ehrRecord);

  // Validate
  const { isValid, warnings } = validateRecord(ehrRecord);

  return {
    record: ehrRecord,
    isValid,
    warnings,
    createdAt: new Date().toISOString()
  };
};

export default {
  SPECIALTIES,
  createEHRForm,
  createEHRRecord,
  validateRecord,
  fillPlaceholders,
  getBaseSchema,
  getInternalSchema
};
