// frontend-dashboard/src/components/Booking/TimeSlotPicker.js
import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Loader2, AlertCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { message } from 'antd';
import { useAppointment } from '../../context/AppointmentContext';
import appointmentServices from '../../services/appointmentServices';

const TimeSlotPicker = ({ doctorId, selectedDate }) => {
  const {
    selectedSlot,
    isHolding,
    holdInfo,
    countdown,
    formatCountdown,
    holdSlot,
    releaseHold,
  } = useAppointment();
  
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [holdingSlotId, setHoldingSlotId] = useState(null); // Local loading state

  
  // ============================================
  // Fetch slots
  // ============================================
  
  useEffect(() => {
    if (doctorId && selectedDate) {
      fetchSlots();
    }
  }, [doctorId, selectedDate]);
  
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const result = await appointmentServices.getTimeSlots({
        doctor_id: doctorId,
        date: selectedDate,
        status: 'AVAILABLE'
      });
      
      setSlots(result || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      message.error('Không thể tải khung giờ');
    } finally {
      setLoading(false);
    }
  };
  
  
  // ============================================
  // Handle select slot (HOLD)
  // ============================================
  
  const handleSelectSlot = async (slot) => {
    // Nếu đang hold slot khác -> confirm trước
    if (isHolding && selectedSlot?._id !== slot._id) {
      message.warning('Bạn đang giữ một slot khác. Vui lòng hủy hoặc hoàn tất trước.');
      return;
    }
    
    // Nếu đang hold slot này -> không làm gì
    if (isHolding && selectedSlot?._id === slot._id) {
      return;
    }
    
    // Hold slot
    setHoldingSlotId(slot._id);
    const result = await holdSlot(slot);
    setHoldingSlotId(null);
    
    if (result.success) {
      // Refresh slots để update UI
      await fetchSlots();
    }
  };
  
  
  // ============================================
  // Handle release hold
  // ============================================
  
  const handleReleaseHold = () => {
    releaseHold();
    fetchSlots(); // Refresh to show slot available again
  };
  
  
  // ============================================
  // Render
  // ============================================
  
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center py-8">
          <Loader2 size={40} className="animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-600">Đang tải khung giờ...</p>
        </div>
      </div>
    );
  }
  
  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Không có khung giờ trống</p>
          <p className="text-slate-500 text-sm mt-2">Vui lòng chọn ngày khác</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 grid place-items-center">
            <Clock size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">Chọn giờ khám</div>
            <div className="text-sm text-slate-500">
              {slots.length} khung giờ khả dụng
            </div>
          </div>
        </div>
        
        {/* Countdown timer */}
        <AnimatePresence>
          {isHolding && countdown > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <div
                className={`
                  px-4 py-2 rounded-lg font-mono font-bold text-lg
                  ${countdown <= 30 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}
                `}
              >
                {formatCountdown()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Holding notice */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Lock size={20} className="text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-emerald-900 mb-1">
                    Đang giữ chỗ: {selectedSlot?.start_time}
                  </div>
                  <div className="text-sm text-emerald-700">
                    Vui lòng hoàn tất đặt lịch trong {formatCountdown()}. 
                    Sau đó slot sẽ tự động được giải phóng.
                  </div>
                </div>
                <button
                  onClick={handleReleaseHold}
                  className="text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Slots grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <AnimatePresence mode="popLayout">
          {slots.map((slot) => {
            const isSelected = selectedSlot?._id === slot._id;
            const isLoadingThis = holdingSlotId === slot._id;
            const isDisabled = isHolding && !isSelected;
            
            return (
              <motion.button
                key={slot._id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={!isDisabled && !isLoadingThis ? { scale: 1.05 } : {}}
                whileTap={!isDisabled && !isLoadingThis ? { scale: 0.95 } : {}}
                onClick={() => handleSelectSlot(slot)}
                disabled={isDisabled || isLoadingThis}
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20'
                    : isDisabled
                    ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer'
                  }
                `}
              >
                {/* Loading spinner */}
                {isLoadingThis && (
                  <div className="absolute inset-0 bg-white/80 rounded-xl grid place-items-center">
                    <Loader2 size={20} className="animate-spin text-emerald-500" />
                  </div>
                )}
                
                {/* Time */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={16} className={isSelected ? 'text-emerald-600' : 'text-slate-600'} />
                  <span className={`font-semibold ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {slot.start_time}
                  </span>
                </div>
                
                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center"
                  >
                    <Check size={18} className="text-emerald-600" />
                  </motion.div>
                )}
                
                {/* Lock indicator for disabled slots */}
                {isDisabled && !isSelected && (
                  <div className="absolute top-1 right-1">
                    <Lock size={12} className="text-slate-400" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Footer note */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Lưu ý quan trọng:</p>
            <ul className="space-y-1 text-slate-500">
              <li>• Slot sẽ được giữ trong 2 phút sau khi chọn</li>
              <li>• Vui lòng hoàn tất đặt lịch trước khi hết giờ</li>
              <li>• Chỉ có thể giữ 1 slot tại một thời điểm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotPicker;