// src/hooks/useAdminRealtime.js
import { useEffect, useState, useCallback } from 'react';
import socket from '../services/socket';
import { message } from 'antd';

/**
 * Hook để quản lý real-time updates cho Admin Dashboard
 * 
 * Features:
 * - Nhận thông báo lịch hẹn mới
 * - Nhận thông báo cập nhật lịch hẹn
 * - Nhận thông báo bệnh nhân mới đăng ký
 * - Tự động refresh data khi có update
 * 
 * @param {Function} onNewAppointment - Callback khi có lịch hẹn mới
 * @param {Function} onAppointmentUpdate - Callback khi lịch hẹn được cập nhật
 * @param {Function} onNewPatient - Callback khi có bệnh nhân mới
 * @returns {Object} - { stats, refreshStats }
 */
export const useAdminRealtime = ({
  onNewAppointment,
  onAppointmentUpdate,
  onNewPatient,
  autoRefresh = true,
} = {}) => {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalPatients: 0,
    totalDoctors: 0,
    pendingAppointments: 0,
  });

  // Refresh stats từ server
  const refreshStats = useCallback(() => {
    // TODO: Call API để lấy stats mới
    console.log('🔄 Refreshing admin stats...');
  }, []);

  useEffect(() => {
    console.log('🎯 Admin Realtime: Connecting...');

    // ===== NEW APPOINTMENT EVENT =====
    const handleNewAppointment = (data) => {
      console.log('📅 New appointment received:', data);
      
      // Show notification
      message.info({
        content: `Lịch hẹn mới từ ${data.patient?.name || 'Bệnh nhân'}`,
        duration: 5,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalAppointments: prev.totalAppointments + 1,
        pendingAppointments: prev.pendingAppointments + 1,
      }));

      // Callback
      if (onNewAppointment) {
        onNewAppointment(data);
      }

      // Auto refresh
      if (autoRefresh) {
        setTimeout(refreshStats, 1000);
      }
    };

    // ===== APPOINTMENT UPDATE EVENT =====
    const handleAppointmentUpdate = (data) => {
      console.log('🔄 Appointment updated:', data);
      
      // Show notification
      message.success({
        content: `Lịch hẹn #${data.appointment_id?.slice(-6)} đã được cập nhật`,
        duration: 3,
      });

      // Callback
      if (onAppointmentUpdate) {
        onAppointmentUpdate(data);
      }

      // Auto refresh
      if (autoRefresh) {
        setTimeout(refreshStats, 1000);
      }
    };

    // ===== NEW PATIENT EVENT =====
    const handleNewPatient = (data) => {
      console.log('👤 New patient registered:', data);
      
      // Show notification
      message.success({
        content: `Bệnh nhân mới: ${data.name || 'N/A'}`,
        duration: 4,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalPatients: prev.totalPatients + 1,
      }));

      // Callback
      if (onNewPatient) {
        onNewPatient(data);
      }

      // Auto refresh
      if (autoRefresh) {
        setTimeout(refreshStats, 1000);
      }
    };

    // ===== APPOINTMENT CANCELLED EVENT =====
    const handleAppointmentCancelled = (data) => {
      console.log('❌ Appointment cancelled:', data);
      
      message.warning({
        content: `Lịch hẹn #${data.appointment_id?.slice(-6)} đã bị hủy`,
        duration: 4,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        pendingAppointments: Math.max(0, prev.pendingAppointments - 1),
      }));

      // Auto refresh
      if (autoRefresh) {
        setTimeout(refreshStats, 1000);
      }
    };

    // ===== REGISTER EVENT LISTENERS =====
    // Use standard events instead of admin-specific ones for compatibility
    socket.on('new_appointment', handleNewAppointment);
    socket.on('appointment_updated', handleAppointmentUpdate);
    socket.on('patient_created', handleNewPatient);
    socket.on('patient_updated', handleNewPatient); // Also listen for updates

    // ===== CLEANUP =====
    return () => {
      console.log('🎯 Admin Realtime: Disconnecting...');
      
      socket.off('new_appointment', handleNewAppointment);
      socket.off('appointment_updated', handleAppointmentUpdate);
      socket.off('patient_created', handleNewPatient);
      socket.off('patient_updated', handleNewPatient);
    };
  }, [onNewAppointment, onAppointmentUpdate, onNewPatient, autoRefresh, refreshStats]);

  return {
    stats,
    refreshStats,
  };
};

export default useAdminRealtime;
