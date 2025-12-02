// src/pages/admin/pages/Statistics.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Select, Statistic, Table, Spin, message } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import moment from 'moment';
import api from '../../../services/services'; // ✅ Use api instance instead of axios
import { getSpecialtyName } from '../../../constants/specialtyConstants'; // ✅ Import specialty mapping

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * Statistics - Trang thống kê chi tiết
 * 
 * Features:
 * - Thống kê doanh thu theo thời gian (từ API thật)
 * - Biểu đồ tỷ lệ trạng thái lịch hẹn
 * - Thống kê theo chuyên khoa
 * - Top bác sĩ
 * - Filter theo thời gian
 */
const Statistics = () => {
  const [dateRange, setDateRange] = useState([
    moment().subtract(30, 'days'),
    moment(),
  ]);
  const [chartType, setChartType] = useState('revenue');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Fetch statistics data
  const fetchStatistics = async (range = dateRange) => {
    if (!range || range.length !== 2 || !range[0] || !range[1]) {
      return;
    }
    
    setLoading(true);
    try {
      const startDate = range[0].format('YYYY-MM-DD');
      const endDate = range[1].format('YYYY-MM-DD');
      
      // ✅ Use api instance with correct baseURL (localhost:5000/api)
      const response = await api.get('/statistics/dashboard', {
        params: { start_date: startDate, end_date: endDate }
      });
      
      // ✅ Handle backend response format
      const backendData = response.data?.data || response.data;
      setData(backendData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      message.error('Không thể tải dữ liệu thống kê');
      // Set empty data to prevent infinite loading
      setData({
        summary: {
          totalRevenue: 0,
          revenueGrowth: 0,
          totalAppointments: 0,
          appointmentGrowth: 0,
          newPatients: 0,
          patientsGrowth: 0,
          completionRate: 0
        },
        revenueByMonth: [],
        appointmentsByStatus: [],
        appointmentsBySpecialization: [],
        topDoctors: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when date range changes
  useEffect(() => {
    if (dateRange && dateRange.length === 2) {
      fetchStatistics(dateRange);
    }
  }, [dateRange]);
  
  // Handle date range change manually
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Top doctors table columns
  const topDoctorsColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (rank) => (
        <div className="flex items-center justify-center">
          {rank <= 3 ? (
            <span className="text-2xl">
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          ) : (
            <span className="text-lg font-semibold text-gray-600">{rank}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-500">
            {record.specialization || 'Đa khoa'}
          </div>
        </div>
      ),
    },
    {
      title: 'Lịch hẹn',
      dataIndex: 'appointments',
      key: 'appointments',
      align: 'center',
      render: (count) => <strong className="text-blue-600">{count}</strong>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (revenue) => (
        <span className="font-medium text-green-600">
          {formatCurrency(revenue)}
        </span>
      ),
    },
    {
      title: 'Đánh giá',
      dataIndex: 'rating',
      key: 'rating',
      align: 'center',
      render: (rating) => (
        <span className="text-yellow-500">⭐ {rating}</span>
      ),
    },
  ];

  // ✅ Fix Ant Design Spin warning: wrap content properly
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-700">
          <Spin spinning size="large" />
          <span className="text-lg">Đang tải dữ liệu thống kê...</span>
        </div>
      </div>
    );
  }

  const { summary, revenueByMonth, appointmentsByStatus, appointmentsBySpecialization: rawSpecializations, topDoctors = [] } = data || {};
  
  // ✅ Map specialization codes to Vietnamese names for chart
  const appointmentsBySpecialization = Array.isArray(rawSpecializations) 
    ? rawSpecializations.map(item => ({
        ...item,
        name: getSpecialtyName(item.name || item._id, 'Đa khoa')
      }))
    : [];
  
  // ✅ Map top doctors specialization to Vietnamese
  const topDoctorsWithVNNames = Array.isArray(topDoctors)
    ? topDoctors.map(doctor => ({
        ...doctor,
        specialization: getSpecialtyName(doctor.specialization, 'Đa khoa')
      }))
    : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChartOutlined className="text-3xl text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Thống kê & Báo cáo</h1>
        </div>
        <p className="text-gray-600">
          Phân tích chi tiết doanh thu, hiệu suất và xu hướng
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-md mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="DD/MM/YYYY"
            style={{ width: 280 }}
          />
          <Select
            value={chartType}
            onChange={setChartType}
            style={{ width: 200 }}
          >
            <Option value="revenue">Doanh thu</Option>
            <Option value="appointments">Lịch hẹn</Option>
            <Option value="specialization">Chuyên khoa</Option>
          </Select>
        </div>
      </Card>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={summary.totalRevenue}
              prefix={<DollarOutlined />}
              suffix="₫"
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              {summary.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.revenueGrowth)}% so với kỳ trước
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Lịch hẹn"
              value={summary.totalAppointments}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              {summary.appointmentGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.appointmentGrowth)}% so với kỳ trước
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Bệnh nhân mới"
              value={summary.newPatients}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              {summary.patientsGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.patientsGrowth)}% so với kỳ trước
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tỷ lệ hoàn thành"
              value={summary.completionRate}
              suffix="%"
              valueStyle={{ color: '#eb2f96' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              Tỷ lệ lịch hẹn hoàn thành
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="mb-6">
        {/* Revenue Chart */}
        <Col xs={24} lg={16}>
          <Card
            title="Doanh thu & Lịch hẹn theo tháng"
            className="shadow-md"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Doanh thu' : 'Lịch hẹn',
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="#52c41a"
                  name="Doanh thu"
                />
                <Bar
                  yAxisId="right"
                  dataKey="appointments"
                  fill="#1890ff"
                  name="Lịch hẹn"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Appointment Status Pie */}
        <Col xs={24} lg={8}>
          <Card
            title="Tỷ lệ trạng thái lịch hẹn"
            className="shadow-md"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Specialization Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title="Thống kê theo chuyên khoa"
            className="shadow-md"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentsBySpecialization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Doanh thu' : 'Bệnh nhân',
                  ]}
                />
                <Legend />
                <Bar dataKey="patients" fill="#1890ff" name="Bệnh nhân" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Top Doctors Table */}
        <Col xs={24} lg={12}>
          <Card
            title="Top bác sĩ xuất sắc"
            className="shadow-md"
          >
            <Table
              columns={topDoctorsColumns}
              dataSource={topDoctorsWithVNNames}
              pagination={false}
              size="small"
              rowKey="rank"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Statistics;
