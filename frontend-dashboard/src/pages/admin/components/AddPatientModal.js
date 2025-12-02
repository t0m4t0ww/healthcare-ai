// src/pages/admin/components/AddPatientModal.jsx - Fixed Form Warning ✅
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Button,
  message,
  Tabs,
  Alert,
  Descriptions,
  Tag,
  Space,
  Checkbox,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined,
  SaveOutlined,
  EditOutlined,
  CheckCircleOutlined,
  LockOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import api from '../../../services/services';
import { useAuth } from '../../../context/AuthContext';

const { Option } = Select;
const { TextArea } = Input;

const AddPatientModal = ({ open, onClose, onSuccess, patientId = null }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [patient, setPatient] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [bmi, setBmi] = useState(null);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);

  const isAddMode = !patientId;

  // ✅ Effect 1: Xử lý đóng/mở và gọi API (KHÔNG set dữ liệu form ở đây)
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setEditMode(false);
      setPatient(null);
      setBmi(null);
      return;
    }

    if (isAddMode) {
      setEditMode(true);
      // Reset form khi mở ở chế độ thêm mới
      // setTimeout để đảm bảo Form đã mount xong
      setTimeout(() => form.resetFields(), 0);
      return;
    }

    // Fetch data
    const fetchPatient = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/patients/${patientId}`);
        const data = response.data?.data || response.data;
        setPatient(data);
        setEditMode(true);
      } catch (error) {
        console.error('❌ Error fetching patient:', error);
        message.error('Không thể tải thông tin bệnh nhân');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [open, patientId, isAddMode, form]);

  // ✅ Effect 2: Đổ dữ liệu vào Form (CHỈ chạy khi loading=false và có patient)
  // Fix lỗi: "Instance created by useForm is not connected..."
  useEffect(() => {
    if (open && !loading && patient && (editMode || isAddMode)) {
      const data = patient;
      const dob = data.date_of_birth || data.dob;

      form.setFieldsValue({
        // Thông tin cơ bản
        mrn: data.mrn,
        full_name: data.full_name || data.name,
        email: data.email,
        phone: data.phone,
        date_of_birth: dob ? moment(dob) : null,
        gender: data.gender,
        address: data.address,
        citizen_id: data.citizen_id,
        occupation: data.occupation,
        insurance_bhyt: data.insurance_bhyt,
        
        // Vital signs
        blood_type: data.blood_type,
        height: data.height || data.vital_signs?.height,
        weight: data.weight || data.vital_signs?.weight,
        
        // Tiền sử & dị ứng
        medical_history: data.medical_history,
        chronic_conditions: data.chronic_conditions,
        past_surgeries: data.past_surgeries,
        allergies_medications: data.allergies_medications,
        allergies_food: data.allergies_food,
        allergies_environment: data.allergies_environment,
        current_medications: data.current_medications,
        vaccination_history: data.vaccination_history,
        family_history: data.family_history,
        
        // Thói quen sống
        smoking_status: data.smoking_status,
        alcohol_consumption: data.alcohol_consumption,
        exercise_frequency: data.exercise_frequency,
        
        // Emergency contact
        emergency_contact_name: data.emergency_contact?.name,
        emergency_contact_phone: data.emergency_contact?.phone,
        emergency_contact_relationship: data.emergency_contact?.relationship,
        
        // Insurance
        insurance_provider: data.insurance?.provider,
        insurance_number: data.insurance?.number,
        
        // Status & Notes
        status: data.status || 'Đang theo dõi',
        notes: data.notes,
      });

      // Calculate BMI
      const h = data.height || data.vital_signs?.height;
      const w = data.weight || data.vital_signs?.weight;
      if (h && w) {
        const bmiValue = (w / Math.pow(h / 100, 2)).toFixed(1);
        setBmi(bmiValue);
      }
    }
  }, [open, loading, patient, editMode, isAddMode, form]);

  // Handle submit
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const dob = values.date_of_birth
        ? moment(values.date_of_birth).format('YYYY-MM-DD')
        : null;

      const payload = {
        mrn: values.mrn,
        full_name: values.full_name,
        name: values.full_name,
        phone: values.phone,
        date_of_birth: dob,
        dob: dob,
        gender: values.gender,
        address: values.address,
        email: values.email || '',
        citizen_id: values.citizen_id || '',
        occupation: values.occupation || '',
        insurance_bhyt: values.insurance_bhyt || '',
        
        ...(isAddMode && {
          username: values.username,
          password: values.password,
          must_change_password: values.must_change_password !== false,
        }),
        
        medical_history: values.medical_history || '',
        chronic_conditions: values.chronic_conditions || '',
        past_surgeries: values.past_surgeries || '',
        allergies_medications: values.allergies_medications || '',
        allergies_food: values.allergies_food || '',
        allergies_environment: values.allergies_environment || '',
        current_medications: values.current_medications || '',
        vaccination_history: values.vaccination_history || '',
        family_history: values.family_history || '',
        
        smoking_status: values.smoking_status || '',
        alcohol_consumption: values.alcohol_consumption || '',
        exercise_frequency: values.exercise_frequency || '',
        
        blood_type: values.blood_type || '',
        height: values.height || null,
        weight: values.weight || null,
        
        emergency_contact: {
          name: values.emergency_contact_name || '',
          phone: values.emergency_contact_phone || '',
          relationship: values.emergency_contact_relationship || '',
        },
        
        insurance: {
          provider: values.insurance_provider || '',
          number: values.insurance_number || '',
        },
        
        status: values.status || 'Đang theo dõi',
        notes: values.notes || '',
      };

      let response;
      if (isAddMode) {
        response = await api.post('/patients', payload);
        message.success('Thêm bệnh nhân thành công!');
      } else {
        response = await api.patch(`/patients/${patientId}`, payload);
        message.success('Cập nhật bệnh nhân thành công!');
      }

      onSuccess && onSuccess(response?.data?.data);
      handleClose();
    } catch (error) {
      console.error('❌ Error saving patient:', error);
      message.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        `Không thể ${isAddMode ? 'thêm' : 'cập nhật'} bệnh nhân`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Không gọi resetFields ở đây để tránh lỗi unmount
    setPatient(null);
    setEditMode(false);
    setBmi(null);
    onClose();
  };

  const calculateBMI = () => {
    const height = form.getFieldValue('height');
    const weight = form.getFieldValue('weight');
    if (height && weight) {
      const h = height / 100;
      const calculatedBMI = (weight / (h * h)).toFixed(1);
      setBmi(calculatedBMI);
      
      const value = parseFloat(calculatedBMI);
      let status = '';
      if (value < 18.5) status = 'Thiếu cân';
      else if (value < 25) status = 'Bình thường';
      else if (value < 30) status = 'Thừa cân';
      else status = 'Béo phì';
      
      return { bmi: calculatedBMI, status };
    }
    return null;
  };

  const getBMIColor = (bmiValue) => {
    const value = parseFloat(bmiValue);
    if (value < 18.5) return 'blue';
    if (value < 25) return 'green';
    if (value < 30) return 'orange';
    return 'red';
  };

  const generateUsername = (email) => {
    if (!email) return '';
    return email.split('@')[0].toLowerCase();
  };

  const generatePassword = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const dob = moment(dateOfBirth);
    if (!dob.isValid()) return '';
    return dob.format('DDMMYYYY');
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    if (email && isAddMode) {
      const username = generateUsername(email);
      form.setFieldsValue({ username });
    }
  };

  const handleDOBChange = (date) => {
    if (date && autoGeneratePassword && isAddMode) {
      const password = generatePassword(date);
      form.setFieldsValue({ password });
    }
  };

  const renderForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      onValuesChange={() => calculateBMI()}
    >
      <Tabs
        items={[
          {
            key: 'basic',
            label: 'Thông tin cơ bản',
            children: (
              <div className="space-y-4">
                {!isAddMode && (
                  <Form.Item label="Mã bệnh nhân (MRN)" name="mrn">
                    <Input disabled />
                  </Form.Item>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    label="Họ tên"
                    name="full_name"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
                  </Form.Item>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Vui lòng nhập email!' },
                      { type: 'email', message: 'Email không hợp lệ!' },
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />} 
                      placeholder="example@email.com"
                      disabled={!isAddMode && !isAdmin}
                      onChange={handleEmailChange}
                    />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Form.Item
                    label="Số điện thoại"
                    name="phone"
                    rules={[
                      { required: true, message: 'Vui lòng nhập SĐT!' },
                      { pattern: /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/, message: 'Số điện thoại VN không hợp lệ' },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="0987654321" />
                  </Form.Item>
                  <Form.Item
                    label="Ngày sinh"
                    name="date_of_birth"
                    rules={[{ required: true, message: 'Vui lòng chọn ngày sinh!' }]}
                  >
                    <DatePicker 
                      format="DD/MM/YYYY" 
                      placeholder="Chọn ngày sinh" 
                      style={{ width: '100%' }}
                      onChange={handleDOBChange}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Giới tính"
                    name="gender"
                    rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
                  >
                    <Select>
                      <Option value="male">Nam</Option>
                      <Option value="female">Nữ</Option>
                      <Option value="other">Khác</Option>
                    </Select>
                  </Form.Item>
                </div>
                <Form.Item label="Địa chỉ" name="address">
                  <TextArea rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item label="CCCD/CMND" name="citizen_id">
                    <Input placeholder="001234567890" />
                  </Form.Item>
                  <Form.Item label="Nghề nghiệp" name="occupation">
                    <Input placeholder="Kỹ sư, Giáo viên..." />
                  </Form.Item>
                </div>
                <Form.Item label="Số thẻ BHYT" name="insurance_bhyt">
                  <Input placeholder="DN1234567890123" />
                </Form.Item>
              </div>
            ),
          },
          {
            key: 'medical',
            label: 'Thông tin y tế',
            children: (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Form.Item label="Chiều cao (cm)" name="height">
                    <InputNumber placeholder="170" style={{ width: '100%' }} min={0} max={300} />
                  </Form.Item>
                  <Form.Item label="Cân nặng (kg)" name="weight">
                    <InputNumber placeholder="65" style={{ width: '100%' }} min={0} max={500} />
                  </Form.Item>
                  <Form.Item label="Nhóm máu" name="blood_type">
                    <Select allowClear>
                      <Option value="A">A</Option>
                      <Option value="B">B</Option>
                      <Option value="AB">AB</Option>
                      <Option value="O">O</Option>
                      <Option value="A+">A+</Option>
                      <Option value="A-">A-</Option>
                      <Option value="B+">B+</Option>
                      <Option value="B-">B-</Option>
                      <Option value="AB+">AB+</Option>
                      <Option value="AB-">AB-</Option>
                      <Option value="O+">O+</Option>
                      <Option value="O-">O-</Option>
                    </Select>
                  </Form.Item>
                </div>
                {bmi && (
                  <Alert
                    message={
                      <div>
                        <strong>BMI: {bmi}</strong> - {
                          parseFloat(bmi) < 18.5 ? 'Thiếu cân' :
                          parseFloat(bmi) < 25 ? 'Bình thường' :
                          parseFloat(bmi) < 30 ? 'Thừa cân' : 'Béo phì'
                        }
                      </div>
                    }
                    type={parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25 ? 'success' : 'warning'}
                    showIcon
                    icon={<HeartOutlined />}
                  />
                )}
                <Form.Item label="Tiền sử bệnh lý" name="medical_history">
                  <TextArea rows={3} placeholder="Các bệnh đã mắc phải trước đây..." />
                </Form.Item>
                <Form.Item label="Bệnh mãn tính" name="chronic_conditions">
                  <TextArea rows={2} placeholder="Tiểu đường, cao huyết áp..." />
                </Form.Item>
                <Form.Item label="Phẫu thuật đã qua" name="past_surgeries">
                  <TextArea rows={2} placeholder="Các ca phẫu thuật đã thực hiện..." />
                </Form.Item>
                <div className="grid grid-cols-3 gap-4">
                  <Form.Item label="Dị ứng thuốc" name="allergies_medications">
                    <TextArea rows={2} placeholder="Penicillin, Aspirin..." />
                  </Form.Item>
                  <Form.Item label="Dị ứng thực phẩm" name="allergies_food">
                    <TextArea rows={2} placeholder="Hải sản, sữa, trứng..." />
                  </Form.Item>
                  <Form.Item label="Dị ứng môi trường" name="allergies_environment">
                    <TextArea rows={2} placeholder="Phấn hoa, bụi..." />
                  </Form.Item>
                </div>
                <Form.Item label="Thuốc đang dùng" name="current_medications">
                  <TextArea rows={2} placeholder="Danh sách thuốc đang sử dụng..." />
                </Form.Item>
                <Form.Item label="Lịch sử tiêm chủng" name="vaccination_history">
                  <TextArea rows={2} placeholder="Các loại vắc-xin đã tiêm..." />
                </Form.Item>
                <Form.Item label="Tiền sử gia đình" name="family_history">
                  <TextArea rows={2} placeholder="Các bệnh di truyền trong gia đình..." />
                </Form.Item>
              </div>
            ),
          },
          {
            key: 'lifestyle',
            label: 'Lối sống',
            children: (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Form.Item label="Hút thuốc" name="smoking_status">
                    <Select allowClear>
                      <Option value="never">Không bao giờ</Option>
                      <Option value="former">Đã bỏ</Option>
                      <Option value="current">Đang hút</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="Uống rượu" name="alcohol_consumption">
                    <Select allowClear>
                      <Option value="never">Không bao giờ</Option>
                      <Option value="occasional">Thỉnh thoảng</Option>
                      <Option value="regular">Thường xuyên</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="Tập thể dục" name="exercise_frequency">
                    <Select allowClear>
                      <Option value="never">Không bao giờ</Option>
                      <Option value="rarely">Hiếm khi</Option>
                      <Option value="sometimes">Thỉnh thoảng</Option>
                      <Option value="often">Thường xuyên</Option>
                      <Option value="daily">Hàng ngày</Option>
                    </Select>
                  </Form.Item>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Liên hệ khẩn cấp</h4>
                  <Form.Item label="Tên người liên hệ" name="emergency_contact_name">
                    <Input placeholder="Nguyễn Văn B" />
                  </Form.Item>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      label="Số điện thoại"
                      name="emergency_contact_phone"
                      rules={[{ pattern: /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/, message: 'Số điện thoại VN không hợp lệ' }]}
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="0987654321" />
                    </Form.Item>
                    <Form.Item label="Mối quan hệ" name="emergency_contact_relationship">
                      <Input placeholder="Vợ/Chồng, Con, Anh/Chị..." />
                    </Form.Item>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Bảo hiểm</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item label="Nhà cung cấp" name="insurance_provider">
                      <Input placeholder="Bảo Việt, Prudential..." />
                    </Form.Item>
                    <Form.Item label="Số thẻ" name="insurance_number">
                      <Input placeholder="BH123456789" />
                    </Form.Item>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'account',
            label: <span><LockOutlined /> Tài khoản</span>,
            children: (
              <div className="space-y-4">
                {isAddMode ? (
                  <>
                    <Alert
                      message="Tạo tài khoản đăng nhập cho bệnh nhân"
                      description="Username và mật khẩu sẽ được tự động tạo dựa trên email và ngày sinh."
                      type="info"
                      showIcon
                      icon={<KeyOutlined />}
                      className="mb-4"
                    />
                    <Form.Item
                      label="Tên đăng nhập (Username)"
                      name="username"
                      rules={[
                        { required: true, message: 'Vui lòng nhập username!' },
                        { min: 3, message: 'Username phải có ít nhất 3 ký tự!' },
                        { pattern: /^[a-z0-9._]+$/, message: 'Username chỉ gồm chữ thường, số, dấu . và _' },
                      ]}
                      tooltip="Tự động lấy từ email (phần trước @)"
                    >
                      <Input prefix={<UserOutlined />} placeholder="VD: nguyenvana" />
                    </Form.Item>
                    <Form.Item label="Tự động tạo mật khẩu">
                      <Checkbox
                        checked={autoGeneratePassword}
                        onChange={(e) => {
                          setAutoGeneratePassword(e.target.checked);
                          if (e.target.checked) {
                            const dob = form.getFieldValue('date_of_birth');
                            if (dob) {
                              const password = generatePassword(dob);
                              form.setFieldsValue({ password });
                            }
                          }
                        }}
                      >
                        <span className="text-sm text-gray-600">Mật khẩu mặc định: Ngày sinh (DDMMYYYY)</span>
                      </Checkbox>
                    </Form.Item>
                    <Form.Item
                      label="Mật khẩu"
                      name="password"
                      rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu!' },
                        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" disabled={autoGeneratePassword} visibilityToggle />
                    </Form.Item>
                    <Form.Item name="must_change_password" valuePropName="checked" initialValue={true}>
                      <Checkbox>
                        <div>
                          <strong>Buộc đổi mật khẩu lần đầu đăng nhập</strong>
                          <div className="text-gray-500 text-xs">Khuyến nghị để bảo mật</div>
                        </div>
                      </Checkbox>
                    </Form.Item>
                  </>
                ) : (
                  <Alert
                    message="Tính năng quản lý tài khoản"
                    description={
                      <div className="space-y-2">
                        <p>✅ Tài khoản đã được tạo khi thêm bệnh nhân</p>
                        <p>📧 Username: <strong>{patient?.username || patient?.email?.split('@')[0]}</strong></p>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                )}
              </div>
            ),
          },
          {
            key: 'other',
            label: 'Khác',
            children: (
              <div className="space-y-4">
                <Form.Item label="Trạng thái" name="status">
                  <Select>
                    <Option value="Đang theo dõi">Đang theo dõi</Option>
                    <Option value="Ổn định">Ổn định</Option>
                    <Option value="Cải thiện">Cải thiện</Option>
                    <Option value="Nặng lên">Nặng lên</Option>
                    <Option value="Hồi phục">Hồi phục</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Ghi chú" name="notes">
                  <TextArea rows={4} placeholder="Ghi chú thêm về bệnh nhân..." maxLength={1000} showCount />
                </Form.Item>
              </div>
            ),
          },
        ]}
      />
      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <Button onClick={handleClose}>Hủy</Button>
        <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
          {isAddMode ? 'Thêm bệnh nhân' : 'Lưu thay đổi'}
        </Button>
      </div>
    </Form>
  );

  const renderViewMode = () => (
    <div className="space-y-4">
      {patient?.has_account ? (
        <Alert message={<Space><CheckCircleOutlined /><span>Đã có tài khoản đăng nhập</span></Space>} type="success" showIcon />
      ) : patient?.email ? (
        <Alert message="Tài khoản đã được tạo tự động" type="info" showIcon />
      ) : (
        <Alert message="Chưa có email - không thể tạo tài khoản" type="warning" showIcon />
      )}
      <Descriptions title="Thông tin cơ bản" bordered column={2} size="small">
        <Descriptions.Item label="Họ tên" span={2}><strong>{patient?.full_name || 'N/A'}</strong></Descriptions.Item>
        <Descriptions.Item label="Ngày sinh">{patient?.date_of_birth ? moment(patient.date_of_birth).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Giới tính"><Tag color={patient?.gender === 'male' ? 'blue' : 'pink'}>{patient?.gender === 'male' ? 'Nam' : 'Nữ'}</Tag></Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{patient?.phone || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Email">{patient?.email || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={2}>{patient?.address || 'N/A'}</Descriptions.Item>
      </Descriptions>
      <Descriptions title="Thông tin y tế" bordered column={3} size="small">
        <Descriptions.Item label="Chiều cao">{patient?.height ? `${patient.height} cm` : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Cân nặng">{patient?.weight ? `${patient.weight} kg` : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="BMI">{patient?.height && patient?.weight ? <Tag color={getBMIColor(bmi)}>{bmi}</Tag> : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Nhóm máu" span={3}>{patient?.blood_type ? <Tag color="red">{patient.blood_type}</Tag> : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Tiền sử bệnh" span={3}>{patient?.medical_history || 'Không có'}</Descriptions.Item>
        <Descriptions.Item label="Dị ứng" span={3}>{patient?.allergies_medications || 'Không có'}</Descriptions.Item>
      </Descriptions>
      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <Button onClick={handleClose}>Đóng</Button>
        <Button type="primary" icon={<EditOutlined />} onClick={() => setEditMode(true)}>Chỉnh sửa</Button>
      </div>
    </div>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <UserOutlined style={{ fontSize: 24, color: '#52c41a' }} />
          <span>{isAddMode ? 'Thêm bệnh nhân mới' : editMode ? 'Chỉnh sửa bệnh nhân' : 'Chi tiết bệnh nhân'}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      {/* Logic hiển thị:
         - Nếu đang loading: Hiển thị "Đang tải...". Form lúc này KHÔNG tồn tại.
         - Khi loading xong (loading=false): Form mới được render.
         - useEffect số 2 sẽ bắt sự kiện này và đổ dữ liệu vào.
      */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : editMode || isAddMode ? (
        renderForm()
      ) : (
        renderViewMode()
      )}
    </Modal>
  );
};

export default AddPatientModal;