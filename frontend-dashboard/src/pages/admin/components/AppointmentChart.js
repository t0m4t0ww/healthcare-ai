// src/pages/admin/components/AppointmentChart.jsx
import React, { useState, useEffect } from 'react';
import { Card, Select, Spin, Empty } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CalendarOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * AppointmentChart - Biểu đồ thống kê lịch hẹn
 * 
 * Props:
 * @param {Array} data - Dữ liệu biểu đồ [{ date: 'T2', appointments: 10, completed: 8, cancelled: 2 }]
 * @param {string} chartType - Loại biểu đồ ('line' | 'bar')
 * @param {boolean} loading - Trạng thái loading
 */
const AppointmentChart = ({
  data = [],
  chartType = 'line',
  loading = false,
  title = 'Thống kê lịch hẹn',
}) => {
  const [selectedType, setSelectedType] = useState(chartType);
  const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month' | 'year'

  // Sample data nếu không có data
  const sampleData = [
    { date: 'T2', appointments: 45, completed: 38, cancelled: 7 },
    { date: 'T3', appointments: 52, completed: 45, cancelled: 7 },
    { date: 'T4', appointments: 61, completed: 55, cancelled: 6 },
    { date: 'T5', appointments: 48, completed: 42, cancelled: 6 },
    { date: 'T6', appointments: 70, completed: 63, cancelled: 7 },
    { date: 'T7', appointments: 35, completed: 30, cancelled: 5 },
    { date: 'CN', appointments: 28, completed: 25, cancelled: 3 },
  ];

  const chartData = data.length > 0 ? data : sampleData;

  const renderChart = () => {
    if (selectedType === 'line') {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#8c8c8c"
            style={{ fontSize: 12 }}
          />
          <YAxis stroke="#8c8c8c" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="appointments"
            stroke="#1890ff"
            strokeWidth={2}
            name="Tổng lịch hẹn"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#52c41a"
            strokeWidth={2}
            name="Hoàn thành"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="cancelled"
            stroke="#ff4d4f"
            strokeWidth={2}
            name="Hủy"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      );
    }

    // Bar chart
    return (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          stroke="#8c8c8c"
          style={{ fontSize: 12 }}
        />
        <YAxis stroke="#8c8c8c" style={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
        />
        <Bar dataKey="appointments" fill="#1890ff" name="Tổng lịch hẹn" />
        <Bar dataKey="completed" fill="#52c41a" name="Hoàn thành" />
        <Bar dataKey="cancelled" fill="#ff4d4f" name="Hủy" />
      </BarChart>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-md">
        <div className="flex items-center justify-center h-80">
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="shadow-md"
      title={
        <div className="flex items-center gap-2">
          <CalendarOutlined style={{ color: '#1890ff' }} />
          <span>{title}</span>
        </div>
      }
      extra={
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="week">Tuần này</Option>
            <Option value="month">Tháng này</Option>
            <Option value="year">Năm nay</Option>
          </Select>
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="line">Đường</Option>
            <Option value="bar">Cột</Option>
          </Select>
        </div>
      }
    >
      {chartData.length === 0 ? (
        <Empty
          description="Chưa có dữ liệu"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default AppointmentChart;