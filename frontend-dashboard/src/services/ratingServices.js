// src/services/ratingServices.js
import api from './services';

/**
 * Rating Service
 * API endpoints for doctor ratings/reviews
 */
class RatingService {
  /**
   * Kiểm tra xem bệnh nhân có thể đánh giá appointment này không
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise} {can_rate, reason, appointment_info}
   */
  async canRateAppointment(appointmentId) {
    try {
      const response = await api.get(`/ratings/can-rate/${appointmentId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] canRateAppointment error:', error);
      throw error;
    }
  }

  /**
   * Tạo đánh giá mới
   * @param {Object} ratingData - {appointment_id, doctor_id, rating, comment, tags, is_anonymous}
   * @returns {Promise}
   */
  async createRating(ratingData) {
    try {
      const response = await api.post('/ratings', ratingData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] createRating error:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách đánh giá của bác sĩ
   * @param {string} doctorId - Doctor ID
   * @param {Object} params - {rating, sort_by, limit, skip}
   * @returns {Promise} {ratings, stats, pagination}
   */
  async getDoctorRatings(doctorId, params = {}) {
    try {
      const response = await api.get(`/ratings/doctor/${doctorId}`, { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] getDoctorRatings error:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê rating của bác sĩ
   * @param {string} doctorId - Doctor ID
   * @returns {Promise} {average_rating, total_ratings, rating_distribution}
   */
  async getDoctorRatingStats(doctorId) {
    try {
      const response = await api.get(`/ratings/stats/doctor/${doctorId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] getDoctorRatingStats error:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách các đánh giá của bệnh nhân (các đánh giá mà bệnh nhân đã đánh giá)
   * @param {Object} params - {limit}
   * @returns {Promise} {ratings, total}
   */
  async getMyRatings(params = {}) {
    try {
      const response = await api.get('/ratings/my-ratings', { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] getMyRatings error:', error);
      throw error;
    }
  }

  /**
   * Lấy đánh giá của một appointment
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise}
   */
  async getRatingByAppointment(appointmentId) {
    try {
      const response = await api.get(`/ratings/appointment/${appointmentId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] getRatingByAppointment error:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách các tags có sẵn
   * @returns {Promise} {tags}
   */
  async getRatingTags() {
    try {
      const response = await api.get('/ratings/tags');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] getRatingTags error:', error);
      throw error;
    }
  }

  /**
   * Xóa đánh giá
   * @param {string} ratingId - Rating ID
   * @returns {Promise}
   */
  async deleteRating(ratingId) {
    try {
      const response = await api.delete(`/ratings/${ratingId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[RatingService] deleteRating error:', error);
      throw error;
    }
  }
}

const ratingService = new RatingService();
export { ratingService };
export default ratingService;

