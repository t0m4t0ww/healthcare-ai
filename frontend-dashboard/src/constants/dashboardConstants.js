// frontend-dashboard/src/constants/dashboardConstants.js

// Dashboard animation styles
export const DASHBOARD_ANIMATION_STYLES = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
    }
    50% {
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
    }
  }
  
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
`;

// Profile completion field configuration (21 fields)
export const PROFILE_FIELDS_CONFIG = {
  // Thông tin cơ bản (bắt buộc) - 5 trường
  basic: [
    { key: 'full_name', label: 'Họ và tên', priority: 'critical' },
    { key: 'phone', label: 'Số điện thoại', priority: 'critical' },
    { key: 'date_of_birth', altKey: 'dob', label: 'Ngày sinh', priority: 'critical' },
    { key: 'gender', label: 'Giới tính', priority: 'critical' },
    { key: 'address', label: 'Địa chỉ', priority: 'critical' },
  ],
  
  // Thông tin y tế (quan trọng) - 6 trường
  medical: [
    { key: 'blood_type', label: 'Nhóm máu', priority: 'critical' },
    { key: 'height', label: 'Chiều cao', priority: 'critical' },
    { key: 'weight', label: 'Cân nặng', priority: 'critical' },
    { key: 'medical_history', label: 'Tiền sử bệnh', priority: 'critical' },
    { key: 'allergies_medications', altKeys: ['allergies_food', 'allergies_environment'], label: 'Thông tin dị ứng', priority: 'critical' },
    { key: 'current_medications', label: 'Thuốc đang dùng', priority: 'critical' },
  ],
  
  // Tiền sử (khuyến khích) - 4 trường
  history: [
    { key: 'chronic_conditions', label: 'Bệnh mãn tính', priority: 'high' },
    { key: 'past_surgeries', label: 'Phẫu thuật đã qua', priority: 'medium' },
    { key: 'vaccination_history', label: 'Lịch sử tiêm chủng', priority: 'medium' },
    { key: 'family_history', label: 'Tiền sử gia đình', priority: 'medium' },
  ],
  
  // Thói quen sống (khuyến khích) - 3 trường
  lifestyle: [
    { key: 'smoking_status', label: 'Tình trạng hút thuốc', priority: 'low' },
    { key: 'alcohol_consumption', label: 'Sử dụng rượu', priority: 'low' },
    { key: 'exercise_frequency', label: 'Tần suất tập thể dục', priority: 'low' },
  ],
  
  // Liên hệ khẩn cấp (quan trọng) - 2 trường
  emergency: [
    { key: 'emergency_contact.name', label: 'Tên người liên hệ khẩn cấp', priority: 'high' },
    { key: 'emergency_contact.phone', label: 'SĐT liên hệ khẩn cấp', priority: 'high' },
  ],
  
  // Bảo hiểm (khuyến khích) - 1 trường
  insurance: [
    { key: 'insurance_number', altKey: 'insurance_bhyt', label: 'Số thẻ bảo hiểm', priority: 'medium' },
  ],
};

// Get all fields as flat array
export const getAllProfileFields = () => {
  return [
    ...PROFILE_FIELDS_CONFIG.basic,
    ...PROFILE_FIELDS_CONFIG.medical,
    ...PROFILE_FIELDS_CONFIG.history,
    ...PROFILE_FIELDS_CONFIG.lifestyle,
    ...PROFILE_FIELDS_CONFIG.emergency,
    ...PROFILE_FIELDS_CONFIG.insurance,
  ];
};

// Priority order for sorting
export const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};
