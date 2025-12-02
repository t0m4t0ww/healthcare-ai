/**
 * Browser Push Notification Service
 * Cho phép gửi desktop notifications khi có appointment mới
 */

class PushNotificationService {
  constructor() {
    this.permission = 'default';
    this.checkPermission();
  }

  /**
   * Kiểm tra và request permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser không hỗ trợ notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Kiểm tra permission hiện tại
   */
  checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.permission === 'granted';
  }

  /**
   * Hiển thị notification
   * @param {string} title - Tiêu đề
   * @param {object} options - Options (body, icon, tag, etc)
   */
  async show(title, options = {}) {
    // Check permission
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('User denied notification permission');
        return null;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/meditech_logo.png',
        badge: '/meditech_logo.png',
        tag: 'healthcare-notification',
        requireInteraction: false,
        ...options,
      });

      // Auto close sau 10s nếu không có interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Notification cho appointment mới
   */
  async notifyNewAppointment(appointment) {
    const patientName = appointment.patient?.full_name || appointment.patient_name || 'Bệnh nhân';
    const time = appointment.time || '';
    
    return this.show('🩺 Lịch hẹn mới', {
      body: `${patientName} đã đặt lịch khám lúc ${time}`,
      icon: '/meditech_logo.png',
      tag: `appointment-${appointment._id}`,
      data: { type: 'appointment', id: appointment._id },
      requireInteraction: true, // Keep notification until user clicks
    });
  }

  /**
   * Notification cho tin nhắn mới
   */
  async notifyNewMessage(message) {
    const senderName = message.sender_name || 'Người dùng';
    const preview = message.text ? message.text.substring(0, 50) : '📎 Đã gửi file';
    
    return this.show(`💬 Tin nhắn mới từ ${senderName}`, {
      body: preview + (message.text?.length > 50 ? '...' : ''),
      icon: '/meditech_logo.png',
      tag: `message-${message._id}`,
      data: { type: 'message', id: message._id, conversation_id: message.conversation_id },
    });
  }

  /**
   * Notification cho appointment reminder
   */
  async notifyAppointmentReminder(appointment) {
    const patientName = appointment.patient?.full_name || appointment.patient_name || 'Bệnh nhân';
    const time = appointment.time || '';
    
    return this.show('⏰ Nhắc nhở lịch khám', {
      body: `Lịch khám với ${patientName} sẽ bắt đầu lúc ${time}`,
      icon: '/meditech_logo.png',
      tag: `reminder-${appointment._id}`,
      data: { type: 'reminder', id: appointment._id },
      requireInteraction: true,
    });
  }

  /**
   * Notification cho lab results
   */
  async notifyLabResults(patientName) {
    return this.show('🧪 Kết quả xét nghiệm mới', {
      body: `Kết quả xét nghiệm của ${patientName} đã có`,
      icon: '/meditech_logo.png',
      tag: 'lab-results',
    });
  }
}

// Export singleton instance
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

