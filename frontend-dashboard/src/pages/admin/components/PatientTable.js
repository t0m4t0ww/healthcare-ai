// src/pages/admin/components/PatientTable.jsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Input,
  Select,
  Tooltip,
  Badge,
  Popconfirm,
  Row,
  Col,
  App,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  EyeOutlined,
  FilterOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SortAscendingOutlined,
  StopOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import api, { getPatients, setPatientAccountStatus } from '../../../services/services';
import moment from 'moment';

const { Option } = Select;

/**
 * PatientTable - Bảng danh sách bệnh nhân
 * (Đã loại bỏ phần Thống kê stats để tránh hiển thị double với trang cha)
 */
const PatientTable = ({ onViewDetails, refreshTrigger = 0 }) => {
  const { modal, message } = App.useApp();
  const [allPatients, setAllPatients] = useState([]); // ✅ Store ALL patients
  const [filteredPatients, setFilteredPatients] = useState([]); // ✅ Store filtered result
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // ✅ Filter states
  const [sortOrder, setSortOrder] = useState('name_asc');
  const [filterGender, setFilterGender] = useState('all');
  const [filterBloodType, setFilterBloodType] = useState('all');
  const [filterAgeRange, setFilterAgeRange] = useState('all');
  
  const [appointmentCounts, setAppointmentCounts] = useState({});
  // Đã xóa state 'stats' vì không render UI thống kê ở đây nữa

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // ✅ Fetch ALL patients from backend
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await getPatients({ limit: 1000 });
      // Đảm bảo data là mảng và lọc trùng lặp (nếu có lỗi backend)
      let rawData = Array.isArray(response) ? response : response?.data || [];
      
      // Bonus: Deduplicate data by ID để tránh sai sót số liệu
      const uniqueData = Array.from(new Map(rawData.map(item => [item._id || item.id, item])).values());

      setAllPatients(uniqueData);
      
      // ✅ Apply filters immediately
      applyFilters(uniqueData);

      // ✅ Fetch appointment counts
      await fetchAppointmentCounts(uniqueData);
    } catch (error) {
      message.error('Không thể tải danh sách bệnh nhân');
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Apply all filters and sorting on client-side
  const applyFilters = (dataToFilter = allPatients) => {
    let result = [...dataToFilter];
    
    // 1. Search filter
    if (searchText && searchText.trim() !== '') {
      const search = searchText.toLowerCase().trim();
      result = result.filter(p => {
        const name = (p.name || p.full_name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        return name.includes(search) || email.includes(search) || phone.includes(search);
      });
    }
    
    // 2. Gender filter
    if (filterGender !== 'all') {
      result = result.filter(p => p.gender === filterGender);
    }
    
    // 3. Blood type filter
    if (filterBloodType !== 'all') {
      result = result.filter(p => p.blood_type === filterBloodType);
    }
    
    // 4. Age range filter
    if (filterAgeRange !== 'all') {
      result = result.filter(p => {
        const age = calculateAge(p.date_of_birth || p.dob);
        if (age === '-') return false;
        
        const ageNum = parseInt(age);
        if (filterAgeRange === '0-18') return ageNum <= 18;
        if (filterAgeRange === '19-40') return ageNum >= 19 && ageNum <= 40;
        if (filterAgeRange === '41-60') return ageNum >= 41 && ageNum <= 60;
        if (filterAgeRange === '60+') return ageNum > 60;
        return true;
      });
    }
    
    // 5. Sorting
    result.sort((a, b) => {
      if (sortOrder === 'name_asc' || sortOrder === 'name_desc') {
        const nameA = (a.name || a.full_name || '').toLowerCase();
        const nameB = (b.name || b.full_name || '').toLowerCase();
        return sortOrder === 'name_asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      
      if (sortOrder === 'age_asc' || sortOrder === 'age_desc') {
        const ageA = parseInt(calculateAge(a.date_of_birth || a.dob)) || 0;
        const ageB = parseInt(calculateAge(b.date_of_birth || b.dob)) || 0;
        return sortOrder === 'age_asc' ? ageA - ageB : ageB - ageA;
      }
      return 0;
    });
    
    setFilteredPatients(result);
    setPagination(prev => ({
      ...prev,
      current: 1,
      total: result.length,
    }));
  };

  const fetchAppointmentCounts = async (patientsList) => {
    try {
      const response = await api.get('/appointments/counts-by-patient');
      const backendData = response.data || response;
      const countsFromBackend = backendData?.data || {};
      setAppointmentCounts(countsFromBackend);
    } catch (error) {
      console.error('Error fetching appointment counts:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/patients/${id}`);
      message.success('Xóa bệnh nhân thành công');
      fetchPatients();
    } catch (error) {
      message.error(error.response?.data?.error || 'Không thể xóa bệnh nhân');
      console.error('Error deleting patient:', error);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText, sortOrder, filterGender, filterBloodType, filterAgeRange, allPatients]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchPatients();
    }
  }, [refreshTrigger]);

  const handleSearch = () => {
    applyFilters();
  };
  
  const handleResetFilters = () => {
    setSortOrder('name_asc');
    setFilterGender('all');
    setFilterBloodType('all');
    setFilterAgeRange('all');
    setSearchText('');
  };

  const calculateAge = (dob) => {
    if (!dob) return '-';
    const age = moment().diff(moment(dob), 'years');
    return isNaN(age) ? '-' : age;
  };

  const handleTogglePatientStatus = (patient) => {
    const patientId = patient._id || patient.id;
    if (!patientId) return;

    const isActive = patient.is_active !== false && patient.status !== 'locked';
    const nextIsActive = !isActive;

    modal.confirm({
      title: nextIsActive ? 'Mở khóa tài khoản bệnh nhân?' : 'Khóa tài khoản bệnh nhân?',
      icon: <ExclamationCircleOutlined />,
      content: nextIsActive
        ? 'Bệnh nhân sẽ có thể đăng nhập và đặt lịch khám.'
        : 'Bệnh nhân sẽ không thể đăng nhập hoặc đặt lịch cho tới khi được mở khóa.',
      okText: nextIsActive ? 'Mở khóa' : 'Khóa',
      cancelText: 'Hủy',
      async onOk() {
        try {
          await setPatientAccountStatus(patientId, nextIsActive);
          message.success(nextIsActive ? 'Đã mở khóa tài khoản bệnh nhân' : 'Đã khóa tài khoản bệnh nhân');
          fetchPatients();
        } catch (error) {
          message.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái bệnh nhân');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Bệnh nhân',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 250,
      render: (name, record) => (
        <div className="flex items-center gap-3">
          <Badge dot={record.is_online} color="green">
            <Avatar
              size={40}
              src={record.avatar}
              icon={<UserOutlined />}
              style={{ 
                backgroundColor: record.gender === 'male' ? '#1890ff' : '#eb2f96' 
              }}
            />
          </Badge>
          <div className="min-w-0">
            <div className="font-medium text-gray-900">
              {name || record.full_name || 'Chưa có tên'}
            </div>
            <Tooltip title={record.email || '-'}>
              <div className="text-xs text-gray-500 truncate max-w-[180px]">
                {record.email || '-'}
              </div>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 90,
      render: (gender) => {
        const genderMap = {
          male: { text: 'Nam', color: 'blue' },
          female: { text: 'Nữ', color: 'pink' },
          other: { text: 'Khác', color: 'default' },
        };
        const config = genderMap[gender] || { text: '-', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Tuổi',
      dataIndex: 'date_of_birth',
      key: 'age',
      width: 70,
      align: 'center',
      render: (dob) => (
        <span className="font-medium">{calculateAge(dob)}</span>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone) => phone || '-',
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 180,
      ellipsis: true,
      render: (address) => (
        <Tooltip title={address}>
          <span>{address || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Nhóm máu',
      dataIndex: 'blood_type',
      key: 'blood_type',
      width: 90,
      align: 'center',
      render: (bloodType) => (
        <Tag color="red">{bloodType || '-'}</Tag>
      ),
    },
    {
      title: 'Lịch hẹn',
      dataIndex: '_id',
      key: 'appointment_count',
      width: 90,
      align: 'center',
      render: (patientId) => {
        const count = appointmentCounts[patientId] || 0;
        return (
          <Badge
            count={count}
            showZero
            color="#1890ff"
            overflowCount={99}
          />
        );
      },
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => (
        date ? moment(date).format('DD/MM/YYYY') : '-'
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'status',
      width: 120, 
      render: (_, record) => {
        const isActive = record.is_active !== false && record.status !== 'locked';
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
          <Tooltip title={record.is_active !== false && record.status !== 'locked' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
            <Button
              type="text"
              icon={
                record.is_active !== false && record.status !== 'locked'
                  ? <StopOutlined />
                  : <UnlockOutlined />
              }
              onClick={() => handleTogglePatientStatus(record)}
              className={
                record.is_active !== false && record.status !== 'locked'
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-green-600 hover:text-green-700'
              }
            />
          </Tooltip>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onViewDetails && onViewDetails(record)}
              className="text-emerald-600 hover:text-emerald-700"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa vĩnh viễn?"
            description="Bạn có chắc muốn xóa bệnh nhân này? Hành động này sẽ xóa hoàn toàn khỏi database và không thể hoàn tác."
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 🔥🔥🔥 ĐÃ XÓA PHẦN THỐNG KÊ (Statistic Cards) TẠI ĐÂY 
         Lý do: Để tránh hiển thị double nếu trang cha đã có thống kê.
         Nếu bạn cần thống kê, hãy thêm component Statistic vào file cha (PatientPage.jsx).
      */}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Input
            placeholder="Tìm kiếm bệnh nhân..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Select
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: '100%' }}
            suffixIcon={<SortAscendingOutlined />}
          >
            <Option value="name_asc">Tên A → Z</Option>
            <Option value="name_desc">Tên Z → A</Option>
            <Option value="age_asc">Tuổi tăng dần</Option>
            <Option value="age_desc">Tuổi giảm dần</Option>
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Select
            value={filterGender}
            onChange={setFilterGender}
            style={{ width: '100%' }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">Tất cả giới tính</Option>
            <Option value="male">Nam</Option>
            <Option value="female">Nữ</Option>
            <Option value="other">Khác</Option>
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Select
            value={filterBloodType}
            onChange={setFilterBloodType}
            style={{ width: '100%' }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">Tất cả nhóm máu</Option>
            <Option value="A">A</Option>
            <Option value="B">B</Option>
            <Option value="AB">AB</Option>
            <Option value="O">O</Option>
          </Select>
        </Col>
        <Col xs={12} sm={6} md={4} lg={4}>
          <Select
            value={filterAgeRange}
            onChange={setFilterAgeRange}
            style={{ width: '100%' }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">Tất cả độ tuổi</Option>
            <Option value="0-18">0-18 tuổi</Option>
            <Option value="19-40">19-40 tuổi</Option>
            <Option value="41-60">41-60 tuổi</Option>
            <Option value="60+">Trên 60 tuổi</Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={24} lg={4}>
          <div className="flex gap-2 w-full">
            <Button type="primary" onClick={handleSearch} className="flex-1">
              Tìm
            </Button>
            <Button onClick={handleResetFilters} className="flex-1">
              Reset
            </Button>
          </div>
        </Col>
      </Row>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {(sortOrder !== 'name_asc' || filterGender !== 'all' || filterBloodType !== 'all' || filterAgeRange !== 'all' || searchText) && (
            <span className="text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full">
              Đang áp dụng bộ lọc
            </span>
          )}
          <span>{filteredPatients.length > 0 && `Hiển thị ${filteredPatients.length} bệnh nhân`}</span>
        </div>
        <span className="text-sm text-gray-600">
          Tổng: <strong>{allPatients.length}</strong> bệnh nhân
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={filteredPatients}
        rowKey={(record) => record._id || record.id}
        loading={loading}
        scroll={{ x: 1300 }} 
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} bệnh nhân`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={(newPagination) => {
          setPagination(newPagination);
        }}
        className="shadow-md rounded-lg"
        rowClassName={(record) => 
          record.is_online ? 'bg-green-50' : ''
        }
      />
    </div>
  );
};

export default PatientTable;