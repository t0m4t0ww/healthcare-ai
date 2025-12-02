// src/pages/admin/components/StatCard.jsx
import React from 'react';
import { Card, Statistic, Badge } from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';

/**
 * StatCard - Thẻ thống kê cho Admin Dashboard
 * 
 * Props:
 * @param {string} title - Tiêu đề thẻ
 * @param {number} value - Giá trị chính
 * @param {string} icon - Loại icon ('user' | 'doctor' | 'appointment' | 'custom')
 * @param {string} color - Màu chủ đạo (hex hoặc tailwind)
 * @param {number} trend - % thay đổi so với kỳ trước (dương = tăng, âm = giảm)
 * @param {string} suffix - Hậu tố (ví dụ: 'người', 'lịch')
 * @param {boolean} loading - Trạng thái loading
 */
const StatCard = ({
  title = 'Tiêu đề',
  value = 0,
  icon = 'user',
  color = '#1890ff',
  trend = null,
  suffix = '',
  loading = false,
  prefix = null,
  onClick = null,
}) => {
  // Icon mapping
  const iconMap = {
    user: <UserOutlined style={{ fontSize: 24 }} />,
    doctor: <MedicineBoxOutlined style={{ fontSize: 24 }} />,
    appointment: <CalendarOutlined style={{ fontSize: 24 }} />,
  };

  const selectedIcon = typeof icon === 'string' ? iconMap[icon] : icon;

  // Trend indicator
  const trendIcon = trend > 0 ? <RiseOutlined /> : trend < 0 ? <FallOutlined /> : null;
  const trendColor = trend > 0 ? '#52c41a' : trend < 0 ? '#ff4d4f' : '#8c8c8c';

  return (
    <Badge.Ribbon
      text={
        trend !== null && (
          <span className="flex items-center gap-1">
            {trendIcon}
            {Math.abs(trend)}%
          </span>
        )
      }
      color={trendColor}
      style={{ display: trend !== null ? 'block' : 'none' }}
    >
      <Card
        hoverable={!!onClick}
        onClick={onClick}
        className="shadow-md hover:shadow-lg transition-all duration-300"
        styles={{ body: { padding: '24px' } }}
        loading={loading}
      >
        <div className="flex items-center justify-between">
          {/* Icon */}
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {selectedIcon}
          </div>

          {/* Statistic */}
          <div className="flex-1 ml-4 text-right">
            <Statistic
              title={<span className="text-gray-600 text-sm">{title}</span>}
              value={value}
              suffix={suffix}
              prefix={prefix}
              valueStyle={{
                fontSize: 28,
                fontWeight: 600,
                color: '#262626',
              }}
            />
          </div>
        </div>

        {/* Trend text */}
        {trend !== null && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {trend > 0 ? '⬆️ Tăng' : trend < 0 ? '⬇️ Giảm' : '➡️ Không đổi'}{' '}
              <strong style={{ color: trendColor }}>{Math.abs(trend)}%</strong> so với tháng trước
            </span>
          </div>
        )}
      </Card>
    </Badge.Ribbon>
  );
};

export default StatCard;