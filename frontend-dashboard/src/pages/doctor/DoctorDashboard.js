// src/pages/doctor/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Activity,
  TrendingUp,
  Play,
  AlertCircle,
  Phone,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import socket from '../../services/socket';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import pushNotificationService from '../../services/pushNotificationService';
import { getTodayLocal, getDateFromNow } from '../../utils/dateUtils';
import moment from 'moment';

const DoctorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    weekAppointments: 0,
    totalPatients: 0,
    completedToday: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [performanceChartData, setPerformanceChartData] = useState([]);
  const [appointmentTrendsData, setAppointmentTrendsData] = useState([]);

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
    if (apt.slot_info?.time) return apt.slot_info.time;
    if (apt.slot_info?.start_time && apt.slot_info?.end_time) {
      return `${apt.slot_info.start_time} - ${apt.slot_info.end_time}`;
    }
    return 'N/A';
  };

  useEffect(() => {
    // ✅ Đợi auth load xong
    if (authLoading) {
      console.log('⏳ Waiting for auth to load...');
      return;
    }
    
    // ✅ Kiểm tra user có tồn tại không
    if (!user) {
      console.error('❌ No user found after auth loaded!');
      return;
    }
    
    console.log('✅ User loaded, fetching dashboard data...');
    fetchDashboardData();
  }, [user, authLoading]); // ✅ Depend on both user and authLoading

  // ✅ Real-time Socket.IO updates with Push Notifications
  useEffect(() => {
    if (!user?.doctor_id && !user?.id) return;

    console.log('🔌 [DoctorDashboard] Setting up Socket.IO listeners...');

    // Listen for appointment updates
    const handleAppointmentUpdate = (data) => {
      console.log('📅 [DoctorDashboard] Appointment updated:', data);
      fetchDashboardData(); // Refresh dashboard data
    };

    // Listen for new appointments
    const handleNewAppointment = (data) => {
      console.log('🆕 [DoctorDashboard] New appointment:', data);
      fetchDashboardData();
      
      // 🔔 Desktop notification for new appointment
      pushNotificationService.notifyNewAppointment(data);
    };

    // Listen for consultation events
    const handleConsultationUpdate = (data) => {
      console.log('🩺 [DoctorDashboard] Consultation updated:', data);
      fetchDashboardData();
    };

    // Listen for slot generation (for schedule updates)
    const handleSlotsGenerated = (data) => {
      console.log('⏰ [DoctorDashboard] Slots generated:', data);
      fetchDashboardData();
    };

    socket.on('appointment_updated', handleAppointmentUpdate);
    socket.on('new_appointment', handleNewAppointment);
    socket.on('consultation_updated', handleConsultationUpdate);
    socket.on('slots_generated', handleSlotsGenerated);

    return () => {
      console.log('🔌 [DoctorDashboard] Cleaning up Socket.IO listeners...');
      socket.off('appointment_updated', handleAppointmentUpdate);
      socket.off('new_appointment', handleNewAppointment);
      socket.off('consultation_updated', handleConsultationUpdate);
      socket.off('slots_generated', handleSlotsGenerated);
    };
  }, [user]);

  // 🔔 Request notification permission on mount
  useEffect(() => {
    const requestNotificationPermission = async () => {
      const granted = await pushNotificationService.requestPermission();
      if (granted) {
        console.log('✅ Notification permission granted');
      }
    };
    
    requestNotificationPermission();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('🔍 DoctorDashboard - user object:', user);
      console.log('🔍 DoctorDashboard - user.id:', user?.id);
      console.log('🔍 DoctorDashboard - user.user_id:', user?.user_id);
      
      // ✅ FIX: Use local date without timezone conversion
      const today = getTodayLocal();
      const nextWeek = getDateFromNow(7);
      const lastWeek = getDateFromNow(-7); // 7 ngày trước

      // ✅ Backend uses auth token, no need for doctor_id param
      // Lấy appointments từ 7 ngày trước đến 7 ngày tới để có đủ dữ liệu cho charts
      const response = await api.get('/appointments/doctor', {
        params: {
          date_from: lastWeek,
          date_to: nextWeek,
        },
      });

      const appointments = Array.isArray(response.data) ? response.data : response.data?.data || [];

      // Filter today's appointments
      const today_apts = appointments.filter((apt) => {
        // ✅ FIX: Extract date string directly without timezone conversion
        const aptDate = (apt.date || apt.appointment_date)?.split('T')[0];
        return aptDate === today;
      });

      // Filter upcoming (không bao gồm hôm nay)
      const upcoming = appointments.filter((apt) => {
        // ✅ FIX: Extract date string directly without timezone conversion
        const aptDate = (apt.date || apt.appointment_date)?.split('T')[0];
        return aptDate > today;
      });

      setTodayAppointments(today_apts);
      setUpcomingAppointments(upcoming);

      const completedToday = today_apts.filter((apt) => apt.status === 'completed').length;

      setStats({
        todayAppointments: today_apts.length,
        weekAppointments: appointments.length,
        totalPatients: new Set(appointments.map((apt) => apt.patient_id)).size,
        completedToday,
      });

      // Prepare performance chart data (last 7 days)
      const performanceData = generatePerformanceData(appointments);
      setPerformanceChartData(performanceData);
      
      // Prepare appointment trends data (last 7 days)
      const trendsData = generateAppointmentTrendsData(appointments);
      setAppointmentTrendsData(trendsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // ✅ Set loading false even on error
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = (appointment) => {
    navigate(`/doctor/consultation/${appointment._id || appointment.id}`);
  };

  // Generate performance data (last 7 days)
  const generatePerformanceData = (appointments) => {
    const data = [];
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dayName = days[date.day()];
      
      const dayAppointments = appointments.filter((apt) => {
        if (!apt || (!apt.date && !apt.appointment_date)) return false;
        try {
          const aptDate = moment(apt.date || apt.appointment_date);
          if (!aptDate.isValid()) return false;
          return aptDate.isSame(date, 'day');
        } catch (e) {
          console.warn('Invalid appointment date:', apt.date || apt.appointment_date);
          return false;
        }
      });
      
      const completed = dayAppointments.filter((apt) => {
        const status = (apt.status || '').toLowerCase();
        return status === 'completed' || status === 'complete';
      }).length;
      
      const cancelled = dayAppointments.filter((apt) => {
        const status = (apt.status || '').toLowerCase();
        return status === 'cancelled' || status === 'canceled';
      }).length;
      
      data.push({
        date: dayName,
        completed,
        cancelled,
        total: dayAppointments.length,
        completionRate: dayAppointments.length > 0 ? Math.round((completed / dayAppointments.length) * 100) : 0
      });
    }
    
    return data;
  };

  // Generate appointment trends data (last 7 days)
  const generateAppointmentTrendsData = (appointments) => {
    const data = [];
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dayName = days[date.day()];
      
      const dayAppointments = appointments.filter((apt) => {
        if (!apt || (!apt.date && !apt.appointment_date)) return false;
        try {
          const aptDate = moment(apt.date || apt.appointment_date);
          if (!aptDate.isValid()) return false;
          return aptDate.isSame(date, 'day');
        } catch (e) {
          console.warn('Invalid appointment date:', apt.date || apt.appointment_date);
          return false;
        }
      });
      
      const completed = dayAppointments.filter((apt) => {
        const status = (apt.status || '').toLowerCase();
        return status === 'completed' || status === 'complete';
      }).length;
      
      data.push({
        date: dayName,
        appointments: dayAppointments.length,
        completed: completed
      });
    }
    
    return data;
  };

  const statCards = [
    {
      label: 'Lịch hôm nay',
      value: stats.todayAppointments,
      icon: Calendar,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    {
      label: 'Tuần này',
      value: stats.weekAppointments,
      icon: Clock,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      label: 'Bệnh nhân',
      value: stats.totalPatients,
      icon: Users,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    },
    {
      label: 'Hoàn thành',
      value: stats.completedToday,
      icon: CheckCircle2,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
    },
  ];

  const getStatusBadge = (status) => {
    const configs = {
      pending: { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
      confirmed: { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      completed: { text: 'Hoàn thành', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      cancelled: { text: 'Đã hủy', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    };
    const config = configs[status] || configs.pending;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.text}</span>;
  };

  if (loading) {
    return <LoadingSkeleton.Dashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Chào mừng trở lại, <strong>BS. {user?.name || 'Bác sĩ'}</strong>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`${stat.bgColor} rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon size={24} className={stat.textColor} />
                </div>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className={`text-3xl font-bold ${stat.textColor} mb-1`}>{stat.value}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Appointments */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={20} className="text-emerald-500" />
            Lịch hẹn hôm nay ({todayAppointments.length})
          </h2>
        </div>
        <div className="p-6">
          {todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Không có lịch hẹn hôm nay</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((apt) => {
                const appointmentTime = formatAppointmentTime(apt);
                const reason = apt.reason || formatChiefComplaint(apt.chief_complaint);
                return (
                  <div
                    key={apt._id || apt.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0">
                        {(apt.patient?.full_name || apt.patient_name || 'P').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {apt.patient?.full_name || apt.patient_name || 'Bệnh nhân'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <Clock size={14} className="flex-shrink-0" />
                          <span>{appointmentTime}</span>
                        </p>
                        {reason && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 truncate" title={reason}>
                            📋 {reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(apt.status)}
                      {apt.status === 'confirmed' && (
                        <button
                          onClick={() => handleStartConsultation(apt)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                        >
                          <Play size={16} />
                          Bắt đầu khám
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock size={20} className="text-blue-500" />
            Lịch sắp tới ({upcomingAppointments.length})
          </h2>
        </div>
        <div className="p-6">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Không có lịch hẹn sắp tới</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingAppointments.slice(0, 6).map((apt) => {
                const aptDate = new Date(apt.date || apt.appointment_date);
                const formattedDate = aptDate.toLocaleDateString('vi-VN');
                const appointmentTime = formatAppointmentTime(apt);
                const reason = apt.reason || formatChiefComplaint(apt.chief_complaint);
                return (
                  <div
                    key={apt._id || apt.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0">
                      {(apt.patient_name || apt.patient?.full_name || 'P').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {apt.patient_name || apt.patient?.full_name || 'Bệnh nhân'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formattedDate} • {appointmentTime}
                      </p>
                      {reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 truncate" title={reason}>
                          📋 {reason}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity size={20} className="text-emerald-500" />
            Hiệu suất làm việc (7 ngày qua)
          </h2>
        </div>
        <div className="p-6">
          {performanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Hoàn thành"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Hủy"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Tỷ lệ hoàn thành (%)"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <Activity size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Chưa có dữ liệu hiệu suất</p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Trends Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Xu hướng Lịch hẹn (7 ngày qua)
          </h2>
        </div>
        <div className="p-6">
          {appointmentTrendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="appointments" fill="#3b82f6" name="Số lịch hẹn" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <TrendingUp size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Chưa có dữ liệu xu hướng</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/doctor/schedule')}
          className="group p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl hover:shadow-2xl transition-all text-left overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <Calendar size={32} className="mb-3 relative z-10" />
          <h3 className="font-semibold text-lg mb-1 relative z-10">Xem lịch làm việc</h3>
          <p className="text-sm opacity-90 relative z-10">Quản lý lịch hẹn đầy đủ</p>
        </button>

        <button
          onClick={() => navigate('/doctor/patients')}
          className="group p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl hover:shadow-2xl transition-all text-left overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <Users size={32} className="mb-3 relative z-10" />
          <h3 className="font-semibold text-lg mb-1 relative z-10">Bệnh nhân của tôi</h3>
          <p className="text-sm opacity-90 relative z-10">Xem hồ sơ bệnh nhân</p>
        </button>

        <button
          onClick={() => navigate('/doctor/ai-assistant')}
          className="group p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl hover:shadow-2xl transition-all text-left overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <Activity size={32} className="mb-3 relative z-10" />
          <h3 className="font-semibold text-lg mb-1 relative z-10">AI Trợ lý</h3>
          <p className="text-sm opacity-90 relative z-10">Hỗ trợ chẩn đoán AI</p>
        </button>
      </div>
    </div>
  );
};

export default DoctorDashboard;