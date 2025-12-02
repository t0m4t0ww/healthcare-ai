// src/hooks/useDoctorNotificationsAPI.js - Hook để fetch doctor notifications từ API
import { useState, useEffect, useCallback } from 'react';
import { doctorNotificationService } from '../services/notificationService';
import socket from '../services/socket';

/**
 * Hook để quản lý notifications cho doctor (API-based + realtime Socket.IO)
 * @param {boolean} autoFetch - Tự động fetch khi mount (default: true)
 * @param {number} refreshInterval - Interval tự động refresh (ms, 0 = disable)
 * @returns {Object} {notifications, unreadCount, loading, error, refresh, markAsRead, deleteNotification, markAllAsRead}
 */
export function useDoctorNotificationsAPI(autoFetch = true, refreshInterval = 0) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await doctorNotificationService.getNotifications({ limit: 50 });
      
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      
      console.log('✅ [useDoctorNotificationsAPI] Fetched notifications:', data.notifications?.length);
    } catch (err) {
      console.error('❌ [useDoctorNotificationsAPI] Fetch error:', err);
      setError(err.message || 'Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await doctorNotificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ [useDoctorNotificationsAPI] Marked as read:', notificationId);
    } catch (err) {
      console.error('❌ [useDoctorNotificationsAPI] Mark read error:', err);
    }
  }, []);

  /**
   * Mark all as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await doctorNotificationService.markAsRead(null);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setUnreadCount(0);
      
      console.log('✅ [useDoctorNotificationsAPI] Marked all as read');
    } catch (err) {
      console.error('❌ [useDoctorNotificationsAPI] Mark all read error:', err);
    }
  }, []);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await doctorNotificationService.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      
      // Giảm unread count nếu notification chưa đọc
      setUnreadCount(prev => {
        const deletedNotif = notifications.find(n => n._id === notificationId);
        return deletedNotif && !deletedNotif.is_read ? Math.max(0, prev - 1) : prev;
      });
      
      console.log('✅ [useDoctorNotificationsAPI] Deleted notification:', notificationId);
    } catch (err) {
      console.error('❌ [useDoctorNotificationsAPI] Delete error:', err);
    }
  }, [notifications]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [autoFetch, fetchNotifications]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchNotifications, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, fetchNotifications]);

  // Socket.IO realtime updates for doctor
  useEffect(() => {
    const handleNewAppointment = (data) => {
      console.log('🔔 [useDoctorNotificationsAPI] New appointment notification via socket:', data);
      
      // Refresh notifications when new appointment
      fetchNotifications();
    };

    const handleAppointmentUpdate = (data) => {
      console.log('📡 [useDoctorNotificationsAPI] Appointment updated via socket:', data);
      
      // Refresh notifications
      fetchNotifications();
    };

    const handleNewNotification = (data) => {
      console.log('🔔 [useDoctorNotificationsAPI] New notification via socket:', data);
      
      // Refresh notifications
      fetchNotifications();
    };

    socket.on('new_appointment', handleNewAppointment);
    socket.on('appointment_updated', handleAppointmentUpdate);
    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_appointment', handleNewAppointment);
      socket.off('appointment_updated', handleAppointmentUpdate);
      socket.off('new_notification', handleNewNotification);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

