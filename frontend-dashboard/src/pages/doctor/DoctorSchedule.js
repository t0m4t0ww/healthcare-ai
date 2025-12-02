// src/pages/doctor/DoctorSchedule.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Filter, Search, Check, X, MessageSquare, Stethoscope } from 'lucide-react';
import api from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import socket from '../../services/socket';
import { useNavigate } from 'react-router-dom';
import { LoadingOverlay } from '../../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

const DoctorSchedule = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();
  // Modal states
  const [actionModal, setActionModal] = useState({ open: false, type: null, appointment: null });
  const [reasonText, setReasonText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  
  // ✅ Use ref to store currentDate for socket handlers (avoid stale closure)
  const currentDateRef = useRef(currentDate);
  
  // ✅ Update ref when currentDate changes
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  // Helper function to format chief_complaint
  const formatChiefComplaint = (chief_complaint) => {
    if (!chief_complaint) return 'Khám tổng quát';
    if (typeof chief_complaint === 'string') return chief_complaint;
    if (typeof chief_complaint === 'object') {
      return chief_complaint.main_symptom || 'Khám tổng quát';
    }
    return 'Khám tổng quát';
  };

  // Helper function to format appointment time
  const formatAppointmentTime = (apt) => {
    // Try multiple possible field names for time
    if (apt.appointment_time) return apt.appointment_time;
    if (apt.time) return apt.time;
    if (apt.start_time && apt.end_time) return `${apt.start_time} - ${apt.end_time}`;
    if (apt.start_time) return apt.start_time;
    return 'N/A';
  };

  // ✅ Use useCallback to memoize fetchAppointments and prevent infinite loops
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Use currentDate directly (it's in dependencies, so it's always fresh)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // ✅ FIX: Format dates without timezone conversion
      const firstDayDate = new Date(year, month, 1);
      const lastDayDate = new Date(year, month + 1, 0);
      
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

      // Backend will automatically map user_id to doctor_id
      const response = await api.get('/appointments/doctor', {
        params: {
          date_from: firstDay,
          date_to: lastDay,
        },
      });

      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      console.log('📋 Appointments received:', data);
      console.log('📋 Sample appointment:', data[0]);
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]); // ✅ Recreate when currentDate changes, but use ref in socket handlers

  // ✅ Fetch appointments when currentDate changes
  useEffect(() => {
    fetchAppointments();
  }, [currentDate, fetchAppointments]); // ✅ Depend on both currentDate and fetchAppointments

  // ✅ Real-time Socket.IO updates for appointments and schedule
  // ✅ FIX: Use ref to avoid stale closure and prevent infinite loop
  useEffect(() => {
    if (!user?.doctor_id) return;

    console.log('🔌 [DoctorSchedule] Setting up Socket.IO listeners...');

    // ✅ Create a stable fetch function that uses ref
    const refreshAppointments = () => {
      // Use latest currentDate from ref
      const dateToUse = currentDateRef.current;
      const year = dateToUse.getFullYear();
      const month = dateToUse.getMonth();
      
      const firstDayDate = new Date(year, month, 1);
      const lastDayDate = new Date(year, month + 1, 0);
      
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

      setLoading(true);
      api.get('/appointments/doctor', {
        params: {
          date_from: firstDay,
          date_to: lastDay,
        },
      })
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setAppointments(data);
      })
      .catch((error) => {
        console.error('Error fetching appointments:', error);
      })
      .finally(() => {
        setLoading(false);
      });
    };

    // Listen for appointment updates (confirm, cancel, reschedule)
    const handleAppointmentUpdate = (data) => {
      console.log('📅 [DoctorSchedule] Appointment updated:', data);
      refreshAppointments(); // Refresh calendar using ref
    };

    // Listen for new appointments
    const handleNewAppointment = (data) => {
      console.log('🆕 [DoctorSchedule] New appointment booked:', data);
      refreshAppointments();
    };

    // Listen for slot generation events
    const handleSlotsGenerated = (data) => {
      console.log('⏰ [DoctorSchedule] New slots generated:', data);
      refreshAppointments();
    };

    // Listen for consultation status changes
    const handleConsultationUpdate = (data) => {
      console.log('🩺 [DoctorSchedule] Consultation updated:', data);
      refreshAppointments();
    };

    socket.on('appointment_updated', handleAppointmentUpdate);
    socket.on('new_appointment', handleNewAppointment);
    socket.on('slots_generated', handleSlotsGenerated);
    socket.on('consultation_updated', handleConsultationUpdate);

    return () => {
      console.log('🔌 [DoctorSchedule] Cleaning up Socket.IO listeners...');
      socket.off('appointment_updated', handleAppointmentUpdate);
      socket.off('new_appointment', handleNewAppointment);
      socket.off('slots_generated', handleSlotsGenerated);
      socket.off('consultation_updated', handleConsultationUpdate);
    };
  }, [user]); // ✅ Only depend on user, not currentDate or fetchAppointments

  const getAppointmentsForDate = (date) => {
    // ✅ FIX: Parse date string correctly without timezone issues
    // Format: YYYY-MM-DD (local time, no timezone conversion)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return appointments.filter((apt) => {
      // Get appointment date string (should already be in YYYY-MM-DD format)
      const aptDateStr = apt.appointment_date || apt.date;
      
      // Extract just the date part if it's a full datetime string
      const aptDateOnly = aptDateStr?.split('T')[0];
      
      return aptDateOnly === dateStr;
    });
  };

  const prevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const openActionModal = (type, appointment) => {
    setActionModal({ open: true, type, appointment });
    setReasonText('');
  };

  const closeActionModal = () => {
    setActionModal({ open: false, type: null, appointment: null });
    setReasonText('');
    setActionLoading(false);
  };

  const handleConfirmAppointment = async () => {
    if (!actionModal.appointment) return;
    
    setActionLoading(true);
    try {
      await api.post(`/appointments/${actionModal.appointment._id}/confirm`, {
        note: reasonText || 'Bác sĩ đã xác nhận lịch khám'
      });
      
      toast.success('Đã xác nhận lịch khám thành công!');
      fetchAppointments(); // Reload appointments
      closeActionModal();
    } catch (error) {
      console.error('Error confirming appointment:', error);
      const message = error.response?.data?.message || error.message || 'Không thể xác nhận lịch khám';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!actionModal.appointment) return;
    
    if (!reasonText.trim()) {
      toast.warning('Vui lòng nhập lý do hủy lịch trước khi tiếp tục');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post(`/appointments/${actionModal.appointment._id}/cancel`, {
        reason: reasonText
      });
      
      toast.success('Đã hủy lịch khám thành công!');
      fetchAppointments(); // Reload appointments
      closeActionModal();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      const message = error.response?.data?.message || error.message || 'Không thể hủy lịch khám';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Tìm ngày đầu tiên của tháng
    const firstDay = new Date(year, month, 1);
    
    // Tìm ngày bắt đầu của lịch (thường là Chủ Nhật tuần trước đó)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const calendar = [];
    let day = new Date(startDate);

    // ✅ SỬA LỖI: Thay vì dùng while (dễ gây lặp vô tận khi qua năm mới)
    // Ta dùng vòng lặp cố định 6 tuần (42 ngày) để đảm bảo layout luôn đẹp và an toàn
    const TOTAL_WEEKS = 6;

    for (let i = 0; i < TOTAL_WEEKS; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        // Tạo bản sao của ngày hiện tại để lưu vào mảng
        const currentDay = new Date(day);
        
        const dayAppointments = getAppointmentsForDate(currentDay);
        const isToday = currentDay.toDateString() === new Date().toDateString();
        // Kiểm tra xem ngày này có thuộc tháng đang chọn không
        const isCurrentMonth = currentDay.getMonth() === month;

        week.push({
          date: currentDay,
          appointments: dayAppointments,
          isToday,
          isCurrentMonth,
        });

        // Tăng biến day lên 1 ngày cho vòng lặp tiếp theo
        day.setDate(day.getDate() + 1);
      }
      calendar.push(week);
    }

    return calendar;
  };

  const calendar = renderCalendar();

  const getStatusBadge = (status, is_confirmed) => {
    // ✅ Priority 1: Completed status
    if (status === 'completed') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Đã khám</span>;
    }
    
    // ✅ Priority 2: Cancelled status
    if (status === 'cancelled') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Đã hủy</span>;
    }
    
    // ✅ Priority 3: Rescheduled status
    if (status === 'rescheduled') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Đã đổi lịch</span>;
    }
    
    // ✅ Priority 4: Confirmed booked appointments
    if (status === 'booked' && is_confirmed) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Đã xác nhận</span>;
    }
    
    // ✅ Priority 5: Pending confirmation
    if (status === 'booked' || status === 'pending') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Chờ xác nhận</span>;
    }
    
    // Default
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">{status}</span>;
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const filteredAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate).filter((apt) => filterStatus === 'all' || apt.status === filterStatus)
    : [];

  return (
    <div className="space-y-6 relative">
      {loading && <LoadingOverlay />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Lịch làm việc</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Quản lý lịch hẹn và thời gian làm việc</p>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
        >
          Hôm nay
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
        {/* Calendar Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Tháng sau"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar body */}
          <div className="space-y-2">
            {calendar.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIdx) => {
                  const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={dayIdx}
                      onClick={() => setSelectedDate(day.date)}
                      className={[
                        'min-h-24 p-2 rounded-xl border transition-all text-left',
                        day.isCurrentMonth
                          ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-40',
                        day.isToday ? 'ring-2 ring-emerald-500 border-emerald-500' : '',
                        isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20' : '',
                      ].join(' ')}
                    >
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{day.date.getDate()}</div>
                      {day.appointments.length > 0 && (
                        <div className="space-y-1">
                          {day.appointments.slice(0, 2).map((apt, idx) => (
                            <div
                              key={idx}
                              className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded truncate"
                              title={`${apt.patient_name || apt.patient?.full_name || 'Bệnh nhân'} - ${formatAppointmentTime(apt)} - ${formatChiefComplaint(apt.chief_complaint)}`}
                            >
                              {apt.patient_name || apt.patient?.full_name || 'Bệnh nhân'} • {formatAppointmentTime(apt)}
                            </div>
                          ))}
                          {day.appointments.length > 2 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 px-1">+{day.appointments.length - 2} nữa</div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List for Selected Date */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Lịch hẹn ngày {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400">Không có lịch hẹn trong ngày này</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((apt) => {
                  const aptId = apt._id || apt.id;
                  const expanded = expandedCards.has(aptId);
                  const chiefComplaint = apt.chief_complaint || {};
                  const hasDetails = apt.reason || chiefComplaint.main_symptom || chiefComplaint.associated_symptoms || chiefComplaint.pain_scale !== undefined || chiefComplaint.onset_date;
                  
                  const toggleExpanded = () => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(aptId)) {
                        newSet.delete(aptId);
                      } else {
                        newSet.add(aptId);
                      }
                      return newSet;
                    });
                  };
                  
                  return (
                  <div
                    key={apt._id || apt.id}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600 overflow-hidden"
                  >
                    {/* Main Card Content */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0">
                          {(apt.patient_name || apt.patient?.full_name || 'P').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{apt.patient_name || apt.patient?.full_name || 'Bệnh nhân'}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <Clock size={14} />
                            {formatAppointmentTime(apt)} • {formatChiefComplaint(apt.chief_complaint)}
                          </p>
                          {/* Quick preview of reason if exists */}
                          {apt.reason && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                              📋 {apt.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    
                      <div className="flex items-center gap-2">
                        {getStatusBadge(apt.status, apt.is_confirmed)}
                        
                        {/* Expand/Collapse button for details */}
                        {hasDetails && (
                          <button
                            onClick={toggleExpanded}
                            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            title={expanded ? "Thu gọn" : "Xem chi tiết"}
                          >
                            {expanded ? '▲' : '▼'}
                          </button>
                        )}
                        
                        {/* Action buttons - only show for booked/pending appointments that are NOT confirmed */}
                        {(apt.status === 'booked' || apt.status === 'pending') && !apt.is_confirmed && (
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => openActionModal('confirm', apt)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors"
                              title="Xác nhận lịch"
                            >
                              <Check size={16} />
                              Xác nhận
                            </button>
                            <button
                              onClick={() => openActionModal('cancel', apt)}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors"
                              title="Hủy lịch"
                            >
                              <X size={16} />
                              Hủy
                            </button>
                          </div>
                        )}
                        
                        {/* ⭐ Show consultation button for booked appointments */}
                        {apt.status === 'booked' && apt.is_confirmed && apt.status !== 'completed' && (
                          <button
                            onClick={() => navigate(`/doctor/consultation/${apt._id}`)}
                            className={`px-3 py-1.5 ${
                              apt.consultation_id 
                                ? 'bg-orange-500 hover:bg-orange-600' 
                                : 'bg-blue-500 hover:bg-blue-600'
                            } text-white text-sm rounded-lg flex items-center gap-1 transition-colors ml-3`}
                            title={apt.consultation_id ? "Tiếp tục phiên khám" : "Bắt đầu khám bệnh"}
                          >
                            <Stethoscope size={16} />
                            {apt.consultation_id ? 'Tiếp tục khám' : 'Bắt đầu khám'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Details Section */}
                    {expanded && hasDetails && (
                      <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-600 pt-4 space-y-3 bg-white dark:bg-slate-800/50">
                        {/* Lý do khám */}
                        {apt.reason && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                              📋 Lý do khám
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{apt.reason}</p>
                          </div>
                        )}
                        
                        {/* Triệu chứng chính */}
                        {chiefComplaint.main_symptom && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1 flex items-center gap-1">
                              🔴 Triệu chứng chính
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{chiefComplaint.main_symptom}</p>
                          </div>
                        )}
                        
                        {/* Các triệu chứng kèm theo */}
                        {chiefComplaint.associated_symptoms && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                              ⚠️ Các triệu chứng kèm theo
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{chiefComplaint.associated_symptoms}</p>
                          </div>
                        )}
                        
                        {/* Grid for onset_date and pain_scale */}
                        {(chiefComplaint.onset_date || chiefComplaint.pain_scale !== undefined) && (
                          <div className="grid grid-cols-2 gap-3">
                            {/* Bắt đầu từ ngày nào */}
                            {chiefComplaint.onset_date && (
                              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                                  📅 Bắt đầu từ ngày nào?
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {new Date(chiefComplaint.onset_date).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            )}
                            
                            {/* Mức độ đau */}
                            {chiefComplaint.pain_scale !== undefined && chiefComplaint.pain_scale !== null && (
                              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                                  😣 Mức độ đau / Khó chịu
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all"
                                      style={{ width: `${(chiefComplaint.pain_scale / 10) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {chiefComplaint.pain_scale}/10
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Action Modal - Confirm/Cancel */}
      {actionModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className={`px-6 py-4 border-b border-slate-200 dark:border-slate-700 ${
              actionModal.type === 'confirm' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                : 'bg-gradient-to-r from-red-500 to-pink-500'
            }`}>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {actionModal.type === 'confirm' ? (
                  <><Check size={24} /> Xác nhận lịch khám</>
                ) : (
                  <><X size={24} /> Hủy lịch khám</>
                )}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Patient info */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Bệnh nhân</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {actionModal.appointment?.patient_name || actionModal.appointment?.patient?.full_name || 'N/A'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  <Clock size={14} className="inline mr-1" />
                  {formatAppointmentTime(actionModal.appointment || {})} • {new Date(actionModal.appointment?.appointment_date || actionModal.appointment?.date).toLocaleDateString('vi-VN')}
                </p>
              </div>
              
              {/* Reason input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {actionModal.type === 'confirm' 
                    ? 'Ghi chú (không bắt buộc)' 
                    : 'Lý do hủy (bắt buộc) *'}
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={actionModal.type === 'confirm' 
                    ? 'Ví dụ: Đã xem triệu chứng, sẽ khám đúng giờ...' 
                    : 'Ví dụ: Bận công việc, cần đổi lịch...'}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-24"
                  required={actionModal.type === 'cancel'}
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeActionModal}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={actionModal.type === 'confirm' ? handleConfirmAppointment : handleCancelAppointment}
                  disabled={actionLoading}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                    actionModal.type === 'confirm'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  }`}
                >
                  {actionLoading ? 'Đang xử lý...' : (actionModal.type === 'confirm' ? 'Xác nhận' : 'Hủy lịch')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedule;