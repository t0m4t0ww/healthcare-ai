// frontend-dashboard/src/constants/appointmentConstants.js

// ✅ Map backend lowercase status to display
export const STATUS_META = {
  // Backend status (lowercase)
  confirmed: { color: "green", text: "Đã xác nhận" },
  booked: { color: "green", text: "Đã đặt" },
  pending: { color: "gold", text: "Chờ xác nhận" },
  completed: { color: "blue", text: "Đã hoàn thành" },
  cancelled: { color: "red", text: "Đã hủy" },
  no_show: { color: "default", text: "Không đến" },
  checked_in: { color: "cyan", text: "Đã check-in" },
  in_progress: { color: "purple", text: "Đang khám" },
  hold: { color: "orange", text: "Đang giữ" },
  
  // Legacy uppercase (for compatibility)
  CONFIRMED: { color: "green", text: "Đã xác nhận" },
  BOOKED: { color: "green", text: "Đã đặt" },
  PENDING: { color: "gold", text: "Chờ xác nhận" },
  COMPLETED: { color: "blue", text: "Đã hoàn thành" },
  CANCELLED: { color: "red", text: "Đã hủy" },
  NO_SHOW: { color: "default", text: "Không đến" },
  CHECKED_IN: { color: "cyan", text: "Đã check-in" },
  IN_PROGRESS: { color: "purple", text: "Đang khám" },
  HOLD: { color: "orange", text: "Đang giữ" },
};

// Appointment type mapping to Vietnamese
export const APPOINTMENT_TYPE_MAP = {
  'offline': 'Khám trực tiếp',
  'online': 'Khám online',
  'consultation': 'Tư vấn',
  'checkup': 'Khám định kỳ',
  'emergency': 'Cấp cứu'
};

// Custom CSS for animations
export const ANIMATION_STYLES = `
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes gradient-shift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient-shift 3s ease infinite;
  }
`;
