// src/pages/public/DoctorRatingsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Tabs, App } from 'antd'; // ✅ 1. Import App, bỏ message tĩnh
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import ratingService from '../../services/ratingServices';
import { 
  RatingStats, 
  RatingList, 
  RatingFilter 
} from '../../components/rating/RatingDisplay';

/**
 * DoctorRatingsPage
 * Trang hiển thị đầy đủ ratings của bác sĩ
 * * Route: /doctors/:doctorId/ratings
 */
const DoctorRatingsPage = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp(); // ✅ 2. Sử dụng hook message từ App context

  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null); // null = all ratings
  const [sortBy, setSortBy] = useState('created_at'); // created_at | rating

  useEffect(() => {
    if (doctorId) {
      loadDoctorRatings();
      loadRatingStats();
    }
  }, [doctorId, selectedRating, sortBy]);

  const loadDoctorRatings = async () => {
    try {
      setLoading(true);
      const params = {
        sort_by: sortBy,
        limit: 50
      };
      
      if (selectedRating !== null) {
        params.rating = selectedRating;
      }

      const result = await ratingService.getDoctorRatings(doctorId, params);
      setRatings(result.ratings || []);
      
      // Get doctor info from first rating if available
      if (result.ratings && result.ratings.length > 0 && !doctorInfo) {
        const firstRating = result.ratings[0];
        if (firstRating.appointment_info) {
          setDoctorInfo({
            name: firstRating.appointment_info.doctor?.name || 'Bác sĩ',
            specialization: firstRating.appointment_info.doctor?.specialization || '',
            avatar_url: firstRating.appointment_info.doctor?.avatar_url
          });
        }
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      message.error('Không thể tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const loadRatingStats = async () => {
    try {
      const result = await ratingService.getDoctorRatingStats(doctorId);
      setStats(result);
    } catch (error) {
      console.error('Error loading rating stats:', error);
    }
  };

  const handleFilterChange = (ratingValue) => {
    setSelectedRating(ratingValue);
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
            type="text"
            className="mb-5 hover:text-emerald-600"
          >
            Quay lại
          </Button>

          {doctorInfo && (
            <div className="flex items-center gap-5 bg-white p-6 rounded-xl shadow-sm">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                {doctorInfo.avatar_url ? (
                  <img 
                    src={doctorInfo.avatar_url} 
                    alt={doctorInfo.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserOutlined style={{ fontSize: 32 }} />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {doctorInfo.name}
                </h1>
                <p className="text-base text-slate-600">
                  {doctorInfo.specialization}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 items-start">
          {/* Left: Stats */}
          <div className="lg:sticky lg:top-6">
            <RatingStats stats={stats} />
          </div>

          {/* Right: Ratings List */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                Đánh giá từ bệnh nhân
              </h2>
              
              {/* Filter */}
              <RatingFilter 
                selectedRating={selectedRating}
                onFilterChange={handleFilterChange}
                stats={stats}
              />

              {/* Sort */}
              <div className="mt-4">
                <Tabs
                  activeKey={sortBy}
                  onChange={handleSortChange}
                  items={[
                    { key: 'created_at', label: 'Mới nhất' },
                    { key: 'rating', label: 'Điểm cao nhất' }
                  ]}
                />
              </div>
            </div>

            {/* Ratings List */}
            <RatingList ratings={ratings} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorRatingsPage;