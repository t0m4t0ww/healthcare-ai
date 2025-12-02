import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Check, AlertCircle, UserX, RefreshCw, Calendar, ChevronDown, ChevronUp,
  GraduationCap, Globe, Briefcase, Users, Award, BookOpen, MessageCircle, Clock, Languages
} from 'lucide-react';
import { message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getPatient } from '../../../services/services';
import appointmentServices from '../../../services/appointmentServices';
import doctorServices from '../../../services/doctorServices';

// Components
import { DoctorCard } from './components/DoctorCard';
import { DoctorFilters } from './components/DoctorFilters';
import { DateTimeSelector } from './components/DateTimeSelector';
import { BookingSummary } from './components/BookingSummary';
import { SuccessModal } from './components/SuccessModal';

// Hooks
import { useDoctorFilters } from './hooks/useDoctorFilters';
import { useSlotHold } from './hooks/useSlotHold';

// Utils
import { BOOKING_STEPS } from './utils/constants';
import { SPECIALTIES } from '../../../constants/specialties';
import { useRef } from 'react';

const PublicBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // ✅ Track if reschedule mode has been initialized
  const rescheduleInitializedRef = useRef(false);
  
  // 🔍 DEBUG - Log URL params immediately
  console.log('🌐 PublicBooking mounted. URL params:', {
    reschedule: searchParams.get('reschedule'),
    doctorId: searchParams.get('doctorId'),
    all: Object.fromEntries(searchParams.entries())
  });
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // 🔍 DEBUG - Watch step changes
  useEffect(() => {
    console.log('📊 Step changed to:', currentStep);
  }, [currentStep]);
  
  // Data states
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [reason, setReason] = useState('');
  
  // ✅ Chief Complaint states (Step 3 - Triệu chứng chi tiết) - Simplified
  const [chiefComplaint, setChiefComplaint] = useState({
    onset_date: '',
    main_symptom: '',
    associated_symptoms: '',
    pain_scale: 0
  });
  
  // ✅ Profile completion check
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [patientFullData, setPatientFullData] = useState(null); // Store full patient data
  const [missingFields, setMissingFields] = useState([]); // Store missing field names
  const [filledFieldsCount, setFilledFieldsCount] = useState(0); // Count filled fields
  
  // Booking states
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  
  // ✅ Reschedule states
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState(null);
  const [oldAppointmentData, setOldAppointmentData] = useState(null);
  
  // UI states
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Hooks
  const { heldSlot, timeRemaining, isHolding, holdSlot, releaseHold } = useSlotHold();
  
  const {
    searchQuery,
    setSearchQuery,
    specialtyFilter,
    setSpecialtyFilter,
    genderFilter,
    setGenderFilter,
    ratingFilter,
    setRatingFilter,
    filteredDoctors,
    resetFilters,
    hasActiveFilters
  } = useDoctorFilters(doctors);

  // Browser back/close warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (timeRemaining > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timeRemaining]);

  // Reset bio expanded state when doctor changes
  useEffect(() => {
    setIsBioExpanded(false);
  }, [selectedDoctor]);

  // Load doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const data = await doctorServices.getDoctors();
        console.log('👨‍⚕️ Doctors loaded:', data.length, 'doctors');
        setDoctors(data || []);
      } catch (error) {
        console.error('Error loading doctors:', error);
        message.error('Không thể tải danh sách bác sĩ');
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      console.log('🩺 [PublicBooking] Selected doctor context', {
        id: selectedDoctor._id || selectedDoctor.id,
        name: selectedDoctor.name,
        specificSchedule: selectedDoctor.specific_schedule || {},
        shift: selectedDoctor.shift || selectedDoctor.working_hours || {}
      });
    }
  }, [selectedDoctor]);
  
  // ✅ Handle reschedule mode - Combined effect for better timing
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule');
    const doctorIdParam = searchParams.get('doctorId');
    
    console.log('🔍 [Reschedule Effect] Running with:', {
      hasRescheduleId: !!rescheduleId,
      hasDoctorId: !!doctorIdParam,
      doctorsLoaded: doctors.length,
      hasSelectedDoctor: !!selectedDoctor,
      currentStep,
      isRescheduleMode,
      initialized: rescheduleInitializedRef.current
    });
    
    // Only proceed if we have reschedule params and doctors are loaded
    // AND if we haven't initialized yet
    if (rescheduleId && doctorIdParam && doctors.length > 0 && !rescheduleInitializedRef.current) {
      console.log('🔄 Reschedule mode detected:', { rescheduleId, doctorIdParam });
      
      // Mark as initialized
      rescheduleInitializedRef.current = true;
      
      // Set reschedule mode first
      setIsRescheduleMode(true);
      setRescheduleAppointmentId(rescheduleId);
      
      // Find and select doctor
      const doctor = doctors.find(d => (d._id || d.id) === doctorIdParam);
      
      if (doctor) {
        console.log('✅ Doctor found, selecting and going to step 2:', doctor.name);
        setSelectedDoctor(doctor);
        
        // Use setTimeout to ensure state is updated before changing step
        setTimeout(() => {
          setCurrentStep(2);
          console.log('✅ Step changed to 2');
        }, 100);
        
        // Load old appointment data
        const loadOldAppointment = async () => {
          try {
            const appointment = await appointmentServices.getAppointmentDetails(rescheduleId);
            console.log('✅ Old appointment loaded:', appointment);
            setOldAppointmentData(appointment);
            
            // Pre-fill reason and chief complaint from old appointment
            if (appointment.reason) {
              setReason(appointment.reason);
            }
            if (appointment.chief_complaint) {
              setChiefComplaint({
                onset_date: appointment.chief_complaint.onset_date || '',
                main_symptom: appointment.chief_complaint.main_symptom || '',
                associated_symptoms: appointment.chief_complaint.associated_symptoms || '',
                pain_scale: appointment.chief_complaint.pain_scale || 0
              });
            }
            
            message.info({
              content: '🔄 Bạn đang đổi lịch khám. Vui lòng chọn thời gian mới.',
              duration: 4
            });
          } catch (error) {
            console.error('❌ Error loading old appointment:', error);
            message.error('Không thể tải thông tin lịch khám cũ');
          }
        };
        
        loadOldAppointment();
      } else {
        console.error('❌ Doctor not found with ID:', doctorIdParam);
        console.log('Available doctors:', doctors.map(d => ({ id: d._id || d.id, name: d.name })));
        message.warning('Không tìm thấy bác sĩ. Vui lòng chọn bác sĩ khác.');
        setIsRescheduleMode(false);
        setRescheduleAppointmentId(null);
        rescheduleInitializedRef.current = false;
      }
    }
  }, [searchParams, doctors, selectedDoctor, isRescheduleMode]);

  // Load patient info - ✅ ALWAYS fetch latest from backend + Check profile completion
  useEffect(() => {
    const loadPatientInfo = async () => {
      try {
        // Get patient info from /me endpoint (includes email from user account)
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          console.log('No token found');
          setCheckingProfile(false);
          return;
        }

        const response = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }

        const result = await response.json();
        console.log('🔍 [PublicBooking] Raw API response from /me:', result); // Debug
        
        // Extract data from response wrapper
        const data = result.data || result;
        console.log('🔍 [PublicBooking] Extracted patient data:', {
          name: data.name,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
          patient_id: data.patient_id
        }); // Debug
        
        // ✅ Check if profile is complete (need patient_id to fetch full profile)
        if (data.patient_id) {
          try {
            const patientResponse = await fetch(`http://localhost:8000/api/patients/${data.patient_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (patientResponse.ok) {
              const patientResult = await patientResponse.json();
              const patientData = patientResult.data || patientResult;
              
              console.log('🔍 [PublicBooking] Full patient data:', patientData);
              
              // ✅ Store full patient data for warning banner
              setPatientFullData(patientData);
              
              // ✅ Check ALL required fields - đồng bộ với PatientProfile.js (21 fields total)
              const requiredFieldsConfig = [
                // Thông tin cơ bản (5 fields)
                { key: 'full_name', value: patientData.full_name, label: 'Họ và tên' },
                { key: 'phone', value: patientData.phone, label: 'Số điện thoại' },
                { key: 'date_of_birth', value: patientData.date_of_birth || patientData.dob, label: 'Ngày sinh' },
                { key: 'gender', value: patientData.gender, label: 'Giới tính' },
                { key: 'address', value: patientData.address, label: 'Địa chỉ' },
                
                // Thông tin y tế (6 fields)
                { key: 'blood_type', value: patientData.blood_type, label: 'Nhóm máu' },
                { key: 'height', value: patientData.height, label: 'Chiều cao' },
                { key: 'weight', value: patientData.weight, label: 'Cân nặng' },
                { key: 'medical_history', value: patientData.medical_history, label: 'Tiền sử bệnh' },
                { key: 'allergies', value: patientData.allergies_medications || patientData.allergies_food || patientData.allergies_environment, label: 'Thông tin dị ứng' },
                { key: 'current_medications', value: patientData.current_medications, label: 'Thuốc đang dùng' },
                
                // Tiền sử (4 fields)
                { key: 'chronic_conditions', value: patientData.chronic_conditions, label: 'Bệnh mãn tính' },
                { key: 'past_surgeries', value: patientData.past_surgeries, label: 'Phẫu thuật đã qua' },
                { key: 'vaccination_history', value: patientData.vaccination_history, label: 'Lịch sử tiêm chủng' },
                { key: 'family_history', value: patientData.family_history, label: 'Tiền sử gia đình' },
                
                // Thói quen sống (3 fields)
                { key: 'smoking_status', value: patientData.smoking_status, label: 'Tình trạng hút thuốc' },
                { key: 'alcohol_consumption', value: patientData.alcohol_consumption, label: 'Sử dụng rượu' },
                { key: 'exercise_frequency', value: patientData.exercise_frequency, label: 'Tần suất tập thể dục' },
                
                // Liên hệ khẩn cấp (2 fields)
                { key: 'emergency_contact_name', value: patientData.emergency_contact?.name, label: 'Tên người liên hệ khẩn cấp' },
                { key: 'emergency_contact_phone', value: patientData.emergency_contact?.phone, label: 'SĐT liên hệ khẩn cấp' },
                
                // Bảo hiểm (1 field)
                { key: 'insurance_number', value: patientData.insurance_number || patientData.insurance_bhyt, label: 'Số thẻ bảo hiểm' }
              ];
              
              // Calculate filled and missing fields
              const missing = [];
              let filled = 0;
              
              requiredFieldsConfig.forEach(field => {
                const hasValue = field.value && String(field.value).trim() !== "";
                if (hasValue) {
                  filled++;
                } else {
                  missing.push({
                    key: field.key,
                    label: field.label
                  });
                }
              });
              
              const isComplete = filled >= 21; // Need ALL 21 required fields
              
              console.log('🔍 [PublicBooking] Profile completion check:', {
                filledCount: filled,
                totalRequired: 21,
                isComplete,
                missingFields: missing.map(f => f.label)
              });
              
              setFilledFieldsCount(filled);
              setMissingFields(missing);
              setIsProfileComplete(isComplete);
              
              // ✅ Show warning banner (NO auto-redirect, user must click button)
              if (!isComplete) {
                message.warning({
                  content: `⚠️ Hồ sơ y tế chưa đầy đủ (${filled}/21 trường). Vui lòng hoàn thiện trước khi đặt lịch!`,
                  duration: 4
                });
                // ❌ DON'T auto-redirect, just show warning banner
              }
            }
          } catch (patientError) {
            console.error('❌ [PublicBooking] Error fetching patient details:', patientError);
          }
        }
        
        // ✅ Map API response to patient info with better fallback
        setPatientInfo({
          name: data.name || data.full_name || 'Chưa cập nhật',
          email: data.email || 'Chưa cập nhật',
          phone: data.phone || 'Chưa cập nhật'
        });
        
        console.log('✅ [PublicBooking] Patient info set:', {
          name: data.name || data.full_name || 'Chưa cập nhật',
          phone: data.phone || 'Chưa cập nhật'
        });
      } catch (error) {
        console.error('❌ [PublicBooking] Error loading patient info:', error);
        // Set fallback values on error
        setPatientInfo({
          name: 'Không thể tải',
          email: 'Không thể tải',
          phone: 'Không thể tải'
        });
      } finally {
        setCheckingProfile(false);
      }
    };

    loadPatientInfo();
  }, []); // ✅ Run once on mount, but /me endpoint will fetch latest data from DB

  // ✅ Restore pending booking after login (but NOT in reschedule mode)
  useEffect(() => {
    // Skip if we're in reschedule mode
    const rescheduleId = searchParams.get('reschedule');
    if (rescheduleId) {
      console.log('ℹ️ Skipping pending booking restore - in reschedule mode');
      return;
    }
    
    const pendingBookingStr = sessionStorage.getItem('pendingBooking');
    if (pendingBookingStr && doctors.length > 0) {
      try {
        const pendingBooking = JSON.parse(pendingBookingStr);
        console.log('🔄 Restoring pending booking:', pendingBooking);
        // Find the doctor
        const doctor = doctors.find(d => (d._id || d.id) === pendingBooking.doctor_id);
        if (doctor) {
          setSelectedDoctor(doctor);
          setSelectedDate(pendingBooking.appointment_date);
          setReason(pendingBooking.reason);
          setChiefComplaint(pendingBooking.chief_complaint);
          // Note: slot needs to be re-fetched, but we can navigate to step 2
          setCurrentStep(2);
          message.info('Đã khôi phục thông tin đặt lịch. Vui lòng chọn lại giờ khám.');
        }
        sessionStorage.removeItem('pendingBooking');
      } catch (error) {
        console.error('Failed to restore pending booking:', error);
        sessionStorage.removeItem('pendingBooking');
      }
    }
  }, [doctors, searchParams]);

  // Handlers
  const handleDoctorSelect = (doctor) => {
    // ✅ Check profile completion before allowing selection
    if (!isProfileComplete) {
      message.warning({
        content: 'Vui lòng hoàn thiện hồ sơ trước khi đặt lịch khám',
        duration: 3
      });
      return;
    }
    
    setSelectedDoctor(doctor);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSlotSelect = (slotData) => {
    console.log('🎯 [PublicBooking] handleSlotSelect called with:', slotData);
    console.log('🎯 [PublicBooking] Current step before change:', currentStep);
    setSelectedSlot(slotData.slot);
    setSelectedDate(slotData.date);
    setCurrentStep(3);
    console.log('🎯 [PublicBooking] Set step to 3');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    // Show warning if holding slot
    if (timeRemaining > 0 && currentStep === 3) {
      setShowLeaveWarning(true);
      return;
    }
    
    if (currentStep === 2) {
      setSelectedDoctor(null);
      setSelectedSlot(null);
      releaseHold();
    } else if (currentStep === 3) {
      setSelectedSlot(null);
      releaseHold();
    }
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmLeave = () => {
    setShowLeaveWarning(false);
    releaseHold();
    setSelectedSlot(null);
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    if (!reason.trim()) {
      message.warning('Vui lòng nhập lý do khám');
      return;
    }

    if (timeRemaining <= 0) {
      message.error('Hết thời gian giữ chỗ. Vui lòng chọn slot khác');
      setCurrentStep(2);
      return;
    }

    // ✅ Check if user is logged in
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      message.error('Vui lòng đăng nhập để đặt lịch khám');
      // Save booking data to resume after login
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        doctor_id: selectedDoctor._id || selectedDoctor.id,
        appointment_date: selectedDate,
        slot_id: selectedSlot._id,
        reason: reason.trim(),
        chief_complaint: chiefComplaint
      }));
      navigate('/login', { state: { returnUrl: '/public-booking' } });
      return;
    }

    setIsConfirming(true);

    // ✅ Email xác nhận sẽ được gửi khi bác sĩ xác nhận lịch (không gửi ở đây)

    try {
      const bookingData = {
        doctor_id: selectedDoctor._id || selectedDoctor.id,
        appointment_date: selectedDate,
        slot_id: selectedSlot._id,
        reason: reason.trim(),
        // ✅ Add chief_complaint object (simplified - chỉ 4 trường)
        chief_complaint: {
          onset_date: chiefComplaint.onset_date || null,
          main_symptom: chiefComplaint.main_symptom?.trim() || null,
          associated_symptoms: chiefComplaint.associated_symptoms?.trim() || null,
          pain_scale: chiefComplaint.pain_scale || 0
        },
        appointment_type: 'offline'
      };

      let result;
      
      // ✅ Check if reschedule mode
      if (isRescheduleMode && rescheduleAppointmentId) {
        console.log('📤 Rescheduling appointment...');
        console.log('📦 Old appointment ID:', rescheduleAppointmentId);
        console.log('📦 New booking data:', bookingData);
        console.log('🔐 Token:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
        
        result = await appointmentServices.rescheduleAppointment(rescheduleAppointmentId, bookingData);
        
        console.log('✅ Reschedule successful:', result);
        // ✅ Don't show message here, let modal handle it
      } else {
        console.log('📤 Booking appointment...');
        console.log('📦 Data:', bookingData);
        console.log('🔐 Token:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');

        result = await appointmentServices.bookAppointment(bookingData);
        
        console.log('✅ Booking successful:', result);
        // ✅ Don't show message here, let modal handle it
      }
      
      // Enrich result with date and slot info for display
      // ✅ Handle reschedule response structure: result.new_appointment (service already unwraps response.data)
      console.log('📋 [handleConfirmBooking] Full result object:', result);
      console.log('📋 [handleConfirmBooking] result.data:', result?.data);
      console.log('📋 [handleConfirmBooking] isRescheduleMode:', isRescheduleMode);
      
      let appointmentData;
      // ✅ FIX: Service returns result = {message, new_appointment, old_appointment_id}
      // So we need to check result.new_appointment, not result.data.new_appointment
      if (isRescheduleMode) {
        // ✅ Priority 1: Check result.new_appointment (service already unwraps response.data)
        if (result?.new_appointment) {
          appointmentData = result.new_appointment;
          console.log('📋 [handleConfirmBooking] Reschedule - Using result.new_appointment');
        } 
        // ✅ Priority 2: Check result.data.new_appointment (fallback if service didn't unwrap)
        else if (result?.data?.new_appointment) {
          appointmentData = result.data.new_appointment;
          console.log('📋 [handleConfirmBooking] Reschedule - Using result.data.new_appointment (fallback)');
        } 
        // ✅ Priority 3: If structure is different, try to find new_appointment anywhere
        else {
          console.warn('⚠️ [handleConfirmBooking] Reschedule - new_appointment not found in expected location');
          appointmentData = result?.data || result;
        }
        console.log('📋 [handleConfirmBooking] Reschedule - new_appointment:', appointmentData);
        console.log('📋 [handleConfirmBooking] Reschedule - new_appointment keys:', Object.keys(appointmentData || {}));
      } else {
        appointmentData = result?.data || result;
        console.log('📋 [handleConfirmBooking] Booking - Using result.data or result');
        console.log('📋 [handleConfirmBooking] Booking - appointmentData:', appointmentData);
        console.log('📋 [handleConfirmBooking] Booking - appointmentData keys:', Object.keys(appointmentData || {}));
      }
      
      // ✅ Extract appointment_id from various possible fields
      // ✅ Check multiple possible locations in the response
      let appointmentId = null;
      
      // First, check direct fields in appointmentData
      if (appointmentData?.appointment_id) {
        appointmentId = appointmentData.appointment_id;
        console.log('📋 [handleConfirmBooking] Found appointment_id in appointmentData.appointment_id');
      } else if (appointmentData?._id) {
        appointmentId = appointmentData._id;
        console.log('📋 [handleConfirmBooking] Found appointment_id in appointmentData._id');
      } else if (appointmentData?.id) {
        appointmentId = appointmentData.id;
        console.log('📋 [handleConfirmBooking] Found appointment_id in appointmentData.id');
      }
      
      // If still not found, check nested data
      if (!appointmentId && appointmentData?.data) {
        appointmentId = appointmentData.data.appointment_id 
          || appointmentData.data._id 
          || appointmentData.data.id;
        if (appointmentId) {
          console.log('📋 [handleConfirmBooking] Found appointment_id in appointmentData.data');
        }
      }
      
      // ✅ Debug logging
      console.log('📋 [handleConfirmBooking] Raw result:', result);
      console.log('📋 [handleConfirmBooking] result.data:', result?.data);
      console.log('📋 [handleConfirmBooking] appointmentData:', appointmentData);
      console.log('📋 [handleConfirmBooking] appointmentData keys:', Object.keys(appointmentData || {}));
      console.log('📋 [handleConfirmBooking] Extracted appointment_id:', appointmentId);
      
      // ✅ Validate appointmentData exists - but don't throw, create fallback instead
      if (!appointmentData) {
        console.error('❌ [handleConfirmBooking] appointmentData is null or undefined!');
        console.error('❌ [handleConfirmBooking] Full result:', result);
        // ✅ Create minimal appointmentData from available info instead of throwing
        appointmentData = {
          appointment_date: selectedDate,
          start_time: selectedSlot?.start_time,
          end_time: selectedSlot?.end_time,
          doctor_id: selectedDoctor?._id || selectedDoctor?.id,
          reason: reason.trim()
        };
        console.warn('⚠️ [handleConfirmBooking] Using fallback appointmentData:', appointmentData);
      }
      
      // ✅ If still no ID, log warning but continue (we'll use fallback)
      if (!appointmentId) {
        console.warn('⚠️ [handleConfirmBooking] No appointment_id found! Full appointmentData:', JSON.stringify(appointmentData, null, 2));
      }
      
      const enrichedAppointment = {
        ...appointmentData,
        appointment_date: selectedDate || appointmentData?.date || appointmentData?.appointment_date,
        start_time: selectedSlot?.start_time || appointmentData?.start_time || appointmentData?.slot_info?.start_time,
        end_time: selectedSlot?.end_time || appointmentData?.end_time || appointmentData?.slot_info?.end_time,
        // ✅ Always set all three ID fields for maximum compatibility
        appointment_id: appointmentId || appointmentData?.appointment_id || appointmentData?._id || appointmentData?.id || 'N/A',
        _id: appointmentId || appointmentData?._id || appointmentData?.appointment_id || appointmentData?.id || 'N/A',
        id: appointmentId || appointmentData?.id || appointmentData?._id || appointmentData?.appointment_id || 'N/A'
      };
      
      console.log('📋 [handleConfirmBooking] Enriched appointment:', enrichedAppointment);
      console.log('📋 [handleConfirmBooking] Selected doctor:', selectedDoctor);
      console.log('📋 [handleConfirmBooking] showSuccessModal before set:', showSuccessModal);
      
      // ✅ ALWAYS show success modal if we reach here (no errors thrown)
      // ✅ Reset confirming state first
      setIsConfirming(false);
      releaseHold();
      
      // ✅ Show success message immediately
      message.success(
        isRescheduleMode 
          ? '✅ Đổi lịch khám thành công!' 
          : '✅ Đặt lịch khám thành công!',
        3
      );
      
      // ✅ Set appointment data and show modal - ensure both are set together
      setCreatedAppointment(enrichedAppointment);
      setShowSuccessModal(true);
      
      // ✅ Force a re-render to ensure modal shows (use setTimeout to break React batching)
      setTimeout(() => {
        // Force modal to show again to ensure it renders (React state batching workaround)
        setShowSuccessModal(true);
        console.log('✅ [handleConfirmBooking] Modal state forced to true (React batching workaround)');
      }, 50);
      
      console.log('✅ [handleConfirmBooking] showSuccessModal set to true');
      console.log('✅ [handleConfirmBooking] createdAppointment set:', enrichedAppointment);
      console.log('✅ [handleConfirmBooking] Success modal should be visible now');

      // Don't reset immediately - wait for modal to close

    } catch (error) {
      console.error('❌ Booking/Reschedule error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      
      if (error.response?.status === 409) {
        message.error('Slot đã được đặt bởi người khác. Vui lòng chọn slot khác');
        setCurrentStep(2);
      } else if (error.response?.status === 410) {
        message.error('Slot đã hết thời gian giữ. Vui lòng chọn lại');
        setCurrentStep(2);
      } else {
        const errorMsg = isRescheduleMode 
          ? (error.response?.data?.error || 'Có lỗi xảy ra khi đổi lịch khám')
          : (error.response?.data?.error || 'Có lỗi xảy ra khi đặt khám');
        message.error(errorMsg);
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedAppointment(null);
    
    // ✅ If reschedule mode, redirect to appointments page
    if (isRescheduleMode) {
      navigate('/patient/appointments?justBooked=true');
      return;
    }
    
    // Reset form after modal closes
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setReason('');
    // ✅ Reset chief complaint (simplified)
    setChiefComplaint({
      onset_date: '',
      main_symptom: '',
      associated_symptoms: '',
      pain_scale: 0
    });
    setCurrentStep(1);
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-md mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 -z-10" />
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (BOOKING_STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="absolute top-5 left-0 h-1 bg-emerald-500 -z-10"
        />

        {BOOKING_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  backgroundColor: isCompleted || isActive ? '#10b981' : '#e2e8f0'
                }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2 border-2
                  ${isCompleted || isActive ? 'text-white border-emerald-400' : 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'}
                `}
              >
                {isCompleted ? <Check size={20} /> : stepNumber}
              </motion.div>
              <p className={`text-sm font-semibold text-center ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Simple Subtle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-emerald-100/50 dark:bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-teal-100/50 dark:bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center mb-12 rounded-2xl p-8 shadow-lg relative overflow-hidden ${
            isRescheduleMode 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          }`}
        >
          {/* Animated background circles */}
          {isRescheduleMode && (
            <>
              <motion.div
                className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
            </>
          )}
          
          <div className="relative z-10">
            {/* Animated icon */}
            <motion.div 
              className="inline-flex items-center justify-center mb-4"
              animate={isRescheduleMode ? {
                rotate: [0, 360],
              } : {}}
              transition={{
                duration: 2,
                repeat: isRescheduleMode ? Infinity : 0,
                ease: "linear"
              }}
            >
              {isRescheduleMode ? (
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-8 h-8 text-white" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
              )}
            </motion.div>
            
            <h1 className="text-4xl font-bold text-white mb-4">
              {isRescheduleMode ? 'Đổi lịch khám' : 'Đặt lịch khám'}
            </h1>
            <p className="text-lg text-white/90">
              {isRescheduleMode 
                ? 'Chọn thời gian mới cho lịch hẹn của bạn' 
                : 'Chọn bác sĩ, thời gian và xác nhận lịch hẹn của bạn'}
            </p>
          </div>
        </motion.div>
        
        {/* ✅ Reschedule Mode Info */}
        {isRescheduleMode && oldAppointmentData && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 shadow-xl mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <AlertCircle size={28} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Thông tin lịch cũ
                </h3>
                <div className="bg-white/70 rounded-xl p-4 space-y-2">
                  <p className="text-slate-700">
                    <span className="font-semibold">Bác sĩ:</span>{' '}
                    {oldAppointmentData.doctor_info?.name || oldAppointmentData.doctor_name || 'N/A'}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Ngày khám cũ:</span>{' '}
                    {oldAppointmentData.date ? new Date(oldAppointmentData.date).toLocaleDateString('vi-VN') : 'N/A'}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Giờ khám cũ:</span>{' '}
                    {oldAppointmentData.start_time || 'N/A'}
                  </p>
                </div>
                <p className="text-amber-700 mt-3 text-sm">
                  ⚠️ Lịch cũ sẽ được hủy và thay thế bằng lịch mới
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ✅ Login Required Warning */}
        {!localStorage.getItem('token') && !sessionStorage.getItem('token') && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-3xl p-8 shadow-xl mb-8"
          >
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <AlertCircle size={32} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  🔐 Yêu cầu đăng nhập
                </h3>
                <p className="text-slate-700 text-lg mb-4 leading-relaxed">
                  Bạn cần <strong className="text-blue-600">đăng nhập</strong> để đặt lịch khám. 
                  Nếu chưa có tài khoản, vui lòng đăng ký trước.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/login', { state: { returnUrl: '/public-booking' } })}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    Đăng nhập ngay
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200"
                  >
                    Đăng ký tài khoản
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ✅ Profile Incomplete Warning */}
        {checkingProfile ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-600 dark:text-slate-400">Đang kiểm tra hồ sơ...</span>
            </div>
          </div>
        ) : !isProfileComplete ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-8 shadow-md mb-8"
          >
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-amber-500 dark:bg-amber-600 rounded-2xl flex items-center justify-center">
                  <UserX size={32} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  ⚠️ Hồ sơ y tế chưa đầy đủ
                </h3>
                <p className="text-slate-700 dark:text-slate-300 text-lg mb-4 leading-relaxed">
                  Bạn đã điền <strong className="text-emerald-600 dark:text-emerald-400">{filledFieldsCount}/12 trường bắt buộc</strong>. 
                  Vui lòng hoàn thiện <strong className="text-rose-600 dark:text-rose-400">{missingFields.length} trường còn thiếu</strong> trong Hồ sơ bệnh án điện tử (EHR) trước khi đặt lịch khám.
                </p>
                
                {/* ✅ Display REAL missing fields from API */}
                {missingFields.length > 0 && (
                  <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl p-4 mb-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className="text-rose-500 dark:text-rose-400" />
                      Còn thiếu {missingFields.length} trường thông tin:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {missingFields.map((field) => (
                        <div 
                          key={field.key}
                          className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-lg text-sm"
                        >
                          <span className="text-rose-500 dark:text-rose-400">❌</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => navigate('/patient/profile')}
                  className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all duration-300"
                >
                  🏥 Hoàn thiện hồ sơ EHR ngay ({missingFields.length} trường)
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* ✅ Only show booking content if profile is complete */}
        {!checkingProfile && isProfileComplete && (
          <>
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Back Button */}
            {currentStep > 1 && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold shadow-md mb-6 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft size={20} />
                <span>Quay lại</span>
              </motion.button>
            )}

            {/* Step Content */}
            <AnimatePresence mode="wait">
          {/* Step 1: Select Doctor */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              style={{ pointerEvents: isProfileComplete ? 'auto' : 'none', opacity: isProfileComplete ? 1 : 0.5 }}
            >
              <DoctorFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                specialtyFilter={specialtyFilter}
                setSpecialtyFilter={setSpecialtyFilter}
                genderFilter={genderFilter}
                setGenderFilter={setGenderFilter}
                ratingFilter={ratingFilter}
                setRatingFilter={setRatingFilter}
                hasActiveFilters={hasActiveFilters}
                resetFilters={resetFilters}
                totalDoctors={doctors.length}
                filteredCount={filteredDoctors.length}
                doctors={doctors}
              />

              {/* Doctors Grid */}
              <div className="mt-8">
                {loadingDoctors ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl text-slate-500">Không tìm thấy bác sĩ phù hợp</p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDoctors.map((doctor) => (
                      <DoctorCard
                        key={doctor._id || doctor.id}
                        doctor={doctor}
                        onSelect={handleDoctorSelect}
                        selected={selectedDoctor?._id === doctor._id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Date & Time */}
          {currentStep === 2 && selectedDoctor && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              {/* Selected Doctor Summary with Biography */}
              <div className="space-y-4">
                {/* Basic Info Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg flex-shrink-0">
                      {selectedDoctor.avatar_url ? (
                        <img 
                          src={selectedDoctor.avatar_url} 
                          alt={selectedDoctor.name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        selectedDoctor.name?.charAt(0) || 'BS'
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">{selectedDoctor.name}</h3>
                      <p className="text-emerald-600 font-semibold mb-2 text-lg">
                        {SPECIALTIES[selectedDoctor.specialty]?.name || 
                         SPECIALTIES[selectedDoctor.doctor_profile?.specialization]?.name || 
                         selectedDoctor.specialty || 
                         selectedDoctor.doctor_profile?.specialization ||
                         'Chuyên khoa'}
                      </p>
                      
                      {/* Experience & Quick Info */}
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {selectedDoctor.years_of_experience && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={16} className="text-emerald-600" />
                            <span>{selectedDoctor.years_of_experience} năm kinh nghiệm</span>
                          </span>
                        )}
                        {selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap size={16} className="text-blue-600" />
                            <span>{selectedDoctor.qualifications.join(', ')}</span>
                          </span>
                        )}
                        {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Languages size={16} className="text-purple-600" />
                            <span>{selectedDoctor.languages.join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Profile Card */}
                {selectedDoctor.bio && (() => {
                  const bio = selectedDoctor.bio;
                  const isStructured = typeof bio === 'object' && bio !== null;
                  const hasContent = isStructured 
                    ? Object.values(bio).some(val => val && val.trim())
                    : bio && bio.trim();

                  if (!hasContent) return null;

                  if (isStructured) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-lg border border-blue-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase size={20} className="text-blue-600" />
                            <span>Hồ sơ chuyên môn</span>
                          </h4>
                          <button
                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                          >
                            <span>{isBioExpanded ? 'Thu gọn' : 'Xem đầy đủ'}</span>
                            {isBioExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>

                        <div className={`space-y-3 ${isBioExpanded ? '' : 'max-h-40 overflow-hidden relative'}`}>
                          {bio.education && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <GraduationCap size={18} className="text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Quá trình đào tạo</h5>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{bio.education}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {bio.international_training && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <Globe size={18} className="text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Tu nghiệp Quốc tế</h5>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{bio.international_training}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {bio.experience && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                  <Briefcase size={18} className="text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Kinh nghiệm công tác</h5>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{bio.experience}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {bio.memberships && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <Users size={18} className="text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Hội viên chuyên ngành</h5>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{bio.memberships}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {bio.awards && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                  <Award size={18} className="text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Thành tích & Khen thưởng</h5>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{bio.awards}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {bio.publications && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                                  <BookOpen size={18} className="text-rose-600" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 text-sm mb-1">Công trình khoa học</h5>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{bio.publications}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {bio.summary && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                  <MessageCircle size={18} className="text-slate-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-slate-700 italic leading-relaxed whitespace-pre-line">{bio.summary}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Gradient overlay when collapsed */}
                          {!isBioExpanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-50 to-transparent pointer-events-none" />
                          )}
                        </div>
                      </motion.div>
                    );
                  } else {
                    // Simple text bio (legacy format)
                    return (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-lg border border-blue-200">
                        <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <span>📋</span>
                          <span>Về bác sĩ</span>
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                          {bio}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>

              <DateTimeSelector
                doctorId={selectedDoctor._id || selectedDoctor.id}
                onSlotSelected={handleSlotSelect}
                selectedSlot={selectedSlot}
                holdSlot={holdSlot}
                heldSlot={heldSlot}
                timeRemaining={timeRemaining}
                releaseHold={releaseHold}
                isHolding={isHolding}
                specificSchedule={selectedDoctor.specific_schedule || {}} 
                isPaused={selectedDoctor.accepting_new_patients === false || selectedDoctor.status === 'paused'}
              />
            </motion.div>
          )}

          {/* Step 3: Confirm Booking */}
          {currentStep === 3 && selectedDoctor && selectedSlot && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <BookingSummary
                doctor={selectedDoctor}
                date={selectedDate}
                slot={selectedSlot}
                patientInfo={patientInfo}
                reason={reason}
                setReason={setReason}
                chiefComplaint={chiefComplaint}
                setChiefComplaint={setChiefComplaint}
                timeRemaining={timeRemaining}
                onConfirm={handleConfirmBooking}
                onBack={handleBack}
                isConfirming={isConfirming}
              />
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
        {/* End of profile complete check wrapper */}
      </div>

      {/* Success Modal - always available */}
      <AnimatePresence mode="wait">
        {showSuccessModal && createdAppointment && (
          <SuccessModal
            key={`success-modal-${createdAppointment?.appointment_id || createdAppointment?._id || createdAppointment?.id || Date.now()}`}
            appointment={createdAppointment}
            doctor={selectedDoctor || createdAppointment?.doctor_info || {}}
            onClose={handleCloseSuccessModal}
            isReschedule={isRescheduleMode}
          />
        )}
      </AnimatePresence>

      {/* Leave Warning Modal */}
      <AnimatePresence>
        {showLeaveWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLeaveWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle size={24} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Bạn đang giữ chỗ!</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Bạn đang giữ slot khám. Nếu quay lại, slot sẽ bị hủy và bạn phải chọn lại. 
                Bạn có chắc muốn quay lại không?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveWarning(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors"
                >
                  Ở lại
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold transition-colors"
                >
                  Quay lại
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicBooking;
