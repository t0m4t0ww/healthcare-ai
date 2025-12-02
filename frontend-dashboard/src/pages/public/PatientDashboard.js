// src/pages/public/PatientDashboard.js - REFACTORED WITH ANT DESIGN ✅
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Empty,
  Space,
  Tag,
  Progress,
  Alert,
  Badge,
  Divider,
  Skeleton,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HeartOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  RiseOutlined,
  ArrowRightOutlined,
  MedicineBoxOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  LockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useAppointment } from "../../context/AppointmentContext";
import { getPatient, getHealthScore } from "../../services/services";
import { announceToScreenReader } from "../../utils/accessibility";
import ChangePasswordModal from "./components/ChangePasswordModal";

const { Title, Text, Paragraph } = Typography;

export default function PatientDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { appointments, appointmentsLoading, fetchAppointments } = useAppointment();
  
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    healthScore: 85
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [patientData, setPatientData] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  
  // ✅ Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasSkippedPasswordChange, setHasSkippedPasswordChange] = useState(false);

  // Real-time updates via Socket.IO
  useEffect(() => {
    let socket;
    try {
      socket = require('../../services/socket').default;
      
      const handleAppointmentUpdate = (data) => {
        console.log('📅 Appointment updated:', data);
        fetchAppointments();
        setLoadingStats(true);
      };

      const handleEHRCreated = (data) => {
        console.log('📋 EHR record created:', data);
        setLoadingStats(true);
      };
      
      socket.on('appointment_updated', handleAppointmentUpdate);
      socket.on('ehr_record_created', handleEHRCreated);
      
      return () => {
        if (socket) {
          socket.off('appointment_updated', handleAppointmentUpdate);
          socket.off('ehr_record_created', handleEHRCreated);
        }
      };
    } catch (error) {
      console.error('Socket error:', error);
    }
  }, [fetchAppointments]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // ✅ Auto-show change password modal on mount if must_change_password
  useEffect(() => {
    if (user?.must_change_password && !hasSkippedPasswordChange) {
      // Delay modal để user không bị shock khi vừa vào dashboard
      const timer = setTimeout(() => {
        setShowPasswordModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.must_change_password, hasSkippedPasswordChange]);


  // Calculate stats when appointments change
  useEffect(() => {
    if (!appointmentsLoading) {
      calculateStats();
    }
  }, [appointments, appointmentsLoading]);

  const loadDashboardData = async () => {
    try {
      setLoadingPatient(true);
      fetchAppointments();
      
      // ✅ Get patient_id correctly based on role
      const patientId = user?.role === 'patient' 
        ? (user?.patient_id || user?.id || user?._id)
        : (user?.id || user?._id);
      
      console.log('🔍 [PatientDashboard] Loading data for patient:', patientId);
      console.log('👤 User object:', user);
      
      if (patientId) {
        // Load patient data
        const data = await getPatient(patientId);
        console.log('📦 [PatientDashboard] Patient data received:', data);
        
        // ✅ Handle different response formats from backend
        const patientInfo = data?.data || data;
        setPatientData(patientInfo);
        
        // Load health score
        try {
          const healthScoreData = await getHealthScore(patientId);
          const healthScore = healthScoreData?.data?.health_score;
          if (healthScore !== undefined && healthScore !== null) {
            setStats(prev => ({
              ...prev,
              healthScore: Math.round(healthScore)
            }));
            console.log('💚 [PatientDashboard] Health score loaded:', healthScore);
          }
        } catch (healthError) {
          console.error('⚠️ [PatientDashboard] Error loading health score:', healthError);
          // Keep default score if API fails
        }
        
        announceToScreenReader('Dữ liệu dashboard đã tải xong');
      }
    } catch (error) {
      console.error('❌ [PatientDashboard] Error loading data:', error);
      announceToScreenReader('Lỗi khi tải dữ liệu dashboard', 'assertive');
    } finally {
      setLoadingPatient(false);
    }
  };

  const calculateStats = () => {
    if (!appointments || appointments.length === 0) {
      console.log('📊 [PatientDashboard] No appointments to calculate stats');
      setStats({
        totalAppointments: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        healthScore: 85
      });
      setLoadingStats(false);
      return;
    }

    console.log('📊 [PatientDashboard] Calculating stats for appointments:', appointments);

    const total = appointments.length;
    
    // ✅ Handle both status formats: "CONFIRMED"/"confirmed", "CANCELLED"/"cancelled"
    const upcoming = appointments.filter(apt => {
      const statusUpper = (apt.status || "").toUpperCase();
      const appointmentDate = new Date(apt.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return appointmentDate >= today && 
             statusUpper !== "CANCELLED" && 
             statusUpper !== "COMPLETED";
    }).length;
    
    const completed = appointments.filter(apt => 
      (apt.status || "").toUpperCase() === "COMPLETED"
    ).length;

    console.log('📊 [PatientDashboard] Stats calculated:', {
      total,
      upcoming,
      completed
    });

    // Keep existing healthScore, don't override with hardcoded value
    setStats(prev => ({
      totalAppointments: total,
      upcomingAppointments: upcoming,
      completedAppointments: completed,
      healthScore: prev.healthScore || 85 // Keep existing or default
    }));
    
    setLoadingStats(false);
  };

  // Calculate profile completion
  const calculateProfileCompletion = () => {
    if (!patientData) {
      console.log('⚠️ [PatientDashboard] No patient data for profile completion');
      return 40;
    }
    
    console.log('📝 [PatientDashboard] Calculating profile completion for:', patientData);
    
    let score = 40; // Base score (has account)
    let details = { base: 40 }; // For debugging
    
    // ✅ Check date of birth (15 points)
    if (patientData.date_of_birth || patientData.dateOfBirth || patientData.dob) {
      score += 15;
      details.dob = 15;
    }
    
    // ✅ Check blood type/group (10 points) - handle both field names
    if (patientData.blood_group || patientData.bloodGroup || patientData.blood_type) {
      score += 10;
      details.blood = 10;
    }
    
    // ✅ Check medical_history (15 points) - any filled value counts (including "không có")
    const medicalHistory = patientData.medical_history || patientData.medicalHistory;
    if (medicalHistory && (
      (Array.isArray(medicalHistory) && medicalHistory.length > 0) ||
      (typeof medicalHistory === 'string' && medicalHistory.trim().length > 0)
    )) {
      score += 15;
      details.medical_history = 15;
    }
    
    // ✅ Check allergies (10 points) - check multiple fields, any filled value counts
    const allergies = patientData.allergies;
    const allergiesMed = patientData.allergies_medications;
    const allergiesFood = patientData.allergies_food;
    const allergiesEnv = patientData.allergies_environment;
    
    const hasAllergies = (
      (allergies && Array.isArray(allergies) && allergies.length > 0) ||
      (allergies && typeof allergies === 'string' && allergies.trim().length > 0) ||
      (allergiesMed && typeof allergiesMed === 'string' && allergiesMed.trim().length > 0) ||
      (allergiesFood && typeof allergiesFood === 'string' && allergiesFood.trim().length > 0) ||
      (allergiesEnv && typeof allergiesEnv === 'string' && allergiesEnv.trim().length > 0)
    );
    
    if (hasAllergies) {
      score += 10;
      details.allergies = 10;
    }
    
    // ✅ Check emergency contact (10 points) - must have name and phone
    const emergencyContact = patientData.emergency_contact || patientData.emergencyContact;
    if (emergencyContact && typeof emergencyContact === 'object') {
      const hasName = emergencyContact.name && emergencyContact.name.trim().length > 0;
      const hasPhone = emergencyContact.phone && emergencyContact.phone.trim().length > 0;
      
      if (hasName && hasPhone) {
        score += 10;
        details.emergency_contact = 10;
      }
    }
    
    console.log('📊 [PatientDashboard] Profile completion details:', details);
    console.log('📊 [PatientDashboard] Profile completion score:', score);
    return Math.min(score, 100);
  };

  const profileCompletion = calculateProfileCompletion();

  // ✅ Handle password change success
  const handlePasswordChangeSuccess = () => {
    // Update user state using AuthContext
    updateUser({ must_change_password: false });
    
    // Close modal
    setShowPasswordModal(false);
    
    // Show success message
    announceToScreenReader('Đổi mật khẩu thành công!');
  };

  // ✅ Handle modal close (skip)
  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setHasSkippedPasswordChange(true); // Don't auto-show again this session
  };

  // Get upcoming appointments (max 3)
  const upcomingAppointments = appointments
    .filter(apt => {
      const statusUpper = (apt.status || "").toUpperCase();
      const appointmentDate = new Date(apt.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return appointmentDate >= today && 
             statusUpper !== "CANCELLED" && 
             statusUpper !== "COMPLETED";
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  console.log('📅 [PatientDashboard] Upcoming appointments:', upcomingAppointments);

  // Health tips
  const healthTips = [
    {
      title: "Tập thể dục đều đặn",
      description: "30 phút mỗi ngày giúp cải thiện sức khỏe tim mạch",
      icon: <HeartOutlined className="text-rose-500" />,
      color: "rose"
    },
    {
      title: "Uống đủ nước",
      description: "2-3 lít nước mỗi ngày để duy trì cơ thể khỏe mạnh",
      icon: <ThunderboltOutlined className="text-blue-500" />,
      color: "blue"
    },
    {
      title: "Ngủ đủ giấc",
      description: "7-8 tiếng ngủ giúp phục hồi và tăng cường miễn dịch",
      icon: <BulbOutlined className="text-purple-500" />,
      color: "purple"
    }
  ];

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    const colors = {
      confirmed: 'success',
      pending: 'warning',
      completed: 'default',
      cancelled: 'error',
      booked: 'success', // Alternative status name
      scheduled: 'success', // Alternative status name
    };
    return colors[statusLower] || 'default';
  };

  const getStatusText = (status) => {
    const statusLower = (status || '').toLowerCase();
    const texts = {
      confirmed: 'Đã xác nhận',
      pending: 'Chờ xác nhận',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      booked: 'Đã đặt',
      scheduled: 'Đã lên lịch',
      rescheduled: 'Đã đổi lịch',
    };
    return texts[statusLower] || status;
  };

  // Show loading state
  if (loadingPatient || appointmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg border-0 bg-gradient-to-r from-emerald-500 to-teal-500">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                <UserOutlined className="text-3xl text-white" />
              </div>
              <div>
                <Title level={2} className="!text-white !mb-1">
                  Xin chào, {user?.name || user?.full_name || user?.username || 'Bạn'}! 👋
                </Title>
                <Text className="text-white/90 text-base">
                  Chúc bạn một ngày tràn đầy năng lượng và sức khỏe
                </Text>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ⚠️ Password Change Reminder Banner - PERSISTENT (cannot dismiss) */}
        {user?.must_change_password && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Alert
              message={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LockOutlined className="text-orange-600" />
                    <span className="font-semibold">Khuyến nghị đổi mật khẩu</span>
                  </div>
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<LockOutlined />}
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 border-orange-500"
                  >
                    Đổi ngay
                  </Button>
                </div>
              }
              description={
                <div className="mt-2">
                  <Text>
                    Bạn đang sử dụng mật khẩu mặc định. Để bảo mật tài khoản, vui lòng đổi mật khẩu ngay.
                  </Text>
                </div>
              }
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              className="border-2 border-orange-300"
              banner
            />
          </motion.div>
        )}

        {/* Profile Completion Alert */}
        {profileCompletion < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: user?.must_change_password ? 0.2 : 0.1 }}
          >
            <Alert
              message="Hoàn thiện hồ sơ của bạn"
              description={
                <div>
                  <Progress 
                    percent={profileCompletion} 
                    strokeColor={{
                      '0%': '#10b981',
                      '100%': '#14b8a6',
                    }}
                    className="mb-2"
                  />
                  <Text>
                    Hồ sơ đầy đủ giúp bác sĩ chẩn đoán chính xác hơn. 
                    <Link to="/patient/profile" className="ml-2 font-semibold text-emerald-600 hover:text-emerald-700">
                      Cập nhật ngay →
                    </Link>
                  </Text>
                </div>
              }
              type="warning"
              showIcon
              closable
            />
          </motion.div>
        )}

        {/* Stats Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-md hover:shadow-xl transition-all duration-300 border-0">
                <Statistic
                  title={<Text strong>Tổng lịch khám</Text>}
                  value={stats.totalAppointments}
                  prefix={<CalendarOutlined className="text-blue-500" />}
                  loading={loadingStats}
                />
                <Text type="secondary" className="text-xs">Tất cả cuộc hẹn</Text>
              </Card>
            </motion.div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-md hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
                <Statistic
                  title={<Text strong className="text-emerald-700">Lịch sắp tới</Text>}
                  value={stats.upcomingAppointments}
                  prefix={<ClockCircleOutlined className="text-emerald-600" />}
                  suffix={<RiseOutlined className="text-emerald-600" />}
                  valueStyle={{ color: '#059669' }}
                  loading={loadingStats}
                />
                <Text type="secondary" className="text-xs">Cần chuẩn bị</Text>
              </Card>
            </motion.div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-md hover:shadow-xl transition-all duration-300 border-0">
                <Statistic
                  title={<Text strong>Đã hoàn thành</Text>}
                  value={stats.completedAppointments}
                  prefix={<CheckCircleOutlined className="text-purple-500" />}
                  loading={loadingStats}
                />
                <Text type="secondary" className="text-xs">Lịch sử khám</Text>
              </Card>
            </motion.div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="shadow-md hover:shadow-xl transition-all duration-300 border-0">
                <Statistic
                  title={<Text strong>Điểm sức khỏe</Text>}
                  value={stats.healthScore}
                  prefix={<HeartOutlined className="text-rose-500" />}
                  suffix="/ 100"
                  valueStyle={{ color: '#f43f5e' }}
                  loading={loadingStats}
                />
                <Text type="secondary" className="text-xs">Tuyệt vời!</Text>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Quick Actions - ĐỒNG BỘ DESIGN */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Link to="/patient/booking">
                <Card 
                  hoverable 
                  className="shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <CalendarOutlined className="text-2xl text-white" />
                    </div>
                    <div className="flex-1">
                      <Title level={4} className="!mb-2 text-emerald-700 dark:text-emerald-300">
                        Đặt lịch khám
                      </Title>
                      <Text className="text-slate-600 dark:text-slate-400 text-sm">
                        Chọn bác sĩ, thời gian và xác nhận lịch hẹn của bạn
                      </Text>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>

            <Col xs={24} md={8}>
              <Link to="/patient/appointments">
                <Card 
                  hoverable 
                  className="shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <ClockCircleOutlined className="text-2xl text-white" />
                    </div>
                    <div className="flex-1">
                      <Title level={4} className="!mb-2 text-emerald-700 dark:text-emerald-300">
                        Lịch khám của tôi
                      </Title>
                      <Text className="text-slate-600 dark:text-slate-400 text-sm">
                        Quản lý và theo dõi tất cả lịch hẹn khám bệnh
                      </Text>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>

            <Col xs={24} md={8}>
              <Link to="/patient/records">
                <Card 
                  hoverable 
                  className="shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <FileTextOutlined className="text-2xl text-white" />
                    </div>
                    <div className="flex-1">
                      <Title level={4} className="!mb-2 text-emerald-700 dark:text-emerald-300">
                        Hồ sơ bệnh án
                      </Title>
                      <Text className="text-slate-600 dark:text-slate-400 text-sm">
                        Theo dõi lịch sử khám chữa bệnh và kết quả xét nghiệm
                      </Text>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          </Row>
        </motion.div>

        {/* Content Grid */}
        <Row gutter={[24, 24]}>
          {/* Left Column - Appointments */}
          <Col xs={24} lg={16}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card
                title={
                  <div className="flex items-center justify-between">
                    <Title level={3} className="!mb-0">Lịch khám sắp tới</Title>
                    <Link to="/patient/appointments">
                      <Button type="link" icon={<ArrowRightOutlined />} className="text-emerald-600 hover:text-emerald-700">
                        Xem tất cả
                      </Button>
                    </Link>
                  </div>
                }
                className="shadow-lg border-0"
              >
                {upcomingAppointments.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <Text className="block mb-4">Chưa có lịch khám sắp tới</Text>
                        <Link to="/patient/booking">
                          <Button type="primary" size="large" icon={<PlusOutlined />}>
                            Đặt lịch khám ngay
                          </Button>
                        </Link>
                      </div>
                    }
                  />
                ) : (
                  <Space direction="vertical" size="middle" className="w-full">
                    {upcomingAppointments.map((apt) => {
                      // ✅ Handle different field names from backend
                      const doctorName = apt.doctor_name || apt.doctorName || apt.doctor?.name || 'Chưa có bác sĩ';
                      const specialtyName = apt.specialty_name || apt.specialtyName || apt.specialty?.name || apt.doctor_specialty || 'Chưa xác định chuyên khoa';
                      
                      // ✅ Handle time_slot with fallback to start_time + end_time
                      let timeSlot = apt.time_slot || apt.timeSlot || apt.time;
                      if (!timeSlot && apt.start_time && apt.end_time) {
                        timeSlot = `${apt.start_time} - ${apt.end_time}`;
                      } else if (!timeSlot && apt.start_time) {
                        timeSlot = apt.start_time;
                      } else if (!timeSlot) {
                        timeSlot = 'Chưa xác định giờ';
                      }
                      
                      // ✅ Format date to Vietnamese format
                      const formattedDate = new Date(apt.date).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      });
                      
                      return (
                        <Card
                          key={apt._id || apt.id}
                          size="small"
                          className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500"
                        >
                          <Row gutter={16} align="middle">
                            <Col flex="auto">
                              <Space direction="vertical" size={4}>
                                <Text strong className="text-base">
                                  {doctorName}
                                </Text>
                                <Text type="secondary" className="text-sm">
                                  {specialtyName}
                                </Text>
                                <Space size="small" className="text-xs">
                                  <CalendarOutlined />
                                  <Text>{formattedDate}</Text>
                                  <ClockCircleOutlined />
                                  <Text>{timeSlot}</Text>
                                </Space>
                              </Space>
                            </Col>
                            <Col>
                              <Tag color={getStatusColor(apt.status)}>
                                {getStatusText(apt.status)}
                              </Tag>
                            </Col>
                          </Row>
                        </Card>
                      );
                    })}
                  </Space>
                )}
              </Card>
            </motion.div>
          </Col>

          {/* Right Column - Health Tips */}
          <Col xs={24} lg={8}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card
                title={<Title level={3} className="!mb-0">Lời khuyên sức khỏe</Title>}
                className="shadow-lg border-0"
              >
                <Space direction="vertical" size="middle" className="w-full">
                  {healthTips.map((tip, index) => (
                    <Card
                      key={index}
                      size="small"
                      className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700"
                    >
                      <Space align="start" size="middle">
                        <div className="text-2xl">{tip.icon}</div>
                        <div>
                          <Text strong className="block mb-1">{tip.title}</Text>
                          <Text type="secondary" className="text-xs">{tip.description}</Text>
                        </div>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            </motion.div>
          </Col>
        </Row>


        {/* ✅ Change Password Modal */}
        <ChangePasswordModal
          open={showPasswordModal}
          onClose={handlePasswordModalClose}
          isFirstTime={user?.must_change_password}
          onSuccess={handlePasswordChangeSuccess}
        />
      </div>
    </div>
  );
}
