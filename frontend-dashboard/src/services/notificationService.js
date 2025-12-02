// src/services/notificationService.js - Tách riêng notification services cho Patient và Doctor
import api from './services';

/**
 * Patient Notification Service
 * API endpoints for patient notifications
 */
export const patientNotificationService = {
  /**
   * Lấy danh sách notifications của patient
   * @param {Object} params - Query parameters {limit, is_read}
   * @returns {Promise} {notifications, unread_count, total}
   */
  async getNotifications(params = {}) {
    try {
      const response = await api.get('/patient/notifications', { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[PatientNotificationService] getNotifications error:', error);
      throw error;
    }
  },

  /**
   * Đánh dấu notification đã đọc
   * @param {string} notificationId - ID của notification cần đánh dấu (null = mark all)
   * @returns {Promise}
   */
  async markAsRead(notificationId = null) {
    try {
      const payload = notificationId ? { notification_id: notificationId } : {};
      const response = await api.post('/patient/notifications/mark-read', payload);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[PatientNotificationService] markAsRead error:', error);
      throw error;
    }
  },

  /**
   * Xóa notification
   * @param {string} notificationId
   * @returns {Promise}
   */
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/patient/notifications/${notificationId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[PatientNotificationService] deleteNotification error:', error);
      throw error;
    }
  },
};

/**
 * Doctor Notification Service
 * API endpoints for doctor notifications
 */
export const doctorNotificationService = {
  /**
   * Lấy danh sách notifications của doctor
   * @param {Object} params - Query parameters {limit, is_read}
   * @returns {Promise} {notifications, unread_count, total}
   */
  async getNotifications(params = {}) {
    try {
      const response = await api.get('/doctor/notifications', { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[DoctorNotificationService] getNotifications error:', error);
      throw error;
    }
  },

  /**
   * Đánh dấu notification đã đọc
   * @param {string} notificationId - ID của notification cần đánh dấu (null = mark all)
   * @returns {Promise}
   */
  async markAsRead(notificationId = null) {
    try {
      const payload = notificationId ? { notification_id: notificationId } : {};
      const response = await api.post('/doctor/notifications/mark-read', payload);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[DoctorNotificationService] markAsRead error:', error);
      throw error;
    }
  },

  /**
   * Xóa notification
   * @param {string} notificationId
   * @returns {Promise}
   */
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/doctor/notifications/${notificationId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[DoctorNotificationService] deleteNotification error:', error);
      throw error;
    }
  },
};

export default {
  patient: patientNotificationService,
  doctor: doctorNotificationService,
};

