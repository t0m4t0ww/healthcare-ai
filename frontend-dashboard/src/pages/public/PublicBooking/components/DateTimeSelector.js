// src/pages/public/PublicBooking/components/DateTimeSelector.js

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock,
  AlertCircle,
  PauseCircle // ✅ Icon mới cho trạng thái tạm nghỉ
} from 'lucide-react';
import { message, Spin } from 'antd';
import appointmentServices from '../../../../services/appointmentServices';
import { 
  toLocalISODate, 
  formatDate, 
  getDaysInMonth,
  getFirstDayOfMonth,
  isToday,
  isPast,
  formatCountdown
} from '../utils/dateHelpers';
import { SLOT_STATUS, SLOT_COLORS, LOW_SLOT_THRESHOLD } from '../utils/constants';

// --- Sub-component: Màn hình bác sĩ tạm nghỉ ---
const PausedStateView = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-3xl p-8 shadow-xl border-2 border-slate-100 text-center"
  >
    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
      <PauseCircle size={40} className="text-slate-400" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">
      Bác sĩ đang tạm nghỉ
    </h3>
    <p className="text-slate-500 max-w-md mx-auto">
      Hiện tại bác sĩ đang tạm dừng nhận lịch khám mới. Vui lòng quay lại sau hoặc chọn bác sĩ khác trong hệ thống.
    </p>
  </motion.div>
);

// --- Sub-component: Loading Spinner ---
const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <Spin size="large" tip="Đang tải lịch...">
      <div style={{ minHeight: '100px' }} />
    </Spin>
  </div>
);

// --- MAIN COMPONENT ---
export const DateTimeSelector = ({ 
  doctorId, 
  onSlotSelected, 
  holdSlot, 
  heldSlot, 
  timeRemaining, 
  releaseHold, 
  isPaused = false,
  specificSchedule = {}
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toLocalISODate(new Date()));
  const [availability, setAvailability] = useState({});
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 1. Fetch Availability for the whole month
  const loadMonthAvailability = useCallback(async () => {
    if (isPaused) return; // Không load nếu đang pause

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const daysInMonth = getDaysInMonth(year, month);
      
      const dates = [];
      const now = new Date();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (!isPast(date) || isToday(date)) {
          dates.push(toLocalISODate(date));
        }
      }

      const data = await appointmentServices.checkAvailability(doctorId, dates);
      
      // Check kỹ hơn cho ngày hôm nay (loại bỏ các slot đã qua giờ)
      const todayStr = toLocalISODate(now);
      if (data[todayStr] > 0) {
        try {
          const todaySlots = await appointmentServices.getTimeSlots({
            doctor_id: doctorId,
            date: todayStr
          });
          const validSlots = filterValidSlots(todaySlots, todayStr);
          data[todayStr] = validSlots.length;
        } catch (err) {
          console.error('Error refining today slots:', err);
        }
      }
      
      setAvailability(data);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  }, [doctorId, currentDate, isPaused, specificSchedule]);

  useEffect(() => {
    loadMonthAvailability();
  }, [loadMonthAvailability]);

  // 2. Fetch Slots for specific date
  const loadSlots = useCallback(async () => {
    if (!selectedDate || isPaused) return;
    
    setLoadingSlots(true);
    try {
      const specialConfig = specificSchedule?.[selectedDate];
      if (specialConfig?.off) {
        setSlots([]);
        setLoadingSlots(false);
        return;
      }

      const data = await appointmentServices.getTimeSlots({
        doctor_id: doctorId,
        date: selectedDate
      });
      
      // Filter slots logic
      const filteredSlots = filterValidSlots(data || [], selectedDate);
      setSlots(filteredSlots);
    } catch (error) {
      console.error('Error loading slots:', error);
      message.error('Không thể tải lịch khám');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctorId, selectedDate, isPaused, specificSchedule]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Helper: Filter slots passed current time
  const filterValidSlots = (slotList, dateStr) => {
    const now = new Date();
    const targetDate = new Date(dateStr + 'T00:00:00');
    const isTargetToday = targetDate.toDateString() === now.toDateString();

    if (!isTargetToday) return slotList;

    const bufferTime = 15 * 60 * 1000; // 15 phút buffer
    return slotList.filter(slot => {
      const [hours, minutes] = slot.start_time.split(':').map(Number);
      const slotTime = new Date(targetDate);
      slotTime.setHours(hours, minutes, 0, 0);
      return slotTime.getTime() > (now.getTime() + bufferTime);
    });
  };

  // Handlers
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const handleDateSelect = (date) => {
    const dateStr = toLocalISODate(date);
    if (isPast(date) && !isToday(date)) return;
    
    if (specificSchedule?.[dateStr]?.off) {
      message.warning('Bác sĩ nghỉ trong ngày này.');
      return;
    }

    // Nếu availability = 0, chặn click
    const availData = availability[dateStr];
    const count = typeof availData === 'object' ? availData.count : (availData || 0);
    
    if (count === 0) {
      message.warning('Ngày này không có lịch khám');
      return;
    }
    
    setSelectedDate(dateStr);
    releaseHold(); 
  };

  const handleSlotClick = async (slot) => {
    if (slot.status !== 'available' && slot.status !== 'Available') {
      message.warning('Slot này không khả dụng');
      return;
    }

    if (heldSlot && heldSlot._id !== slot._id) {
      await releaseHold();
    }

    try {
      const success = await holdSlot(slot);
      if (success) {
        onSlotSelected({ slot, date: selectedDate });
        message.success({
            content: `Đã giữ slot ${slot.start_time}. Vui lòng hoàn tất trong ${Math.ceil(timeRemaining / 60)} phút.`,
            key: 'hold_slot',
            duration: 3
        });
      } else {
        message.warning('Slot này vừa được người khác đặt. Vui lòng chọn slot khác.');
        loadSlots(); // Refresh
      }
    } catch (error) {
      message.error('Lỗi khi giữ slot, vui lòng thử lại.');
      loadSlots();
    }
  };

  // Determine Visual Status of a Date Cell
  const getDateStatusDetails = (dateStr, dateObj) => {
    const availData = availability[dateStr];
    const count = typeof availData === 'object' ? availData.count : (availData || 0);
    const isPastBackend = typeof availData === 'object' ? availData.is_past : false;
    const isFull = typeof availData === 'object' ? availData.is_full : (count === 0);
    const isPastDate = isPast(dateObj) && !isToday(dateObj);
    const specialConfig = specificSchedule?.[dateStr];
    const isSpecialOff = specialConfig?.off === true;
    const hasCustomHours = specialConfig && specialConfig.start && specialConfig.end && !isSpecialOff;

    const effectiveCount = isSpecialOff ? 0 : count;

    return { 
      count: effectiveCount, 
      isPastBackend, 
      isFull: isSpecialOff ? true : isFull, 
      isPastDate,
      isSpecialOff,
      hasCustomHours
    };
  };

  // --- RENDERERS ---

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month + 1);
    const firstDay = getFirstDayOfMonth(year, month + 1);
    
    const days = [];
    const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Headers
    weekDays.forEach(day => days.push(
      <div key={`header-${day}`} className="text-center py-3 text-sm font-bold text-slate-600">{day}</div>
    ));

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = toLocalISODate(date);
      const isSelected = dateStr === selectedDate;
      
      const { count, isPastBackend, isFull, isPastDate, isSpecialOff, hasCustomHours } = getDateStatusDetails(dateStr, date);

      const isDisabled = isSpecialOff || isPastDate || isPastBackend || count === 0;

      // Determine dot color
      let dotColor = 'bg-slate-300';
      if (count > LOW_SLOT_THRESHOLD) dotColor = 'bg-emerald-500';
      else if (count > 0) dotColor = 'bg-amber-500';

      days.push(
        <motion.button
          key={day}
          whileHover={!isDisabled ? { scale: 1.1 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          onClick={() => handleDateSelect(date)}
          disabled={isDisabled}
          className={`
            relative p-3 rounded-xl text-center transition-all duration-300
            ${isDisabled ? 'text-slate-300 cursor-not-allowed bg-slate-50' : ''}
            ${isSelected 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg ring-4 ring-emerald-100 font-bold' 
              : (!isDisabled && !isSelected) ? 'hover:bg-slate-100' : ''
            }
          `}
        >
          <div className="text-sm font-semibold">{day}</div>
          
          {/* Status Indicators */}
          {!isSelected && (
            <>
              {(isPastBackend || isPastDate) && <div className="absolute top-0.5 right-0.5 text-[10px] text-slate-400">✕</div>}
              {isSpecialOff && (
                <div className="absolute top-1 right-1 text-[9px] font-semibold text-red-500">Nghỉ</div>
              )}
              {hasCustomHours && !isSpecialOff && (
                <div className="absolute top-1 right-1 text-[9px] font-semibold text-emerald-600">Giờ riêng</div>
              )}
              {isFull && !isPastDate && !isPastBackend && !isSpecialOff && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-500">HẾT</div>
              )}
              {!isDisabled && (
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${dotColor}`} />
              )}
            </>
          )}
        </motion.button>
      );
    }
    return days;
  };

  // ✅ LOGIC CHÍNH: Nếu isPaused = true, trả về PausedStateView ngay lập tức
  if (isPaused) {
    return <PausedStateView />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Calendar View */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarIcon size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
              </h3>
              <p className="text-sm text-slate-500">Chọn ngày khám</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200">
              <ChevronLeft size={20} />
            </button>
            <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarGrid()}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600">Còn nhiều</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-slate-600">Sắp hết</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <span className="text-sm text-slate-600">Hết chỗ</span>
          </div>
        </div>
      </div>

      {/* 2. Slot Selection View */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-100"
        >
          {/* Header Slot */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chọn giờ khám</h3>
                <p className="text-sm text-slate-500">{formatDate(selectedDate)}</p>
              </div>
            </div>
            
            {/* Countdown timer if holding */}
            {heldSlot && timeRemaining > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-semibold">
                <AlertCircle size={18} />
                <span>Còn {formatCountdown(timeRemaining)}</span>
              </motion.div>
            )}
          </div>

          {loadingSlots ? (
            <LoadingState />
          ) : slots.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-semibold mb-2">
                {isToday(new Date(selectedDate)) 
                  ? '⏰ Đã hết giờ khám hôm nay' 
                  : 'Không có lịch khám trong ngày này'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <AnimatePresence>
                {slots.map((slot, index) => {
                  const status = (slot.status || '').toLowerCase();
                  const isAvailable = status === 'available';
                  const isHeldByMe = heldSlot && heldSlot._id === slot._id;
                  
                  // Styles
                  const baseStyle = "relative px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300";
                  const availableStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:scale-105";
                  const unavailableStyle = "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed";
                  const heldStyle = "bg-amber-50 text-amber-700 border border-amber-200 ring-2 ring-amber-100";

                  return (
                    <motion.button
                      key={slot._id || index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleSlotClick(slot)}
                      disabled={!isAvailable && !isHeldByMe}
                      className={`
                        ${baseStyle}
                        ${isHeldByMe ? heldStyle : isAvailable ? availableStyle : unavailableStyle}
                      `}
                    >
                      {slot.start_time}
                      {isHeldByMe && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};