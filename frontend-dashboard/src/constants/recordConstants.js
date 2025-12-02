// frontend-dashboard/src/constants/recordConstants.js
import {
  Stethoscope,
  Activity,
  Zap,
  FileText,
  FileImage,
  Pill
} from "lucide-react";

// Record type configurations
export const RECORD_TYPES = {
  consultation: {
    label: 'Chuyên khoa',
    icon: Stethoscope,
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700'
  },
  checkup: {
    label: 'Tổng quát',
    icon: Activity,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700'
  },
  emergency: {
    label: 'Cấp cứu',
    icon: Zap,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700'
  },
  lab_test: {
    label: 'Xét nghiệm',
    icon: FileText,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700'
  },
  imaging: {
    label: 'Chẩn đoán hình ảnh',
    icon: FileImage,
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700'
  },
  prescription: {
    label: 'Đơn thuốc',
    icon: Pill,
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700'
  }
};
