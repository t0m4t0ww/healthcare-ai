// src/pages/admin/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tabs, Spin, Empty, Badge } from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  FileTextOutlined,
  BellOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StatCard, AppointmentChart, RecentActivity } from '../components';
import { getPatients, getDoctors } from '../../../services/services';
import api from '../../../services/services';
import moment from 'moment';
import { useAdminRealtime } from '../../../hooks/useAdminRealtime';

/**
 * AdminDashboard - Trang dashboard tổng quan cho Admin
 * 
 * Features:
 * - Thống kê tổng quan (bác sĩ, bệnh nhân, lịch hẹn, doanh thu)
 * - Biểu đồ lịch hẹn theo thời gian
 * - Quick stats với trends
 */
const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    doctorTrend: 0,
    patientTrend: 0,
    appointmentTrend: 0,
    revenueTrend: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [revenueChartData, setRevenueChartData] = useState([]);
  const [patientGrowthData, setPatientGrowthData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  // ===== 🔴 REAL-TIME UPDATES =====
  const { refreshStats } = useAdminRealtime({
    onNewAppointment: (data) => {
      console.log('📅 New appointment in dashboard:', data);
      // Thêm notification
      setRealtimeNotifications((prev) => [
        {
          id: Date.now(),
          type: 'appointment',
          message: `Lịch hẹn mới từ ${data.patient?.name || 'Bệnh nhân'}`,
          time: new Date(),
        },
        ...prev.slice(0, 4), // Giữ tối đa 5 notifications
      ]);
      // Refresh data and activity
      fetchDashboardData();
      setActivityRefreshKey((prev) => prev + 1);
    },
    onAppointmentUpdate: (data) => {
      console.log('🔄 Appointment updated in dashboard:', data);
      fetchDashboardData();
      setActivityRefreshKey((prev) => prev + 1);
    },
    onNewPatient: (data) => {
      console.log('👤 New patient in dashboard:', data);
      setRealtimeNotifications((prev) => [
        {
          id: Date.now(),
          type: 'patient',
          message: `Bệnh nhân mới: ${data.name || 'N/A'}`,
          time: new Date(),
        },
        ...prev.slice(0, 4),
      ]);
      fetchDashboardData();
      setActivityRefreshKey((prev) => prev + 1);
    },
    autoRefresh: true,
  });

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // ✅ Admin fetch all appointments (không phải getPatientAppointments)
      const [doctorsRes, patientsRes, appointmentsRes] = await Promise.all([
        getDoctors().catch(() => ({ data: [] })),
        getPatients().catch(() => ({ data: [] })),
        api.get('/appointments').catch(() => ({ data: [] })), // ✅ Admin có quyền xem tất cả appointments
      ]);

      const doctors = Array.isArray(doctorsRes) ? doctorsRes : doctorsRes?.data || [];
      const patients = Array.isArray(patientsRes) ? patientsRes : patientsRes?.data || [];
      
      // ✅ FIX: Handle axios response format - response.data contains backend response
      const backendAppointments = appointmentsRes.data || appointmentsRes;
      
      let appointments = [];
      if (Array.isArray(backendAppointments)) {
        // Old format: direct array
        appointments = backendAppointments;
      } else if (backendAppointments?.success && Array.isArray(backendAppointments.data)) {
        // New format: { success: true, data: [...], total: 10 }
        appointments = backendAppointments.data;
      }

      console.log('📊 Dashboard Data:', {
        doctors: doctors.length,
        patients: patients.length,
        appointments: appointments.length,
      });

      // Calculate stats
      const totalDoctors = doctors.length;
      const totalPatients = patients.length;
      const totalAppointments = appointments.length;
      
      // Calculate revenue (giả sử mỗi lịch hẹn hoàn thành = 200k)
      const completedAppointments = appointments.filter(
        (apt) => apt.status === 'completed'
      );
      const totalRevenue = completedAppointments.length * 200000;

      // Calculate trends (giả sử so với tháng trước)
      // Trong thực tế, cần có API endpoint riêng để lấy data tháng trước
      const doctorTrend = calculateTrend(totalDoctors, totalDoctors - 2);
      const patientTrend = calculateTrend(totalPatients, totalPatients - 5);
      const appointmentTrend = calculateTrend(totalAppointments, totalAppointments - 10);
      const revenueTrend = calculateTrend(totalRevenue, totalRevenue - 1000000);

      setStats({
        totalDoctors,
        totalPatients,
        totalAppointments,
        totalRevenue,
        doctorTrend,
        patientTrend,
        appointmentTrend,
        revenueTrend,
      });

      // Prepare chart data (last 7 days)
      const last7Days = generateLast7DaysData(appointments);
      setChartData(last7Days);

      // Fetch statistics data for revenue and patient growth charts
      try {
        const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        const endDate = moment().format('YYYY-MM-DD');
        
        const statsResponse = await api.get('/statistics/dashboard', {
          params: { start_date: startDate, end_date: endDate }
        });
        
        const statsData = statsResponse.data?.data || statsResponse.data;
        
        // Prepare revenue chart data (6 months)
        if (statsData?.revenueByMonth) {
          setRevenueChartData(statsData.revenueByMonth.map(item => ({
            month: item.month,
            revenue: item.revenue || 0,
            appointments: item.appointments || 0
          })));
        }
        
        // Prepare patient growth data (last 30 days by week)
        const patientGrowth = generatePatientGrowthData(patients);
        setPatientGrowthData(patientGrowth);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate patient growth data (last 30 days by week)
  const generatePatientGrowthData = (patients) => {
    const data = [];
    const weeks = 4;
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = moment().subtract(i * 7 + 6, 'days');
      const weekEnd = moment().subtract(i * 7, 'days');
      
      const weekPatients = patients.filter((patient) => {
        const createdDate = moment(patient.created_at || patient.createdAt);
        return createdDate.isBetween(weekStart, weekEnd, 'day', '[]');
      });
      
      data.push({
        week: `Tuần ${weeks - i}`,
        newPatients: weekPatients.length,
        totalPatients: patients.filter(p => {
          const createdDate = moment(p.created_at || p.createdAt);
          return createdDate.isSameOrBefore(weekEnd, 'day');
        }).length
      });
    }
    
    return data;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate trend percentage
  const calculateTrend = (current, previous) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Generate chart data for last 7 days
  const generateLast7DaysData = (appointments) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dayName = days[date.day()];
      
      const dayAppointments = appointments.filter((apt) => {
        const aptDate = moment(apt.date || apt.appointment_date);
        return aptDate.isSame(date, 'day');
      });

      const completed = dayAppointments.filter((apt) => apt.status === 'completed').length;
      const cancelled = dayAppointments.filter((apt) => apt.status === 'cancelled').length;

      data.push({
        date: dayName,
        appointments: dayAppointments.length,
        completed,
        cancelled,
      });
    }

    return data;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Spin size="large" />
        <p className="text-gray-600 text-lg">Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="text-gray-600 mt-1">Tổng quan hệ thống quản lý phòng khám</p>
          </div>
          
          {/* Real-time Notifications Badge */}
          {realtimeNotifications.length > 0 && (
            <Badge count={realtimeNotifications.length} offset={[-10, 10]}>
              <div className="bg-white p-3 rounded-lg shadow-md">
                <BellOutlined className="text-xl text-blue-600" />
              </div>
            </Badge>
          )}
        </div>

        {/* Recent Notifications */}
        {realtimeNotifications.length > 0 && (
          <div className="mt-4 space-y-2">
            {realtimeNotifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">
                    {notif.type === 'appointment' ? '📅' : '👤'}
                  </span>
                  <span className="text-sm font-medium">{notif.message}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {moment(notif.time).fromNow()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Bác sĩ"
            value={stats.totalDoctors}
            icon="doctor"
            color="#1890ff"
            trend={stats.doctorTrend}
            suffix="người"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Bệnh nhân"
            value={stats.totalPatients}
            icon="user"
            color="#52c41a"
            trend={stats.patientTrend}
            suffix="người"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Lịch hẹn"
            value={stats.totalAppointments}
            icon="appointment"
            color="#faad14"
            trend={stats.appointmentTrend}
            suffix="lịch"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Doanh thu"
            value={stats.totalRevenue}
            icon={<FileTextOutlined style={{ fontSize: 24 }} />}
            color="#eb2f96"
            trend={stats.revenueTrend}
            prefix="₫"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <div className="space-y-6">
                {/* Appointment Chart */}
                <AppointmentChart
                  data={chartData}
                  chartType="line"
                  title="Thống kê lịch hẹn 7 ngày qua"
                />

                {/* Quick Info Cards */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card
                      title="Thông tin nhanh"
                      className="shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Lịch hẹn hôm nay:</span>
                          <span className="font-semibold text-blue-600">
                            {chartData[chartData.length - 1]?.appointments || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Đã hoàn thành:</span>
                          <span className="font-semibold text-green-600">
                            {chartData[chartData.length - 1]?.completed || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-gray-600">Đã hủy:</span>
                          <span className="font-semibold text-red-600">
                            {chartData[chartData.length - 1]?.cancelled || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                          <span className="font-semibold text-purple-600">
                            {chartData[chartData.length - 1]?.appointments > 0
                              ? Math.round(
                                  (chartData[chartData.length - 1].completed /
                                    chartData[chartData.length - 1].appointments) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card
                      title="Hoạt động gần đây"
                      className="shadow-md"
                      extra={
                        <span className="text-xs text-gray-500">
                          Cập nhật theo thời gian thực
                        </span>
                      }
                    >
                      <RecentActivity limit={10} refreshKey={activityRefreshKey} autoRefresh={true} />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'performance',
            label: 'Hiệu suất',
            children: (
              <div className="space-y-6">
                {/* Revenue Trends Chart */}
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <FileTextOutlined style={{ color: '#eb2f96' }} />
                      <span>Xu hướng Doanh thu (6 tháng gần nhất)</span>
                    </div>
                  }
                  className="shadow-md"
                >
                  {revenueChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          stroke="#8c8c8c"
                          style={{ fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#8c8c8c"
                          style={{ fontSize: 12 }}
                          tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#eb2f96"
                          fill="#eb2f96"
                          fillOpacity={0.6}
                          name="Doanh thu (VND)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="Chưa có dữ liệu doanh thu" />
                  )}
                </Card>

                {/* Patient Growth Chart */}
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <UserOutlined style={{ color: '#52c41a' }} />
                      <span>Tăng trưởng Bệnh nhân (4 tuần gần nhất)</span>
                    </div>
                  }
                  className="shadow-md"
                >
                  {patientGrowthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={patientGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="week"
                          stroke="#8c8c8c"
                          style={{ fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#8c8c8c"
                          style={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                          }}
                        />
                        <Legend />
                        <Bar dataKey="newPatients" fill="#52c41a" name="Bệnh nhân mới" />
                        <Bar dataKey="totalPatients" fill="#1890ff" name="Tổng bệnh nhân" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="Chưa có dữ liệu bệnh nhân" />
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AdminDashboard;