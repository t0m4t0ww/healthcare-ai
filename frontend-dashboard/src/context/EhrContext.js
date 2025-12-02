// src/services/ehrServices.js - Complete Electronic Health Records API
import api from './services';

// =============== PATIENT RECORDS API ===============

/**
 * Lấy danh sách hồ sơ bệnh án của bệnh nhân
 * @param {Object} params - Query parameters
 * @param {string} params.patient_id - ID bệnh nhân
 * @param {string} params.type - Loại record (consultation, checkup, emergency, followup)
 * @param {string} params.doctor_id - ID bác sĩ (filter theo bác sĩ)
 * @param {string} params.start_date - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} params.end_date - Ngày kết thúc (YYYY-MM-DD)
 * @param {string} params.search - Tìm kiếm trong chẩn đoán, ghi chú
 * @param {string} params.sort - Sắp xếp (date_desc, date_asc, doctor, diagnosis)
 * @param {number} params.page - Trang
 * @param {number} params.limit - Số lượng mỗi trang
 * @returns {Promise<Object>} Danh sách records với pagination
 */
export const getPatientRecords = async (params = {}) => {
  try {
    const response = await api.get('/ehr/patient/records', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch patient records:', error);
    throw new Error('Không thể tải hồ sơ bệnh án');
  }
};

/**
 * Lấy chi tiết một record cụ thể
 * @param {string} recordId - ID record
 * @param {Object} params - Additional params
 * @param {boolean} params.include_versions - Có lấy tất cả versions không
 * @param {boolean} params.include_attachments - Có lấy attachments không
 * @returns {Promise<Object>} Chi tiết record
 */
export const getRecordDetails = async (recordId, params = {}) => {
  try {
    const response = await api.get(`/ehr/records/${recordId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch record details:', error);
    throw new Error('Không thể tải chi tiết hồ sơ');
  }
};

/**
 * Lấy timeline của một record (tất cả versions)
 * @param {string} recordId - ID record
 * @returns {Promise<Array>} Timeline các versions
 */
export const getRecordTimeline = async (recordId) => {
  try {
    const response = await api.get(`/ehr/records/${recordId}/timeline`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch record timeline:', error);
    throw new Error('Không thể tải lịch sử hồ sơ');
  }
};

/**
 * Tạo record mới (chỉ dành cho bác sĩ)
 * @param {Object} data - Record data
 * @param {string} data.patient_id - ID bệnh nhân (required)
 * @param {string} data.appointment_id - ID cuộc hẹn liên quan
 * @param {string} data.type - Loại record (required)
 * @param {Object} data.vitals - Sinh hiệu
 * @param {Object} data.diagnosis - Chẩn đoán
 * @param {Array} data.symptoms - Triệu chứng
 * @param {Object} data.treatment - Điều trị
 * @param {Array} data.prescriptions - Đơn thuốc
 * @param {string} data.notes - Ghi chú của bác sĩ
 * @param {Object} data.follow_up - Lịch tái khám
 * @returns {Promise<Object>} Record đã tạo
 */
export const createRecord = async (data) => {
  try {
    const response = await api.post('/ehr/records', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create record:', error);
    throw new Error('Không thể tạo hồ sơ bệnh án');
  }
};

/**
 * Cập nhật record (tạo version mới - append-only)
 * @param {string} recordId - ID record
 * @param {Object} data - Updated data
 * @param {string} data.update_reason - Lý do cập nhật
 * @returns {Promise<Object>} Record version mới
 */
export const updateRecord = async (recordId, data) => {
  try {
    const response = await api.put(`/ehr/records/${recordId}`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update record:', error);
    throw new Error('Không thể cập nhật hồ sơ');
  }
};

// =============== PRESCRIPTIONS API ===============

/**
 * Lấy danh sách đơn thuốc của bệnh nhân
 * @param {Object} params - Query parameters
 * @param {string} params.patient_id - ID bệnh nhân
 * @param {string} params.status - Trạng thái (active, completed, cancelled)
 * @param {string} params.doctor_id - ID bác sĩ kê đơn
 * @param {string} params.start_date - Ngày bắt đầu
 * @param {string} params.end_date - Ngày kết thúc
 * @returns {Promise<Array>} Danh sách đơn thuốc
 */
export const getPatientPrescriptions = async (params = {}) => {
  try {
    const response = await api.get('/ehr/prescriptions', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    throw new Error('Không thể tải đơn thuốc');
  }
};

/**
 * Lấy chi tiết đơn thuốc
 * @param {string} prescriptionId - ID đơn thuốc
 * @returns {Promise<Object>} Chi tiết đơn thuốc
 */
export const getPrescriptionDetails = async (prescriptionId) => {
  try {
    const response = await api.get(`/ehr/prescriptions/${prescriptionId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch prescription details:', error);
    throw new Error('Không thể tải chi tiết đơn thuốc');  
  }
};

/**
 * Tạo đơn thuốc mới (bác sĩ)
 * @param {Object} data - Prescription data
 * @param {string} data.patient_id - ID bệnh nhân
 * @param {string} data.record_id - ID record liên quan
 * @param {Array} data.medications - Danh sách thuốc
 * @param {string} data.instructions - Hướng dẫn sử dụng
 * @param {string} data.valid_until - Ngày hết hạn
 * @returns {Promise<Object>} Đơn thuốc đã tạo
 */
export const createPrescription = async (data) => {
  try {
    const response = await api.post('/ehr/prescriptions', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create prescription:', error);
    throw new Error('Không thể tạo đơn thuốc');
  }
};

/**
 * Cập nhật trạng thái đơn thuốc
 * @param {string} prescriptionId - ID đơn thuốc
 * @param {Object} data - Update data
 * @param {string} data.status - Trạng thái mới
 * @param {string} data.notes - Ghi chú
 * @returns {Promise<Object>} Đơn thuốc đã cập nhật
 */
export const updatePrescription = async (prescriptionId, data) => {
  try {
    const response = await api.patch(`/ehr/prescriptions/${prescriptionId}`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update prescription:', error);
    throw new Error('Không thể cập nhật đơn thuốc');
  }
};

// =============== TEST RESULTS API ===============

/**
 * Lấy danh sách kết quả xét nghiệm
 * @param {Object} params - Query parameters
 * @param {string} params.patient_id - ID bệnh nhân
 * @param {string} params.test_type - Loại xét nghiệm
 * @param {string} params.status - Trạng thái (pending, completed, reviewed)
 * @param {string} params.start_date - Ngày bắt đầu
 * @param {string} params.end_date - Ngày kết thúc
 * @returns {Promise<Array>} Danh sách kết quả xét nghiệm
 */
export const getTestResults = async (params = {}) => {
  try {
    const response = await api.get('/ehr/test-results', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch test results:', error);
    throw new Error('Không thể tải kết quả xét nghiệm');
  }
};

/**
 * Lấy chi tiết kết quả xét nghiệm
 * @param {string} testResultId - ID kết quả xét nghiệm
 * @returns {Promise<Object>} Chi tiết kết quả
 */
export const getTestResultDetails = async (testResultId) => {
  try {
    const response = await api.get(`/ehr/test-results/${testResultId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch test result details:', error);
    throw new Error('Không thể tải chi tiết kết quả xét nghiệm');
  }
};

/**
 * Upload kết quả xét nghiệm mới
 * @param {Object} data - Test result data
 * @param {string} data.patient_id - ID bệnh nhân
 * @param {string} data.test_type - Loại xét nghiệm
 * @param {Object} data.results - Kết quả chi tiết
 * @param {Array} data.files - Files đính kèm
 * @param {string} data.lab_info - Thông tin phòng lab
 * @returns {Promise<Object>} Test result đã tạo
 */
export const uploadTestResult = async (data) => {
  try {
    const response = await api.post('/ehr/test-results', data);
    return response.data;
  } catch (error) {
    console.error('Failed to upload test result:', error);
    throw new Error('Không thể tải lên kết quả xét nghiệm');
  }
};

// =============== ATTACHMENTS & FILES API ===============

/**
 * Lấy danh sách file đính kèm của record
 * @param {string} recordId - ID record
 * @param {Object} params - Query parameters
 * @param {string} params.type - Loại file (image, pdf, document)
 * @returns {Promise<Array>} Danh sách attachments
 */
export const getRecordAttachments = async (recordId, params = {}) => {
  try {
    const response = await api.get(`/ehr/records/${recordId}/attachments`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch record attachments:', error);
    throw new Error('Không thể tải file đính kèm');
  }
};

/**
 * Upload file đính kèm cho record
 * @param {string} recordId - ID record
 * @param {FormData} formData - Form data chứa file
 * @param {Object} metadata - Metadata của file
 * @returns {Promise<Object>} Attachment đã upload
 */
export const uploadAttachment = async (recordId, formData, metadata = {}) => {
  try {
    // Add metadata to form data
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const response = await api.post(`/ehr/records/${recordId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    throw new Error('Không thể tải lên file đính kèm');
  }
};

/**
 * Tải xuống attachment
 * @param {string} attachmentId - ID attachment
 * @returns {Promise<Blob>} File blob
 */
export const downloadAttachment = async (attachmentId) => {
  try {
    const response = await api.get(`/ehr/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Failed to download attachment:', error);
    throw new Error('Không thể tải xuống file');
  }
};

/**
 * Xóa attachment
 * @param {string} attachmentId - ID attachment
 * @returns {Promise<Object>} Kết quả xóa
 */
export const deleteAttachment = async (attachmentId) => {
  try {
    const response = await api.delete(`/ehr/attachments/${attachmentId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    throw new Error('Không thể xóa file đính kèm');
  }
};

// =============== PDF EXPORT API ===============

/**
 * Xuất record ra PDF
 * @param {string} recordId - ID record
 * @param {Object} options - Export options
 * @param {boolean} options.include_attachments - Có bao gồm attachments không
 * @param {string} options.template - Template PDF (standard, detailed, summary)
 * @param {string} options.language - Ngôn ngữ (vi, en)
 * @returns {Promise<Blob>} PDF blob
 */
export const downloadRecordPDF = async (recordId, options = {}) => {
  try {
    const response = await api.post(`/ehr/records/${recordId}/export-pdf`, options, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Failed to download record PDF:', error);
    throw new Error('Không thể tải xuống PDF');
  }
};

/**
 * Xuất tất cả records của patient ra PDF
 * @param {string} patientId - ID bệnh nhân
 * @param {Object} options - Export options
 * @param {string} options.start_date - Ngày bắt đầu
 * @param {string} options.end_date - Ngày kết thúc  
 * @param {Array} options.record_types - Loại records cần export
 * @returns {Promise<Blob>} PDF blob
 */
export const downloadPatientRecordsPDF = async (patientId, options = {}) => {
  try {
    const response = await api.post(`/ehr/patients/${patientId}/export-pdf`, options, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Failed to download patient records PDF:', error);
    throw new Error('Không thể tải xuống hồ sơ PDF');
  }
};

// =============== SHARING & PERMISSIONS API ===============

/**
 * Chia sẻ record với bác sĩ khác
 * @param {string} recordId - ID record
 * @param {Object} data - Sharing data
 * @param {string} data.doctor_id - ID bác sĩ được chia sẻ
 * @param {Array} data.permissions - Quyền truy cập (read, write, download)
 * @param {string} data.expiry_date - Ngày hết hạn
 * @param {string} data.message - Tin nhắn đính kèm
 * @returns {Promise<Object>} Share link/info
 */
export const shareRecord = async (recordId, data) => {
  try {
    const response = await api.post(`/ehr/records/${recordId}/share`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to share record:', error);
    throw new Error('Không thể chia sẻ hồ sơ');
  }
};

/**
 * Lấy danh sách records đã được chia sẻ với tôi
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Danh sách shared records
 */
export const getSharedRecords = async (params = {}) => {
  try {
    const response = await api.get('/ehr/shared-records', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch shared records:', error);
    throw new Error('Không thể tải hồ sơ đã chia sẻ');
  }
};

/**
 * Thu hồi quyền chia sẻ
 * @param {string} shareId - ID share
 * @returns {Promise<Object>} Kết quả thu hồi
 */
export const revokeShare = async (shareId) => {
  try {
    const response = await api.delete(`/ehr/shares/${shareId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to revoke share:', error);
    throw new Error('Không thể thu hồi chia sẻ');
  }
};

// =============== ANALYTICS & INSIGHTS API ===============

/**
 * Lấy health insights của bệnh nhân
 * @param {string} patientId - ID bệnh nhân
 * @param {Object} params - Query parameters
 * @param {string} params.timeframe - Khung thời gian (3months, 6months, 1year, all)
 * @returns {Promise<Object>} Health insights
 */
export const getHealthInsights = async (patientId, params = {}) => {
  try {
    const response = await api.get(`/ehr/patients/${patientId}/insights`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch health insights:', error);
    throw new Error('Không thể tải thông tin sức khỏe');
  }
};

/**
 * Lấy health trends (xu hướng sức khỏe)
 * @param {string} patientId - ID bệnh nhân
 * @param {Object} params - Query parameters
 * @param {Array} params.metrics - Các chỉ số cần theo dõi (blood_pressure, weight, etc.)
 * @param {string} params.period - Chu kỳ (daily, weekly, monthly)
 * @returns {Promise<Object>} Health trends data
 */
export const getHealthTrends = async (patientId, params = {}) => {
  try {
    const response = await api.get(`/ehr/patients/${patientId}/trends`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch health trends:', error);
    throw new Error('Không thể tải xu hướng sức khỏe');
  }
};

// =============== SEARCH API ===============

/**
 * Tìm kiếm trong records của bệnh nhân
 * @param {string} patientId - ID bệnh nhân
 * @param {Object} searchData - Search parameters
 * @param {string} searchData.query - Từ khóa tìm kiếm
 * @param {Array} searchData.types - Loại records cần tìm
 * @param {string} searchData.date_range - Khoảng thời gian
 * @param {Array} searchData.doctors - ID bác sĩ
 * @returns {Promise<Array>} Kết quả tìm kiếm
 */
export const searchRecords = async (patientId, searchData) => {
  try {
    const response = await api.post(`/ehr/patients/${patientId}/search`, searchData);
    return response.data;
  } catch (error) {
    console.error('Failed to search records:', error);
    throw new Error('Không thể tìm kiếm hồ sơ');
  }
};

// =============== AUDIT LOG API ===============

/**
 * Lấy audit log cho record (ai đã xem, chỉnh sửa)
 * @param {string} recordId - ID record
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Audit log entries
 */
export const getRecordAuditLog = async (recordId, params = {}) => {
  try {
    const response = await api.get(`/ehr/records/${recordId}/audit-log`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    throw new Error('Không thể tải log truy cập');
  }
};

// =============== EXPORT DEFAULT ===============

const ehrServices = {
  // Records
  getPatientRecords,
  getRecordDetails,
  getRecordTimeline,
  createRecord,
  updateRecord,
  
  // Prescriptions  
  getPatientPrescriptions,
  getPrescriptionDetails,
  createPrescription,
  updatePrescription,
  
  // Test Results
  getTestResults,
  getTestResultDetails,
  uploadTestResult,
  
  // Attachments
  getRecordAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  
  // PDF Export
  downloadRecordPDF,
  downloadPatientRecordsPDF,
  
  // Sharing
  shareRecord,
  getSharedRecords,
  revokeShare,
  
  // Analytics
  getHealthInsights,
  getHealthTrends,
  
  // Search
  searchRecords,
  
  // Audit
  getRecordAuditLog
};

export default ehrServices;