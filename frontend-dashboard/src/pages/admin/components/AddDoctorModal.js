// src/pages/admin/components/AddDoctorModal.jsx - Antd v5 Optimized ✅
import React, { useState, useEffect } from 'react';
import { 
  Modal, Form, Input, Select, InputNumber, Switch, 
  Checkbox, Button, TimePicker, Space, Tag, Alert, Card,
  App // ✅ 1. Import App để dùng hook
} from 'antd';
import moment from 'moment';
import {
  User,
  Pill,
  Phone,
  Mail,
  Calendar,
  Clock,
  Save,
  Book,
  Globe,
  Briefcase,
  Users,
  Trophy,
  BookOpen,
  MessageCircle,
  FileText,
  Stethoscope,
} from 'lucide-react';
import api from '../../../services/services';
import { SPECIALTIES } from '../../../constants/specialties';

const { Option } = Select;
const { TextArea } = Input;

const AddDoctorModal = ({ open, onClose, onSuccess, editData = null }) => {
  // ✅ 2. Sử dụng hook để lấy message instance (thay vì import static)
  const { message } = App.useApp();
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [autoGenerateSlots, setAutoGenerateSlots] = useState(true);
  const [slotsDurationDays, setSlotsDurationDays] = useState(30);
  const [acceptingPatients, setAcceptingPatients] = useState(true);

  const isEditMode = !!editData;

  // Working hours mapping & Initial constants...
  const daysMap = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday', Sun: 'sunday' };
  const dayLabels = { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' };
  const initialWorkingHours = {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: true, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  };

  // Load saved working hours from localStorage
  const loadSavedWorkingHours = () => {
    try {
      const saved = localStorage.getItem('admin_last_working_hours');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading saved working hours:', e);
    }
    return null;
  };

  const [workingHours, setWorkingHours] = useState(
    editData?.working_hours || loadSavedWorkingHours() || initialWorkingHours
  );

  // ✅ Update form logic: Reset/Populate khi mở Modal
  useEffect(() => {
    if (!open) return;
    
    // Use setTimeout to ensure Form component is mounted before calling form methods
    const timer = setTimeout(() => {
      if (editData) {
        // Edit mode: populate form
        // Handle bio fields - support both old (string) and new (structured) format
        const bioData = typeof editData.bio === 'object' ? editData.bio : {};
        const hasStructuredBio = bioData && Object.keys(bioData).length > 0;
        
        form.setFieldsValue({
          name: editData.name || '',
          license_no: editData.license_no || '',
          issuing_authority: editData.issuing_authority || '',
          specialty: editData.specialty || editData.department || '',
          subspecialty: editData.subspecialty || '',
          years_of_experience: editData.years_of_experience || 0,
          qualifications_input: editData.qualifications?.join(', ') || '',
          languages_input: editData.languages?.join(', ') || '',
          email: editData.email || '',
          phone: editData.phone || '',
          gender: editData.gender || 'male',
          date_of_birth: editData.date_of_birth || '',
          slot_duration: editData.slot_duration || 30,
          on_call: editData.on_call || false,
          status: editData.status || 'active',
          role: editData.role || 'doctor',
          // Status: Load accepting_new_patients
          accepting_new_patients: typeof editData.accepting_new_patients === "boolean"
            ? editData.accepting_new_patients
            : (editData.status || "active") !== "paused",
          // Bio structured fields
          bio_education: hasStructuredBio ? bioData.education : '',
          bio_international_training: hasStructuredBio ? bioData.international_training : '',
          bio_experience: hasStructuredBio ? bioData.experience : '',
          bio_memberships: hasStructuredBio ? bioData.memberships : '',
          bio_awards: hasStructuredBio ? bioData.awards : '',
          bio_publications: hasStructuredBio ? bioData.publications : '',
          bio_summary: hasStructuredBio ? bioData.summary : (typeof editData.bio === 'string' ? editData.bio : ''),
          avatar: editData.avatar || '👨‍⚕️',
          consultation_fee: editData.consultation_fee || 500000,
        });
        setWorkingHours(editData.working_hours || initialWorkingHours);
        // Set accepting patients status
        const accepting = typeof editData.accepting_new_patients === "boolean"
          ? editData.accepting_new_patients
          : (editData.status || "active") !== "paused";
        setAcceptingPatients(accepting);
      } else {
        // Add mode: Reset form, but keep saved working hours if available
        form.resetFields();
        const saved = loadSavedWorkingHours();
        setWorkingHours(saved || initialWorkingHours);
        setAcceptingPatients(true); // Default to accepting patients
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [editData, open]); // Remove form from dependencies to avoid unnecessary re-runs

  // Handle submit
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const working_hours = {};
      Object.keys(workingHours).forEach((day) => {
        const dayConfig = workingHours[day];
        if (dayConfig && dayConfig.enabled) {
          working_hours[day] = { start: dayConfig.start, end: dayConfig.end };
        } else {
          working_hours[day] = null;
        }
      });

      const qualifications = values.qualifications_input
        ? values.qualifications_input.split(',').map((q) => q.trim()).filter(Boolean) : [];
      const languages = values.languages_input
        ? values.languages_input.split(',').map((l) => l.trim()).filter(Boolean) : [];

      // Build structured bio object
      const bio = {
        education: values.bio_education || '',
        international_training: values.bio_international_training || '',
        experience: values.bio_experience || '',
        memberships: values.bio_memberships || '',
        awards: values.bio_awards || '',
        publications: values.bio_publications || '',
        summary: values.bio_summary || '',
      };

      const payload = {
        name: values.name,
        full_name: values.name,
        license_no: values.license_no,
        issuing_authority: values.issuing_authority || '',
        department: values.specialty,
        specialty: values.specialty,
        subspecialty: values.subspecialty || '',
        years_of_experience: values.years_of_experience || 0,
        qualifications,
        languages,
        email: values.email || '',
        phone: values.phone || '',
        gender: values.gender || 'male',
        date_of_birth: values.date_of_birth || '',
        working_hours,
        slot_duration: values.slot_duration || 30,
        on_call: values.on_call || false,
        status: acceptingPatients ? 'active' : 'paused',
        accepting_new_patients: acceptingPatients,
        role: values.role || 'doctor',
        bio,
        avatar: values.avatar || '👨‍⚕️',
        consultation_fee: values.consultation_fee || 500000,
      };

      // Save working hours to localStorage for next time (only in add mode)
      if (!isEditMode) {
        try {
          localStorage.setItem('admin_last_working_hours', JSON.stringify(workingHours));
        } catch (e) {
          console.warn('Could not save working hours to localStorage:', e);
        }
      }

      let response;
      if (isEditMode) {
        response = await api.patch(`/doctors/${editData._id || editData.id}`, payload);
        message.success('Cập nhật bác sĩ thành công!');
      } else {
        response = await api.post('/doctors', payload);
        message.success('Thêm bác sĩ thành công!');

        if (autoGenerateSlots && response?.data?.data?.id) {
          try {
            const doctorId = response.data.data.id;
            await api.post('/time-slots/generate', {
              doctor_id: doctorId,
              duration_days: slotsDurationDays,
            });
            message.success(`Đã tự động tạo lịch khám cho ${slotsDurationDays} ngày tới!`);
          } catch (err) {
            console.warn('Auto generate slots failed:', err);
            message.warning('Bác sĩ đã được thêm nhưng không thể tự động tạo lịch');
          }
        }
      }

      onSuccess && onSuccess(response?.data?.data);
      handleClose();
    } catch (error) {
      console.error('Error saving doctor:', error);
      message.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        `Không thể ${isEditMode ? 'cập nhật' : 'thêm'} bác sĩ`
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ 3. Tối ưu Handle close: Không gọi resetFields ở đây để tránh warning
  const handleClose = () => {
    // form.resetFields(); // ❌ Bỏ dòng này
    setWorkingHours(initialWorkingHours);
    setAutoGenerateSlots(true);
    setSlotsDurationDays(30);
    onClose();
  };

  // Toggle working day
  const toggleWorkingDay = (day) => {
    setWorkingHours((prev) => {
      const currentConfig = prev[day] || { enabled: false, start: '09:00', end: '17:00' };
      return { ...prev, [day]: { ...currentConfig, enabled: !currentConfig.enabled } };
    });
  };

  // Update working hours time
  const updateWorkingTime = (day, field, value) => {
    setWorkingHours((prev) => {
      const currentConfig = prev[day] || { enabled: true, start: '09:00', end: '17:00' };
      return { ...prev, [day]: { ...currentConfig, [field]: value } };
    });
  };

  // Apply working hours from one day to all enabled days
  const applyToAllDays = (sourceDay) => {
    const sourceConfig = workingHours[sourceDay];
    if (!sourceConfig || !sourceConfig.enabled) {
      message.warning('Vui lòng chọn một ngày đã bật để áp dụng!');
      return;
    }

    setWorkingHours((prev) => {
      const updated = { ...prev };
      Object.keys(prev).forEach((day) => {
        if (prev[day]?.enabled) {
          updated[day] = {
            ...prev[day],
            start: sourceConfig.start,
            end: sourceConfig.end,
          };
        }
      });
      return updated;
    });
    message.success(`Đã áp dụng giờ làm việc ${sourceConfig.start} - ${sourceConfig.end} cho tất cả các ngày đã bật!`);
  };

  // Apply template working hours
  const applyTemplate = (templateName) => {
    const templates = {
      'office_hours': {
        monday: { enabled: true, start: '08:00', end: '17:00' },
        tuesday: { enabled: true, start: '08:00', end: '17:00' },
        wednesday: { enabled: true, start: '08:00', end: '17:00' },
        thursday: { enabled: true, start: '08:00', end: '17:00' },
        friday: { enabled: true, start: '08:00', end: '17:00' },
        saturday: { enabled: false, start: '08:00', end: '17:00' },
        sunday: { enabled: false, start: '08:00', end: '17:00' },
      },
      'morning_shift': {
        monday: { enabled: true, start: '08:00', end: '12:00' },
        tuesday: { enabled: true, start: '08:00', end: '12:00' },
        wednesday: { enabled: true, start: '08:00', end: '12:00' },
        thursday: { enabled: true, start: '08:00', end: '12:00' },
        friday: { enabled: true, start: '08:00', end: '12:00' },
        saturday: { enabled: false, start: '08:00', end: '12:00' },
        sunday: { enabled: false, start: '08:00', end: '12:00' },
      },
      'afternoon_shift': {
        monday: { enabled: true, start: '13:00', end: '17:00' },
        tuesday: { enabled: true, start: '13:00', end: '17:00' },
        wednesday: { enabled: true, start: '13:00', end: '17:00' },
        thursday: { enabled: true, start: '13:00', end: '17:00' },
        friday: { enabled: true, start: '13:00', end: '17:00' },
        saturday: { enabled: false, start: '13:00', end: '17:00' },
        sunday: { enabled: false, start: '13:00', end: '17:00' },
      },
      'full_week': {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: true, start: '09:00', end: '13:00' },
        sunday: { enabled: true, start: '09:00', end: '13:00' },
      },
    };

    const template = templates[templateName];
    if (template) {
      setWorkingHours(template);
      const templateLabels = {
        'office_hours': 'Giờ hành chính (T2-T6: 8h-17h)',
        'morning_shift': 'Ca sáng (T2-T6: 8h-12h)',
        'afternoon_shift': 'Ca chiều (T2-T6: 13h-17h)',
        'full_week': 'Cả tuần (T2-T6: 9h-17h, T7-CN: 9h-13h)',
      };
      message.success(`Đã áp dụng template: ${templateLabels[templateName]}`);
    }
  };

  // Calculate estimated slots
  const calculateEstimatedSlots = () => {
    const enabledDays = Object.values(workingHours).filter((d) => d && d.enabled).length;
    // Thêm check || 30 để tránh chia cho 0 hoặc undefined
    const slotDuration = form.getFieldValue('slot_duration') || 30; 
    return Math.floor((slotsDurationDays / 7) * enabledDays * ((17 - 9) * 60 / slotDuration));
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <Pill size={24} className="text-green-500" />
          <span>{isEditMode ? 'Chỉnh sửa bác sĩ' : 'Thêm bác sĩ mới'}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
            // Giữ nguyên initialValues như bản cũ để đề phòng
            // (Tuy nhiên useEffect đã handle việc populate data rồi)
            slot_duration: 30,
            gender: 'male',
            status: 'active',
            accepting_new_patients: true,
            role: 'doctor',
            consultation_fee: 500000
        }}
      >
        {/* ... (Giữ nguyên toàn bộ phần giao diện Form bên trong) ... */}
        {/* Thông tin cơ bản */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="Họ tên"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập họ tên' },
              { min: 3, message: 'Họ tên phải có ít nhất 3 ký tự' },
            ]}
          >
            <Input prefix={<User size={16} className="text-gray-400" />} placeholder="BS. Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            label="Số CCHN"
            name="license_no"
            rules={[
              { required: true, message: 'Vui lòng nhập số CCHN' },
              { min: 5, message: 'Số CCHN phải có ít nhất 5 ký tự' },
            ]}
          >
            <Input placeholder="BS-12345" />
          </Form.Item>
        </div>

        <Form.Item label="Cơ quan cấp" name="issuing_authority">
          <Input placeholder="Bộ Y tế" />
        </Form.Item>

        {/* Chuyên khoa */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="Chuyên khoa"
            name="specialty"
            rules={[{ required: true, message: 'Vui lòng chọn chuyên khoa' }]}
          >
            <Select placeholder="Chọn chuyên khoa">
              {Object.values(SPECIALTIES).map((spec) => (
                <Option key={spec.code} value={spec.code}>
                  {spec.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Phân khoa hẹp" name="subspecialty">
            <Input placeholder="VD: Tim mạch can thiệp qua da" />
          </Form.Item>
        </div>

        {/* Liên hệ */}
        <div className="grid grid-cols-3 gap-4">
          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input prefix={<Mail size={16} className="text-gray-400" />} placeholder="doctor@example.com" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại phải có 10-11 chữ số' },
            ]}
          >
            <Input prefix={<Phone size={16} className="text-gray-400" />} placeholder="0912345678" />
          </Form.Item>

          <Form.Item
            label="Giới tính"
            name="gender"
            rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
          >
            <Select placeholder="Chọn giới tính">
              <Option value="male">Nam</Option>
              <Option value="female">Nữ</Option>
              <Option value="other">Khác</Option>
            </Select>
          </Form.Item>
        </div>

        {/* Ngày sinh */}
        <Form.Item
          label="Ngày sinh (dd/mm/yyyy)"
          name="date_of_birth"
          rules={[
            { required: true, message: 'Vui lòng nhập ngày sinh' },
            {
              pattern: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
              message: 'Định dạng ngày sinh không hợp lệ (dd/mm/yyyy)',
            },
          ]}
        >
          <Input placeholder="25/12/1985" />
        </Form.Item>

        {/* Kinh nghiệm & Học vấn */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="Kinh nghiệm (năm)"
            name="years_of_experience"
            rules={[
              { type: 'number', min: 0, message: 'Kinh nghiệm không được âm' },
              { type: 'number', max: 60, message: 'Kinh nghiệm tối đa 60 năm' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={60} />
          </Form.Item>

          <Form.Item label="Học vị (ngăn cách bằng dấu phẩy)" name="qualifications_input">
            <Input placeholder="BS, ThS, PGS.TS" />
          </Form.Item>
        </div>

        <Form.Item label="Ngôn ngữ (ngăn cách bằng dấu phẩy)" name="languages_input">
          <Input placeholder="Tiếng Việt, English, 中文" />
        </Form.Item>

        {/* Giờ làm việc */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Giờ làm việc
            </h4>
            <div className="flex gap-2">
              <Button 
                size="small" 
                onClick={() => applyTemplate('office_hours')}
                title="Giờ hành chính (T2-T6: 8h-17h)"
              >
                Giờ hành chính
              </Button>
              <Button 
                size="small" 
                onClick={() => applyTemplate('morning_shift')}
                title="Ca sáng (T2-T6: 8h-12h)"
              >
                Ca sáng
              </Button>
              <Button 
                size="small" 
                onClick={() => applyTemplate('afternoon_shift')}
                title="Ca chiều (T2-T6: 13h-17h)"
              >
                Ca chiều
              </Button>
              <Button 
                size="small" 
                onClick={() => applyTemplate('full_week')}
                title="Cả tuần (T2-T6: 9h-17h, T7-CN: 9h-13h)"
              >
                Cả tuần
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {Object.keys(daysMap).map((dayKey) => {
              const day = daysMap[dayKey];
              const config = workingHours[day] || { enabled: false, start: '09:00', end: '17:00' };
              return (
                <div key={day} className="flex items-center gap-3">
                  <Checkbox
                    checked={config.enabled}
                    onChange={() => toggleWorkingDay(day)}
                  >
                    <Tag color={config.enabled ? 'blue' : 'default'}>
                      {dayLabels[dayKey]}
                    </Tag>
                  </Checkbox>
                  {config.enabled && (
                    <Space>
                      <TimePicker
                        format="HH:mm"
                        value={moment(config.start, 'HH:mm')}
                        onChange={(time) =>
                          updateWorkingTime(day, 'start', time ? time.format('HH:mm') : '09:00')
                        }
                      />
                      <span>-</span>
                      <TimePicker
                        format="HH:mm"
                        value={moment(config.end, 'HH:mm')}
                        onChange={(time) =>
                          updateWorkingTime(day, 'end', time ? time.format('HH:mm') : '17:00')
                        }
                      />
                      <Button 
                        type="link" 
                        size="small" 
                        onClick={() => applyToAllDays(day)}
                        title={`Áp dụng giờ ${config.start} - ${config.end} cho tất cả các ngày đã bật`}
                      >
                        Áp dụng cho tất cả
                      </Button>
                    </Space>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cài đặt khác */}
        <div className="grid grid-cols-3 gap-4">
          <Form.Item label="Thời lượng slot (phút)" name="slot_duration">
            <InputNumber style={{ width: '100%' }} min={15} max={120} step={15} />
          </Form.Item>

          <Form.Item label="Phí khám (VNĐ)" name="consultation_fee">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={50000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item label="Trực on-call" name="on_call" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        {/* Auto generate slots - CHỈ HIỂN THỊ KHI THÊM MỚI */}
        {!isEditMode && (
          <Alert
            message={
              <div>
                <Checkbox
                  checked={autoGenerateSlots}
                  onChange={(e) => setAutoGenerateSlots(e.target.checked)}
                >
                  <strong>Tự động tạo time slots sau khi thêm bác sĩ</strong>
                </Checkbox>
                {autoGenerateSlots && (
                  <div className="mt-2">
                    <Select
                      value={slotsDurationDays}
                      onChange={setSlotsDurationDays}
                      style={{ width: 200 }}
                      size="small"
                    >
                      <Option value={7}>7 ngày (1 tuần)</Option>
                      <Option value={14}>14 ngày (2 tuần)</Option>
                      <Option value={30}>30 ngày (1 tháng)</Option>
                      <Option value={60}>60 ngày (2 tháng)</Option>
                      <Option value={90}>90 ngày (3 tháng)</Option>
                    </Select>
                    <p className="text-sm text-gray-600 mt-2">
                      💡 Hệ thống sẽ tự động tạo khoảng{' '}
                      <strong>{calculateEstimatedSlots()} slots</strong> khám
                    </p>
                  </div>
                )}
              </div>
            }
            type="info"
            showIcon
            icon={<Calendar size={16} />}
          />
        )}

        {/* Vai trò & Trạng thái nhận bệnh - Ngang hàng */}
        <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
          {/* Vai trò */}
          <Card className="border border-gray-200 h-full">
            <div className="flex items-center gap-2 mb-3">
              <User size={20} className="text-indigo-500" />
              <span className="font-semibold text-base">Vai trò</span>
            </div>
            <Form.Item name="role" className="mb-0">
              <Select>
                <Option value="doctor">Bác sĩ lâm sàng</Option>
                <Option value="radiologist">Bác sĩ X-quang</Option>
                <Option value="admin">Quản trị viên</Option>
              </Select>
            </Form.Item>
          </Card>

          {/* Trạng thái nhận bệnh - Giống DoctorSettingsPage */}
          <Card className="border border-gray-200 h-full">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Stethoscope size={20} className="text-blue-500" />
                <span className="font-semibold text-base">Trạng thái nhận bệnh</span>
              </div>
              <Switch 
                checked={acceptingPatients} 
                onChange={(checked) => {
                  setAcceptingPatients(checked);
                  // Update form value để submit
                  form.setFieldsValue({
                    accepting_new_patients: checked,
                    status: checked ? "active" : "paused"
                  });
                }}
                checkedChildren="Mở"
                unCheckedChildren="Đóng"
              />
            </div>
            <div className={`p-3 rounded-xl text-sm ${acceptingPatients ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {acceptingPatients 
                ? "Đang nhận bệnh nhân mới. Lịch của bác sĩ hiển thị công khai." 
                : "Đang tạm dừng. Bệnh nhân không thể đặt lịch mới."}
            </div>
          </Card>
        </div>

        {/* Bio - Structured Sections */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200">
          <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FileText size={20} className="text-slate-700" />
            <span>Hồ sơ chuyên môn</span>
          </h3>
          
          <Form.Item 
            label={<span className="flex items-center gap-2"><Book size={16} className="text-blue-600" />Quá trình đào tạo & Bằng cấp</span>} 
            name="bio_education"
          >
            <TextArea 
              rows={3} 
              placeholder="VD: Bác sĩ Đa khoa - Đại học Y Hà Nội (2005-2011)&#10;Bác sĩ Chuyên khoa II Tim mạch - Bệnh viện Bạch Mai (2011-2015)" 
              maxLength={1000} 
              showCount 
            />
          </Form.Item>

          <Form.Item 
            label={<span className="flex items-center gap-2"><Globe size={16} className="text-emerald-600" />Đào tạo nâng cao & Tu nghiệp Quốc tế</span>} 
            name="bio_international_training"
          >
            <TextArea 
              rows={3} 
              placeholder="VD: Fellowship Tim mạch can thiệp - Mayo Clinic, Hoa Kỳ (2016-2018)&#10;Chứng chỉ Tim mạch châu Âu (ESC) - Đức (2019)" 
              maxLength={1000} 
              showCount 
            />
          </Form.Item>

          <Form.Item 
            label={<span className="flex items-center gap-2"><Briefcase size={16} className="text-indigo-600" />Kinh nghiệm công tác</span>} 
            name="bio_experience"
          >
            <TextArea 
              rows={3} 
              placeholder="VD: Phó Trưởng khoa Tim mạch - Bệnh viện Bạch Mai (2018-2022)&#10;Trưởng khoa Tim mạch - Bệnh viện Đa khoa Quốc tế (2022-nay)" 
              maxLength={1000} 
              showCount 
            />
          </Form.Item>

          <Form.Item 
            label={<span className="flex items-center gap-2"><Users size={16} className="text-purple-600" />Hội viên các hội chuyên ngành</span>} 
            name="bio_memberships"
          >
            <TextArea 
              rows={2} 
              placeholder="VD: Hội Tim mạch học Việt Nam&#10;Hiệp hội Tim mạch châu Á - Thái Bình Dương (APSC)&#10;Hội Tim mạch học châu Âu (ESC)" 
              maxLength={500} 
              showCount 
            />
          </Form.Item>

          <Form.Item 
            label={<span className="flex items-center gap-2"><Trophy size={16} className="text-amber-600" />Thành tích & Khen thưởng</span>} 
            name="bio_awards"
          >
            <TextArea 
              rows={2} 
              placeholder="VD: Bác sĩ xuất sắc toàn quốc (2020)&#10;Giải thưởng Y học Việt Nam (2021)&#10;Huân chương Lao động hạng Ba (2022)" 
              maxLength={500} 
              showCount 
            />
          </Form.Item>

          <Form.Item 
            label={<span className="flex items-center gap-2"><BookOpen size={16} className="text-rose-600" />Công trình khoa học tiêu biểu</span>} 
            name="bio_publications"
          >
            <TextArea 
              rows={3} 
              placeholder="VD: &quot;Nghiên cứu hiệu quả phương pháp can thiệp mạch vành qua da&quot; - The Lancet (2020)&#10;&quot;Đánh giá kết quả điều trị suy tim mãn tính&quot; - JACC (2021)" 
              maxLength={1000} 
              showCount 
            />
          </Form.Item>

          <Form.Item 
            label={<span className="flex items-center gap-2"><MessageCircle size={16} className="text-teal-600" />Giới thiệu chung (tuỳ chọn)</span>} 
            name="bio_summary"
          >
            <TextArea 
              rows={2} 
              placeholder="VD: Với hơn 15 năm kinh nghiệm trong lĩnh vực tim mạch, tôi cam kết mang đến dịch vụ chăm sóc sức khỏe tốt nhất..." 
              maxLength={500} 
              showCount 
            />
          </Form.Item>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading} icon={<Save size={16} />}>
            {isEditMode ? 'Cập nhật' : 'Thêm bác sĩ'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default AddDoctorModal;