// src/pages/public/PatientRecordsPage.js - REFACTORED WITH ANT DESIGN ✅
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  Input,
  Segmented,
  Select,
  Pagination,
  Empty,
  Skeleton,
  message,
  notification,
  Button,
  Space,
  Typography,
  Alert,
  Badge,
  Modal,
} from "antd";
import {
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  DownloadOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  LockOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import socket from "../../services/socket";

// ✅ Import from extracted modules
import { RECORD_TYPES } from "../../constants/recordConstants";
import { RecordCard, RecordDetailModal } from "../../components/records";
import RatingForm from "../../components/rating/RatingForm";
import ratingService from "../../services/ratingServices";

const { Title, Text, Paragraph } = Typography;

// EHR Service Implementation (inline - không cần import từ service file)
const ehrServices = {
  async getRecords(patientId) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      
      console.log('🔍 Fetching EHR records for patient:', patientId);
      
      // ✅ Backend route là /ehr/patient/records (không cần patient_id param)
      // Patient được lấy từ token authentication
      const response = await fetch(`${apiUrl}/ehr/patient/records`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if endpoint exists
      if (response.status === 404 || response.status === 405) {
        console.warn('⚠️ EHR API endpoint not implemented yet');
        // Return empty array instead of throwing
        return [];
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Full API response:', data);
      
      // ✅ Backend wraps in success() helper: { success: true, data: { data: [...], total, stats } }
      const responseData = data.data || data; // First unwrap
      const records = responseData.data || responseData || []; // Second unwrap
      
      console.log('✅ Fetched records:', data);
      console.log('📊 Records array:', records);
      console.log('📊 Array length:', records.length);
      return Array.isArray(records) ? records : [];
      
    } catch (error) {
      console.error('❌ Error fetching EHR records:', error);
      
      // If API not ready, return empty instead of throwing
      if (error.message.includes('404') || error.message.includes('405')) {
        console.warn('⚠️ EHR API not ready, returning empty records');
        return [];
      }
      
      // For other errors, still return empty but log
      console.error('Unexpected error:', error);
      return [];
    }
  },
  
  async downloadRecord(recordId) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const url = `${apiUrl}/ehr/records/${recordId}/pdf`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check if endpoint exists
      if (response.status === 404 || response.status === 405) {
        message.warning('Tính năng tải xuống đang được phát triển');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `record-${recordId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      message.success('Tải xuống thành công');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Không thể tải xuống file');
    }
  },
  
};

// Main Component
export default function PatientRecordsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ Cache key for localStorage
  const CACHE_KEY = `ehr_records_cache_${user?.patient_id || user?.id || 'default'}`;
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const itemsPerPage = 9;
  
  // ✅ Rating state
  const [ratingModal, setRatingModal] = useState({ open: false, record: null, doctorInfo: null });
  const [ratedAppointments, setRatedAppointments] = useState(new Set());

  useEffect(() => {
    if (user) {
      // ✅ Try to load from cache first for faster display
      const cachedRecords = localStorage.getItem(CACHE_KEY);
      if (cachedRecords) {
        try {
          const parsed = JSON.parse(cachedRecords);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('📦 Loading cached records:', parsed.length);
            setRecords(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse cached records:', e);
        }
      }
      
      loadRecords();
      loadRatedAppointments();
    }
  }, [user]);

  // ✅ Socket.IO Listener for Real-time EHR Updates
  useEffect(() => {
    if (!user) return;

    const handleEHRCreated = (data) => {
      console.log('📬 Received ehr_record_created event:', data);
      
      // Check if this record belongs to current patient
      const currentPatientId = user.role === 'patient' 
        ? (user.patient_id || user.id || user._id)
        : (user.id || user._id);
      
      if (data.patient_id === currentPatientId) {
        console.log('✅ New EHR record for current patient, refreshing...');
        
        // Show notification
        notification.success({
          message: '🏥 Hồ sơ khám bệnh mới',
          description: `Bác sĩ đã hoàn thành khám bệnh và tạo hồ sơ mới cho bạn. ${data.chief_complaint ? 'Triệu chứng: ' + data.chief_complaint : ''}`,
          duration: 8,
          placement: 'topRight',
          onClick: () => {
            loadRecords(); // Refresh records when clicking notification
          }
        });
        
        // Auto refresh records list
        loadRecords();
      }
    };

    // Subscribe to socket event
    socket.on('ehr_record_created', handleEHRCreated);

    // Cleanup on unmount
    return () => {
      socket.off('ehr_record_created', handleEHRCreated);
    };
  }, [user]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      
      // ✅ Debug: Log user info
      console.log('👤 Current user:', user);
      console.log('📋 User role:', user?.role);
      console.log('🆔 User patient_id:', user?.patient_id);
      console.log('🆔 User id:', user?.id);
      console.log('🆔 User _id:', user?._id);
      
      // ✅ Use patient_id for patient role
      const patientId = user.role === 'patient' 
        ? (user.patient_id || user.id || user._id)
        : (user.id || user._id);
      
      console.log('🎯 Using patientId for query:', patientId);
      
      const data = await ehrServices.getRecords(patientId);
      
      console.log('📦 Raw data from API:', data);
      console.log('📊 Data type:', typeof data);
      console.log('📊 Is array:', Array.isArray(data));
      
      // ✅ Ensure data is an array
      const recordsArray = Array.isArray(data) ? data : (data?.data || []);
      
      console.log('📊 Records array length:', recordsArray?.length);
      
      // ✅ Debug: Log first record from API to see structure
      if (recordsArray.length > 0) {
        console.log('🔍 First raw record from API:', recordsArray[0]);
        console.log('🔍 doctor_info field:', recordsArray[0].doctor_info);
        console.log('🔍 doctor field:', recordsArray[0].doctor);
        console.log('🔍 record_type:', recordsArray[0].record_type);
      }
      
      // ✅ Transform API data to match component expectations
      const transformedRecords = recordsArray.map(record => {
        // Handle different date formats
        let recordDate = record.created_at || record.visit_date || record.date;
        if (recordDate && typeof recordDate === 'string') {
          recordDate = new Date(recordDate);
        }
        
        return {
          ...record,
          id: record._id || record.id, // ✅ Add id from _id
          type: record.record_type || 'consultation', // ✅ Map record_type to type
          doctor: record.doctor_info || record.doctor || {}, // ✅ Try both doctor_info and doctor
          doctor_info: record.doctor_info || record.doctor || {}, // ✅ Keep doctor_info as well
          vitals: record.vital_signs ? {
            bloodPressure: record.vital_signs.blood_pressure,
            heartRate: record.vital_signs.heart_rate,
            temperature: record.vital_signs.temperature,
            weight: record.vital_signs.weight,
            respiratoryRate: record.vital_signs.respiratory_rate,
            spo2: record.vital_signs.spo2,
            height: record.vital_signs.height
          } : null,
          prescriptions: record.prescription ? (Array.isArray(record.prescription) ? record.prescription : [record.prescription]) : [],
          medications: record.medications || [],
          date: recordDate // ✅ Add date field
        };
      });
      
      console.log('✅ Transformed records:', transformedRecords);
      console.log('📊 Transformed length:', transformedRecords.length);
      if (transformedRecords.length > 0) {
        console.log('🔍 First transformed record:', transformedRecords[0]);
        console.log('🔍 First transformed record doctor:', transformedRecords[0].doctor);
      }
      
      // ✅ Only update if we have valid records
      if (transformedRecords.length >= 0) {
        setRecords(transformedRecords);
        // ✅ Cache records to localStorage for recovery
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(transformedRecords));
          console.log('✅ Cached records to localStorage');
        } catch (e) {
          console.warn('Failed to cache records:', e);
        }
      } else {
        console.warn('⚠️ No valid records found, keeping existing records');
      }
      
    } catch (error) {
      console.error('❌ Error loading records:', error);
      console.error('Error details:', error.message, error.stack);
      
      // ✅ Don't clear existing records on error
      if (records.length === 0) {
        message.error('Không thể tải hồ sơ bệnh án. Vui lòng thử lại.');
      } else {
        message.warning('Không thể tải lại hồ sơ. Đang hiển thị dữ liệu cũ.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load danh sách các appointment đã được đánh giá
  const loadRatedAppointments = async () => {
    try {
      const result = await ratingService.getMyRatings();
      const ratedIds = new Set(
        (result.ratings || []).map(rating => rating.appointment_id)
      );
      setRatedAppointments(ratedIds);
    } catch (error) {
      console.error('Error loading rated appointments:', error);
    }
  };

  // ✅ Handle rating action
  const handleRate = (record) => {
    if (!record.appointment_id) {
      message.warning('Không thể đánh giá: Thiếu thông tin appointment');
      return;
    }

    const doctorInfo = {
      id: record.doctor_id || record.doctor?._id || record.doctor?.id,
      name: record.doctor?.full_name || record.doctor?.name || 'Bác sĩ',
      specialization: record.doctor?.specialty || record.doctor?.specialization || '',
      avatar_url: record.doctor?.avatar_url
    };

    setRatingModal({
      open: true,
      record: record,
      doctorInfo: doctorInfo
    });
  };

  // ✅ Handle rating success
  const handleRatingSuccess = () => {
    setRatingModal({ open: false, record: null, doctorInfo: null });
    loadRatedAppointments(); // Refresh rated appointments
    message.success('Đánh giá thành công! Cảm ơn bạn đã chia sẻ.');
  };

  // Filter & Sort
  const filteredRecords = records
    .filter(record => {
      // Filter by type (now using transformed 'type' field)
      if (filter !== 'all' && record.type !== filter) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.diagnosis?.primary?.toLowerCase().includes(query) ||
          record.doctor?.name?.toLowerCase().includes(query) ||
          record.chief_complaint?.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // ✅ Ưu tiên visit_date || created_at || date
      const dateA = a.visit_date || a.created_at || a.date;
      const dateB = b.visit_date || b.created_at || b.date;
      
      if (sortBy === 'date_desc') return new Date(dateB) - new Date(dateA);
      if (sortBy === 'date_asc') return new Date(dateA) - new Date(dateB);
      if (sortBy === 'doctor') return (a.doctor?.name || '').localeCompare(b.doctor?.name || '');
      return 0;
    });

  // ✅ Stats - Tính toán từ dữ liệu thực tế
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: records.length,
      consultation: records.filter(r => r.type === 'consultation' || !r.type).length,
      // ✅ Thay thế checkup và emergency bằng stats hữu ích hơn
      withPrescription: records.filter(r => {
        const hasPrescription = r.prescriptions && r.prescriptions.length > 0;
        const hasMedications = r.medications && r.medications.length > 0;
        return hasPrescription || hasMedications;
      }).length,
      recentVisits: records.filter(r => {
        const recordDate = r.date ? new Date(r.date) : (r.created_at ? new Date(r.created_at) : null);
        return recordDate && recordDate >= thirtyDaysAgo;
      }).length,
    };
  }, [records]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
  };

  const handleDownloadRecord = async (record) => {
    await ehrServices.downloadRecord(record.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg border-0 bg-gradient-to-r from-emerald-500 to-teal-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                  <FileTextOutlined className="text-2xl md:text-3xl text-white" />
                </div>
                <div className="min-w-0">
                  <Title level={2} className="!text-white !mb-1 !text-xl md:!text-2xl">
                    Hồ sơ bệnh án
                  </Title>
                  <Text className="text-white/90 text-sm md:text-base hidden sm:block">
                    Theo dõi lịch sử khám chữa bệnh và kết quả xét nghiệm
                  </Text>
                </div>
              </div>
              <Space wrap className="w-full md:w-auto">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadRecords}
                  size="default"
                  className="!bg-white/20 !border-white/30 !text-white hover:!bg-white/30 w-full md:w-auto"
                >
                  Tải lại
                </Button>
              </Space>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.total} hồ sơ`} color="blue">
                <Card className="shadow-md hover:shadow-xl transition-all">
                  <Statistic
                    title={<Text strong>Tổng hồ sơ</Text>}
                    value={stats.total}
                    prefix={<FileTextOutlined className="text-blue-500" />}
                    loading={loading}
                    suffix={<Text type="secondary" className="text-xs">bệnh án</Text>}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.consultation} lần`} color="green">
                <Card className="shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-emerald-50 to-teal-50">
                  <Statistic
                    title={<Text strong className="text-emerald-700">Chuyên khoa</Text>}
                    value={stats.consultation}
                    prefix={<MedicineBoxOutlined className="text-emerald-600" />}
                    valueStyle={{ color: '#059669' }}
                    loading={loading}
                    suffix={<Text type="secondary" className="text-xs">chuyên sâu</Text>}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.withPrescription} đơn`} color="purple">
                <Card className="shadow-md hover:shadow-xl transition-all">
                  <Statistic
                    title={<Text strong>Đơn thuốc</Text>}
                    value={stats.withPrescription}
                    prefix={<MedicineBoxOutlined className="text-purple-500" />}
                    loading={loading}
                    suffix={<Text type="secondary" className="text-xs">có kê đơn</Text>}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.recentVisits} lần`} color="orange">
                <Card className="shadow-md hover:shadow-xl transition-all">
                  <Statistic
                    title={<Text strong>Khám gần đây</Text>}
                    value={stats.recentVisits}
                    prefix={<CalendarOutlined className="text-orange-500" />}
                    loading={loading}
                    suffix={<Text type="secondary" className="text-xs">30 ngày qua</Text>}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
          </Row>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-emerald-50/30">
            <Row gutter={[16, 16]} align="middle">
              {/* Search Input */}
              <Col xs={24} lg={12}>
                <Input
                  allowClear
                  size="large"
                  placeholder="Tìm theo bác sĩ, chẩn đoán..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  prefix={<SearchOutlined className="text-emerald-500" />}
                  className="hover:border-emerald-400 focus:border-emerald-500"
                  style={{
                    borderRadius: '8px',
                  }}
                />
              </Col>
              
              {/* Filter by Type */}
              <Col xs={24} sm={12} lg={6}>
                <Select
                  size="large"
                  value={filter}
                  onChange={(v) => {
                    setFilter(v);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%" }}
                  className="filter-select"
                  suffixIcon={<FilterOutlined className="text-emerald-500" />}
                  options={[
                    { 
                      label: (
                        <span>
                          <FileTextOutlined className="mr-2 text-blue-500" />
                          Tất cả
                        </span>
                      ), 
                      value: "all" 
                    },
                    { 
                      label: (
                        <span>
                          <MedicineBoxOutlined className="mr-2 text-emerald-500" />
                          Chuyên khoa
                        </span>
                      ), 
                      value: "consultation" 
                    },
                    { 
                      label: (
                        <span>
                          <HeartOutlined className="mr-2 text-purple-500" />
                          Tổng quát
                        </span>
                      ), 
                      value: "checkup" 
                    },
                    { 
                      label: (
                        <span>
                          <ThunderboltOutlined className="mr-2 text-red-500" />
                          Cấp cứu
                        </span>
                      ), 
                      value: "emergency" 
                    },
                  ]}
                />
              </Col>
              
              {/* Sort Options */}
              <Col xs={24} sm={12} lg={6}>
                <Select
                  size="large"
                  value={sortBy}
                  onChange={setSortBy}
                  style={{ width: "100%" }}
                  className="sort-select"
                  options={[
                    { 
                      label: (
                        <span>
                          <CalendarOutlined className="mr-2 text-emerald-500" />
                          Mới nhất
                        </span>
                      ), 
                      value: "date_desc" 
                    },
                    { 
                      label: (
                        <span>
                          <CalendarOutlined className="mr-2 text-slate-500" />
                          Cũ nhất
                        </span>
                      ), 
                      value: "date_asc" 
                    },
                    { 
                      label: (
                        <span>
                          <UserOutlined className="mr-2 text-blue-500" />
                          Theo bác sĩ
                        </span>
                      ), 
                      value: "doctor" 
                    },
                  ]}
                />
              </Col>
            </Row>
            
            {/* Filter Summary */}
            {(searchQuery || filter !== 'all') && (
              <div className="mt-4 pt-4 border-t border-emerald-100">
                <Space wrap>
                  <Text type="secondary" className="text-sm">
                    <FilterOutlined className="mr-2" />
                    Đang lọc:
                  </Text>
                  {searchQuery && (
                    <Badge 
                      count={`Tìm kiếm: "${searchQuery}"`} 
                      style={{ backgroundColor: '#10b981' }}
                      className="cursor-pointer"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                    />
                  )}
                  {filter !== 'all' && (
                    <Badge 
                      count={`Loại: ${RECORD_TYPES[filter]?.label || filter}`}
                      style={{ backgroundColor: '#14b8a6' }}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilter('all');
                        setCurrentPage(1);
                      }}
                    />
                  )}
                  <Button 
                    type="link" 
                    size="small"
                    className="text-emerald-600"
                    onClick={() => {
                      setSearchQuery('');
                      setFilter('all');
                      setCurrentPage(1);
                    }}
                  >
                    Xóa tất cả
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Records List */}
        {loading ? (
          <Space direction="vertical" className="w-full" size="large">
            <Row gutter={[16, 16]}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Col xs={24} lg={12} key={i}>
                  <Card className="shadow-lg">
                    <Skeleton active avatar={{ size: 64, shape: 'square' }} paragraph={{ rows: 4 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          </Space>
        ) : paginatedRecords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="shadow-lg text-center py-12">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                imageStyle={{ height: 120 }}
                description={
                  <Space direction="vertical" size="middle">
                    <Title level={3}>
                      {filter === 'all' 
                        ? 'Chưa có hồ sơ bệnh án' 
                        : `Không có hồ sơ "${RECORD_TYPES[filter]?.label || filter}"`}
                    </Title>
                    <Text type="secondary" className="text-base">
                      {filter === 'all' 
                        ? 'Sau khi khám bệnh, hồ sơ sẽ tự động được đồng bộ về đây'
                        : `Không tìm thấy hồ sơ nào với bộ lọc này`}
                    </Text>
                  </Space>
                }
              >
                <Link to="/patient/booking">
                  <Button type="primary" size="large" icon={<PlusOutlined />}>
                    Đặt lịch khám ngay
                  </Button>
                </Link>
              </Empty>
            </Card>
          </motion.div>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <AnimatePresence>
                {paginatedRecords.map((record) => (
                  <Col xs={24} lg={12} key={record.id}>
                    <RecordCard
                      record={record}
                      onView={handleViewRecord}
                      onDownload={handleDownloadRecord}
                      onRate={handleRate}
                      hasRated={ratedAppointments.has(record.appointment_id)}
                    />
                  </Col>
                ))}
              </AnimatePresence>
            </Row>
            
            {totalPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination
                  current={currentPage}
                  pageSize={itemsPerPage}
                  total={filteredRecords.length}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                  showTotal={(total, range) => (
                    <span className="hidden sm:inline">{`${range[0]}-${range[1]} / ${total} hồ sơ`}</span>
                  )}
                  size="default"
                  responsive
                />
              </div>
            )}
          </>
        )}

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Alert
            message={
              <Space>
                <LockOutlined className="text-xl" />
                <Text strong className="text-base">Bảo mật và Quyền riêng tư</Text>
              </Space>
            }
            description={
              <div>
                <Paragraph className="!mb-4">
                  Tất cả hồ sơ bệnh án của bạn được mã hóa và bảo vệ theo tiêu chuẩn HIPAA. 
                  Chỉ bạn và bác sĩ được ủy quyền mới có thể truy cập thông tin này.
                </Paragraph>
                <Space wrap>
                  <Badge status="success" text="Mã hóa AES-256" />
                  <Badge status="success" text="Tuân thủ GDPR" />
                  <Badge status="success" text="Kiểm tra bảo mật định kỳ" />
                </Space>
              </div>
            }
            type="success"
            showIcon
            icon={<SafetyOutlined className="text-xl" />}
            className="shadow-lg"
          />
        </motion.div>

        {/* Record Detail Modal */}
        <AnimatePresence>
          {selectedRecord && (
            <RecordDetailModal
              record={selectedRecord}
              onClose={() => setSelectedRecord(null)}
            />
          )}
        </AnimatePresence>

        {/* Rating Modal */}
        {ratingModal.open && ratingModal.doctorInfo && (
          <RatingForm
            visible={ratingModal.open}
            appointmentId={ratingModal.record?.appointment_id}
            doctorInfo={ratingModal.doctorInfo}
            onSuccess={handleRatingSuccess}
            onCancel={() => setRatingModal({ open: false, record: null, doctorInfo: null })}
            showAsModal={true}
          />
        )}

      </div>
    </div>
  );
}