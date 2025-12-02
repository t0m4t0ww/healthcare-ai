// frontend-dashboard/src/services/appointmentServices.js - CLEAN & FIXED ✅
import axios from 'axios';

const availabilityCache = new Map(); // key: `${doctorId}:${monthKey}` -> value: { 'YYYY-MM-DD': number }

// API client
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 15000,
});

// Add auth header
api.interceptors.request.use((config) => {
  try {
    const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    const token =
      user?.token ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    console.log('🔐 [appointmentServices] Request interceptor:');
    console.log('   - URL:', config.url);
    console.log('   - Method:', config.method);
    console.log('   - Token found:', token ? 'YES ✅' : 'NO ❌');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('   - Authorization header set ✅');
    } else {
      console.warn('   - ⚠️ NO TOKEN - Request will be unauthorized!');
    }
  } catch (e) {
    console.error('   - ❌ Error in request interceptor:', e);
    // ignore parse error
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class AppointmentServices {
  // =============== DOCTORS API ===============
  async getDoctors(params = {}) {
    try {
      const response = await api.get('/doctors', { params });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
      throw new Error(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Không thể tải danh sách bác sĩ'
      );
    }
  }

  async getDoctorDetails(doctorId) {
    try {
      const response = await api.get(`/doctors/${doctorId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to fetch doctor details:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải thông tin bác sĩ');
    }
  }

  async getSpecialties() {
    try {
      const response = await api.get('/specialties');
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to fetch specialties:', error);
      // Fallback to 3 specialties only
      return [
        { id: "general_medicine", code: "general_medicine", name: "Nội tổng quát", icon: "🩺" },
        { id: "obstetrics", code: "obstetrics", name: "Sản phụ khoa", icon: "�" },
        { id: "pediatrics", code: "pediatrics", name: "Nhi khoa", icon: "👶" },
      ];
    }
  }

  // =============== TIME SLOTS API ===============
  async getTimeSlots(params) {
    try {
      const response = await api.get('/time-slots', { params });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      throw new Error(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Không thể tải lịch khám'
      );
    }
  }

  // Hold a slot (with better error handling)
  async holdSlot(slotId) {
    try {
      console.log('🔒 [holdSlot] Attempting to hold slot:', slotId);
      const response = await api.post('/time-slots/hold', { slot_id: slotId });
      const result = response.data?.data ?? response.data;
      console.log('✅ [holdSlot] Success:', result);
      return result;
    } catch (error) {
      console.error('❌ [holdSlot] Failed:', error.response?.data || error.message);
      
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      // Better error messages based on status code
      if (status === 409 || status === 410) {
        throw new Error('Slot này đã được đặt bởi người khác');
      } else if (status === 404) {
        throw new Error('Không tìm thấy slot');
      } else if (status === 400) {
        throw new Error(errorData?.message || 'Yêu cầu không hợp lệ');
      } else if (status === 503) {
        throw new Error('Dịch vụ đang bận. Vui lòng thử lại sau.');
      }
      
      throw new Error(
        errorData?.message || 
        'Không thể giữ slot. Vui lòng thử lại.'
      );
    }
  }

  async releaseHold(slotId) {
    try {
      const response = await api.post('/time-slots/release', { slot_id: slotId });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to release slot:', error);
      // Don't throw error, just log it
      return null;
    }
  }

  /**
   * ✅ Batch Check Availability - Single Unified Version
   * 
   * ==================================================
   * BACKEND API REQUIREMENTS:
   * ==================================================
   * 
   * Endpoint: POST /api/time-slots/batch-availability
   * 
   * Request Body:
   * {
   *   "doctor_id": "507f1f77bcf86cd799439011",
   *   "dates": ["2025-01-15", "2025-01-16", "2025-01-17", ...]
   * }
   * 
   * Response Format:
   * {
   *   "data": {
   *     "2025-01-15": 5,   // 5 available slots
   *     "2025-01-16": 3,   // 3 available slots
   *     "2025-01-17": 0    // no available slots
   *   }
   * }
   * 
   * ==================================================
   * BACKEND LOGIC:
   * ==================================================
   * 
   * 1. Query time_slots collection:
   *    - WHERE doctor_id = :doctor_id
   *    - AND date IN (:dates)
   *    - AND status = 'AVAILABLE'
   * 
   * 2. Exclude HOLD slots that haven't expired:
   *    - If status = 'HOLD' AND hold_until > NOW() → exclude
   *    - These are temporarily reserved
   * 
   * 3. Group by date and count:
   *    - Aggregate: { $group: { _id: "$date", count: { $sum: 1 } } }
   * 
   * 4. Return format:
   *    - Transform to object: { "YYYY-MM-DD": count }
   *    - Dates with 0 slots should return 0, not be omitted
   * 
   * ==================================================
   * EXAMPLE BACKEND IMPLEMENTATION (Python + MongoDB):
   * ==================================================
   * 
   * from datetime import datetime
   * from typing import Dict, List
   * 
   * async def batch_availability(doctor_id: str, dates: List[str]) -> Dict[str, int]:
   *     pipeline = [
   *         {
   *             "$match": {
   *                 "doctor_id": ObjectId(doctor_id),
   *                 "date": {"$in": dates},
   *                 "$or": [
   *                     {"status": "AVAILABLE"},
   *                     {
   *                         "status": "HOLD",
   *                         "hold_until": {"$lte": datetime.utcnow()}
   *                     }
   *                 ]
   *             }
   *         },
   *         {
   *             "$group": {
   *                 "_id": "$date",
   *                 "count": {"$sum": 1}
   *             }
   *         }
   *     ]
   *     
   *     results = await db.time_slots.aggregate(pipeline).to_list()
   *     
   *     # Initialize all dates with 0
   *     availability = {date: 0 for date in dates}
   *     
   *     # Update with actual counts
   *     for result in results:
   *         availability[result["_id"]] = result["count"]
   *     
   *     return availability
   * 
   * ==================================================
   */
  async checkAvailability(doctorId, dates) {
    const monthKey = (dates?.[0]?.slice(0, 7)) || 'all';
    const cacheKey = `${doctorId}:${monthKey}`;
    const cached = availabilityCache.get(cacheKey);
    if (cached) return cached;

    // ✅ ENSURE dates is an array
    if (!Array.isArray(dates)) {
      console.error('❌ dates must be an array, got:', typeof dates, dates);
      return {};
    }

    console.log('🔍 checkAvailability called:', { 
      doctorId, 
      dates,
      datesType: typeof dates,
      isArray: Array.isArray(dates) 
    });

    try {
      const payload = { 
        doctor_id: doctorId, 
        dates: dates  // ✅ Already array
      };
      
      console.log('📤 Sending POST request:', payload);
      
      const res = await api.post('/time-slots/batch-availability', payload);
      
      console.log('✅ POST response:', res.data);
      
      const data = res.data?.data ?? res.data ?? {};
      const normalized = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
      
      console.log('✅ Normalized availability:', normalized);
      
      availabilityCache.set(cacheKey, normalized);
      return normalized;
      
    } catch (error) {
      console.error('❌ POST failed:', error.message);
      console.error('   Response:', error.response?.data);
      
      // Fallback: Loop từng ngày
      try {
        console.log('⚠️ Using fallback method...');
        const results = await Promise.all(dates.map(async (date) => {
          const slots = await this.getTimeSlots({ 
            doctor_id: doctorId, 
            date, 
            status: 'AVAILABLE' 
          });
          const count = Array.isArray(slots) ? slots.length : 0;
          console.log(`   ${date}: ${count} slots`);
          return { date, count };
        }));
        
        const availability = {};
        results.forEach(({ date, count }) => (availability[date] = count));
        
        console.log('✅ Fallback result:', availability);
        availabilityCache.set(cacheKey, availability);
        return availability;
        
      } catch (e) {
        console.error('❌ Fallback also failed:', e);
        return {};
      }
    }
  }

  // =============== APPOINTMENTS API ===============
  async completeBooking(bookingData) {
    try {
      console.log('📤 [completeBooking] Sending request...');
      console.log('   - Data:', bookingData);
      
      const response = await api.post('/appointments/complete-booking', bookingData);
      
      console.log('✅ [completeBooking] Success:', response.data);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('❌ [completeBooking] Failed:', error);
      console.error('   - Status:', error.response?.status);
      console.error('   - Response data:', error.response?.data);
      console.error('   - Headers:', error.response?.headers);
      
      // Extract error message
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.message || 
                       'Đặt lịch thất bại';
      
      console.error('   - Error message:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Alias for completeBooking
  async bookAppointment(bookingData) {
    return this.completeBooking(bookingData);
  }

  async getPatientAppointments(params = {}) {
    try {
      const response = await api.get('/appointments/patient', { params });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách lịch khám');
    }
  }

  async getAppointmentDetails(appointmentId) {
    try {
      const response = await api.get(`/appointments/${appointmentId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to fetch appointment details:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải chi tiết lịch khám');
    }
  }

  async cancelAppointment(appointmentId, reason) {
    try {
      const response = await api.post(`/appointments/${appointmentId}/cancel`, { reason });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      throw new Error(error.response?.data?.message || 'Không thể hủy lịch khám');
    }
  }

  async rescheduleAppointment(appointmentId, newSlotData) {
    try {
      // Use dedicated reschedule endpoint
      const response = await api.post(`/appointments/${appointmentId}/reschedule`, newSlotData);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      throw new Error(error.response?.data?.message || 'Không thể đổi lịch khám');
    }
  }

  // =============== HELPERS ===============
  formatDate(dateStr) {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const date = isNaN(y) ? new Date(dateStr) : new Date(y, (m || 1) - 1, d || 1); // local
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(timeStr) {
    return timeStr; // Already in HH:MM format
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  }
}

const appointmentServices = new AppointmentServices();
export default appointmentServices;