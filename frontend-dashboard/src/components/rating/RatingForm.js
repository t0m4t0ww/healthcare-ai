// src/components/rating/RatingForm.js
import React, { useState, useEffect } from 'react';
import { Rate, Input, Checkbox, Button, Tag, message, Modal } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import ratingService from '../../services/ratingServices';
import { getSpecialtyName } from '../../constants/specialtyConstants';

const { TextArea } = Input;

// Add fadeIn animation style
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

/**
 * RatingForm Component
 * Form đánh giá bác sĩ sau khi hoàn thành khám
 * 
 * Props:
 * - appointmentId: ID của appointment cần đánh giá
 * - doctorInfo: {id, name, specialization, avatar_url}
 * - onSuccess: callback khi đánh giá thành công
 * - onCancel: callback khi hủy
 * - visible: hiển thị modal hay không
 */
const RatingForm = ({ 
  appointmentId, 
  doctorInfo, 
  onSuccess, 
  onCancel,
  visible = true,
  showAsModal = true 
}) => {
  const [loading, setLoading] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [permissionReason, setPermissionReason] = useState('');
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  // Check permission khi component mount
  useEffect(() => {
    if (appointmentId && visible) {
      checkRatingPermission();
      loadRatingTags();
    }
  }, [appointmentId, visible]);

  const checkRatingPermission = async () => {
    try {
      setCheckingPermission(true);
      const result = await ratingService.canRateAppointment(appointmentId);
      setCanRate(result.can_rate);
      setPermissionReason(result.reason);
      
      if (!result.can_rate) {
        message.warning(result.reason);
      }
    } catch (error) {
      console.error('Error checking rating permission:', error);
      message.error('Không thể kiểm tra quyền đánh giá');
      setCanRate(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  const loadRatingTags = async () => {
    try {
      const result = await ratingService.getRatingTags();
      setAvailableTags(result.tags || []);
    } catch (error) {
      console.error('Error loading rating tags:', error);
      // Use default tags if API fails
      setAvailableTags([
        'Thân thiện',
        'Giải thích rõ ràng',
        'Tư vấn chi tiết',
        'Nhiệt tình',
        'Chuyên nghiệp'
      ]);
    }
  };

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (rating === 0) {
      message.warning('Vui lòng chọn số sao đánh giá');
      return;
    }

    if (!comment.trim() && rating < 4) {
      message.warning('Vui lòng để lại nhận xét để chúng tôi cải thiện dịch vụ');
      return;
    }

    try {
      setLoading(true);
      
      const ratingData = {
        appointment_id: appointmentId,
        doctor_id: doctorInfo.id,
        rating: rating,
        comment: comment.trim(),
        tags: selectedTags,
        is_anonymous: isAnonymous
      };

      await ratingService.createRating(ratingData);
      
      message.success('Cảm ơn bạn đã đánh giá! 🎉');
      
      // Reset form
      setRating(0);
      setComment('');
      setSelectedTags([]);
      setIsAnonymous(false);
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      const errorMsg = error.response?.data?.message || 'Không thể gửi đánh giá';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const ratingDescriptions = {
    1: '😞 Rất không hài lòng',
    2: '😐 Không hài lòng',
    3: '😊 Bình thường',
    4: '😄 Hài lòng',
    5: '🤩 Rất hài lòng'
  };

  const formContent = (
    <>
      <style>{fadeInStyle}</style>
      <div className="p-5">
      {checkingPermission ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#1890ff] rounded-full animate-spin mb-4"></div>
          <p>Đang kiểm tra...</p>
        </div>
      ) : !canRate ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-[60px] mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2.5 text-gray-800">Không thể đánh giá</h3>
          <p className="text-sm text-gray-600 mb-5">{permissionReason}</p>
          <Button type="primary" onClick={onCancel}>
            Đóng
          </Button>
        </div>
      ) : (
        <>
          {/* Doctor Info */}
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-[#f7f9fc] rounded-lg mb-6 text-center md:text-left">
            <img 
              src={doctorInfo.avatar_url || '/default-doctor-avatar.png'} 
              alt={doctorInfo.name}
              className="w-[60px] h-[60px] rounded-full object-cover border-2 border-[#1890ff]"
            />
            <div>
              <h3 className="text-lg font-semibold m-0 mb-1 text-gray-800">{doctorInfo.name}</h3>
              <p className="text-sm text-gray-600 m-0">{getSpecialtyName(doctorInfo.specialization) || doctorInfo.specialization || 'Bác sĩ'}</p>
            </div>
          </div>

          {/* Rating Stars */}
          <div className="mb-6 text-center">
            <h4 className="text-base font-semibold mb-4 text-gray-800">Bạn đánh giá thế nào về bác sĩ?</h4>
            <Rate
              value={rating}
              onChange={setRating}
              className="[&_.ant-rate]:text-[32px] md:[&_.ant-rate]:text-[40px]"
              character={({ index }) => (
                index < rating ? <StarFilled /> : <StarOutlined />
              )}
            />
            {rating > 0 && (
              <div className="mt-2.5 text-lg font-medium text-[#1890ff]" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                {ratingDescriptions[rating]}
              </div>
            )}
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-base font-semibold mb-3 text-gray-800">Chọn các đặc điểm nổi bật (tùy chọn)</h4>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Tag
                    key={tag}
                    color={selectedTags.includes(tag) ? 'blue' : 'default'}
                    onClick={() => handleTagToggle(tag)}
                    className="cursor-pointer mb-2 text-sm px-3 py-1 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="mb-5">
            <h4 className="text-base font-semibold mb-2.5 text-gray-800">
              Nhận xét chi tiết {rating < 4 && <span className="text-[#ff4d4f] ml-1">*</span>}
            </h4>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về buổi tư vấn..."
              rows={4}
              maxLength={500}
              showCount
            />
          </div>

          {/* Anonymous Option */}
          <div className="mb-6">
            <Checkbox
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            >
              Đánh giá ẩn danh (tên của bạn sẽ không hiển thị)
            </Checkbox>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col md:flex-row justify-end gap-2.5 pt-4 border-t border-gray-200">
            <Button onClick={onCancel} disabled={loading} className="min-w-[100px] w-full md:w-auto">
              Để sau
            </Button>
            <Button 
              type="primary" 
              onClick={handleSubmit}
              loading={loading}
              disabled={rating === 0}
              className="min-w-[100px] w-full md:w-auto"
            >
              Gửi đánh giá
            </Button>
          </div>
        </>
      )}
      </div>
    </>
  );

  // Render as modal or standalone
  if (showAsModal) {
    return (
      <Modal
        title="Đánh giá bác sĩ"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={600}
        className="[&_.ant-modal-body]:p-0 [&_.ant-modal-header]:border-b [&_.ant-modal-header]:border-gray-200"
      >
        {formContent}
      </Modal>
    );
  }

  return formContent;
};

export default RatingForm;

