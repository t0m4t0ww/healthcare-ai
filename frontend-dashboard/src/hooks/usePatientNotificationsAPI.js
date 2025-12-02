// src/hooks/usePatientNotificationsAPI.js - Hook để fetch patient notifications từ API
import { useState, useEffect, useCallback } from 'react';
import { patientNotificationService } from '../services/notificationService';
import socket from '../services/socket';

/**
 * Hook để quản lý notifications cho patient (API-based + realtime Socket.IO)
 * @param {boolean} autoFetch - Tự động fetch khi mount (default: true)
 * @param {number} refreshInterval - Interval tự động refresh (ms, 0 = disable)
 * @returns {Object} {notifications, unreadCount, loading, error, refresh, markAsRead, deleteNotification, markAllAsRead}
 */
export function usePatientNotificationsAPI(autoFetch = true, refreshInterval = 0) {
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
      
      const data = await patientNotificationService.getNotifications({ limit: 50 });
      
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      
      console.log('✅ [usePatientNotificationsAPI] Fetched notifications:', data.notifications?.length);
    } catch (err) {
      console.error('❌ [usePatientNotificationsAPI] Fetch error:', err);
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
      await patientNotificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ [usePatientNotificationsAPI] Marked as read:', notificationId);
    } catch (err) {
      console.error('❌ [usePatientNotificationsAPI] Mark read error:', err);
    }
  }, []);

  /**
   * Mark all as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await patientNotificationService.markAsRead(null);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setUnreadCount(0);
      
      console.log('✅ [usePatientNotificationsAPI] Marked all as read');
    } catch (err) {
      console.error('❌ [usePatientNotificationsAPI] Mark all read error:', err);
    }
  }, []);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await patientNotificationService.deleteNotification(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      
      // Giảm unread count nếu notification chưa đọc
      setUnreadCount(prev => {
        const deletedNotif = notifications.find(n => n._id === notificationId);
        return deletedNotif && !deletedNotif.is_read ? Math.max(0, prev - 1) : prev;
      });
      
      console.log('✅ [usePatientNotificationsAPI] Deleted notification:', notificationId);
    } catch (err) {
      console.error('❌ [usePatientNotificationsAPI] Delete error:', err);
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

  // Socket.IO realtime updates
  useEffect(() => {
    const handleNewNotification = (data) => {
      console.log('🔔 [usePatientNotificationsAPI] New notification via socket:', data);
      
      // Refresh notifications when new one arrives
      fetchNotifications();
    };

    const handleNotificationUpdate = (data) => {
      console.log('📡 [usePatientNotificationsAPI] Notification updated via socket:', data);
      
      // Refresh notifications
      fetchNotifications();
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_updated', handleNotificationUpdate);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_updated', handleNotificationUpdate);
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

