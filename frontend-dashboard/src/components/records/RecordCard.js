// src/components/records/RecordCard.jsx - UPDATED ✅
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, Download, Stethoscope, Activity, AlertCircle, FileText, Star
} from 'lucide-react';
import { Tag } from 'antd';
import { RECORD_TYPES } from '../../constants/recordConstants';
import { getSpecialtyName } from '../../constants/specialtyConstants'; // ✅ Import specialty mapping

const RecordCard = ({ record, onView, onDownload, onRate, hasRated }) => {
  // Helper: Map visit_type to Vietnamese
  const mapVisitType = (type) => {
    const typeMap = {
      'consultation': 'Khám tư vấn',
      'checkup': 'Khám tổng quát',
      'emergency': 'Cấp cứu',
      'followup': 'Tái khám'
    };
    return typeMap[type] || 'Khám bệnh';
  };

  // Helper: Format date to DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return 'N/A';
    }
  };

  // Helper: Truncate text (increased for wider cards)
  const truncate = (text, maxLength = 120) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Extract data
  const visitType = mapVisitType(record.visit_type || record.type);
  
  // ✅ Debug: Log record to see what API returns
  console.log('📋 RecordCard - Full record:', record);
  console.log('👨‍⚕️ RecordCard - doctor field:', record.doctor);
  console.log('👨‍⚕️ RecordCard - doctor_info field:', record.doctor_info);
  
  // ✅ Try multiple fields for doctor name (API might return different formats)
  const doctorInfo = record.doctor || record.doctor_info || {};
  console.log('👨‍⚕️ RecordCard - doctorInfo combined:', doctorInfo);
  
  const doctorName = doctorInfo.full_name || doctorInfo.name || doctorInfo.doctor_name || null;
  console.log('👨‍⚕️ RecordCard - Final doctorName:', doctorName);
  
  // ✅ Map specialty code to Vietnamese name
  const specialtyCode = doctorInfo.specialty || doctorInfo.subspecialty;
  const specialtyDisplay = getSpecialtyName(specialtyCode); // e.g., "general_medicine" → "Nội tổng quát"
  
  const recordDate = record.visit_date || record.created_at || record.date;
  const chiefComplaint = record.chief_complaint;
  const diagnosis = record.diagnosis;

  // Compose title with Vietnamese specialty
  const title = specialtyDisplay ? `${visitType} – ${specialtyDisplay}` : visitType;

  // Compose meta line with proper doctor name display
  const doctorDisplay = doctorName ? `Bác sĩ ${doctorName}` : 'Chưa có thông tin bác sĩ';
  const metaLine = `${formatDate(recordDate)} • ${doctorDisplay}`;

  // Type config for icon/color
  const typeConfig = RECORD_TYPES[record.type || 'consultation'] || RECORD_TYPES.consultation;
  const Icon = typeConfig.icon || Stethoscope;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: '0 20px 40px -12px rgba(16, 185, 129, 0.25)' }}
      className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 overflow-hidden transition-all duration-300 group"
    >
      {/* Header with gradient */}
      <div className="relative p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-700 dark:via-slate-700 dark:to-slate-700 border-b-2 border-emerald-100 dark:border-slate-600">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`w-14 h-14 ${typeConfig.bgColor} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 ${typeConfig.borderColor || 'border-emerald-200'}`}>
              <Icon size={22} className={typeConfig.textColor} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Dòng 1: Tiêu đề */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 truncate">
                {title}
              </h3>
              {/* Dòng 2: Meta */}
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-3">
                {metaLine}
              </p>
              {/* Dòng 3: Lý do khám */}
              {chiefComplaint && (
                <div className="mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Lý do: </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {truncate(chiefComplaint, 120)}
                  </span>
                </div>
              )}
              {/* Dòng 4: Chẩn đoán */}
              {diagnosis && (
                <div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Chẩn đoán: </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {truncate(diagnosis, 120)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={() => onView(record)}
              className="p-2.5 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600"
              title="Xem chi tiết"
            >
              <Eye size={18} className="text-emerald-600 dark:text-emerald-400" />
            </button>
            <button
              onClick={() => onDownload(record)}
              className="p-2.5 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-xl transition-all shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-teal-600"
              title="Tải về"
            >
              <Download size={18} className="text-teal-600 dark:text-teal-400" />
            </button>
            
            {/* Rating button - chỉ hiển thị nếu có onRate function và record có appointment_id */}
            {onRate && record.appointment_id && (
              <button
                onClick={() => onRate(record)}
                className={`p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md border ${
                  hasRated 
                    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 cursor-default'
                    : 'bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
                title={hasRated ? 'Đã đánh giá' : 'Đánh giá bác sĩ'}
                disabled={hasRated}
              >
                <Star 
                  size={18} 
                  className={hasRated ? 'text-amber-500 fill-amber-500' : 'text-amber-600 dark:text-amber-400'}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer preview */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-600">
        <div className="flex items-center justify-between gap-4">
          {/* Medications count */}
          {record.medications && record.medications.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{record.medications.length} loại thuốc được kê đơn</span>
            </div>
          )}
          
          {/* Rating status */}
          {onRate && record.appointment_id && (
            <Tag 
              color={hasRated ? 'gold' : 'default'}
              icon={hasRated ? <Star size={14} /> : null}
              className="flex items-center gap-1"
            >
              {hasRated ? 'Đã đánh giá' : 'Chưa đánh giá'}
            </Tag>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RecordCard;
