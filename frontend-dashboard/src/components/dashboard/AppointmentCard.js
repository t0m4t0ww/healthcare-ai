// frontend-dashboard/src/components/dashboard/AppointmentCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Clock, Star, FileText, MapPin, CheckCircle, Info } from "lucide-react";
import { APPOINTMENT_TYPE_MAP } from "../../constants/appointmentConstants";
import { getRoomLocation } from "../../utils/dashboardHelpers";

const AppointmentCard = ({ appointment, index }) => {
  // ✅ Handle API format
  const doctor = appointment.doctor_info || {};
  const date = appointment.date || "";
  const time = appointment.start_time || appointment.slot_info?.start_time || "";
  const status = (appointment.status || "pending").toLowerCase();
  const isConfirmed = Boolean(appointment.is_confirmed) || status === "confirmed";


  const rawType = appointment.appointment_type || appointment.type || "";
  const type = APPOINTMENT_TYPE_MAP[rawType.toLowerCase()] || rawType || "Khám bệnh";
  const location = getRoomLocation(appointment);
  
  const isToday = date && new Date(date).toDateString() === new Date().toDateString();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-6 rounded-3xl border-2 transition-all duration-300 shadow-lg hover:shadow-2xl bg-white dark:bg-slate-900 ${
        isToday 
          ? 'border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900/30' 
          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
      }`}
    >
      {isToday && (
        <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
          HÔM NAY
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-2xl">
          {doctor.avatar_url || doctor.avatar || '👨‍⚕️'}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">{doctor.name || 'Bác sĩ'}</h4>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                {doctor.specialty || doctor.doctor_profile?.specialization || 'Chuyên khoa'}
              </p>
            </div>
            <div className="text-right">
              {doctor.rating && (
                <div className="flex items-center gap-1 mb-1">
                  <Star size={14} className="text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{doctor.rating}</span>
                </div>
              )}
                <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status === 'rescheduled' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  isConfirmed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                  status === 'cancelled' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                  status === 'completed' ? 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400' :
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}
              >
                {status === 'rescheduled' ? 'Đã đổi lịch' :
                 status === 'completed' ? 'Hoàn thành' :
                 isConfirmed ? 'Đã xác nhận' : 
                 status === 'cancelled' ? 'Đã hủy' : 
                 'Chờ xác nhận'}
             </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-emerald-500" />
              <span>{date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa xác định'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-emerald-500" />
              <span>{time || 'Chưa xác định'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-emerald-500" />
              <span>{type}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-500" />
              <span className="truncate">{location}</span>
            </div>
          </div>
                   {/* Hiển thị confirm_note nếu đã xác nhận */}
          {isConfirmed && appointment.confirm_note && (
            <div className="mb-3 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2">
              <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="text-sm text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">Ghi chú xác nhận: </span>
                {appointment.confirm_note}
                {appointment.confirmed_at && (
                  <span className="ml-2 text-emerald-600/80">
                    ({new Date(appointment.confirmed_at).toLocaleString('vi-VN')})
                  </span>
                )}
              </div>
            </div>
         )}
          
          <div className="flex gap-2">
            <Link
              to={`/patient/appointments`}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium text-center"
            >
              Xem chi tiết
            </Link>
            <Link
              to={`/patient/booking?doctorId=${appointment.doctor_id || doctor._id}&reschedule=${appointment._id}`}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              Đổi lịch
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
