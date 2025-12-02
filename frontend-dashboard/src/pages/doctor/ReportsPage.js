// Doctor Reports Page - Dashboard tổng quan cho bác sĩ
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  FileText,
  Bell,
  Loader,
  User,
  XCircle,
} from "lucide-react";
import api from "../../services/services";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { getTodayLocal } from "../../utils/dateUtils";

// ✅ REMOVED: Replaced with getTodayLocal() from dateUtils

const getStatusBadge = (status, isConfirmed) => {
  const badges = {
    pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', text: 'Chờ xác nhận' },
    booked: isConfirmed 
      ? { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', text: 'Đã xác nhận' }
      : { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', text: 'Đã đặt' },
    completed: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', text: 'Hoàn thành' },
    cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', text: 'Đã hủy' },
  };
  const badge = badges[status] || badges.pending;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      {badge.text}
    </span>
  );
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchData();
      
      // Auto refresh every 30 seconds
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing data...');
        fetchData();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ✅ FIX: Use local date without timezone conversion
      const today = getTodayLocal();
      
      console.log('📊 ReportsPage - Fetching data:', {
        today,
        user,
      });

      // ✅ Backend uses auth token, get all appointments then filter on frontend
      const response = await api.get('/appointments/doctor');

      console.log('✅ ReportsPage - API response:', response.data);

      const allAppointments = response.data?.data || response.data || [];
      console.log('📋 ReportsPage - All Appointments:', allAppointments);
      
      // Filter for today's appointments on frontend
      const todayAppts = allAppointments.filter(apt => {
        if (!apt.date && !apt.appointment_date) return false;
        // ✅ FIX: Extract date string directly without timezone conversion
        const aptDate = (apt.date || apt.appointment_date)?.split('T')[0];
        return aptDate === today;
      });
      
      console.log('📅 ReportsPage - Today Appointments:', todayAppts);
      setTodayAppointments(todayAppts);
      
      // ✅ Get recent completed appointments (from all time, sorted by date desc, limit 5)
      const completedAppts = allAppointments
        .filter(apt => apt.status === 'completed')
        .sort((a, b) => {
          const dateA = new Date(a.date || a.appointment_date || 0);
          const dateB = new Date(b.date || b.appointment_date || 0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, 5);
      
      console.log('📋 ReportsPage - Recent History:', completedAppts);
      setRecentHistory(completedAppts);

      // Tính toán thống kê
      const statsData = {
        total: todayAppts.length,
        pending: todayAppts.filter(a => !a.is_confirmed && (a.status === 'booked' || a.status === 'pending')).length,
        completed: todayAppts.filter(a => a.status === 'completed').length,
        cancelled: todayAppts.filter(a => a.status === 'cancelled').length,
      };
      
      console.log('📊 ReportsPage - Stats:', statsData);
      setStats(statsData);
      
      // Update last refresh time
      setLastUpdate(new Date());
      
      // Show info if no data found
      if (allAppointments.length === 0) {
        toast.info('Bạn chưa có lịch hẹn nào trong hệ thống');
      } else if (todayAppts.length === 0) {
        toast.info(`Không có lịch hẹn hôm nay. Tổng cộng có ${allAppointments.length} lịch hẹn trong hệ thống.`);
      }
    } catch (error) {
      console.error('❌ ReportsPage - Error fetching appointments:', error);
      console.error('❌ ReportsPage - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || error.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr, timeStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('vi-VN')} • ${timeStr || 'N/A'}`;
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-emerald-500" size={48} />
          <p className="text-slate-600 dark:text-slate-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const waitingPatients = todayAppointments.filter(
    a => !a.is_confirmed && (a.status === 'booked' || a.status === 'pending')
  );
  
  const todaySchedule = todayAppointments.filter(
    a => a.is_confirmed && a.status === 'booked'
  );


  return (
    <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Tổng quan hôm nay
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1">
            <Clock size={12} />
            Cập nhật lúc: {lastUpdate.toLocaleTimeString('vi-VN')}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-xl flex items-center gap-2 transition-colors"
        >
          <Activity size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng lịch hẹn</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Chờ xác nhận</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Hoàn thành</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Đã hủy</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.cancelled}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <XCircle size={24} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lịch khám hôm nay */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar size={20} className="text-emerald-500" />
              Lịch khám hôm nay ({todaySchedule.length})
            </h2>
          </div>
          <div className="p-6">
            {todaySchedule.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400">Không có lịch khám hôm nay</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.slice(0, 5).map((apt) => {
                  const appointmentTime = formatAppointmentTime(apt);
                  const reason = apt.reason || formatChiefComplaint(apt.chief_complaint);
                  return (
                    <div
                      key={apt._id}
                      onClick={() => navigate(`/doctor/consultation/${apt._id}`)}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {(apt.patient_name || apt.patient?.full_name || 'P').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {apt.patient_name || apt.patient?.full_name || 'Bệnh nhân'}
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
                      <div className="flex-shrink-0">
                        {getStatusBadge(apt.status, apt.is_confirmed)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Danh sách bệnh nhân đang chờ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users size={20} className="text-yellow-500" />
              Bệnh nhân đang chờ ({waitingPatients.length})
            </h2>
          </div>
          <div className="p-6">
            {waitingPatients.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400">Không có bệnh nhân đang chờ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingPatients.map((apt) => (
                  <div
                    key={apt._id}
                    onClick={() => navigate(`/doctor/schedule`)}
                    className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors border border-yellow-200 dark:border-yellow-800 cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(apt.patient_name || apt.patient?.full_name || 'P').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {apt.patient_name || apt.patient?.full_name || 'Bệnh nhân'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <Clock size={14} className="inline mr-1" />
                        {apt.start_time || apt.time || 'N/A'}
                      </p>
                    </div>
                    <Bell size={18} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lịch sử gần đây */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText size={20} className="text-blue-500" />
              Lịch sử gần đây
            </h2>
          </div>
          <div className="p-6">
            {recentHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400">Chưa có lịch sử khám</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentHistory.map((apt) => {
                  const appointmentTime = formatAppointmentTime(apt);
                  const reason = apt.reason || formatChiefComplaint(apt.chief_complaint);
                  const aptDate = apt.date || apt.appointment_date;
                  const formattedDate = aptDate ? new Date(aptDate).toLocaleDateString('vi-VN') : 'N/A';
                  return (
                    <div
                      key={apt._id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
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
                      <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Nhắc việc */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl shadow-lg border border-emerald-200 dark:border-emerald-800 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <Bell size={20} className="text-emerald-600" />
              Nhắc việc hôm nay
            </h2>
          </div>
          
          <div className="space-y-3">
            {stats.pending > 0 && (
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                      Xác nhận lịch hẹn
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Có {stats.pending} lịch hẹn cần xác nhận
                    </p>
                  </div>
                </div>
              </div>
            )}

            {todaySchedule.length > 0 && (
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                      Lịch khám hôm nay
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {todaySchedule.length} bệnh nhân cần khám
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.total === 0 && (
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                      Không có việc gì
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Bạn đã hoàn thành tất cả công việc hôm nay
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/doctor/schedule')}
              className="w-full mt-4 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              Xem lịch đầy đủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}