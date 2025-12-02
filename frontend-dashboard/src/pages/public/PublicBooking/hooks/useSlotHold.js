import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import appointmentServices from '../../../../services/appointmentServices';
import { HOLD_DURATION } from '../utils/constants';

export const useSlotHold = () => {
  const [heldSlot, setHeldSlot] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef(null);
  const holdExpiryRef = useRef(null);

  // Start countdown
  useEffect(() => {
    if (!heldSlot || timeRemaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const expiry = holdExpiryRef.current;
      
      if (!expiry || now >= expiry) {
        setTimeRemaining(0);
        setHeldSlot(null);
        clearInterval(timerRef.current);
        timerRef.current = null;
        
        message.warning('Hết thời gian giữ chỗ! Đang chuyển về trang chủ...', 2);
        
        // Auto redirect to home after timeout
        setTimeout(() => {
          window.location.href = '/patient/dashboard';
        }, 2000);
        
        return;
      }

      const remaining = Math.ceil((expiry - now) / 1000);
      setTimeRemaining(remaining);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [heldSlot, timeRemaining]);

  // Hold slot
  const holdSlot = useCallback(async (slot) => {
    try {
      setIsHolding(true);
      
      console.log('🔒 [useSlotHold] Attempting to hold slot:', slot._id);
      const result = await appointmentServices.holdSlot(slot._id);
      console.log('🔍 [useSlotHold] Hold API result:', result);
      
      if (result) {
        const expiryTime = Date.now() + (HOLD_DURATION * 1000);
        holdExpiryRef.current = expiryTime;
        
        setHeldSlot(slot);
        setTimeRemaining(HOLD_DURATION);
        
        message.success({
          content: `Đã giữ chỗ! Vui lòng xác nhận trong ${HOLD_DURATION / 60} phút`,
          duration: 3
        });
        
        console.log('✅ [useSlotHold] Slot held successfully, expires at:', new Date(expiryTime));
        return true;
      }
      
      console.warn('⚠️ [useSlotHold] Hold API returned falsy result:', result);
      console.warn('⚠️ [useSlotHold] Hold API returned falsy result:', result);
      return false;
    } catch (error) {
      console.error('❌ [useSlotHold] Hold slot error:', error);
      console.error('❌ [useSlotHold] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.message?.includes('409') || error.message?.includes('conflict')) {
        message.error('Slot này đã hết chỗ, vui lòng chọn slot khác');
      } else if (error.message?.includes('hold')) {
        message.error('Slot đã được giữ bởi người khác');
      } else {
        message.error(error.message || 'Không thể giữ chỗ');
      }
      
      return false;
    } finally {
      setIsHolding(false);
    }
  }, []);

  // Release hold
  const releaseHold = useCallback(async () => {
    if (!heldSlot) return;

    try {
      console.log('🔓 Releasing hold for slot:', heldSlot._id);
      await appointmentServices.releaseHold(heldSlot._id);
      
      setHeldSlot(null);
      setTimeRemaining(0);
      holdExpiryRef.current = null;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      console.log('✅ Hold released successfully');
    } catch (error) {
      console.error('❌ Release hold error:', error);
      // Silent fail - không cần thông báo lỗi
    }
  }, [heldSlot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heldSlot) {
        releaseHold();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    heldSlot,
    timeRemaining,
    isHolding,
    holdSlot,
    releaseHold
  };
};
