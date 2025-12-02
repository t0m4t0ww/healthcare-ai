// src/pages/admin/components/DoctorTable.jsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Popconfirm,
  Input,
  Tooltip,
  Select,
  Row,
  Col,
  App, // ✅ 1. Import App từ antd
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  StarOutlined,
  StopOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import doctorServices from '../../../services/doctorServices';
import DoctorRatingsModal from './DoctorRatingsModal';
import { setDoctorAccountStatus } from '../../../services/services';

const { Option } = Select;

/**
 * DoctorTable - Bảng quản lý bác sĩ với CRUD
 */
const DoctorTable = ({ onEdit, onAdd, refreshTrigger = 0 }) => {
  // ✅ 2. Sử dụng hook từ App context
  const { modal, message } = App.useApp();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Filter states
  const [sortOrder, setSortOrder] = useState('name_asc');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  
  // Ratings modal state
  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Fetch doctors
  const fetchDoctors = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        search: searchText || undefined,
      };

      const response = await doctorServices.getDoctors(params);
      let data = Array.isArray(response) ? response : response?.data || [];
      
      // Client-side filtering
      if (experienceFilter !== 'all') {
        data = data.filter(d => {
          const years = d.years_of_experience || 0;
          if (experienceFilter === '0-2') return years >= 0 && years <= 2;
          if (experienceFilter === '3-5') return years >= 3 && years <= 5;
          if (experienceFilter === '6-10') return years >= 6 && years <= 10;
          if (experienceFilter === '10+') return years > 10;
          return true;
        });
      }
      if (statusFilter !== 'all') {
        data = data.filter(d => d.status === statusFilter);
      }
      if (genderFilter !== 'all') {
        data = data.filter(d => d.gender === genderFilter);
      }
      
      // Client-side sorting
      data = [...data].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        
        if (sortOrder === 'name_asc') return nameA.localeCompare(nameB);
        if (sortOrder === 'name_desc') return nameB.localeCompare(nameA);
        return 0;
      });
      
      setDoctors(data);
      setPagination({
        current: page,
        pageSize,
        total: data.length,
      });
    } catch (error) {
      message.error('Không thể tải danh sách bác sĩ');
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 3. Sửa hàm toggle status dùng modal.confirm (hook)
  const handleToggleDoctorStatus = (doctor) => {
    const doctorId = doctor._id || doctor.id;
    if (!doctorId) return;

    const isActive = doctor.status !== 'locked' && doctor.status !== 'inactive';
    const nextIsActive = !isActive;

    modal.confirm({
      title: nextIsActive ? 'Mở khóa tài khoản bác sĩ?' : 'Khóa tài khoản bác sĩ?',
      content: nextIsActive
        ? 'Bác sĩ sẽ có thể đăng nhập và tiếp tục nhận lịch hẹn.'
        : 'Bác sĩ sẽ không thể đăng nhập cho đến khi được mở khóa lại.',
      okText: nextIsActive ? 'Mở khóa' : 'Khóa',
      cancelText: 'Hủy',
      async onOk() {
        try {
          await setDoctorAccountStatus(doctorId, nextIsActive);
          message.success(nextIsActive ? 'Đã mở khóa tài khoản bác sĩ' : 'Đã khóa tài khoản bác sĩ');
          fetchDoctors(pagination.current, pagination.pageSize);
        } catch (error) {
          message.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái bác sĩ');
        }
      },
    });
  };

  useEffect(() => {
    fetchDoctors(pagination.current, pagination.pageSize);
  }, [refreshTrigger, sortOrder, experienceFilter, statusFilter, genderFilter]);

  // Delete doctor
  const handleDelete = async (id) => {
    try {
      await doctorServices.deleteDoctor(id);
      message.success('Xóa bác sĩ thành công');
      fetchDoctors(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('Không thể xóa bác sĩ');
      console.error('Error deleting doctor:', error);
    }
  };

  const handleSearch = () => {
    fetchDoctors(1, pagination.pageSize);
  };
  
  const handleResetFilters = () => {
    setSortOrder('name_asc');
    setExperienceFilter('all');
    setStatusFilter('all');
    setGenderFilter('all');
    setSearchText('');
  };

  // Table columns
  const columns = [
    {
      title: 'Bác sĩ',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 250,
      render: (name, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={40}
            src={record.avatar}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <div className="font-medium text-gray-900">{name || 'Chưa có tên'}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Chuyên khoa',
      dataIndex: 'specialty',
      key: 'specialty',
      width: 180,
      render: (specialty) => {
        const colorMap = { 'general_medicine': 'blue', 'obstetrics': 'pink', 'pediatrics': 'orange' };
        const labelMap = { 'general_medicine': 'Nội tổng quát', 'obstetrics': 'Sản phụ khoa', 'pediatrics': 'Nhi khoa' };
        return (
          <Tag color={colorMap[specialty] || 'default'}>
            {labelMap[specialty] || specialty || 'Chưa xác định'}
          </Tag>
        );
      },
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone) => phone || '-',
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'date_of_birth',
      key: 'date_of_birth',
      width: 120,
      render: (dob) => dob || '-',
    },
    {
      title: 'Kinh nghiệm',
      dataIndex: 'years_of_experience',
      key: 'years_of_experience',
      width: 120,
      align: 'center',
      render: (years) => (
        <span className="font-medium text-blue-600">{years || 0} năm</span>
      ),
    },
    {
      title: 'Giá khám',
      dataIndex: 'consultation_fee',
      key: 'consultation_fee',
      width: 150,
      align: 'right',
      render: (fee) => (
        <span className="font-medium text-green-600">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(fee || 0)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const isActive = status !== 'locked' && status !== 'inactive';
        return (
          <Tag color={isActive ? 'success' : 'error'}>
            {isActive ? 'Hoạt động' : 'Đã khóa'}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={record.status !== 'locked' && record.status !== 'inactive' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
            <Button
              type="text"
              icon={record.status !== 'locked' && record.status !== 'inactive' ? <StopOutlined /> : <UnlockOutlined />}
              onClick={() => handleToggleDoctorStatus(record)}
              className={record.status !== 'locked' && record.status !== 'inactive' ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'}
            />
          </Tooltip>
          <Tooltip title="Xem đánh giá">
            <Button
              type="text"
              icon={<StarOutlined />}
              onClick={() => {
                setSelectedDoctor(record);
                setRatingsModalVisible(true);
              }}
              className="text-yellow-600 hover:text-yellow-700"
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit && onEdit(record)}
              className="text-blue-600 hover:text-blue-700"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa vĩnh viễn?"
            description="Bạn có chắc muốn xóa bác sĩ này?"
            onConfirm={() => handleDelete(record._id || record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Input
            placeholder="Tìm kiếm bác sĩ..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
        </Col>
        
        <Col xs={12} sm={6} md={4} lg={4}>
          <Select value={sortOrder} onChange={setSortOrder} style={{ width: '100%' }} suffixIcon={<SortAscendingOutlined />}>
            <Option value="name_asc">Tên A → Z</Option>
            <Option value="name_desc">Tên Z → A</Option>
          </Select>
        </Col>
        
        <Col xs={12} sm={6} md={5} lg={5}>
          <Select value={experienceFilter} onChange={setExperienceFilter} style={{ width: '100%' }} suffixIcon={<FilterOutlined />}>
            <Option value="all">Tất cả kinh nghiệm</Option>
            <Option value="0-2">0-2 năm</Option>
            <Option value="3-5">3-5 năm</Option>
            <Option value="6-10">6-10 năm</Option>
            <Option value="10+">Trên 10 năm</Option>
          </Select>
        </Col>
        
        <Col xs={12} sm={6} md={4} lg={4}>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: '100%' }} suffixIcon={<FilterOutlined />}>
            <Option value="all">Tất cả trạng thái</Option>
            <Option value="active">Hoạt động</Option>
            <Option value="inactive">Ngưng hoạt động</Option>
          </Select>
        </Col>
        
        <Col xs={12} sm={6} md={3} lg={3}>
          <Select value={genderFilter} onChange={setGenderFilter} style={{ width: '100%' }} suffixIcon={<FilterOutlined />}>
            <Option value="all">Tất cả giới tính</Option>
            <Option value="male">Nam</Option>
            <Option value="female">Nữ</Option>
          </Select>
        </Col>
        
        <Col xs={24} sm={12} md={24} lg={2} className="flex gap-2">
          <Button type="primary" onClick={handleSearch} block>Tìm</Button>
        </Col>
      </Row>
      
      {/* Active Filters Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(sortOrder !== 'name_asc' || experienceFilter !== 'all' || statusFilter !== 'all' || genderFilter !== 'all' || searchText) && (
            <Button onClick={handleResetFilters} size="small">Xóa bộ lọc</Button>
          )}
          <span className="text-gray-500 text-sm">
            {doctors.length > 0 && `Hiển thị ${doctors.length} bác sĩ`}
          </span>
        </div>
        <span className="text-sm text-gray-600">
          Tổng: <strong>{pagination.total}</strong> bác sĩ
        </span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={doctors}
        rowKey={(record) => record._id || record.id}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} bác sĩ`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={(newPagination) => fetchDoctors(newPagination.current, newPagination.pageSize)}
        className="shadow-md rounded-lg"
      />

      {/* Ratings Modal */}
      <DoctorRatingsModal
        visible={ratingsModalVisible}
        doctor={selectedDoctor}
        onClose={() => {
          setRatingsModalVisible(false);
          setSelectedDoctor(null);
        }}
      />
    </div>
  );
};

export default DoctorTable;