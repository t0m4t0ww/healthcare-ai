// src/pages/admin/pages/PatientManagement.jsx
import React, { useState, useEffect } from 'react';
import { Card, Modal, Descriptions, Tag, Avatar, Button, message, Statistic, Row, Col } from 'antd';
import { 
  UserOutlined, 
  MedicineBoxOutlined, 
  HistoryOutlined, 
  PlusOutlined, 
  EditOutlined, 
  HeartOutlined, 
  ExperimentOutlined, 
  FileTextOutlined, 
  SafetyOutlined,
  TeamOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { PatientTable, AddPatientModal } from '../components';
import { getPatients } from '../../../services/services';
import moment from 'moment';

const PatientManagement = () => {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // ✅ Stats state
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
  });

  // ✅ Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getPatients({});
        const data = Array.isArray(response) ? response : response?.data || [];
        
        const total = data.length;
        const male = data.filter(p => p.gender === 'male').length;
        const female = data.filter(p => p.gender === 'female').length;
        
        setStats({ total, male, female });
      } catch (error) {
        console.error('Error fetching patient stats:', error);
      }
    };

    fetchStats();
  }, [refreshTrigger]);

  // ✅ Real-time updates via Socket.IO
  useEffect(() => {
    let socket;
    try {
      socket = require('../../../services/socket').default;
      
      const handlePatientUpdate = (data) => {
        console.log('🔄 Patient updated:', data);
        message.info('Dữ liệu bệnh nhân đã được cập nhật');
        setRefreshTrigger(prev => prev + 1);
      };
      
      socket.on('patient_created', handlePatientUpdate);
      socket.on('patient_updated', handlePatientUpdate);
      socket.on('patient_deleted', handlePatientUpdate);
      
      return () => {
        socket.off('patient_created', handlePatientUpdate);
        socket.off('patient_updated', handlePatientUpdate);
        socket.off('patient_deleted', handlePatientUpdate);
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }, []);

  const handleAddPatient = () => {
    setSelectedPatient(null); // ✅ Clear selected patient khi thêm mới
    setAddModalOpen(true);
  };

  const handleViewDetails = (patient) => {
    setSelectedPatient(patient);
    setDetailModalOpen(true);
  };

  const handleEditPatient = () => {
    // ✅ Đóng modal xem, mở modal edit với selectedPatient._id
    console.log('🔧 Edit patient:', selectedPatient?._id);
    setDetailModalOpen(false);
    setAddModalOpen(true);
    // Không clear selectedPatient - để AddPatientModal nhận được ID
  };

  const handleModalClose = () => {
    setDetailModalOpen(false);
    setSelectedPatient(null);
  };

  const handleAddModalClose = () => {
    setAddModalOpen(false);
    // Clear selectedPatient khi đóng modal edit
    setTimeout(() => setSelectedPatient(null), 300);
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    message.success('Thao tác thành công!');
  };

  const calculateAge = (dob) => {
    if (!dob) return '-';
    return moment().diff(moment(dob), 'years');
  };

  const calculateBMI = (height, weight) => {
    if (!height || !weight) return '-';
    const bmi = weight / Math.pow(height / 100, 2);
    return bmi.toFixed(1);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <UserOutlined className="text-3xl text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Bệnh nhân</h1>
        </div>
        <p className="text-gray-600">
          Xem và quản lý thông tin bệnh nhân, lịch sử khám bệnh
        </p>
      </div>

      {/* ✅ Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={8}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Tổng số bệnh nhân"
              value={stats.total}
              prefix={<TeamOutlined className="text-green-600" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Bệnh nhân nam"
              value={stats.male}
              prefix={<ManOutlined className="text-blue-600" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Bệnh nhân nữ"
              value={stats.female}
              prefix={<WomanOutlined className="text-pink-600" />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table Card */}
      <Card 
        className="shadow-md"
        title={
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-lg font-semibold">Danh sách bệnh nhân</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPatient}
              size="large"
              className="w-full md:w-auto"
            >
              Thêm bệnh nhân
            </Button>
          </div>
        }
      >
        <PatientTable
          onViewDetails={handleViewDetails}
          refreshTrigger={refreshTrigger}
        />
      </Card>

      {/* Modal xem chi tiết */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <Avatar
              size={48}
              src={selectedPatient?.avatar}
              icon={<UserOutlined />}
              style={{
                backgroundColor: selectedPatient?.gender === 'male' ? '#1890ff' : '#eb2f96',
              }}
            />
            <div>
              <div className="text-lg font-semibold">
                {selectedPatient?.name || selectedPatient?.full_name || 'Bệnh nhân'}
              </div>
              <div className="text-sm text-gray-500">
                Mã BN: {selectedPatient?.mrn || selectedPatient?._id?.slice(-6) || '-'}
              </div>
            </div>
          </div>
        }
        open={detailModalOpen}
        onCancel={handleModalClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleModalClose}>Đóng</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={handleEditPatient}>
              Chỉnh sửa
            </Button>
          </div>
        }
        width={1200}
        style={{ top: 20 }}
      >
        {selectedPatient && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            {/* Thông tin cá nhân */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-600">
                <UserOutlined /> Thông tin cá nhân
              </h3>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Họ tên" span={2}>
                  <strong>{selectedPatient.name || selectedPatient.full_name || '-'}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{selectedPatient.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{selectedPatient.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">
                  <Tag color={selectedPatient.gender === 'male' ? 'blue' : 'pink'}>
                    {selectedPatient.gender === 'male' ? 'Nam' : selectedPatient.gender === 'female' ? 'Nữ' : 'Khác'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tuổi">
                  {calculateAge(selectedPatient.date_of_birth || selectedPatient.dob)} tuổi
                </Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">
                  {selectedPatient.date_of_birth || selectedPatient.dob 
                    ? moment(selectedPatient.date_of_birth || selectedPatient.dob).format('DD/MM/YYYY') 
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Nhóm máu">
                  <Tag color="red">{selectedPatient.blood_type || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={2}>
                  {selectedPatient.address || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="CCCD/CMND">{selectedPatient.citizen_id || '-'}</Descriptions.Item>
                <Descriptions.Item label="Nghề nghiệp">{selectedPatient.occupation || '-'}</Descriptions.Item>
                <Descriptions.Item label="Số thẻ BHYT" span={2}>
                  {selectedPatient.insurance_bhyt || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={selectedPatient.is_active ? 'green' : 'red'}>
                    {selectedPatient.status || (selectedPatient.is_active ? 'Đang theo dõi' : 'Ngưng theo dõi')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ghi chú" span={2}>
                  {selectedPatient.notes || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Dấu hiệu sinh tồn */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-600">
                <HeartOutlined /> Dấu hiệu sinh tồn
              </h3>
              <Descriptions column={3} bordered size="small">
                <Descriptions.Item label="Chiều cao">
                  {selectedPatient.vital_signs?.height || selectedPatient.height || '-'} {(selectedPatient.vital_signs?.height || selectedPatient.height) ? 'cm' : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Cân nặng">
                  {selectedPatient.vital_signs?.weight || selectedPatient.weight || '-'} {(selectedPatient.vital_signs?.weight || selectedPatient.weight) ? 'kg' : ''}
                </Descriptions.Item>
                <Descriptions.Item label="BMI">
                  {selectedPatient.vital_signs?.bmi || calculateBMI(
                    selectedPatient.vital_signs?.height || selectedPatient.height,
                    selectedPatient.vital_signs?.weight || selectedPatient.weight
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Huyết áp">
                  {selectedPatient.vital_signs?.blood_pressure_systolic && selectedPatient.vital_signs?.blood_pressure_diastolic
                    ? `${selectedPatient.vital_signs.blood_pressure_systolic}/${selectedPatient.vital_signs.blood_pressure_diastolic} mmHg`
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Nhịp tim">
                  {selectedPatient.vital_signs?.heart_rate || '-'} {selectedPatient.vital_signs?.heart_rate ? 'lần/phút' : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Nhiệt độ">
                  {selectedPatient.vital_signs?.temperature || '-'} {selectedPatient.vital_signs?.temperature ? '°C' : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Nhịp thở">
                  {selectedPatient.vital_signs?.respiratory_rate || '-'} {selectedPatient.vital_signs?.respiratory_rate ? 'lần/phút' : ''}
                </Descriptions.Item>
                <Descriptions.Item label="SpO2">
                  {selectedPatient.vital_signs?.spo2 || '-'} {selectedPatient.vital_signs?.spo2 ? '%' : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày đo">
                  {selectedPatient.vital_signs?.date ? moment(selectedPatient.vital_signs.date).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Tiền sử bệnh & Dị ứng */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-600">
                <MedicineBoxOutlined /> Tiền sử bệnh & Dị ứng
              </h3>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Tiền sử bệnh lý">
                  {selectedPatient.medical_history || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Bệnh mãn tính">
                  {selectedPatient.chronic_conditions || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Phẫu thuật đã qua">
                  {selectedPatient.past_surgeries || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Dị ứng thuốc">
                  {selectedPatient.allergies_medications || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Dị ứng thực phẩm">
                  {selectedPatient.allergies_food || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Dị ứng môi trường">
                  {selectedPatient.allergies_environment || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Thuốc đang dùng">
                  {selectedPatient.current_medications || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Lịch sử tiêm chủng">
                  {selectedPatient.vaccination_history || 'Chưa cập nhật'}
                </Descriptions.Item>
                <Descriptions.Item label="Tiền sử gia đình">
                  {selectedPatient.family_history || 'Chưa cập nhật'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Thói quen sống */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-purple-600">
                <HeartOutlined /> Thói quen sống
              </h3>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Tình trạng hút thuốc">
                  {selectedPatient.smoking_status === 'never' ? 'Không bao giờ' :
                   selectedPatient.smoking_status === 'former' ? 'Đã bỏ' :
                   selectedPatient.smoking_status === 'current' ? 'Hiện tại' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sử dụng rượu">
                  {selectedPatient.alcohol_consumption === 'never' ? 'Không bao giờ' :
                   selectedPatient.alcohol_consumption === 'occasional' ? 'Thỉnh thoảng' :
                   selectedPatient.alcohol_consumption === 'regular' ? 'Thường xuyên' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Tần suất tập thể dục" span={2}>
                  {selectedPatient.exercise_frequency === 'never' ? 'Không bao giờ' :
                   selectedPatient.exercise_frequency === 'rarely' ? 'Hiếm khi' :
                   selectedPatient.exercise_frequency === 'sometimes' ? 'Thỉnh thoảng' :
                   selectedPatient.exercise_frequency === 'often' ? 'Thường xuyên' :
                   selectedPatient.exercise_frequency === 'daily' ? 'Hàng ngày' : '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Liên hệ khẩn cấp */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-red-600">
                <SafetyOutlined /> Liên hệ khẩn cấp
              </h3>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Họ tên" span={2}>
                  {selectedPatient.emergency_contact?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {selectedPatient.emergency_contact?.phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Mối quan hệ">
                  {selectedPatient.emergency_contact?.relationship || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Bảo hiểm */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-indigo-600">
                <SafetyOutlined /> Bảo hiểm
              </h3>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Nhà cung cấp">
                  {selectedPatient.insurance?.provider || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Số hợp đồng">
                  {selectedPatient.insurance?.number || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Số thẻ BHYT" span={2}>
                  {selectedPatient.insurance_bhyt || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Lịch sử khám bệnh */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-600">
                <HistoryOutlined /> Lịch sử khám bệnh
              </h3>
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded">
                <HistoryOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>Lịch sử khám bệnh sẽ hiển thị ở đây</p>
                <p className="text-sm">Tính năng đang phát triển</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal thêm/sửa */}
      <AddPatientModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleSuccess}
        patientId={selectedPatient?._id || null}
      />
    </div>
  );
};

export default PatientManagement;