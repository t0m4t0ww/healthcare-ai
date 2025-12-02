// src/pages/doctor/DoctorConsultation.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle, ArrowLeft, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/services';
import ehrServices from '../../services/ehrServices';
import { Modal } from 'antd';
import { toast } from 'react-toastify';

// Components
import PatientInfoSidebar from '../../components/doctor/PatientInfoSidebar';
import VitalSignsInput from '../../components/doctor/VitalSignsInput';
import ConsultationForm from '../../components/doctor/ConsultationForm';
import PrescriptionForm from '../../components/doctor/PrescriptionForm';
import AttachmentUploader from '../../components/doctor/AttachmentUploader';

const DoctorConsultation = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // ⭐ Get loading state

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [vitals, setVitals] = useState({
    blood_pressure: { systolic: '', diastolic: '' },
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    spo2: '',
    weight: '',
    height: '',
    notes: ''
  });

  const [consultationData, setConsultationData] = useState({
    chief_complaint: '',
    symptoms: [],
    diagnosis: {
      primary: '',
      secondary: '',
      icd_code: '',
      differential: ''
    },
    treatment_plan: '',
    doctor_notes: '',
    follow_up_required: false,
    follow_up_date: '',
    follow_up_notes: ''
  });

  const [prescriptions, setPrescriptions] = useState([]);
  const [attachments, setAttachments] = useState([]);

  // ⭐ Check auth and fetch data
  useEffect(() => {
    console.log('🔍 Auth state:', { user, authLoading, appointmentId });
    
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ Auth still loading...');
      return;
    }
    
    // If not loading but no user, redirect to login
    if (!authLoading && !user) {
      console.error('❌ Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Auth done and user exists, fetch data
    if (!authLoading && user) {
      console.log('✅ User authenticated:', user);
      fetchAppointmentData();
    }
  }, [authLoading, user, appointmentId]);

  const fetchAppointmentData = async () => {
    if (!user) {
      console.error('❌ Cannot fetch - user is null');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      console.log('👤 Current user:', user);
      console.log('🆔 User ID:', user.id || user.user_id);
      console.log('🏥 Appointment ID:', appointmentId);
      
      // ⭐ FIX: Lấy tất cả appointments của doctor rồi filter
      // Backend uses auth token to identify doctor
      const aptResponse = await api.get('/appointments/doctor');
      
      console.log('📋 Doctor appointments response:', aptResponse.data);
      
      // Parse response - handle different response structures
      let allApts = [];
      if (Array.isArray(aptResponse.data)) {
        allApts = aptResponse.data;
      } else if (aptResponse.data?.data && Array.isArray(aptResponse.data.data)) {
        allApts = aptResponse.data.data;
      } else if (aptResponse.data?.data) {
        allApts = [aptResponse.data.data];
      }
      
      console.log('📋 Parsed appointments array:', allApts);
      
      // Tìm appointment có ID match
      const aptData = allApts.find(apt => 
        String(apt._id) === String(appointmentId) || 
        String(apt.id) === String(appointmentId)
      );
      
      if (!aptData) {
        throw new Error('Không tìm thấy appointment này trong danh sách của bạn');
      }
      
      console.log('✅ Found appointment:', aptData);
      setAppointment(aptData);

      // Set chief complaint from appointment
      if (aptData.chief_complaint) {
        setConsultationData(prev => ({
          ...prev,
          chief_complaint: typeof aptData.chief_complaint === 'string' 
            ? aptData.chief_complaint 
            : aptData.chief_complaint?.main_symptom || ''
        }));
      }

      // Fetch patient data
      if (aptData.patient_id) {
        console.log('🔍 Fetching patient:', aptData.patient_id);
        const patientResponse = await api.get(`/patients/${aptData.patient_id}`);
        const patientData = patientResponse.data?.data || patientResponse.data;
        console.log('✅ Patient data:', patientData);
        setPatient(patientData);
      }
    } catch (err) {
      console.error('❌ Error fetching appointment:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Không thể tải thông tin lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = [];

    if (!consultationData.diagnosis.primary) {
      errors.push('Chưa nhập chẩn đoán chính');
    }

    if (consultationData.follow_up_required && !consultationData.follow_up_date) {
      errors.push('Chưa chọn ngày tái khám');
    }

    // Validate prescriptions
    prescriptions.forEach((rx, idx) => {
      if (!rx.drug_name) errors.push(`Thuốc #${idx + 1}: Chưa nhập tên thuốc`);
      if (!rx.dosage) errors.push(`Thuốc #${idx + 1}: Chưa nhập liều lượng`);
      if (!rx.frequency) errors.push(`Thuốc #${idx + 1}: Chưa chọn tần suất`);
      if (!rx.duration) errors.push(`Thuốc #${idx + 1}: Chưa nhập thời gian dùng`);
    });

    return errors;
  };

  // Save record
  const handleSaveRecord = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      const formattedErrors = validationErrors
        .map((err, idx) => `${idx + 1}. ${err}`)
        .join('\n');
      toast.warning(`Vui lòng kiểm tra lại:\n${formattedErrors}`);
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Prepare record data
      const recordData = {
        patient_id: appointment.patient_id,
        appointment_id: appointmentId,
        doctor_id: user.user_id || user.id || user.doctor_id,
        record_type: 'consultation',
        
        // Vital signs
        vital_signs: {
          blood_pressure: vitals.blood_pressure.systolic && vitals.blood_pressure.diastolic
            ? `${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic}`
            : null,
          heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
          temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
          respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
          spo2: vitals.spo2 ? parseInt(vitals.spo2) : null,
          weight: vitals.weight ? parseFloat(vitals.weight) : null,
          height: vitals.height ? parseFloat(vitals.height) : null,
          notes: vitals.notes
        },

        // Consultation data
        chief_complaint: consultationData.chief_complaint,
        symptoms: consultationData.symptoms,
        diagnosis: consultationData.diagnosis,
        
        // Treatment
        treatment: {
          plan: consultationData.treatment_plan,
          prescriptions: prescriptions.map(rx => ({
            drug_name: rx.drug_name,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: `${rx.duration} ${rx.duration_unit}`,
            instructions: rx.instructions,
            notes: rx.notes
          }))
        },

        // Prescription array (for compatibility)
        prescription: prescriptions.map(rx => ({
          drug_name: rx.drug_name,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: `${rx.duration} ${rx.duration_unit}`,
          instructions: rx.instructions,
          notes: rx.notes
        })),

        // Notes
        doctor_notes: consultationData.doctor_notes,

        // Follow-up
        follow_up_required: consultationData.follow_up_required,
        follow_up_date: consultationData.follow_up_date || null,
        follow_up_notes: consultationData.follow_up_notes,

        // Attachments
        attachments: attachments.map(att => ({
          filename: att.filename,
          file_type: att.file_type,
          file_url: att.file_url,
          description: att.description
        }))
      };

      console.log('💾 Saving record:', recordData);

      // Create EHR record
      const response = await ehrServices.createRecord(recordData);
      console.log('✅ Record created:', response);

      setSaveSuccess(true);
      toast.success('Đã lưu hồ sơ khám bệnh thành công!');

      // Navigate back to schedule after 1 second
      setTimeout(() => {
        navigate('/doctor/schedule');
      }, 1000);

    } catch (err) {
      console.error('❌ Error saving record:', err);
      console.error('❌ Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi lưu hồ sơ';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Go back without saving
  const handleBack = () => {
    Modal.confirm({
      title: 'Rời khỏi biểu mẫu?',
      content: 'Mọi dữ liệu chưa lưu sẽ bị mất. Bạn có chắc chắn muốn quay lại trang lịch khám?',
      okText: 'Rời khỏi',
      cancelText: 'Tiếp tục chỉnh sửa',
      centered: true,
      onOk: () => navigate('/doctor/schedule'),
    });
  };

  // ⭐ Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-emerald-500" size={48} />
          <p className="text-slate-600 dark:text-slate-400">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // ⭐ Show loading while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-emerald-500" size={48} />
          <p className="text-slate-600 dark:text-slate-400">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  // ⭐ Show error if data fetch failed
  if (error && !appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2"
            >
              <ArrowLeft size={20} />
              Quay lại lịch khám
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Khám bệnh
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Ghi chép thông tin khám và kê đơn thuốc
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveRecord}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Lưu hồ sơ
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
            <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Đã lưu hồ sơ thành công!
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Đang chuyển về trang lịch khám...
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Patient Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <PatientInfoSidebar patient={patient} appointment={appointment} />
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vital Signs */}
            <VitalSignsInput vitals={vitals} onChange={setVitals} />

            {/* Consultation Form */}
            <ConsultationForm 
              formData={consultationData} 
              onChange={setConsultationData} 
            />

            {/* Prescription Form */}
            <PrescriptionForm 
              prescriptions={prescriptions} 
              onChange={setPrescriptions} 
            />

            {/* Attachments */}
            <AttachmentUploader 
              attachments={attachments} 
              onChange={setAttachments} 
            />

            {/* Bottom Actions */}
            <div className="flex gap-3 justify-end sticky bottom-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg">
              <button
                onClick={handleBack}
                disabled={saving}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveRecord}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Lưu hồ sơ khám bệnh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorConsultation;