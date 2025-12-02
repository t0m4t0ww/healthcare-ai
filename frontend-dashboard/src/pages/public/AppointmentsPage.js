// frontend-dashboard/src/pages/public/AppointmentsPage.js - REFACTORED WITH ANT DESIGN ✅

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Button,
  Input,
  Select,
  Segmented,
  Pagination,
  Modal,
  Empty,
  Skeleton,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  Alert,
  Badge,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  SortAscendingOutlined,
  FilterOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useAuth } from "../../context/AuthContext";
import { useAppointment } from "../../context/AppointmentContext";
import socket from "../../services/socket";
import { AppointmentDetailCard } from "../../components/appointments";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { 
    appointments, 
    appointmentsLoading, 
    fetchAppointments, 
    cancelAppointment 
  } = useAppointment();

  // Filters
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
    
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Cancel modal
  const [cancelModal, setCancelModal] = useState({ open: false, apt: null });
  const [cancelReason, setCancelReason] = useState("");

  // Just booked state
  const [justBookedId, setJustBookedId] = useState(null);

  // Load appointments on mount
  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  // Socket listener for real-time updates
  useEffect(() => {
    const handleAppointmentUpdate = (data) => {
      console.log('📡 Refetching after update:', data);
      fetchAppointments();
    };

    socket.on('appointment_updated', handleAppointmentUpdate);
    return () => socket.off('appointment_updated', handleAppointmentUpdate);
  }, [fetchAppointments]);

  // Handle just booked
  useEffect(() => {
    const justBooked = searchParams.get('justBooked');
    if (justBooked) {
      if (justBooked === 'true' && appointments.length > 0) {
        setJustBookedId(appointments[0]._id);
      } else {
        setJustBookedId(justBooked);
      }
      message.success('Đặt lịch thành công!');
      
      setTimeout(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('justBooked');
        navigate(`?${newParams.toString()}`, { replace: true });
      }, 1000);
    }
  }, [searchParams, appointments, navigate]);

  // Filtered & sorted list
  const filteredList = useMemo(() => {
    let data = [...appointments];

    // Filter by status
    if (filter === "upcoming") {
      data = data.filter((a) => {
        const statusLower = (a.status || "").toLowerCase();
        return new Date(`${a.date}T12:00:00`) >= new Date() && statusLower !== "cancelled";
      });
    } else if (filter === "completed") {
      data = data.filter((a) => (a.status || "").toLowerCase() === "completed");
    } else if (filter === "cancelled") {
      data = data.filter((a) => (a.status || "").toLowerCase() === "cancelled");
    }

    // Search filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      data = data.filter(
        (a) =>
          (a.reason || "").toLowerCase().includes(lower) ||
          (a.symptoms || "").toLowerCase().includes(lower) ||
          (a.notes || "").toLowerCase().includes(lower) ||
          (a.doctor_info?.name || a.doctor_name || "").toLowerCase().includes(lower)
      );
    }

    // Sort
    data.sort((a, b) => {
      if (sortBy === "date_asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "date_desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      return 0;
    });

    return data;
  }, [appointments, filter, searchQuery, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const upcoming = appointments.filter(
      (a) => {
        const statusLower = (a.status || "").toLowerCase();
        return new Date(`${a.date}T12:00:00`) >= new Date() && statusLower !== "cancelled";
      }
    ).length;
    const completed = appointments.filter((a) => (a.status || "").toLowerCase() === "completed").length;
    const cancelled = appointments.filter((a) => (a.status || "").toLowerCase() === "cancelled").length;
    return { total, upcoming, completed, cancelled };
  }, [appointments]);

  // Paginated
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  // Handlers
  const onReschedule = (apt) => {
    const doctorId = apt.doctor_id || apt.doctor_info?._id;
    navigate(`/patient/booking?doctorId=${doctorId}&reschedule=${apt._id}`);
  };

  const onMessageDoctor = (apt) => {
    navigate(`/patient/messages?appointmentId=${apt._id}`);
  };

  const onCancel = (apt) => {
    setCancelReason("");
    setCancelModal({ open: true, apt });
  };

  const confirmCancel = async () => {
    if (!cancelModal.apt) return;
    
    const result = await cancelAppointment(
      cancelModal.apt._id, 
      cancelReason || "Bệnh nhân hủy lịch"
    );
    
    if (result.success) {
      message.success("Đã hủy lịch khám");
      setCancelModal({ open: false, apt: null });
    } else {
      message.error(result.error || "Không thể hủy lịch");
    }
  };

  const handleRefresh = () => {
    fetchAppointments();
    message.success('Đã tải lại danh sách');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg border-0 bg-gradient-to-r from-emerald-500 to-teal-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                  <CalendarOutlined className="text-3xl text-white" />
                </div>
                <div>
                  <Title level={2} className="!text-white !mb-1">
                    Lịch khám của tôi
                  </Title>
                  <Text className="text-white/90 text-base">
                    Quản lý và theo dõi tất cả lịch hẹn khám bệnh
                  </Text>
                </div>
              </div>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  size="large"
                  className="!bg-white/20 !border-white/30 !text-white hover:!bg-white/30"
                >
                  Tải lại
                </Button>
                <Link to="/patient/booking">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    className="!bg-white !text-emerald-600 !border-0 hover:!bg-emerald-50"
                  >
                    Đặt lịch mới
                  </Button>
                </Link>
              </Space>
            </div>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.total} lịch`} color="blue">
                <Card className="shadow-md hover:shadow-xl transition-all">
                  <Statistic
                    title={<Text strong>Tổng lịch khám</Text>}
                    value={stats.total}
                    prefix={<CalendarOutlined className="text-blue-500" />}
                    loading={appointmentsLoading}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.upcoming} lịch`} color="green">
                <Card className="shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-emerald-50 to-teal-50">
                  <Statistic
                    title={<Text strong className="text-emerald-700">Sắp tới</Text>}
                    value={stats.upcoming}
                    prefix={<ClockCircleOutlined className="text-emerald-600" />}
                    valueStyle={{ color: '#059669' }}
                    loading={appointmentsLoading}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.completed} lịch`} color="purple">
                <Card className="shadow-md hover:shadow-xl transition-all">
                  <Statistic
                    title={<Text strong>Hoàn thành</Text>}
                    value={stats.completed}
                    prefix={<CheckCircleOutlined className="text-purple-500" />}
                    loading={appointmentsLoading}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Badge.Ribbon text={`${stats.cancelled} lịch`} color="red">
                <Card className="shadow-md hover:shadow-xl transition-all">
                  <Statistic
                    title={<Text strong>Đã hủy</Text>}
                    value={stats.cancelled}
                    prefix={<CloseOutlined className="text-red-500" />}
                    loading={appointmentsLoading}
                  />
                </Card>
              </Badge.Ribbon>
            </Col>
          </Row>
        </motion.div>

        {/* Filters */}
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
                  placeholder="Tìm theo lý do, triệu chứng, tên bác sĩ..."
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
              
              {/* Filter by Status */}
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
                          <CalendarOutlined className="mr-2 text-blue-500" />
                          Tất cả
                        </span>
                      ), 
                      value: "all" 
                    },
                    { 
                      label: (
                        <span>
                          <ClockCircleOutlined className="mr-2 text-emerald-500" />
                          Sắp tới
                        </span>
                      ), 
                      value: "upcoming" 
                    },
                    { 
                      label: (
                        <span>
                          <CheckCircleOutlined className="mr-2 text-green-500" />
                          Hoàn thành
                        </span>
                      ), 
                      value: "completed" 
                    },
                    { 
                      label: (
                        <span>
                          <CloseOutlined className="mr-2 text-red-500" />
                          Đã hủy
                        </span>
                      ), 
                      value: "cancelled" 
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
                          <CheckCircleOutlined className="mr-2 text-blue-500" />
                          Theo trạng thái
                        </span>
                      ), 
                      value: "status" 
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
                      count={`Trạng thái: ${
                        filter === 'upcoming' ? 'Sắp tới' :
                        filter === 'completed' ? 'Hoàn thành' :
                        filter === 'cancelled' ? 'Đã hủy' : filter
                      }`}
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

        {/* List */}
        {appointmentsLoading ? (
          <Space direction="vertical" className="w-full" size="large">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-lg">
                <Skeleton active avatar={{ size: 64, shape: 'square' }} paragraph={{ rows: 4 }} />
              </Card>
            ))}
          </Space>
        ) : paginated.length === 0 ? (
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
                        ? 'Chưa có lịch khám nào' 
                        : `Không có lịch khám "${filter}"`}
                    </Title>
                    <Text type="secondary" className="text-base">
                      Đặt lịch khám ngay để được bác sĩ tư vấn và chăm sóc sức khỏe
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
            <AnimatePresence>
              {paginated.map((apt) => (
                <AppointmentDetailCard
                  key={apt._id}
                  appointment={apt}
                  onCancel={onCancel}
                  onReschedule={onReschedule}
                  onMessage={onMessageDoctor}
                  isJustBooked={justBookedId === apt._id}
                />
              ))}
            </AnimatePresence>
            
            {filteredList.length > pageSize && (
              <div className="flex justify-center pt-4">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredList.length}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total} lịch khám`}
                  size="default"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Modal */}
      <Modal
        open={cancelModal.open}
        onCancel={() => setCancelModal({ open: false, apt: null })}
        footer={null}
        width={600}
        centered
      >
        <div className="py-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-xl">
              <WarningOutlined className="text-4xl text-white" />
            </div>
            <Title level={3} className="!mb-2">Xác nhận hủy lịch</Title>
            <Text type="secondary">Bạn có chắc muốn hủy lịch khám này?</Text>
          </div>

          <Alert
            message="⚠️ Lưu ý quan trọng"
            description={
              <ul className="space-y-2 mt-2">
                <li>• Hủy lịch trước <strong>2 giờ</strong> để tránh phí phạt</li>
                <li>• Không thể hoàn tác sau khi xác nhận</li>
                <li>• Slot khám sẽ được mở lại cho người khác</li>
              </ul>
            }
            type="warning"
            showIcon
            className="mb-6"
          />

          <div className="mb-6">
            <Text strong className="block mb-2">
              Lý do hủy lịch <Text type="secondary">(không bắt buộc)</Text>
            </Text>
            <TextArea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ví dụ: Tôi bận đột xuất, không thể đến khám..."
              autoSize={{ minRows: 4 }}
            />
          </div>

          <Space className="w-full" size="middle">
            <Button
              size="large"
              block
              onClick={() => setCancelModal({ open: false, apt: null })}
            >
              Đóng
            </Button>
            <Button
              type="primary"
              danger
              size="large"
              block
              onClick={confirmCancel}
              icon={<CloseOutlined />}
            >
              Xác nhận hủy
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
}
