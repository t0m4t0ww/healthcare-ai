// src/hooks/usePatientNotifications.js
import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import socket from '../services/socket';

/**
 * Custom hook để tự động listen tất cả notification events cho patient
 * Sử dụng trong PatientLayout hoặc component gốc của patient routes
 */
export function usePatientNotifications() {
  const { notify } = useNotifications();

  useEffect(() => {
    // ✅ 1. Appointment events
    const handleAppointmentUpdated = (data) => {
      console.log('📡 Appointment updated:', data);
      
      const statusMessages = {
        confirmed: {
          title: "✅ Lịch hẹn đã được xác nhận",
          message: `Bác sĩ ${data.doctor?.name || 'đã xác nhận'} lịch khám của bạn vào ${data.date} lúc ${data.time}`,
          type: "success"
        },
        cancelled: {
          title: "❌ Lịch hẹn đã bị hủy",
          message: data.cancel_reason || "Lịch hẹn đã được hủy bởi bác sĩ",
          type: "error"
        },
        completed: {
          title: "🎉 Lịch hẹn hoàn thành",
          message: "Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi",
          type: "success"
        },
        pending: {
          title: "⏰ Lịch hẹn mới",
          message: `Lịch khám vào ${data.date} lúc ${data.time} đang chờ xác nhận`,
          type: "info"
        }
      };

      const notification = statusMessages[data.status];
      if (notification) {
        notify({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          showToast: true
        });
      }
    };

    // ✅ 2. New message from doctor
    const handleNewMessage = (data) => {
      console.log('📡 New message:', data);
      
      notify({
        title: "💬 Tin nhắn mới",
        message: `${data.senderName || 'Bác sĩ'}: ${data.message?.substring(0, 50)}${data.message?.length > 50 ? '...' : ''}`,
        type: "info",
        showToast: true
      });
    };

    // ✅ 3. X-ray result ready
    const handleXrayResultReady = (data) => {
      console.log('📡 X-ray result ready:', data);
      
      notify({
        title: "📋 Kết quả X-quang đã sẵn sàng",
        message: `Kết quả chẩn đoán AI đã được xử lý. Vui lòng kiểm tra`,
        type: "success",
        showToast: true
      });
    };

    // ✅ 4. Prescription ready
    const handlePrescriptionReady = (data) => {
      console.log('📡 Prescription ready:', data);
      
      notify({
        title: "💊 Đơn thuốc mới",
        message: `Bác sĩ ${data.doctorName || ''} đã kê đơn thuốc cho bạn`,
        type: "info",
        showToast: true
      });
    };

    // ✅ 5. Reminder - upcoming appointment
    const handleAppointmentReminder = (data) => {
      console.log('📡 Appointment reminder:', data);
      
      notify({
        title: "🔔 Nhắc nhở lịch khám",
        message: `Bạn có lịch khám vào ${data.date} lúc ${data.time}. Vui lòng đến đúng giờ`,
        type: "warning",
        showToast: true
      });
    };

    // ✅ 6. System notification
    const handleSystemNotification = (data) => {
      console.log('📡 System notification:', data);
      
      notify({
        title: data.title || "📢 Thông báo hệ thống",
        message: data.message || "",
        type: data.type || "info",
        showToast: true
      });
    };

    // Register all socket listeners
    socket.on('appointment_updated', handleAppointmentUpdated);
    socket.on('new_message', handleNewMessage);
    socket.on('xray_result_ready', handleXrayResultReady);
    socket.on('prescription_ready', handlePrescriptionReady);
    socket.on('appointment_reminder', handleAppointmentReminder);
    socket.on('system_notification', handleSystemNotification);

    // Cleanup
    return () => {
      socket.off('appointment_updated', handleAppointmentUpdated);
      socket.off('new_message', handleNewMessage);
      socket.off('xray_result_ready', handleXrayResultReady);
      socket.off('prescription_ready', handlePrescriptionReady);
      socket.off('appointment_reminder', handleAppointmentReminder);
      socket.off('system_notification', handleSystemNotification);
    };
  }, [notify]);
}
