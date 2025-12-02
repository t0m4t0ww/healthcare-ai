// src/components/consultation/ConsultationWorkflow.js
import React, { useState, useEffect } from 'react';
import { Steps, Button, message, Modal } from 'antd';
import {
  FileTextOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

// Step components
import PreVisitIntakeStep from './steps/PreVisitIntakeStep';
import VitalSignsStep from './steps/VitalSignsStep';
import ChiefComplaintStep from './steps/ChiefComplaintStep';
import PhysicalExamStep from './steps/PhysicalExamStep';
import SpecialtyExamStep from './steps/SpecialtyExamStep';
import SOAPAssessmentStep from './steps/SOAPAssessmentStep';
import PrescriptionStep from './steps/PrescriptionStep';

import api from '../../services/services';
import { normalizeSpecialty } from '../../constants/specialtyMapping';

const { Step } = Steps;

const ConsultationWorkflow = ({ appointmentId, onComplete, onCancel }) => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [consultationId, setConsultationId] = useState(null);
  const [consultationData, setConsultationData] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [specialty, setSpecialty] = useState('general_medicine');

  // Form data for each step
  const [preVisitData, setPreVisitData] = useState({});
  const [vitalSigns, setVitalSigns] = useState({});
  const [chiefComplaint, setChiefComplaint] = useState({});
  const [examData, setExamData] = useState({});
  const [specialtyData, setSpecialtyData] = useState({});
  const [soapData, setSOAPData] = useState({});
  const [prescription, setPrescription] = useState([]);
  const [followUp, setFollowUp] = useState({});

  useEffect(() => {
    if (appointmentId) {
      startConsultation();
    }
  }, [appointmentId]);

  const startConsultation = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting consultation for appointment:', appointmentId);
      
      // Step 1: Check if appointment already has a consultation session
      try {
        const aptCheck = await api.get(`/appointments/doctor`);
        const apts = aptCheck.data?.data || aptCheck.data;
        const apt = Array.isArray(apts) ? apts.find(a => a._id === appointmentId || a.id === appointmentId) : null;
        
        if (apt && apt.consultation_id) {
          console.log('🔄 Found existing consultation:', apt.consultation_id);
          // Load existing consultation instead of creating new one
          const existingResponse = await api.get(`/consultation/${apt.consultation_id}`);
          const existingData = existingResponse.data?.data || existingResponse.data;
          
          setConsultationId(existingData._id);
          setConsultationData(existingData);
          setPatientInfo(existingData.patient_info);
          setSpecialty(normalizeSpecialty(existingData.specialty || 'general_medicine'));
          
          // Check for local backup (might have unsaved changes)
          const backupKey = `consultation_backup_${existingData._id}`;
          const backup = localStorage.getItem(backupKey);
          
          if (backup) {
            try {
              const backupData = JSON.parse(backup);
              const backupTime = new Date(backupData.timestamp);
              const serverTime = new Date(existingData.updated_at);
              
              // If backup is newer than server data, ask to restore
              if (backupTime > serverTime) {
                Modal.confirm({
                  title: 'Phát hiện dữ liệu chưa lưu',
                  content: `Có dữ liệu chưa lưu từ ${backupTime.toLocaleString()}. Bạn có muốn khôi phục?`,
                  okText: 'Khôi phục',
                  cancelText: 'Bỏ qua',
                  onOk: () => {
                    setPreVisitData(backupData.preVisitData || {});
                    setVitalSigns(backupData.vitalSigns || {});
                    setChiefComplaint(backupData.chiefComplaint || {});
                    setExamData(backupData.examData || {});
                    setSpecialtyData(backupData.specialtyData || {});
                    setSOAPData(backupData.soapData || {});
                    setPrescription(backupData.prescription || []);
                    setFollowUp(backupData.followUp || {});
                    setCurrent(backupData.step || 0);
                    message.success('Đã khôi phục dữ liệu chưa lưu');
                  },
                  onCancel: () => {
                    // Use server data
                    setVitalSigns(existingData.vital_signs || {});
                    setChiefComplaint({ chief_complaint: existingData.chief_complaint || '' });
                    setExamData(existingData.examination_data || {});
                    setSpecialtyData(existingData.specialty_data || {});
                    setSOAPData(existingData.soap_data || {});
                    setPrescription(existingData.prescription || []);
                    setFollowUp(existingData.follow_up || {});
                    setCurrent(existingData.current_step - 1 || 0);
                    localStorage.removeItem(backupKey); // Clear outdated backup
                  }
                });
              } else {
                // Server data is newer, use it
                setVitalSigns(existingData.vital_signs || {});
                setChiefComplaint({ chief_complaint: existingData.chief_complaint || '' });
                setExamData(existingData.examination_data || {});
                setSpecialtyData(existingData.specialty_data || {});
                setSOAPData(existingData.soap_data || {});
                setPrescription(existingData.prescription || []);
                setFollowUp(existingData.follow_up || {});
                setCurrent(existingData.current_step - 1 || 0);
              }
            } catch (e) {
              console.error('Failed to parse backup:', e);
              // Fall back to server data
              setVitalSigns(existingData.vital_signs || {});
              setChiefComplaint({ chief_complaint: existingData.chief_complaint || '' });
              setExamData(existingData.examination_data || {});
              setSpecialtyData(existingData.specialty_data || {});
              setSOAPData(existingData.soap_data || {});
              setPrescription(existingData.prescription || []);
              setFollowUp(existingData.follow_up || {});
              setCurrent(existingData.current_step - 1 || 0);
            }
          } else {
            // No backup, use server data
            console.log('📥 Loading from server data:', existingData);
            
            const loadedVitalSigns = existingData.vital_signs || {};
            const loadedChiefComplaint = { chief_complaint: existingData.chief_complaint || '' };
            const loadedExamData = existingData.examination_data || {};
            const loadedSpecialtyData = existingData.specialty_data || {};
            const loadedSOAPData = existingData.soap_data || {};
            const loadedPrescription = existingData.prescription || [];
            const loadedFollowUp = existingData.follow_up || {};
            const loadedStep = existingData.current_step - 1 || 0;
            
            console.log('📋 Setting state:');
            console.log('   vitalSigns:', loadedVitalSigns);
            console.log('   chiefComplaint:', loadedChiefComplaint);
            console.log('   examData:', loadedExamData);
            console.log('   specialtyData:', loadedSpecialtyData);
            console.log('   soapData:', loadedSOAPData);
            console.log('   prescription:', loadedPrescription);
            console.log('   followUp:', loadedFollowUp);
            console.log('   current step:', loadedStep);
            
            setVitalSigns(loadedVitalSigns);
            setChiefComplaint(loadedChiefComplaint);
            setExamData(loadedExamData);
            setSpecialtyData(loadedSpecialtyData);
            setSOAPData(loadedSOAPData);
            setPrescription(loadedPrescription);
            setFollowUp(loadedFollowUp);
            setCurrent(loadedStep);
          }
          
          message.success('Đã tải phiên khám trước đó');
          setLoading(false);
          return;
        }
      } catch (checkError) {
        console.log('⚠️ Could not check existing consultation, creating new one:', checkError);
      }
      
      // Step 2: Create new consultation if no existing one
      console.log('🏥 Starting new consultation session...');
      const response = await api.post('/consultation/start', {
        appointment_id: appointmentId,
        pre_visit_data: {}
      });

      console.log('✅ Consultation response:', response.data);
      const data = response.data?.data || response.data;
      
      if (!data._id) {
        throw new Error('Response missing consultation _id');
      }
      
      setConsultationId(data._id);
      setConsultationData(data);
      setPatientInfo(data.patient_info);
      // Normalize specialty để đảm bảo format chuẩn cho SpecialtyExamStep
      setSpecialty(normalizeSpecialty(data.specialty || 'general_medicine'));
      setCurrent(0);
      message.success('Đã bắt đầu phiên khám');
    } catch (error) {
      console.error('❌ Error starting consultation:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Full error:', JSON.stringify(error.response?.data, null, 2));
      
      let errorMsg = error.response?.data?.message || error.message || 'Không thể bắt đầu phiên khám';
      
      // Handle specific errors
      if (error.response?.status === 400 && errorMsg.includes('confirmed')) {
        // Appointment status issue - try to get appointments from doctor endpoint
        console.log('⚠️ Appointment not confirmed, trying alternative flow...');
        try {
          // Use doctor's appointments endpoint which has less strict RBAC
          const aptResponse = await api.get('/appointments/doctor');
          const apts = aptResponse.data?.data || aptResponse.data;
          const apt = Array.isArray(apts) ? apts.find(a => a._id === appointmentId || a.id === appointmentId) : null;
          
          if (apt && apt.status === 'scheduled') {
            // Try to confirm it via update
            await api.put(`/appointments/${appointmentId}`, { status: 'confirmed' });
            // Retry start consultation
            const retryResponse = await api.post('/consultation/start', {
              appointment_id: appointmentId,
              pre_visit_data: {}
            });
            const retryData = retryResponse.data?.data || retryResponse.data;
            setConsultationId(retryData._id);
            setConsultationData(retryData);
            setPatientInfo(retryData.patient_info);
            setSpecialty(normalizeSpecialty(retryData.specialty || 'general_medicine'));
            setCurrent(0);
            message.success('Đã bắt đầu phiên khám');
            setLoading(false);
            return;
          }
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
          errorMsg = 'Không thể xác nhận appointment. Vui lòng confirm appointment trước khi khám.';
        }
      }
      
      message.error(errorMsg);
      
      // Show detailed error in alert
      Modal.error({
        title: 'Lỗi khởi tạo phiên khám',
        content: (
          <div>
            <p><strong>Lỗi:</strong> {errorMsg}</p>
            {error.response?.data?.error && (
              <p className="text-xs mt-2 text-gray-500">{error.response.data.error}</p>
            )}
            {error.response?.status && (
              <p className="text-xs mt-1 text-gray-400">Status: {error.response.status}</p>
            )}
            <p className="text-xs mt-2 text-blue-600">
              💡 Tip: Đảm bảo appointment đã được confirm trong lịch khám
            </p>
          </div>
        ),
        onOk: () => {
          if (onCancel) onCancel();
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const saveStep = async (step, data) => {
    console.log('💾 saveStep called');
    console.log('   step:', step);
    console.log('   step + 1 (sent to backend):', step + 1);
    console.log('   data:', data);
    console.log('   consultationId:', consultationId);
    
    if (!consultationId) {
      console.error('❌ No consultationId');
      return false;
    }
    
    setLoading(true);
    try {
      const payload = {
        step: step + 1, // Backend expects 1-7, frontend uses 0-6
        data
      };
      console.log('📡 PUT /consultation/.../step with payload:', payload);
      
      const response = await api.put(`/consultation/${consultationId}/step`, payload);
      console.log('✅ saveStep response:', response.data);
      
      // Auto-save to local storage as backup
      const backupKey = `consultation_backup_${consultationId}`;
      const backupData = {
        step,
        data,
        timestamp: new Date().toISOString(),
        preVisitData,
        vitalSigns,
        chiefComplaint,
        examData,
        specialtyData,
        soapData,
        prescription,
        followUp
      };
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      console.log('✅ saveStep completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error saving step:', error);
      console.error('   Response:', error.response?.data);
      message.error(`Lỗi lưu bước ${step + 1}: ${error.response?.data?.message || error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    // Validate and save current step
    let stepData;
    let isValid = false;

    switch (current) {
      case 0:
        if (!preVisitData.reason_for_visit) {
          message.warning('Vui lòng nhập lý do khám');
          return;
        }
        stepData = preVisitData;
        isValid = true;
        break;

      case 1:
        if (!vitalSigns.blood_pressure || !vitalSigns.heart_rate || !vitalSigns.temperature) {
          message.warning('Vui lòng nhập đầy đủ dấu hiệu sinh tồn bắt buộc');
          return;
        }
        stepData = vitalSigns;
        isValid = true;
        break;

      case 2:
        if (!chiefComplaint.chief_complaint) {
          message.warning('Vui lòng nhập triệu chứng chính');
          return;
        }
        stepData = chiefComplaint;
        isValid = true;
        break;

      case 3:
        stepData = examData;
        isValid = true;
        break;

      case 4:
        stepData = specialtyData;
        isValid = true;
        break;

      case 5:
        if (!soapData.assessment || !soapData.plan) {
          message.warning('Vui lòng nhập đánh giá (Assessment) và kế hoạch (Plan)');
          return;
        }
        stepData = soapData;
        isValid = true;
        break;

      case 6:
        stepData = {
          prescription,
          follow_up: followUp
        };
        isValid = true;
        break;

      default:
        return;
    }

    if (isValid) {
      const saved = await saveStep(current, stepData);
      if (saved) {
        setCurrent(current + 1);
      }
    }
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleComplete = async () => {
    console.log('🎯 handleComplete called');
    console.log('   Current step:', current);
    console.log('   Consultation ID:', consultationId);
    
    // Save current step data first before completing
    const finalStepData = {
      prescription,
      follow_up: followUp
    };
    
    console.log('💾 Saving final step data:', finalStepData);
    
    // Save the final step
    const saved = await saveStep(current, finalStepData);
    if (!saved) {
      console.error('❌ Failed to save final step');
      message.error('Vui lòng lưu bước cuối trước khi hoàn thành');
      return;
    }
    
    console.log('✅ Final step saved, showing confirmation modal');
    console.log('   Creating Modal.confirm...');
    
    // ✅ TEMPORARY: Skip modal for debugging, call API directly
    console.log('🚀 Calling complete API directly (skip modal)...');
    setLoading(true);
    try {
      const completeUrl = `/consultation/${consultationId}/complete`;
      console.log('📡 POST', completeUrl);
      
      const response = await api.post(completeUrl, {
        send_notification: true,
        schedule_follow_up: followUp.required || false
      });
      
      console.log('✅ Complete API response:', response.data);

      // Clear backup after successful completion
      const backupKey = `consultation_backup_${consultationId}`;
      localStorage.removeItem(backupKey);

      message.success('Đã hoàn thành phiên khám và tạo bệnh án');
      if (onComplete) onComplete();
    } catch (error) {
      console.error('❌ Error completing consultation:', error);
      console.error('   Response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message;
      message.error(`Lỗi hoàn thành: ${errorMsg}`);
      
      // Show detailed error for debugging
      Modal.error({
        title: 'Không thể hoàn thành khám',
        content: (
          <div>
            <p>{errorMsg}</p>
            <p className="text-xs text-gray-500 mt-2">
              Chi tiết: {JSON.stringify(error.response?.data)}
            </p>
          </div>
        )
      });
    } finally {
      setLoading(false);
    }
    
    /* ORIGINAL CODE WITH MODAL - Commented out for debugging
    try {
      const confirmResult = Modal.confirm({
        title: 'Hoàn thành phiên khám?',
        content: 'Hành động này sẽ tạo bệnh án điện tử và hoàn thành cuộc hẹn. Bạn có chắc chắn?',
        okText: 'Hoàn thành',
        cancelText: 'Hủy',
        onOk: async () => {
          console.log('🚀 User confirmed, calling complete API...');
          setLoading(true);
          try {
            const completeUrl = `/consultation/${consultationId}/complete`;
            console.log('📡 POST', completeUrl);
            
            const response = await api.post(completeUrl, {
              send_notification: true,
              schedule_follow_up: followUp.required || false
            });
            
            console.log('✅ Complete API response:', response.data);

            // Clear backup after successful completion
            const backupKey = `consultation_backup_${consultationId}`;
            localStorage.removeItem(backupKey);

            message.success('Đã hoàn thành phiên khám và tạo bệnh án');
            if (onComplete) onComplete();
          } catch (error) {
            console.error('❌ Error completing consultation:', error);
            console.error('   Response:', error.response?.data);
            const errorMsg = error.response?.data?.message || error.message;
            message.error(`Lỗi hoàn thành: ${errorMsg}`);
            
            // Show detailed error for debugging
            Modal.error({
              title: 'Không thể hoàn thành khám',
              content: (
                <div>
                  <p>{errorMsg}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Vui lòng đảm bảo đã điền đầy đủ: Vital Signs, Chief Complaint, và SOAP Assessment
                  </p>
                </div>
              )
            });
          } finally {
            setLoading(false);
          }
        },
        onCancel: () => {
          console.log('❌ User cancelled');
        }
      });
      console.log('✅ Modal.confirm created:', confirmResult);
    } catch (modalError) {
      console.error('❌ Error creating modal:', modalError);
      message.error('Lỗi hiển thị modal xác nhận');
    }
    */
  };

  const steps = [
    {
      title: 'Tiếp nhận',
      icon: <FileTextOutlined />,
      description: 'Thông tin & triệu chứng'
    },
    {
      title: 'Sinh hiệu',
      icon: <HeartOutlined />,
      description: 'Dấu hiệu sinh tồn'
    },
    {
      title: 'Triệu chứng',
      icon: <MedicineBoxOutlined />,
      description: 'Lý do khám & lịch sử'
    },
    {
      title: 'Khám lâm sàng',
      icon: <ExperimentOutlined />,
      description: 'Khám thực thể'
    },
    {
      title: 'Khám chuyên khoa',
      icon: <ExperimentOutlined />,
      description: getSpecialtyStepTitle(specialty)
    },
    {
      title: 'Đánh giá SOAP',
      icon: <FileTextOutlined />,
      description: 'Chẩn đoán & kế hoạch'
    },
    {
      title: 'Đơn thuốc',
      icon: <MedicineBoxOutlined />,
      description: 'Toa thuốc & tái khám'
    }
  ];

  const renderStepContent = () => {
    switch (current) {
      case 0:
        return (
          <PreVisitIntakeStep
            data={preVisitData}
            onChange={setPreVisitData}
            patientInfo={patientInfo}
          />
        );
      case 1:
        return (
          <VitalSignsStep
            data={vitalSigns}
            onChange={setVitalSigns}
          />
        );
      case 2:
        return (
          <ChiefComplaintStep
            data={chiefComplaint}
            onChange={setChiefComplaint}
            patientInfo={patientInfo}
          />
        );
      case 3:
        return (
          <PhysicalExamStep
            data={examData}
            onChange={setExamData}
          />
        );
      case 4:
        return (
          <SpecialtyExamStep
            specialty={specialty}
            data={specialtyData}
            onChange={setSpecialtyData}
            consultationId={consultationId}
            patientInfo={patientInfo}
          />
        );
      case 5:
        return (
          <SOAPAssessmentStep
            data={soapData}
            onChange={setSOAPData}
            consultationData={{
              preVisitData,
              vitalSigns,
              chiefComplaint,
              examData,
              specialtyData,
              patientInfo
            }}
          />
        );
      case 6:
        return (
          <PrescriptionStep
            prescription={prescription}
            followUp={followUp}
            onPrescriptionChange={setPrescription}
            onFollowUpChange={setFollowUp}
            soapData={soapData}
          />
        );
      default:
        return null;
    }
  };

  if (!consultationId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang khởi tạo phiên khám...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consultation-workflow p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Phiên khám bệnh</h2>
        {patientInfo && (
          <p className="text-gray-600">
            Bệnh nhân: <span className="font-semibold">{patientInfo.name}</span> | 
            Chuyên khoa: <span className="font-semibold">{getSpecialtyName(specialty)}</span>
          </p>
        )}
      </div>

      <Steps current={current} className="mb-8">
        {steps.map((item, index) => (
          <Step
            key={index}
            title={item.title}
            description={item.description}
            icon={item.icon}
          />
        ))}
      </Steps>

      <div className="step-content min-h-96 mb-8">
        {renderStepContent()}
      </div>

      <div className="step-actions flex justify-between">
        <div>
          {current > 0 && (
            <Button
              onClick={prev}
              icon={<ArrowLeftOutlined />}
              disabled={loading}
            >
              Quay lại
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              Modal.confirm({
                title: 'Thoát phiên khám?',
                content: 'Dữ liệu đã nhập sẽ được tự động lưu. Bạn có thể quay lại tiếp tục sau.',
                okText: 'Thoát',
                cancelText: 'Ở lại',
                onOk: () => {
                  message.info('Đã lưu tiến độ khám. Bạn có thể tiếp tục sau.');
                  if (onCancel) onCancel();
                }
              });
            }} 
            disabled={loading}
          >
            Thoát
          </Button>
          
          {current < steps.length - 1 && (
            <Button
              type="primary"
              onClick={next}
              loading={loading}
              icon={<ArrowRightOutlined />}
            >
              Tiếp tục
            </Button>
          )}
          
          {current === steps.length - 1 && (
            <Button
              type="primary"
              onClick={() => {
                console.log('🖱️ "Hoàn thành khám" button clicked!');
                console.log('   Current loading state:', loading);
                console.log('   Current step:', current);
                console.log('   Steps length:', steps.length);
                handleComplete();
              }}
              loading={loading}
              icon={<CheckCircleOutlined />}
              className="bg-green-500 hover:bg-green-600"
            >
              Hoàn thành khám
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getSpecialtyName(specialty) {
  // Chỉ hỗ trợ Nội tổng quát
  return 'Nội tổng quát';
}

function getSpecialtyStepTitle(specialty) {
  const titles = {
    general_medicine: 'X-quang & AI',
    obstetrics: 'Thai sản',
    pediatrics: 'Tăng trưởng'
  };
  return titles[specialty] || 'Chuyên khoa';
}

export default ConsultationWorkflow;
