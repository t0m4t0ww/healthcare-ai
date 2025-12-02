// frontend-dashboard/src/context/AppointmentContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import appointmentServices from '../services/appointmentServices';
import { message } from 'antd';

const AppointmentContext = createContext();

export const useAppointment = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointment must be used within AppointmentProvider');
  }
  return context;
};

export const AppointmentProvider = ({ children }) => {
  // ============================================
  // STATE
  // ============================================
  
  // Booking flow state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Hold state
  const [isHolding, setIsHolding] = useState(false);
  const [holdInfo, setHoldInfo] = useState(null); // { slot_id, hold_expires_at, countdown_seconds }
  const [countdown, setCountdown] = useState(0); // seconds remaining
  
  // Booking form data
  const [bookingData, setBookingData] = useState({
    reason: '',
    symptoms: '',
    notes: '',
    appointment_type: 'consultation'
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: chọn bác sĩ, 2: chọn ngày, 3: chọn giờ, 4: điền thông tin
  
  // Appointments list (for patient)
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  
  
  // ============================================
  // COUNTDOWN TIMER
  // ============================================
  
  useEffect(() => {
    if (!holdInfo || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Hết giờ hold
          handleExpireHold();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [holdInfo, countdown]);
  
  
  // ============================================
  // ACTIONS: HOLD SLOT
  // ============================================
  
  const holdSlot = async (slot) => {
    if (isHolding) {
      message.warning('Bạn đang giữ một slot khác. Vui lòng hoàn tất hoặc hủy trước.');
      return { success: false };
    }
    
    setLoading(true);
    try {
      const result = await appointmentServices.holdSlot(slot._id);
      
      if (result.success) {
        setIsHolding(true);
        setSelectedSlot(slot);
        setHoldInfo({
          slot_id: slot._id,
          hold_expires_at: result.hold_expires_at,
          countdown_seconds: result.countdown_seconds || 120
        });
        setCountdown(result.countdown_seconds || 120);
        
        message.success('Đã giữ chỗ thành công! Vui lòng hoàn tất trong 2 phút.');
        
        return { success: true };
      } else {
        message.error(result.message || 'Không thể giữ slot');
        return { success: false };
      }
    } catch (error) {
      console.error('Hold slot error:', error);
      message.error(error.message || 'Có lỗi xảy ra khi giữ slot');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };
  
  
  // ============================================
  // ACTIONS: RELEASE HOLD (manual)
  // ============================================
  
  const releaseHold = useCallback(() => {
    setIsHolding(false);
    setHoldInfo(null);
    setCountdown(0);
    setSelectedSlot(null);
    message.info('Đã hủy giữ chỗ');
  }, []);
  
  
  // ============================================
  // ACTIONS: HANDLE EXPIRE (auto)
  // ============================================
  
  const handleExpireHold = useCallback(() => {
    setIsHolding(false);
    setHoldInfo(null);
    setCountdown(0);
    setSelectedSlot(null);
    message.warning('Hết thời gian giữ chỗ. Vui lòng chọn lại slot khác.');
  }, []);
  
  
  // ============================================
  // ACTIONS: COMPLETE BOOKING
  // ============================================
  
  const completeBooking = async () => {
    if (!holdInfo || !selectedSlot) {
      message.error('Vui lòng chọn slot trước');
      return { success: false };
    }
    
    if (!bookingData.reason) {
      message.error('Vui lòng nhập lý do khám');
      return { success: false };
    }
    
    setLoading(true);
    try {
      const payload = {
        slot_id: holdInfo.slot_id,
        ...bookingData
      };
      
      const result = await appointmentServices.completeBooking(payload);
      
      message.success('Đặt lịch thành công! 🎉');
      
      // Reset state
      resetBookingFlow();
      
      // Reload appointments list
      await fetchAppointments();
      
      return { success: true, appointment: result };
      
    } catch (error) {
      console.error('Booking error:', error);
      message.error(error.message || 'Đặt lịch thất bại');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };
  
  
  // ============================================
  // ACTIONS: FETCH APPOINTMENTS
  // ============================================
  
  const fetchAppointments = async (filters = {}) => {
    setAppointmentsLoading(true);
    try {
      // ✅ Truyền limit lớn để load tất cả appointments (hoặc dùng pagination)
      const params = {
        ...filters,
        limit: filters.limit || 1000, // ✅ Load tối đa 1000 appointments
        page: filters.page || 1
      };
      
      const result = await appointmentServices.getPatientAppointments(params);
      
      // Handle both response formats
      const data = result.data || result;
      setAppointments(Array.isArray(data) ? data : []);
      
      return { success: true, data };
    } catch (error) {
      console.error('Fetch appointments error:', error);
      message.error('Không thể tải danh sách lịch khám');
      return { success: false };
    } finally {
      setAppointmentsLoading(false);
    }
  };
  
  
  // ============================================
  // ACTIONS: CANCEL APPOINTMENT
  // ============================================
  
  const cancelAppointment = async (appointmentId, reason) => {
    setLoading(true);
    try {
      await appointmentServices.cancelAppointment(appointmentId, reason);
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt._id === appointmentId 
            ? { ...apt, status: 'CANCELLED', cancel_reason: reason }
            : apt
        )
      );
      
      message.success('Đã hủy lịch khám');
      return { success: true };
      
    } catch (error) {
      console.error('Cancel appointment error:', error);
      message.error(error.message || 'Không thể hủy lịch');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };
  
  
  // ============================================
  // HELPERS
  // ============================================
  
  const resetBookingFlow = () => {
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setIsHolding(false);
    setHoldInfo(null);
    setCountdown(0);
    setBookingData({
      reason: '',
      symptoms: '',
      notes: '',
      appointment_type: 'consultation'
    });
    setStep(1);
  };
  
  const updateBookingData = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };
  
  const goToStep = (stepNumber) => {
    setStep(stepNumber);
  };
  
  const canProceedToBooking = () => {
    return isHolding && holdInfo && countdown > 0;
  };
  
  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  
  // ============================================
  // CONTEXT VALUE
  // ============================================
  
  const value = {
    // State
    selectedDoctor,
    selectedDate,
    selectedSlot,
    isHolding,
    holdInfo,
    countdown,
    bookingData,
    loading,
    step,
    appointments,
    appointmentsLoading,
    
    // Setters
    setSelectedDoctor,
    setSelectedDate,
    setSelectedSlot,
    updateBookingData,
    setStep: goToStep,
    
    // Actions
    holdSlot,
    releaseHold,
    completeBooking,
    fetchAppointments,
    cancelAppointment,
    resetBookingFlow,
    
    // Helpers
    canProceedToBooking,
    formatCountdown,
  };
  
  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};