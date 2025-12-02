import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { formatDate, formatCurrency, formatCountdown } from '../utils/dateHelpers';
import { SPECIALTIES } from '../../../../constants/specialties';

export const BookingSummary = ({ 
  doctor, 
  date, 
  slot, 
  patientInfo,
  reason,
  setReason,
  chiefComplaint,
  setChiefComplaint,
  timeRemaining,
  onConfirm,
  onBack,
  isConfirming
}) => {
  const isExpired = timeRemaining <= 0;
  const [validationErrors, setValidationErrors] = React.useState({});

  // Helper để update chief complaint
  const updateChiefComplaint = (field, value) => {
    setChiefComplaint(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validation helper
  const validateField = (field, value) => {
    if (field === 'reason' && !value?.trim()) {
      return 'Vui lòng nhập lý do khám';
    }
    return null;
  };

  const handleReasonChange = (e) => {
    const value = e.target.value;
    setReason(value);
    // Clear error when user types
    if (validationErrors.reason) {
      setValidationErrors(prev => ({ ...prev, reason: null }));
    }
  };

  const handleConfirm = () => {
    // Validate before confirm
    const errors = {};
    if (!reason?.trim()) {
      errors.reason = 'Vui lòng nhập lý do khám';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    onConfirm();
  };

  return (
    <div className="space-y-6">
      {/* Warning if expired */}
      {isExpired && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-900 mb-1">Hết thời gian giữ chỗ</h4>
            <p className="text-sm text-red-700">
              Slot của bạn đã hết thời gian giữ. Vui lòng quay lại chọn slot khác.
            </p>
          </div>
        </motion.div>
      )}

      {/* Countdown Timer */}
      {!isExpired && timeRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-600 dark:bg-amber-700 rounded-2xl p-6 text-white shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm opacity-90">Thời gian còn lại</p>
                <p className="text-3xl font-bold">{formatCountdown(timeRemaining)}</p>
              </div>
            </div>
            <CheckCircle2 size={48} className="opacity-20" />
          </div>
        </motion.div>
      )}

      {/* Booking Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-700">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Thông tin đặt khám</h3>

        {/* Doctor Info */}
        <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-md">
              {doctor.avatar_url ? (
                <img 
                  src={doctor.avatar_url} 
                  alt={doctor.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <User size={32} />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{doctor.name}</h4>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm mb-2">
                {SPECIALTIES[doctor.specialty]?.name || 
                 SPECIALTIES[doctor.doctor_profile?.specialization]?.name || 
                 doctor.specialty || 
                 'Chuyên khoa'}
              </p>
              {doctor.doctor_profile?.consultation_fee && (
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(doctor.doctor_profile.consultation_fee)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ngày khám</p>
              <p className="font-semibold">{formatDate(date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Giờ khám</p>
              <p className="font-semibold">{slot?.start_time} - {slot?.end_time}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
              <MapPin size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Địa điểm</p>
              <p className="font-semibold">
                {doctor.doctor_profile?.clinic_address || 'Phòng khám Healthcare AI'}
              </p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 mb-6">
          <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <User size={18} />
            Thông tin bệnh nhân
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Họ tên</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {patientInfo?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Số điện thoại</p>
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                <Phone size={14} />
                {patientInfo?.phone || 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-semibold text-slate-900 flex items-center gap-1">
                <Mail size={14} />
                {patientInfo?.email || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* ===== LÝ DO KHÁM & TRIỆU CHỨNG ===== */}
        <div className="space-y-6">
          {/* 1. Lý do khám - BẮT BUỘC */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FileText size={14} className="text-emerald-600" />
              </div>
              Lý do khám
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={handleReasonChange}
              placeholder="Ví dụ: Khám định kỳ, Tư vấn sức khỏe, Tái khám sau điều trị..."
              rows={3}
              className={`w-full px-4 py-3 bg-slate-50 border-2 ${
                validationErrors.reason 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
              } focus:bg-white rounded-xl text-slate-900 placeholder-slate-400 transition-all duration-300 focus:ring-4 outline-none resize-none font-medium`}
            />
            {validationErrors.reason && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1 font-medium">
                <AlertCircle size={14} />
                {validationErrors.reason}
              </p>
            )}
          </div>

          {/* 2. Triệu chứng chi tiết - TÙY CHỌN */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity size={14} className="text-blue-600" />
                </div>
                Triệu chứng chi tiết
              </h4>
              <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full">
                Tùy chọn
              </span>
            </div>

            <div className="space-y-4">
              {/* Thời điểm khởi phát */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500" />
                  Bắt đầu từ ngày nào?
                </label>
                <input
                  type="date"
                  value={chiefComplaint.onset_date}
                  onChange={(e) => updateChiefComplaint('onset_date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 transition-all duration-300 focus:ring-4 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Triệu chứng chính */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-500" />
                  Triệu chứng chính
                </label>
                <textarea
                  value={chiefComplaint.main_symptom}
                  onChange={(e) => updateChiefComplaint('main_symptom', e.target.value)}
                  placeholder="Mô tả chi tiết: Đau đầu vùng thái dương, đau âm ỉ kéo dài..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 transition-all duration-300 focus:ring-4 focus:ring-blue-100 outline-none resize-none"
                />
              </div>

              {/* Triệu chứng kèm theo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Các triệu chứng kèm theo
                </label>
                <textarea
                  value={chiefComplaint.associated_symptoms}
                  onChange={(e) => updateChiefComplaint('associated_symptoms', e.target.value)}
                  placeholder="Buồn nôn, chóng mặt, mệt mỏi, khó ngủ, căng cơ vai gáy..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 transition-all duration-300 focus:ring-4 focus:ring-blue-100 outline-none resize-none"
                />
              </div>

              {/* Mức độ đau */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Mức độ đau / Khó chịu
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={chiefComplaint.pain_scale}
                    onChange={(e) => updateChiefComplaint('pain_scale', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className={`w-14 h-14 flex items-center justify-center rounded-xl font-bold text-xl border-2 shadow-sm ${
                    chiefComplaint.pain_scale >= 7 
                      ? 'bg-red-50 border-red-500 text-red-600'
                      : chiefComplaint.pain_scale >= 4
                      ? 'bg-amber-50 border-amber-500 text-amber-600'
                      : 'bg-green-50 border-green-500 text-green-600'
                  }`}>
                    {chiefComplaint.pain_scale}
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-slate-500 px-1">
                  <span>😊 Không đau</span>
                  <span>😐 Vừa phải</span>
                  <span>😣 Rất đau</span>
                </div>
              </div>
            </div>

            {/* Helper note */}
            <div className="mt-4 p-3 bg-blue-100/50 border border-blue-300 rounded-xl">
              <p className="text-xs text-blue-900 flex items-start gap-2">
                <span className="text-sm">💡</span>
                <span>
                  <strong>Mẹo:</strong> Thông tin chi tiết giúp bác sĩ hiểu rõ tình trạng và chuẩn bị tốt hơn cho buổi khám.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isConfirming}
            className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Quay lại
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || !reason?.trim() || isExpired}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xác nhận...
              </span>
            ) : (
              'Xác nhận đặt khám'
            )}
          </button>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Lưu ý:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Vui lòng đến trước giờ hẹn 15 phút</li>
            <li>Mang theo CMND/CCCD và thẻ BHYT (nếu có)</li>
            <li>Liên hệ phòng khám nếu cần thay đổi lịch hẹn</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
