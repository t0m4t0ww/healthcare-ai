// frontend-dashboard/src/components/Booking/BookingCalendar.js
import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import appointmentServices from '../../services/appointmentServices';

const BookingCalendar = ({ doctorId, onSelectDate, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({}); // { "2025-01-15": 10, "2025-01-16": 5 }
  const [loading, setLoading] = useState(false);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  
  // ============================================
  // Fetch availability for current month
  // ============================================
  
  useEffect(() => {
    if (doctorId) {
      fetchAvailability();
    }
  }, [doctorId, currentMonth]);
  
  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Get all dates in current month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dates = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (date >= today) { // Only future dates
          dates.push(formatDate(date));
        }
      }
      
      // Fetch availability for all dates (batch request)
      const result = await appointmentServices.checkAvailability(doctorId, dates);
      setAvailability(result);
      
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoading(false);
    }
  };
  
  
  // ============================================
  // Calendar helpers
  // ============================================
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Fill leading empty days (từ chủ nhật tuần trước)
    const startDay = firstDay.getDay(); // 0 = Sunday
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Fill actual days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };
  
  const handleSelectDate = (date) => {
    if (!date || date < today) return;
    
    const dateStr = formatDate(date);
    const slotsCount = availability[dateStr] || 0;
    
    if (slotsCount === 0) {
      return; // Không có slot trống
    }
    
    onSelectDate?.(dateStr);
  };
  
  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return formatDate(date) === selectedDate;
  };
  
  const getDateStatus = (date) => {
    if (!date) return null;
    
    const dateStr = formatDate(date);
    const slotsCount = availability[dateStr] || 0;
    const isPast = date < today;
    
    if (isPast) return 'past';
    if (slotsCount === 0) return 'unavailable';
    if (slotsCount <= 3) return 'limited';
    return 'available';
  };
  
  
  // ============================================
  // Render
  // ============================================
  
  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 grid place-items-center">
            <Calendar size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">{monthName}</div>
            <div className="text-sm text-slate-500">Chọn ngày khám</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            disabled={loading}
            className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 grid place-items-center transition-colors disabled:opacity-50"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            disabled={loading}
            className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 grid place-items-center transition-colors disabled:opacity-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2 animate-pulse">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }
            
            const status = getDateStatus(date);
            const dateStr = formatDate(date);
            const slotsCount = availability[dateStr] || 0;
            const selected = isSelected(date);
            
            let bgColor = 'bg-white hover:bg-slate-50';
            let textColor = 'text-slate-800';
            let cursor = 'cursor-pointer';
            let border = 'border border-slate-200';
            
            if (status === 'past') {
              bgColor = 'bg-slate-50';
              textColor = 'text-slate-300';
              cursor = 'cursor-not-allowed';
            } else if (status === 'unavailable') {
              bgColor = 'bg-slate-50';
              textColor = 'text-slate-400';
              cursor = 'cursor-not-allowed';
            } else if (selected) {
              bgColor = 'bg-emerald-500';
              textColor = 'text-white';
              border = 'border-2 border-emerald-600';
            }
            
            return (
              <motion.button
                key={dateStr}
                whileHover={status !== 'past' && status !== 'unavailable' ? { scale: 1.05 } : {}}
                whileTap={status !== 'past' && status !== 'unavailable' ? { scale: 0.95 } : {}}
                onClick={() => handleSelectDate(date)}
                disabled={status === 'past' || status === 'unavailable'}
                className={`
                  aspect-square rounded-lg ${bgColor} ${border} ${cursor}
                  transition-all relative group
                `}
              >
                <div className={`text-base font-semibold ${textColor}`}>
                  {date.getDate()}
                </div>
                
                {/* Availability indicator */}
                {status !== 'past' && slotsCount > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <Circle
                      size={4}
                      className={
                        status === 'limited' 
                          ? 'fill-orange-500 text-orange-500'
                          : selected
                          ? 'fill-white text-white'
                          : 'fill-emerald-500 text-emerald-500'
                      }
                    />
                  </div>
                )}
                
                {/* Tooltip on hover */}
                {status !== 'past' && slotsCount > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {slotsCount} slot trống
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-slate-600">Nhiều slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-slate-600">Còn ít slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-200" />
          <span className="text-slate-600">Hết slot</span>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;