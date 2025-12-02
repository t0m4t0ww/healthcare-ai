// src/components/rating/RatingDisplay.js
import React from 'react';
import { Rate, Progress, Avatar } from 'antd';
import { StarFilled, UserOutlined } from '@ant-design/icons';

/**
 * RatingStars Component
 * Hiển thị rating trung bình với số sao (compact)
 * 
 * Props:
 * - averageRating: số rating trung bình (0-5)
 * - totalRatings: tổng số đánh giá
 * - size: 'small' | 'medium' | 'large'
 * - showNumber: hiển thị số rating bên cạnh
 */
export const RatingStars = ({ 
  averageRating = 0, 
  totalRatings = 0, 
  size = 'medium',
  showNumber = true 
}) => {
  const sizeMap = {
    small: 14,
    medium: 18,
    large: 24
  };

  const textSizeClass = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';
  const strongSizeClass = size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl' : 'text-base';

  return (
    <div className={`inline-flex items-center gap-2 ${size === 'small' ? 'rating-stars-small' : size === 'large' ? 'rating-stars-large' : ''}`}>
      <Rate 
        disabled 
        allowHalf 
        value={averageRating} 
        style={{ fontSize: sizeMap[size], color: '#fadb14', lineHeight: 1 }}
      />
      {showNumber && (
        <span className={`${textSizeClass} text-gray-800`}>
          <strong className={`${strongSizeClass} font-semibold`}>{averageRating.toFixed(1)}</strong>
          {totalRatings > 0 && (
            <span className="text-gray-600 text-[13px]"> ({totalRatings})</span>
          )}
        </span>
      )}
    </div>
  );
};

/**
 * RatingStats Component
 * Hiển thị thống kê chi tiết rating với progress bars
 * 
 * Props:
 * - stats: {average_rating, total_ratings, rating_distribution}
 */
export const RatingStats = ({ stats }) => {
  if (!stats || stats.total_ratings === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>Chưa có đánh giá nào</p>
      </div>
    );
  }

  const { average_rating, total_ratings, rating_distribution } = stats;

  const distribution = rating_distribution || {
    '5_star': 0,
    '4_star': 0,
    '3_star': 0,
    '2_star': 0,
    '1_star': 0
  };

  const calculatePercentage = (count) => {
    return total_ratings > 0 ? (count / total_ratings) * 100 : 0;
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200">
      <div className="flex justify-center mb-6">
        <div className="text-center">
          <div className="text-4xl md:text-5xl font-bold text-gray-800 leading-none mb-2">{average_rating.toFixed(1)}</div>
          <Rate 
            disabled 
            allowHalf 
            value={average_rating} 
            style={{ fontSize: 20, color: '#fadb14' }}
          />
          <div className="text-sm text-gray-600 mt-2">{total_ratings} đánh giá</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[5, 4, 3, 2, 1].map(star => {
          const count = distribution[`${star}_star`] || 0;
          const percentage = calculatePercentage(count);
          
          return (
            <div key={star} className="grid grid-cols-[50px_1fr_35px] md:grid-cols-[60px_1fr_40px] items-center gap-2 md:gap-3">
              <div className="text-sm text-gray-600 flex items-center gap-1">
                {star} <StarFilled style={{ color: '#fadb14', fontSize: 12 }} />
              </div>
              <Progress 
                percent={percentage} 
                showInfo={false}
                strokeColor="#fadb14"
                trailColor="#f0f0f0"
              />
              <div className="text-sm text-gray-600 text-right">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * RatingList Component
 * Hiển thị danh sách các đánh giá
 * 
 * Props:
 * - ratings: array of rating objects
 * - loading: đang load hay không
 */
export const RatingList = ({ ratings = [], loading = false }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#1890ff] rounded-full animate-spin mb-4"></div>
        <p>Đang tải đánh giá...</p>
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>Chưa có đánh giá nào</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ratings.map((rating, index) => (
        <RatingItem key={rating._id || index} rating={rating} />
      ))}
    </div>
  );
};

/**
 * RatingItem Component
 * Item hiển thị một đánh giá cụ thể
 */
const RatingItem = ({ rating }) => {
  const {
    patient_name,
    patient_avatar,
    rating: score,
    comment,
    tags = [],
    created_at,
    is_anonymous
  } = rating;

  const displayName = is_anonymous ? 'Ẩn danh' : (patient_name || 'Bệnh nhân');
  
  // Format local time (Vietnam timezone): DD/MM/YYYY HH:mm
  // created_at từ backend là UTC time (datetime.utcnow())
  // Chuyển đổi sang local time để hiển thị cho người dùng
  let timeString = '';
  try {
    const date = new Date(created_at);
    // Sử dụng local time methods để hiển thị theo timezone của người dùng
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    timeString = `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    timeString = 'N/A';
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 transition-shadow duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2.5 md:gap-0 mb-3">
        <div className="flex items-center gap-3">
          <Avatar 
            src={!is_anonymous ? patient_avatar : null} 
            icon={<UserOutlined />}
            size={40}
          />
          <div className="flex flex-col">
            <div className="text-[15px] font-semibold text-gray-800">{displayName}</div>
            <div className="text-[13px] text-gray-500">{timeString}</div>
          </div>
        </div>
        <div className="flex-shrink-0 self-start">
          <Rate 
            disabled 
            value={score} 
            style={{ fontSize: 16, color: '#fadb14' }}
          />
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, idx) => (
            <span key={idx} className="inline-block bg-[#e6f7ff] text-[#1890ff] px-3 py-1 rounded-xl text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {comment && (
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {comment}
        </div>
      )}
    </div>
  );
};

/**
 * RatingFilter Component
 * Filter để lọc đánh giá theo số sao
 * 
 * Props:
 * - selectedRating: rating đang được chọn (null = all)
 * - onFilterChange: callback khi thay đổi filter
 * - stats: thống kê để hiển thị số lượng
 */
export const RatingFilter = ({ selectedRating, onFilterChange, stats }) => {
  const filters = [
    { label: 'Tất cả', value: null },
    { label: '5 sao', value: 5 },
    { label: '4 sao', value: 4 },
    { label: '3 sao', value: 3 },
    { label: '2 sao', value: 2 },
    { label: '1 sao', value: 1 }
  ];

  const getCount = (value) => {
    if (!stats || !stats.rating_distribution) return 0;
    if (value === null) return stats.total_ratings || 0;
    return stats.rating_distribution[`${value}_star`] || 0;
  };

  return (
    <div className="flex flex-col md:flex-row flex-wrap gap-2 mb-5">
      {filters.map(filter => {
        const count = getCount(filter.value);
        const isActive = selectedRating === filter.value;
        
        return (
          <button
            key={filter.value || 'all'}
            className={`px-4 py-2 border rounded text-sm flex items-center justify-center gap-1.5 transition-all duration-300 w-full md:w-auto ${
              isActive 
                ? 'bg-[#1890ff] text-white border-[#1890ff]' 
                : 'bg-white text-gray-600 border-gray-300 hover:text-[#1890ff] hover:border-[#1890ff]'
            }`}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
            {count > 0 && <span className="text-xs opacity-80">({count})</span>}
          </button>
        );
      })}
    </div>
  );
};

export default {
  RatingStars,
  RatingStats,
  RatingList,
  RatingFilter
};

