// src/pages/doctor/ConsultationPage.jsx - SIMPLIFIED VERSION ✅
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Alert } from 'antd';
import { ArrowLeft } from 'lucide-react';
import SimplifiedConsultationForm from '../../components/consultation/SimplifiedConsultationForm';
import api from '../../services/services';

const ConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [consultationId, setConsultationId] = useState(null);
  const [existingData, setExistingData] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Load appointment & patient data
  useEffect(() => {
    if (appointmentId) {
      fetchData();
    }
  }, [appointmentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get appointment details
      const aptResponse = await api.get(`/appointments/${appointmentId}`);
      const aptData = aptResponse.data?.data || aptResponse.data;
      setAppointment(aptData);

      // ✅ Check if appointment is already completed
      const appointmentStatus = (aptData.status || '').toLowerCase();
      if (appointmentStatus === 'completed') {
        console.log('⚠️ Appointment already completed, redirecting...');
        setIsCompleted(true);
        message.warning('Phiên khám này đã hoàn thành. Không thể chỉnh sửa.');
        setTimeout(() => {
          navigate('/doctor/dashboard');
        }, 2000);
        setLoading(false);
        return;
      }

      // 2. Get patient info
      if (aptData.patient_id) {
        try {
          const patientResponse = await api.get(`/patients/${aptData.patient_id}`);
          const patientData = patientResponse.data?.data || patientResponse.data;
          setPatientInfo(patientData);
        } catch (err) {
          console.warn('Could not load patient details:', err);
          // Use basic patient info from appointment
          setPatientInfo(aptData.patient_info || {});
        }
      }

      // 3. Check if consultation already exists
      if (aptData.consultation_id) {
        try {
          const consResponse = await api.get(`/consultation/${aptData.consultation_id}`);
          const consData = consResponse.data?.data || consResponse.data;
          setConsultationId(consData._id);
          setExistingData(consData);
          
          // ✅ Check if consultation is already completed
          const consultationStatus = (consData.status || '').toLowerCase();
          if (consultationStatus === 'completed') {
            console.log('⚠️ Consultation already completed, redirecting...');
            setIsCompleted(true);
            message.warning('Phiên khám này đã hoàn thành. Không thể chỉnh sửa.');
            setTimeout(() => {
              navigate('/doctor/dashboard');
            }, 2000);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Could not load existing consultation:', err);
        }
      } else {
        // 4. Start new consultation (only if not completed)
        try {
          const startResponse = await api.post('/consultation/start', {
            appointment_id: appointmentId
          });
          const consData = startResponse.data?.data || startResponse.data;
          setConsultationId(consData._id || consData.consultation_id);
        } catch (err) {
          console.error('Could not start consultation:', err);
          message.error('Không thể bắt đầu phiên khám');
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Không thể tải thông tin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (data) => {
    message.success('Đã lưu bản nháp');
    // Auto-save backup to localStorage
    localStorage.setItem(`consultation_backup_${consultationId}`, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    }));
  };

  const handleComplete = (data) => {
    // Clear backup
    if (consultationId) {
      localStorage.removeItem(`consultation_backup_${consultationId}`);
    }
    // Navigate back (will be called from modal's "Về trang chủ" button)
    navigate('/doctor/dashboard');
  };

  const handleCancel = () => {
    navigate('/doctor/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Đang tải thông tin khám..." />
      </div>
    );
  }

  // ✅ Show completed message if consultation is already completed
  if (isCompleted) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full">
            <Alert
              message="Phiên khám đã hoàn thành"
              description={
                <div className="mt-4">
                  <p className="mb-4">
                    Phiên khám bệnh này đã được hoàn thành và không thể chỉnh sửa.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Bạn sẽ được chuyển về trang chủ trong giây lát...
                  </p>
                  <Button
                    type="primary"
                    icon={<ArrowLeft size={16} />}
                    onClick={() => navigate('/doctor/dashboard')}
                    block
                  >
                    Về trang chủ ngay
                  </Button>
                </div>
              }
              type="success"
              showIcon
              className="text-center"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={handleCancel}
            type="text"
          >
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold mt-2">
            Phiên khám bệnh
          </h1>
          <p className="text-gray-600">
            {appointment?.patient?.full_name || patientInfo?.name || 'Bệnh nhân'} • {appointment?.date || ''}
          </p>
        </div>
      </div>

      {/* Simplified Form */}
      <SimplifiedConsultationForm
        appointmentId={appointmentId}
        consultationId={consultationId}
        patientInfo={patientInfo}
        appointment={appointment}
        initialData={existingData}
        onSave={handleSave}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default ConsultationPage;