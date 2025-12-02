// src/pages/admin/pages/AppointmentManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  Select,
  message,
  Tooltip,
  Badge,
  Avatar,
  Statistic,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import api from '../../../services/services';
import moment from 'moment';
import { SPECIALTIES } from '../../../constants/specialties';

const { Option } = Select;
const { TextArea } = Input;

/**
 * AppointmentManagement - Trang quản lý lịch hẹn
 * 
 * Features:
 * - Hiển thị danh sách lịch hẹn
 * - Approve/Reject lịch hẹn
 * - View chi tiết lịch hẹn
 * - Filter theo trạng thái, ngày
 * - Search theo tên bệnh nhân/bác sĩ
 */
const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [actionNote, setActionNote] = useState('');
  
  // ✅ Stats state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 200,
    total: 0,
  });

  // Fetch appointments
  const fetchAppointments = async (page = 1, pageSize = 200) => {
    setLoading(true);
    try {
      // ✅ Admin gọi GET /appointments - xem TẤT CẢ appointments
      const params = {
        page,
        limit: pageSize,
        search: searchText || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      };

      const response = await api.get('/appointments', { params });
      
      console.log('🔍 Raw response from /appointments:', response);
      
      // ✅ Handle axios response format: response.data contains backend response
      let data = [];
      let total = 0;
      
      // Check if response.data exists (axios response)
      const backendData = response.data || response;
      
      if (Array.isArray(backendData)) {
        // Old format: direct array
        data = backendData;
        total = backendData.length;
      } else if (backendData?.success && Array.isArray(backendData.data)) {
        // New format: { success: true, data: [...], total: 10 }
        data = backendData.data;
        total = backendData.total || data.length;
      }
      
      console.log('📋 Parsed appointments:', {
        count: data.length,
        sample: data[0],
        total
      });
      
      // ✅ Calculate stats from fetched data
      const pending = data.filter(a => a.status === 'pending').length;
      const confirmed = data.filter(a => a.status === 'confirmed').length;
      const completed = data.filter(a => a.status === 'completed').length;
      const cancelled = data.filter(a => a.status === 'cancelled').length;
      
      setStats({
        total: data.length,
        pending,
        confirmed,
        completed,
        cancelled,
      });
      
      setAppointments(data);
      setPagination({
        current: page,
        pageSize,
        total,
      });
    } catch (error) {
      message.error('Không thể tải danh sách lịch hẹn');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(pagination.current, pagination.pageSize);
  }, []);

  // ✅ Real-time updates via Socket.IO
  useEffect(() => {
    let socket;
    try {
      socket = require('../../../services/socket').default;
      
      const handleAppointmentUpdate = (data) => {
        console.log('🔄 Appointment updated:', data);
        message.info('Lịch hẹn đã được cập nhật');
        fetchAppointments(pagination.current, pagination.pageSize);
      };
      
      socket.on('appointment_updated', handleAppointmentUpdate);
      
      return () => {
        socket.off('appointment_updated', handleAppointmentUpdate);
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }, [pagination.current, pagination.pageSize]);

  // Handle search
  const handleSearch = () => {
    fetchAppointments(1, pagination.pageSize);
  };

  // Handle view details
  const handleViewDetails = (appointment) => {
    console.log('📋 View appointment details:', appointment);
    setSelectedAppointment(appointment);
    setDetailModalOpen(true);
  };

  // Handle approve/reject
  const handleAction = (appointment, type) => {
    setSelectedAppointment(appointment);
    setActionType(type);
    setActionNote('');
    setActionModalOpen(true);
  };

  // Submit action
  const handleSubmitAction = async () => {
    if (!selectedAppointment) return;

    try {
      // TODO: Call API to approve/reject appointment
      // await appointmentServices.updateAppointmentStatus(
      //   selectedAppointment._id,
      //   actionType === 'approve' ? 'confirmed' : 'cancelled',
      //   actionNote
      // );

      message.success(
        actionType === 'approve'
          ? 'Đã xác nhận lịch hẹn'
          : 'Đã từ chối lịch hẹn'
      );

      setActionModalOpen(false);
      fetchAppointments(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('Không thể cập nhật lịch hẹn');
      console.error('Error updating appointment:', error);
    }
  };

  // Handle delete appointment
  const deleteAppointmentById = async (appointmentId) => {
    try {
      console.log('🗑️ Deleting appointment:', appointmentId);
      const response = await api.delete(`/appointments/${appointmentId}`);
      console.log('✅ Delete response:', response);
      message.success('Đã xóa lịch hẹn thành công');
      fetchAppointments(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('❌ Delete appointment error:', error);
      console.error('   Response:', error?.response);
      console.error('   Status:', error?.response?.status);
      console.error('   Data:', error?.response?.data);
      
      // ✅ Better error messages
      let errorMsg = 'Không thể xóa lịch hẹn';
      
      if (error?.response?.status === 403) {
        errorMsg = '❌ Không có quyền xóa lịch hẹn. Vui lòng đăng nhập với tài khoản Admin.';
      } else if (error?.response?.status === 401) {
        errorMsg = '❌ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      
      message.error(errorMsg);
      throw error;
    }
  };

  const handleDelete = async (appointment) => {
    const appointmentId = appointment?._id || appointment?.id;
    if (!appointmentId) {
      message.error('Không xác định được ID lịch hẹn để xóa');
      return;
    }
    await deleteAppointmentById(appointmentId);
  };

  // Status config
  const statusConfig = {
    pending: { color: 'gold', text: 'Chờ xác nhận' },
    confirmed: { color: 'blue', text: 'Đã xác nhận' },
    completed: { color: 'green', text: 'Hoàn thành' },
    cancelled: { color: 'red', text: 'Đã hủy' },
    'no-show': { color: 'default', text: 'Không đến' },
  };

  // Table columns
  const columns = [
    {
      title: 'Mã',
      dataIndex: '_id',
      key: 'id',
      width: 80,
      render: (id) => <span className="font-mono text-xs">{id?.slice(-6)}</span>,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patient',
      key: 'patient',
      width: 180,
      render: (patient) => (
        <div className="flex items-center gap-2">
          <Avatar size={32} icon={<CalendarOutlined />} />
          <div>
            <div className="font-medium">{patient?.name || 'N/A'}</div>
            <div className="text-xs text-gray-500">{patient?.phone || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctor',
      key: 'doctor',
      width: 180,
      render: (doctor) => (
        <div className="flex items-center gap-2">
          <Avatar size={32} icon={<CalendarOutlined />} />
          <div>
            <div className="font-medium">{doctor?.name || 'N/A'}</div>
            <div className="text-xs text-gray-500">
              {SPECIALTIES[doctor?.specialty]?.name || 
               SPECIALTIES[doctor?.specialization]?.name || 
               doctor?.specialty || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Ngày khám',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Giờ',
      dataIndex: 'time',
      key: 'time',
      width: 90,
      render: (time) => <strong>{time}</strong>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const config = statusConfig[status] || statusConfig.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Lý do khám',
      dataIndex: 'chief_complaint',
      key: 'chief_complaint',
      width: 180,
      ellipsis: true,
      render: (complaint) => {
        // ✅ Handle both string and object format
        if (!complaint) return '-';
        
        if (typeof complaint === 'string') {
          return (
            <Tooltip title={complaint}>
              <span>{complaint}</span>
            </Tooltip>
          );
        }
        
        // If object, extract main_symptom or format it
        const text = complaint.main_symptom || 
                     complaint.reason || 
                     JSON.stringify(complaint);
        
        return (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="Xác nhận">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleAction(record, 'approve')}
                  className="text-green-600 hover:text-green-700"
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  type="text"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleAction(record, 'reject')}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Xóa lịch hẹn">
            <Popconfirm
              title="Xác nhận xóa vĩnh viễn?"
              description="Bạn có chắc chắn muốn xóa lịch hẹn này? Hành động không thể hoàn tác."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalendarOutlined className="text-3xl text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Lịch hẹn</h1>
        </div>
        <p className="text-gray-600">
          Quản lý và xác nhận lịch hẹn khám bệnh
        </p>
      </div>

      {/* ✅ Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Tổng lịch hẹn"
              value={stats.total}
              prefix={<CalendarOutlined className="text-orange-600" />}
              valueStyle={{ color: '#ff7a00' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Chờ xác nhận"
              value={stats.pending}
              prefix={<ClockCircleOutlined className="text-amber-600" />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Đã xác nhận"
              value={stats.confirmed}
              prefix={<CheckSquareOutlined className="text-blue-600" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Hoàn thành"
              value={stats.completed}
              prefix={<CheckCircleOutlined className="text-green-600" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <Statistic
              title="Đã hủy"
              value={stats.cancelled}
              prefix={<CloseCircleOutlined className="text-red-600" />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="shadow-md mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Tìm kiếm bệnh nhân, bác sĩ..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 180 }}
              prefix={<FilterOutlined />}
            >
              <Option value="all">Tất cả trạng thái</Option>
              <Option value="pending">Chờ xác nhận</Option>
              <Option value="confirmed">Đã xác nhận</Option>
              <Option value="completed">Hoàn thành</Option>
              <Option value="cancelled">Đã hủy</Option>
            </Select>
            <Button type="primary" onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            Tổng: <strong>{pagination.total}</strong> lịch hẹn
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="shadow-md">
        <Table
          columns={columns}
          dataSource={appointments}
          rowKey={(record) => record._id || record.id}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} lịch hẹn`,
          }}
          onChange={(newPagination) => {
            fetchAppointments(newPagination.current, newPagination.pageSize);
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết lịch hẹn"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedAppointment && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-600 text-sm">Bệnh nhân:</label>
                <div className="font-medium">{selectedAppointment.patient?.name || 'N/A'}</div>
                <div className="text-sm text-gray-500">{selectedAppointment.patient?.phone || 'N/A'}</div>
                <div className="text-sm text-gray-500">{selectedAppointment.patient?.email || 'N/A'}</div>
              </div>
              <div>
                <label className="text-gray-600 text-sm">Bác sĩ:</label>
                <div className="font-medium">{selectedAppointment.doctor?.name || 'N/A'}</div>
                <div className="text-sm text-gray-500">
                  {SPECIALTIES[selectedAppointment.doctor?.specialty]?.name || 
                   selectedAppointment.doctor?.specialty || 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-gray-600 text-sm">Ngày khám:</label>
                <div className="font-medium">
                  {moment(selectedAppointment.date).format('DD/MM/YYYY')}
                </div>
              </div>
              <div>
                <label className="text-gray-600 text-sm">Giờ:</label>
                <div className="font-medium">
                  {selectedAppointment.time || 
                   (selectedAppointment.start_time && selectedAppointment.end_time 
                     ? `${selectedAppointment.start_time} - ${selectedAppointment.end_time}` 
                     : 'N/A')}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-gray-600 text-sm">Lý do khám:</label>
                <div>
                  {(() => {
                    const complaint = selectedAppointment.chief_complaint;
                    if (!complaint) return '-';
                    
                    if (typeof complaint === 'string') {
                      return complaint;
                    }
                    
                    // If object, display formatted
                    if (complaint.main_symptom) {
                      return (
                        <div className="space-y-1">
                          <div><strong>Triệu chứng chính:</strong> {complaint.main_symptom}</div>
                          {complaint.pain_scale && (
                            <div><strong>Mức độ đau:</strong> {complaint.pain_scale}/10</div>
                          )}
                          {complaint.onset_date && (
                            <div><strong>Ngày bắt đầu:</strong> {moment(complaint.onset_date).format('DD/MM/YYYY')}</div>
                          )}
                          {complaint.associated_symptoms && (
                            <div><strong>Triệu chứng kèm theo:</strong> {complaint.associated_symptoms}</div>
                          )}
                        </div>
                      );
                    }
                    
                    return JSON.stringify(complaint);
                  })()}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-gray-600 text-sm">Ghi chú:</label>
                <div>{selectedAppointment.notes || '-'}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        title={actionType === 'approve' ? 'Xác nhận lịch hẹn' : 'Từ chối lịch hẹn'}
        open={actionModalOpen}
        onCancel={() => setActionModalOpen(false)}
        onOk={handleSubmitAction}
        okText={actionType === 'approve' ? 'Xác nhận' : 'Từ chối'}
        cancelText="Hủy"
        okButtonProps={{
          danger: actionType === 'reject',
        }}
      >
        <div className="space-y-4">
          <p>
            Bạn có chắc muốn{' '}
            <strong>{actionType === 'approve' ? 'xác nhận' : 'từ chối'}</strong>{' '}
            lịch hẹn này?
          </p>
          <TextArea
            placeholder="Ghi chú (không bắt buộc)"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentManagement;