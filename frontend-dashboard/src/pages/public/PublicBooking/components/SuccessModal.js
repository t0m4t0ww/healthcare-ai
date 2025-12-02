import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Calendar, 
  MessageCircle, 
  ArrowRight,
  Sparkles 
} from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/dateHelpers';
import { getSpecialtyName } from '../../../../constants/specialtyConstants';

export const SuccessModal = ({ appointment, doctor, onClose, isReschedule = false }) => {
  const navigate = useNavigate();

  const handleViewAppointments = () => {
    navigate('/patient/appointments');
  };

  const handleOpenChat = () => {
    navigate('/patient/messages');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Success Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative text-center">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 200 }}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
            >
              <CheckCircle2 size={48} className="text-emerald-500" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2 flex items-center justify-center gap-2"
            >
              <Sparkles size={24} />
              {isReschedule ? 'Đổi lịch khám thành công!' : 'Đặt khám thành công!'}
              <Sparkles size={24} />
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg opacity-90"
            >
              {isReschedule 
                ? 'Lịch khám mới của bạn đang đợi bác sĩ xác nhận'
                : 'Lịch hẹn của bạn đang đợi bác sĩ xác nhận'
              }
            </motion.p>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="p-8">
          {/* Doctor Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg flex-shrink-0">
                {doctor?.avatar_url ? (
                  <img 
                    src={doctor.avatar_url} 
                    alt={doctor.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  doctor?.name?.charAt(0) || 'BS'
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {doctor?.name || 'Bác sĩ'}
                </h3>
                <p className="text-emerald-600 font-semibold mb-2">
                  {getSpecialtyName(doctor?.specialty || doctor?.doctor_profile?.specialization || doctor?.specialty_name) || 'Chuyên khoa'}
                </p>
                {doctor?.doctor_profile?.consultation_fee && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Phí khám:</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(doctor.doctor_profile.consultation_fee)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Appointment Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Calendar size={20} />
                <span className="text-sm font-semibold">Ngày khám</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {formatDate(appointment?.appointment_date)}
              </p>
            </div>

            <div className="bg-purple-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Calendar size={20} />
                <span className="text-sm font-semibold">Giờ khám</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {appointment?.start_time}
              </p>
            </div>
          </motion.div>

          {/* Booking Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 text-center"
          >
            <p className="text-sm text-amber-700 mb-1">Mã đặt khám</p>
            <p className="text-2xl font-bold text-amber-900 tracking-wider">
              {appointment?.appointment_id 
                || appointment?._id 
                || appointment?.id
                || (appointment?.data && (appointment.data.appointment_id || appointment.data._id || appointment.data.id))
                || 'N/A'}
            </p>
            <p className="text-xs text-amber-600 mt-1">Vui lòng lưu mã này để tra cứu</p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <button
              onClick={handleViewAppointments}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              <Calendar size={20} />
              <span>Xem lịch hẹn</span>
              <ArrowRight 
                size={20} 
                className="group-hover:translate-x-1 transition-transform" 
              />
            </button>

            <button
              onClick={handleOpenChat}
              className="w-full px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 group"
            >
              <MessageCircle size={20} />
              <span>Mở chat trước khám</span>
              <ArrowRight 
                size={20} 
                className="group-hover:translate-x-1 transition-transform" 
              />
            </button>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Đóng
            </button>
          </motion.div>

          {/* Info Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <p className="text-sm text-blue-900 text-center">
              📧 Bạn hãy đợi bác sĩ xác nhận lịch hẹn để bắt đầu chat
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
