// src/pages/admin/pages/DoctorManagement.jsx
import React, { useState, useEffect } from 'react';
import { Card, Button, message, Statistic, Row, Col } from 'antd';
import { 
  PlusOutlined, 
  MedicineBoxOutlined, 
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { DoctorTable, AddDoctorModal } from '../components';
import GenerateTimeSlotsModal from '../components/GenerateTimeSlotsModal';
import doctorServices from '../../../services/doctorServices';

/**
 * DoctorManagement - Trang quản lý bác sĩ
 * 
 * Features:
 * - Hiển thị danh sách bác sĩ (Table)
 * - Thêm bác sĩ mới (Modal)
 * - Chỉnh sửa thông tin bác sĩ (Modal)
 * - Xóa bác sĩ (Confirm)
 * - Search & Filter
 */
const DoctorManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await doctorServices.getDoctors({});
        const data = Array.isArray(response) ? response : response?.data || [];
        
        setDoctors(data); // Save doctors list for modal
        
        const total = data.length;
        const active = data.filter(d => d.status === 'active').length;
        const inactive = total - active;
        
        setStats({ total, active, inactive });
      } catch (error) {
        console.error('Error fetching doctor stats:', error);
      }
    };

    fetchStats();
  }, [refreshTrigger]);

  // ✅ Real-time updates via Socket.IO
  useEffect(() => {
    let socket;
    try {
      socket = require('../../../services/socket').default;
      
      const handleDoctorUpdate = (data) => {
        console.log('🔄 Doctor updated:', data);
        message.info('Dữ liệu bác sĩ đã được cập nhật');
        setRefreshTrigger(prev => prev + 1);
      };

      const handleSlotsGenerated = (data) => {
        console.log('🗓️ Slots generated:', data);
        message.success(`Đã tạo ${data.slots_count} slots cho ${data.doctor_name}`);
        setRefreshTrigger((prev) => prev + 1);
      };
      
      socket.on('doctor_created', handleDoctorUpdate);
      socket.on('doctor_updated', handleDoctorUpdate);
      socket.on('doctor_deleted', handleDoctorUpdate);
      socket.on('slots_generated', handleSlotsGenerated);
      
      return () => {
        socket.off('doctor_created', handleDoctorUpdate);
        socket.off('doctor_updated', handleDoctorUpdate);
        socket.off('doctor_deleted', handleDoctorUpdate);
        socket.off('slots_generated', handleSlotsGenerated);
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }, []);

  // Handle add new doctor
  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setModalOpen(true);
  };

  // Handle edit doctor
  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDoctor(null);
  };

  // Handle success (after add/edit)
  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    message.success(
      editingDoctor 
        ? 'Cập nhật bác sĩ thành công!' 
        : 'Thêm bác sĩ thành công!'
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MedicineBoxOutlined className="text-3xl text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Bác sĩ</h1>
        </div>
        <p className="text-gray-600">
          Quản lý thông tin bác sĩ, chuyên khoa và lịch làm việc
        </p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={8}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Tổng số bác sĩ"
              value={stats.total}
              prefix={<UserOutlined className="text-blue-600" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              prefix={<CheckCircleOutlined className="text-green-600" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Ngưng hoạt động"
              value={stats.inactive}
              prefix={<CloseCircleOutlined className="text-red-600" />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table Card */}
      <Card className="shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Danh sách bác sĩ</h2>
          <div className="flex gap-2">
            <Button
              type="default"
              icon={<ClockCircleOutlined />}
              onClick={() => setSlotsModalOpen(true)}
              className="flex items-center"
            >
              Tạo Lịch Khám
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddDoctor}
            >
              Thêm Bác Sĩ
            </Button>
          </div>
        </div>
        <DoctorTable
          onEdit={handleEditDoctor}
          onAdd={handleAddDoctor}
          refreshTrigger={refreshTrigger}
        />
      </Card>

      {/* Add/Edit Modal */}
      <AddDoctorModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        editData={editingDoctor}
      />

      {/* Generate Time Slots Modal */}
      <GenerateTimeSlotsModal
        visible={slotsModalOpen}
        onClose={() => setSlotsModalOpen(false)}
        doctors={doctors}
      />
    </div>
  );
};

export default DoctorManagement;