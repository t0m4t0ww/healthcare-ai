// components/appointments/AppointmentDetailCard.jsx - REFACTORED WITH ANT DESIGN ✅
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  Tag,
  Badge,
  Button,
  Space,
  Typography,
  Descriptions,
  Divider,
  Alert,
  Collapse,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  StarFilled,
  MessageOutlined,
  EditOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { APPOINTMENT_TYPE_MAP } from "../../constants/appointmentConstants";
import { getSpecialtyName } from "../../constants/specialtyConstants";
import { formatDateVN } from "../../utils/appointmentHelpers";
import ratingService from "../../services/ratingServices";

const { Title, Text, Paragraph } = Typography;
// Removed Panel import - using items prop instead

export default function AppointmentDetailCard({ 
  appointment, 
  onCancel, 
  onReschedule, 
  onMessage, 
  isJustBooked 
}) {
  const [expanded, setExpanded] = useState(isJustBooked || false);
  
  const todayStr = new Date().toDateString();
  const aptDate = appointment.date ? new Date(`${appointment.date}T12:00:00`) : new Date();
  const isToday = aptDate.toDateString() === todayStr;
  const isPast = aptDate < new Date();
  
  const statusLower = (appointment.status || "").toLowerCase();
  const isCancelled = statusLower === "cancelled";
  const isRescheduled = statusLower === "rescheduled"; // ✅ Check if appointment is rescheduled
  const isCompleted = statusLower === "completed"; // ✅ Check if appointment is completed
  // ✅ Allow actions (message, reschedule, cancel) for rescheduled appointments
  // Only hide actions when completed or cancelled
  const isUpcoming = !isPast && !isCancelled && !isCompleted; // ✅ Only exclude completed and cancelled
  const isConfirmed = Boolean(appointment.is_confirmed) || statusLower === "confirmed";
  const derivedStatus = isConfirmed ? "confirmed" : (appointment.status || "");

  // Helper: Calculate age from date_of_birth
  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  };

  // Helper: Map gender to Vietnamese
  const mapGender = (gender) => {
    if (!gender) return null;
    const genderMap = {
      'male': 'Nam',
      'female': 'Nữ',
      'other': 'Khác',
      'nam': 'Nam',
      'nữ': 'Nữ',
      'khác': 'Khác'
    };
    return genderMap[gender.toLowerCase()] || gender;
  };

  // Helper: Format age and gender display
  const formatAgeGender = (patientData) => {
    const age = calculateAge(patientData?.date_of_birth || patientData?.dob);
    const gender = mapGender(patientData?.gender);
    
    if (age && gender) {
      return `${age} tuổi • ${gender}`;
    } else if (age) {
      return `${age} tuổi`;
    } else if (gender) {
      return gender;
    } else {
      return null;
    }
  };

  // Get status config
  const getStatusConfig = (status) => {
    const configs = {
      confirmed: { color: 'success', icon: <CheckCircleOutlined />, text: 'Đã xác nhận' },
      booked: { color: 'success', icon: <CheckCircleOutlined />, text: 'Đã xác nhận' }, // ✅ Same as confirmed
      pending: { color: 'warning', icon: <ClockCircleOutlined />, text: 'Chờ xác nhận' },
      completed: { color: 'default', icon: <CheckCircleOutlined />, text: 'Hoàn thành' },
      cancelled: { color: 'error', icon: <CloseOutlined />, text: 'Đã hủy' },
      rescheduled: { color: 'processing', icon: <CheckCircleOutlined />, text: 'Đã đổi lịch' }, // ✅ Rescheduled status
    };
    // ✅ Map status to Vietnamese if not found in configs
    const statusLower = status?.toLowerCase();
    if (configs[statusLower]) {
      return configs[statusLower];
    }
    // Fallback: translate common statuses to Vietnamese
    const statusTranslations = {
      'rescheduled': 'Đã đổi lịch',
      'confirmed': 'Đã xác nhận',
      'pending': 'Chờ xác nhận',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
      'booked': 'Đã đặt',
    };
    return { 
      color: 'default', 
      icon: null, 
      text: statusTranslations[statusLower] || status 
    };
  };

  const statusConfig = getStatusConfig(derivedStatus);

  // Doctor info - ✅ Handle specialty mapping
  const doctorRaw = appointment.doctor_info || {
    name: appointment.doctor_name || "N/A",
    specialty: appointment.doctor_specialty || appointment.specialty_name || "general_medicine",
    specialty_name: appointment.specialty_name,
    avatar: "👨‍⚕️",
    phone: "N/A"
  };

  // ✅ Map specialty to Vietnamese name using centralized constant
  const specialtyDisplay = doctorRaw.specialty_name || 
                          getSpecialtyName(doctorRaw.specialty) || 
                          'Đa khoa';

  const doctor = {
    ...doctorRaw,
    specialtyDisplay, // ✅ Add Vietnamese specialty name
  };
  const doctorId = appointment.doctor_id || doctor._id || doctor.id;
  const initialAverage = Number.isFinite(Number(doctor.rating))
    ? Number(doctor.rating)
    : null;
  const [doctorRating, setDoctorRating] = useState({
    average: initialAverage,
    total: Number.isFinite(Number(doctor.rating_total_reviews))
      ? Number(doctor.rating_total_reviews)
      : null,
  });
  const [loadingRating, setLoadingRating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadRating = async () => {
      if (!doctorId) return;
      try {
        setLoadingRating(true);
        const stats = await ratingService.getDoctorRatingStats(doctorId);
        if (!cancelled) {
          setDoctorRating({
            average: stats?.average_rating ?? null,
            total: stats?.total_ratings ?? null,
          });
        }
      } catch (error) {
        console.error("Failed to load doctor rating:", error);
      } finally {
        if (!cancelled) {
          setLoadingRating(false);
        }
      }
    };

    loadRating();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const ratingValueDisplay =
    doctorRating.average != null && !Number.isNaN(Number(doctorRating.average))
      ? Number(doctorRating.average).toFixed(1)
      : "0";
  const ratingTotalDisplay =
    doctorRating.total != null && !Number.isNaN(Number(doctorRating.total))
      ? Number(doctorRating.total)
      : 0;

  // Patient info
  const patient = appointment.patient_info || appointment.patient || null;
  const patientAgeGender = patient ? formatAgeGender(patient) : null;
  
  const appointmentTypeDisplay = APPOINTMENT_TYPE_MAP[appointment.appointment_type] || 'Khám bệnh';

  // Auto scroll when just booked
  useEffect(() => {
    if (isJustBooked) {
      setExpanded(true);
      const timer = setTimeout(() => {
        const element = document.getElementById(`apt-${appointment._id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isJustBooked, appointment._id]);

  return (
    <motion.div
      id={`apt-${appointment._id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4"
    >
      <Badge.Ribbon 
        text={isToday ? "HÔM NAY" : isJustBooked ? "✨ MỚI ĐẶT" : null}
        color={isToday ? "green" : "gold"}
        style={{ display: (isToday || isJustBooked) ? 'block' : 'none' }}
      >
        <Card
          className={`shadow-lg hover:shadow-xl transition-all duration-300 ${
            isToday ? 'border-2 border-emerald-500' : ''
          } ${
            isJustBooked ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
          }`}
          hoverable
        >
          {/* Header - Doctor Info */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 -m-6 mb-6 p-5 rounded-t-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                  {doctor.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <Title level={4} className="!text-white !mb-2 !leading-tight truncate">
                    {doctor.name}
                  </Title>
                  <Space wrap size={[8, 4]}>
                    <Tag color="white" className="!text-emerald-700 border-0 font-semibold !m-0">
                      <MedicineBoxOutlined className="mr-1" />
                      {doctor.specialtyDisplay}
                    </Tag>
                    <Tag color="white" className="!text-teal-700 border-0 !m-0">
                      {appointmentTypeDisplay}
                    </Tag>
                    <Tag
                      icon={<StarFilled />}
                      color="gold"
                      className="border-0 !m-0"
                    >
                      {ratingValueDisplay}
                      {ratingTotalDisplay > 0 ? ` (${ratingTotalDisplay})` : ""}
                    </Tag>
                  </Space>
                </div>
              </div>
              <Tag 
                icon={statusConfig.icon} 
                color={statusConfig.color}
                className="!text-sm !font-semibold flex-shrink-0"
              >
                {statusConfig.text}
              </Tag>
            </div>
          </div>

          {/* Doctor's Note - Quick View (if exists) */}
          {(appointment.confirm_note || (isCancelled && (appointment.cancel_reason || appointment.cancellation_reason))) && (
            <Alert
              message={
                <Space>
                  {isCancelled ? (
                    <>
                      <CloseOutlined className="text-red-500" />
                      <Text strong className="text-red-600">Lý do hủy:</Text>
                      <Text className="text-red-700">
                        {appointment.cancel_reason || appointment.cancellation_reason}
                      </Text>
                    </>
                  ) : (
                    <>
                      <CheckCircleOutlined className="text-emerald-500" />
                      <Text strong className="text-emerald-600">Ghi chú từ bác sĩ:</Text>
                      <Text className="text-emerald-700">
                        {appointment.confirm_note}
                      </Text>
                    </>
                  )}
                </Space>
              }
              type={isCancelled ? "error" : "success"}
              showIcon={false}
              className="mb-4"
              style={{
                backgroundColor: isCancelled ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${isCancelled ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '8px'
              }}
            />
          )}

          {/* Main Info - Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Card 
              size="small" 
              className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all"
              styles={{ body: { padding: '12px' } }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0">
                  <CalendarOutlined className="text-white text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <Text type="secondary" className="text-xs uppercase font-semibold block mb-0.5">
                    Ngày khám
                  </Text>
                  <Text strong className="text-sm block truncate">
                    {formatDateVN(appointment.date)}
                  </Text>
                </div>
              </div>
            </Card>

            <Card 
              size="small" 
              className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all"
              styles={{ body: { padding: '12px' } }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm flex-shrink-0">
                  <ClockCircleOutlined className="text-white text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <Text type="secondary" className="text-xs uppercase font-semibold block mb-0.5">
                    Giờ khám
                  </Text>
                  <Text strong className="text-lg block">
                    {appointment.start_time || "N/A"}
                  </Text>
                </div>
              </div>
            </Card>
          </div>

          {/* Expanded Details */}
          <Collapse 
            bordered={false}
            activeKey={expanded ? ['1'] : []}
            onChange={() => setExpanded(!expanded)}
            className="bg-transparent"
            items={[{
              key: '1',
              label: (
                <Text strong className="text-emerald-600">
                  {expanded ? "Thu gọn chi tiết" : "Xem chi tiết"}
                </Text>
              ),
              className: '!border-0',
              children: (
                <Space direction="vertical" size="large" className="w-full">
                
                {/* Patient Info */}
                {patient && (
                  <Card 
                    size="small" 
                    title={
                      <Space>
                        <UserOutlined className="text-blue-500" />
                        <Text strong>Thông tin bệnh nhân</Text>
                      </Space>
                    }
                    className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200"
                  >
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="Họ tên">
                        <Text strong>
                          {patient.name || patient.full_name || appointment.patient_name || 'N/A'}
                        </Text>
                      </Descriptions.Item>
                      {patientAgeGender && (
                        <Descriptions.Item label="Tuổi/Giới">
                          <Text strong>{patientAgeGender}</Text>
                        </Descriptions.Item>
                      )}
                      {patient.phone && (
                        <Descriptions.Item label="Điện thoại" icon={<PhoneOutlined />}>
                          <Text strong>{patient.phone}</Text>
                        </Descriptions.Item>
                      )}
                      {patient.address && (
                        <Descriptions.Item label="Địa chỉ" icon={<EnvironmentOutlined />} span={2}>
                          {patient.address}
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {/* Allergies Warning */}
                    {patient.allergies_medications && (
                      <Alert
                        message="⚠️ Dị ứng thuốc"
                        description={patient.allergies_medications}
                        type="error"
                        showIcon
                        className="mt-3"
                      />
                    )}

                    {/* Medical History */}
                    {patient.medical_history && (
                      <Alert
                        message="📋 Tiền sử bệnh"
                        description={patient.medical_history}
                        type="info"
                        showIcon
                        className="mt-2"
                      />
                    )}
                  </Card>
                )}

                {/* Reason for Visit */}
                {appointment.reason && (
                  <Card 
                    size="small"
                    title={
                      <Space>
                        <FileTextOutlined className="text-emerald-500" />
                        <Text strong>Lý do khám</Text>
                      </Space>
                    }
                    className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"
                  >
                    <Paragraph className="!mb-0">
                      {appointment.reason}
                    </Paragraph>
                  </Card>
                )}

                {/* Chief Complaint */}
                {appointment.chief_complaint && appointment.chief_complaint.main_symptom && (
                  <Card
                    size="small"
                    title={
                      <Space>
                        <MedicineBoxOutlined className="text-orange-500" />
                        <Text strong>Triệu chứng chính</Text>
                      </Space>
                    }
                    className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Triệu chứng">
                        <Text strong>{appointment.chief_complaint.main_symptom}</Text>
                      </Descriptions.Item>
                      {appointment.chief_complaint.duration && (
                        <Descriptions.Item label="Thời gian">
                          {appointment.chief_complaint.duration}
                        </Descriptions.Item>
                      )}
                      {appointment.chief_complaint.severity && (
                        <Descriptions.Item label="Mức độ">
                          <Tag color={
                            appointment.chief_complaint.severity === 'severe' ? 'red' :
                            appointment.chief_complaint.severity === 'moderate' ? 'orange' : 'blue'
                          }>
                            {appointment.chief_complaint.severity === 'severe' ? 'Nặng' :
                             appointment.chief_complaint.severity === 'moderate' ? 'Trung bình' : 'Nhẹ'}
                          </Tag>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                    {appointment.chief_complaint.description && (
                      <>
                        <Divider className="!my-3" />
                        <Text type="secondary" className="text-sm">
                          {appointment.chief_complaint.description}
                        </Text>
                      </>
                    )}
                  </Card>
                )}

                {/* Confirm Note from Doctor */}
                {appointment.confirm_note && appointment.is_confirmed && (
                  <Alert
                    message={
                      <Space>
                        <CheckCircleOutlined />
                        <Text strong>Ghi chú xác nhận từ bác sĩ</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph className="!mb-2">
                          {appointment.confirm_note}
                        </Paragraph>
                        {appointment.confirmed_at && (
                          <Text type="secondary" className="text-xs">
                            <ClockCircleOutlined className="mr-1" />
                            Xác nhận lúc: {new Date(appointment.confirmed_at).toLocaleString('vi-VN')}
                          </Text>
                        )}
                      </div>
                    }
                    type="success"
                    showIcon={false}
                    className="border-2 border-emerald-300"
                  />
                )}

                {/* Reschedule Notice */}
                {isRescheduled && (
                  <Alert
                    message={
                      <Space>
                        <CheckCircleOutlined className="text-blue-500" />
                        <Text strong className="text-blue-600">Đã đổi lịch khám</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph className="!mb-2 text-blue-700">
                          Lịch khám này đã được đổi sang lịch mới.
                        </Paragraph>
                        {appointment.rescheduled_at && (
                          <Text type="secondary" className="text-xs">
                            <ClockCircleOutlined className="mr-1" />
                            Đổi lúc: {new Date(appointment.rescheduled_at).toLocaleString('vi-VN')}
                          </Text>
                        )}
                        {appointment.rescheduled_to_appointment_id && (
                          <Text type="secondary" className="text-xs block mt-1">
                            <CheckCircleOutlined className="mr-1" />
                            Lịch mới đã được tạo thành công
                          </Text>
                        )}
                      </div>
                    }
                    type="info"
                    showIcon={false}
                    className="border-2 border-blue-300"
                  />
                )}

                {/* Cancellation Reason - Only show if cancelled (not rescheduled) */}
                {isCancelled && !isRescheduled && (appointment.cancel_reason || appointment.cancellation_reason) && (
                  <Alert
                    message={
                      <Space>
                        <CloseOutlined />
                        <Text strong>Lý do hủy lịch</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph className="!mb-2">
                          {appointment.cancel_reason || appointment.cancellation_reason}
                        </Paragraph>
                        {appointment.cancelled_at && (
                          <Text type="secondary" className="text-xs">
                            <ClockCircleOutlined className="mr-1" />
                            Hủy lúc: {new Date(appointment.cancelled_at).toLocaleString('vi-VN')}
                          </Text>
                        )}
                        {appointment.cancelled_by_role && (
                          <Text type="secondary" className="text-xs block mt-1">
                            {appointment.cancelled_by_role === 'doctor' ? '👨‍⚕️' : '👤'} 
                            {' '}
                            {appointment.cancelled_by_role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'} đã hủy
                          </Text>
                        )}
                      </div>
                    }
                    type="error"
                    showIcon={false}
                    className="border-2 border-red-300"
                  />
                )}

                {/* Notes */}
                {appointment.notes && (
                  <Alert
                    message="Ghi chú"
                    description={appointment.notes}
                    type="info"
                    showIcon
                    icon={<FileTextOutlined />}
                  />
                )}
              </Space>
              )
            }]}
          />

          {/* Actions */}
          <Divider />
          <Space wrap className="w-full justify-end">
            {onMessage && isUpcoming && (
              <Button
                type="default"
                icon={<MessageOutlined />}
                onClick={() => onMessage(appointment)}
              >
                Nhắn tin
              </Button>
            )}
            {onReschedule && isUpcoming && !isCancelled && (
              <Button
                icon={<EditOutlined />}
                onClick={() => onReschedule(appointment)}
              >
                Đổi lịch
              </Button>
            )}
            {onCancel && isUpcoming && !isCancelled && (
              <Tooltip title="Hủy lịch hẹn">
                <Popconfirm
                  title="Hủy lịch hẹn"
                  description="Bạn có chắc muốn hủy lịch hẹn này?"
                  okText="Hủy lịch"
                  cancelText="Giữ lịch"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onCancel(appointment)}
                >
                  <Button danger icon={<CloseOutlined />}>
                    Hủy lịch
                  </Button>
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        </Card>
      </Badge.Ribbon>
    </motion.div>
  );
}
