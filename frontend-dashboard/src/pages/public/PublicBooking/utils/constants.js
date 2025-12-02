// Slot status constants (must match backend lowercase values)
export const SLOT_STATUS = {
  AVAILABLE: 'available',
  LOW_LEFT: 'LOW_LEFT',
  UNAVAILABLE: 'UNAVAILABLE',
  HELD: 'hold'
};

// Slot status colors (keys must match SLOT_STATUS values)
export const SLOT_COLORS = {
  'available': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    hover: 'hover:bg-emerald-100',
    ring: 'ring-emerald-100'
  },
  'LOW_LEFT': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hover: 'hover:bg-amber-100',
    ring: 'ring-amber-100'
  },
  'UNAVAILABLE': {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-400',
    hover: '',
    ring: ''
  },
  'hold': {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-800',
    hover: 'hover:bg-amber-200',
    ring: 'ring-amber-200'
  }
};

// Hold duration in seconds (2 minutes)
export const HOLD_DURATION = 120;

// Low slot threshold
export const LOW_SLOT_THRESHOLD = 3;

// Import specialty constants
import { SPECIALTIES as SPECIALTY_CONFIG } from '../../../../constants/specialties';

// Specialty options for filter dropdown  
export const SPECIALTIES = [
  { value: 'all', label: '🏥 Tất cả chuyên khoa' },
  ...Object.values(SPECIALTY_CONFIG).map(spec => ({
    value: spec.code,
    label: `🩺 ${spec.name}`
  }))
];

// Gender options
export const GENDERS = [
  { value: 'all', label: 'Tất cả giới tính' },
  { value: 'male', label: '👨 Nam' },
  { value: 'female', label: '👩 Nữ' }
];

// Rating options
export const RATINGS = [
  { value: 'all', label: 'Tất cả đánh giá' },
  { value: '4.5', label: '⭐ 4.5 sao trở lên' },
  { value: '4.0', label: '⭐ 4.0 sao trở lên' },
  { value: '3.5', label: '⭐ 3.5 sao trở lên' }
];

// Appointment types
export const APPOINTMENT_TYPES = [
  { value: 'offline', label: 'Khám trực tiếp', icon: '🏥' },
  { value: 'video', label: 'Khám video call', icon: '📹' }
];

// Booking steps
export const BOOKING_STEPS = [
  { num: 1, label: 'Chọn bác sĩ', key: 'doctor' },
  { num: 2, label: 'Chọn ngày & giờ', key: 'datetime' },
  { num: 3, label: 'Xác nhận', key: 'confirm' }
];
