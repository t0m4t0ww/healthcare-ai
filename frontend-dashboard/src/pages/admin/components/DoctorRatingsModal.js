// src/pages/admin/components/DoctorRatingsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Rate,
  Tag,
  Avatar,
  Empty,
  Spin,
  Statistic,
  Row,
  Col,
  Card,
  Progress,
  List,
  Typography,
  Space,
  Divider,
  message
} from 'antd';
import {
  StarOutlined,
  StarFilled,
  UserOutlined,
  CalendarOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { ratingService } from '../../../services/ratingServices';
import { getSpecialtyName } from '../../../constants/specialtyConstants';
import moment from 'moment';

const { Text, Paragraph, Title } = Typography;

/**
 * DoctorRatingsModal - Modal hiển thị đánh giá của bác sĩ cho Admin
 * 
 * Props:
 * @param {boolean} visible - Hiển thị modal
 * @param {object} doctor - Thông tin bác sĩ { _id, name, specialty, avatar }
 * @param {function} onClose - Callback đóng modal
 */
const DoctorRatingsModal = ({ visible, doctor, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);

  // Fetch ratings khi mở modal
  useEffect(() => {
    if (visible && doctor?._id) {
      fetchDoctorRatings();
    }
  }, [visible, doctor]);

  const fetchDoctorRatings = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching ratings for doctor:', doctor);
      console.log('🔍 Doctor ID:', doctor?._id);
      
      const response = await ratingService.getDoctorRatings(doctor._id, {
        limit: 50,
        sort_by: 'created_at'
      });

      console.log('📦 Ratings API Response:', response);

      // ✅ Handle different response structures
      if (response.success) {
        const ratingsData = response.data?.ratings || [];
        const statsData = response.data?.stats || {
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: {
            '5_star': 0,
            '4_star': 0,
            '3_star': 0,
            '2_star': 0,
            '1_star': 0
          }
        };
        
        console.log('✅ Ratings:', ratingsData);
        console.log('✅ Stats:', statsData);
        
        setRatings(ratingsData);
        setStats(statsData);
      } else {
        // Try direct data access
        const ratingsData = response.ratings || [];
        const statsData = response.stats || {
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: {
            '5_star': 0,
            '4_star': 0,
            '3_star': 0,
            '2_star': 0,
            '1_star': 0
          }
        };
        
        setRatings(ratingsData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('❌ Error fetching ratings:', error);
      console.error('Error details:', error.response || error);
      message.error('Không thể tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  // Render rating distribution bars
  const renderRatingDistribution = () => {
    if (!stats || !stats.rating_distribution) return null;

    const distribution = stats.rating_distribution;
    const total = stats.total_ratings || 1;

    return (
      <Card className="mb-4">
        <Title level={5}>Phân bố đánh giá</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = distribution[`${star}_star`] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-2">
                <div className="w-12 flex items-center gap-1">
                  <StarFilled className="text-yellow-500" />
                  <span className="font-medium">{star}</span>
                </div>
                <Progress
                  percent={percentage}
                  size="small"
                  strokeColor="#fadb14"
                  format={(percent) => `${count}`}
                  style={{ flex: 1 }}
                />
              </div>
            );
          })}
        </Space>
      </Card>
    );
  };

  // Format patient name (anonymous support)
  const formatPatientName = (rating) => {
    if (rating.is_anonymous) {
      return 'Bệnh nhân ẩn danh';
    }
    return rating.patient_name || 'Bệnh nhân';
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <Avatar
            size={48}
            src={doctor?.avatar}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <div className="text-lg font-semibold">{doctor?.name || 'Bác sĩ'}</div>
            <div className="text-sm text-gray-500">{getSpecialtyName(doctor?.specialty, 'Chưa rõ')}</div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        {/* Statistics Section */}
        {stats && (
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <Card>
                <Statistic
                  title="Đánh giá trung bình"
                  value={stats.average_rating || 0}
                  precision={1}
                  suffix="/ 5"
                  prefix={<StarFilled className="text-yellow-500" />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Tổng số đánh giá"
                  value={stats.total_ratings || 0}
                  prefix={<MessageOutlined className="text-blue-500" />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Đánh giá 5 sao"
                  value={stats.rating_distribution?.['5_star'] || 0}
                  prefix={<StarFilled className="text-yellow-500" />}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Rating Distribution */}
        {renderRatingDistribution()}

        <Divider />

        {/* Ratings List */}
        <Title level={5} className="mb-3">Danh sách đánh giá</Title>
        
        {ratings.length === 0 ? (
          <Empty
            description="Chưa có đánh giá nào"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={ratings}
            renderItem={(rating) => (
              <List.Item key={rating._id}>
                <div className="w-full">
                  {/* Header: Patient + Rating + Date */}
                  <div className="flex items-center justify-between mb-2">
                    <Space>
                      <Avatar
                        size={32}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: rating.is_anonymous ? '#999' : '#1890ff' }}
                      />
                      <div>
                        <div className="font-medium">{formatPatientName(rating)}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <CalendarOutlined />
                          {moment(rating.created_at).format('DD/MM/YYYY HH:mm')}
                        </div>
                      </div>
                    </Space>
                    <Rate disabled value={rating.rating} className="text-sm" />
                  </div>

                  {/* Comment */}
                  {rating.comment && (
                    <Paragraph className="mb-2 ml-10 text-gray-700">
                      {rating.comment}
                    </Paragraph>
                  )}

                  {/* Tags */}
                  {rating.tags && rating.tags.length > 0 && (
                    <div className="ml-10">
                      <Space wrap>
                        {rating.tags.map((tag, idx) => (
                          <Tag key={idx} color="blue">
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
              </List.Item>
            )}
            style={{ maxHeight: '400px', overflowY: 'auto' }}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default DoctorRatingsModal;

