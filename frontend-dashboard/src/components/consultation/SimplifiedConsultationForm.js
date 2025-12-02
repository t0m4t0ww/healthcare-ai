// src/components/consultation/SimplifiedConsultationForm.js
import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, message, Collapse, Tag, Spin } from 'antd';
import {
  Save,
  CheckCircle2,
  Lightbulb,
  Plus,
  Trash2,
  ClipboardList,
  Stethoscope,
  Target,
  Pill,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/services';
import CompletionModal from './CompletionModal';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

/**
 * Form khám bệnh đơn giản, gọn gàng cho bác sĩ
 * 
 * Principles:
 * - Thông tin có sẵn → Read-only, không bắt nhập lại
 * - Gộp các field liên quan thành sections logic
 * - Field ít dùng → Collapse (Advanced)
 * - AI gợi ý → Panel riêng, không làm rối form
 */
const SimplifiedConsultationForm = ({ 
  appointmentId, 
  consultationId,
  patientInfo,
  appointment, // Add appointment prop for date
  initialData = {},
  onSave,
  onComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('🔄 showCompletionModal changed:', showCompletionModal);
  }, [showCompletionModal]);

  // Main form data - GỘP TẤT CẢ VÀO 1 STATE
  const [formData, setFormData] = useState({
    // Vital Signs (Sinh hiệu)
    vital_signs: {
      blood_pressure: initialData?.vital_signs?.blood_pressure || '',
      heart_rate: initialData?.vital_signs?.heart_rate || '',
      temperature: initialData?.vital_signs?.temperature || '',
      spo2: initialData?.vital_signs?.spo2 || '',
      weight: initialData?.vital_signs?.weight || '',
      height: initialData?.vital_signs?.height || '',
    },

    // Chief Complaint & HPI (Triệu chứng chính)
    chief_complaint: initialData?.chief_complaint || '',
    history_present_illness: initialData?.history_present_illness || '',

    // Physical Exam (Khám lâm sàng)
    general_appearance: initialData?.general_appearance || '',
    examination_notes: initialData?.examination_notes || '',

    // Diagnosis (Chẩn đoán)
    diagnosis_primary: initialData?.diagnosis?.primary || '',
    diagnosis_icd10: initialData?.diagnosis?.icd10 || '',
    diagnosis_notes: initialData?.diagnosis?.notes || '',

    // Treatment Plan (Kế hoạch điều trị)
    treatment_plan: initialData?.treatment_plan || '',

    // Prescription (Đơn thuốc)
    medications: initialData?.medications || [],

    // Follow-up (Tái khám)
    follow_up_required: initialData?.follow_up_required || false,
    follow_up_date: initialData?.follow_up_date || '',
    follow_up_notes: initialData?.follow_up_notes || '',

    // Doctor Notes (Ghi chú bác sĩ)
    doctor_notes: initialData?.doctor_notes || '',
  });

  // Handle field change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle nested field change
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  // Add medication
  const addMedication = () => {
    const newMed = {
      id: Date.now(),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    };
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, newMed]
    }));
  };

  // Remove medication
  const removeMedication = (id) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m.id !== id)
    }));
  };

  // Update medication field
  const updateMedication = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      )
    }));
  };

  // AI Suggestion - Simple & Non-intrusive
  const getAISuggestion = async () => {
    setAiLoading(true);
    try {
      const response = await api.post('/specialty-ai/suggest', {
        chief_complaint: formData.chief_complaint,
        history_present_illness: formData.history_present_illness,
        vital_signs: formData.vital_signs,
        patient_info: {
          age: patientInfo?.age,
          gender: patientInfo?.gender,
          medical_history: patientInfo?.medical_history,
          allergies: patientInfo?.allergies_medications,
        }
      });

      setAiSuggestion(response.data?.data || response.data);
      message.success('Đã nhận gợi ý từ AI');
    } catch (error) {
      console.error('AI suggestion failed:', error);
      message.warning('Không thể lấy gợi ý AI. Vui lòng tiếp tục nhập thủ công.');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI suggestion to field
  const applyAISuggestion = (field) => {
    if (!aiSuggestion) return;
    
    const mapping = {
      diagnosis: 'diagnosis_primary',
      treatment: 'treatment_plan',
      medications: 'medications'
    };

    const targetField = mapping[field] || field;
    const value = aiSuggestion[field];

    if (value) {
      handleChange(targetField, value);
      message.success(`Đã áp dụng gợi ý vào ${field}`);
    }
  };

  // Save consultation (draft)
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        appointment_id: appointmentId,
        consultation_id: consultationId,
        ...formData,
        status: 'in_progress'
      };

      const response = await api.post('/consultation/save', payload);
      message.success('Đã lưu bản nháp');
      
      if (onSave) {
        onSave(response.data);
      }
    } catch (error) {
      console.error('Save failed:', error);
      message.error('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Complete consultation
  const handleComplete = async () => {
    // Validate required fields
    if (!formData.chief_complaint?.trim()) {
      message.error('Vui lòng nhập triệu chứng chính');
      return;
    }
    if (!formData.diagnosis_primary?.trim()) {
      message.error('Vui lòng nhập chẩn đoán');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        appointment_id: appointmentId,
        consultation_id: consultationId,
        ...formData,
        status: 'completed'
      };

      console.log('🚀 Submitting consultation completion...', payload);
      const response = await api.post('/consultation/complete', payload);
      
      console.log('✅ Consultation completed successfully:', response.data);
      
      // ✅ Show success message immediately
      message.success('✅ Hoàn thành khám bệnh thành công!', 3);
      
      // IMPORTANT: Show completion modal IMMEDIATELY
      // Stop loading first to allow UI to update
      setLoading(false);
      
      // Set modal visible immediately (React will batch this update)
      setShowCompletionModal(true);
      console.log('📋 Completion modal state set to true');
      
      // CRITICAL: Do NOT call onComplete here - it will navigate immediately
      // Only call onComplete when user clicks "Về trang chủ" button in modal
    } catch (error) {
      console.error('❌ Complete failed:', error);
      console.error('Error details:', error.response?.data || error.message);
      message.error('Không thể hoàn thành. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCompletionModal(false);
  };

  // Handle go home
  const handleGoHome = () => {
    console.log('🏠 User clicked "Về trang chủ", closing modal and navigating...');
    setShowCompletionModal(false);
    // Small delay to ensure modal closes smoothly before navigation
    setTimeout(() => {
      if (onComplete) {
        console.log('📞 Calling onComplete callback to navigate...');
        onComplete({});
      }
    }, 300);
  };

  // Helper: Calculate age from date_of_birth
  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  };

  // Helper: Map gender to Vietnamese
  const mapGender = (gender) => {
    if (!gender) return null;
    const genderMap = {
      'male': 'Nam',
      'female': 'Nữ',
      'other': 'Khác',
      'nam': 'Nam',
      'nữ': 'Nữ',
      'khác': 'Khác'
    };
    return genderMap[gender.toLowerCase()] || gender;
  };

  // Helper: Format age and gender display
  const formatAgeGender = () => {
    const age = calculateAge(patientInfo?.date_of_birth || patientInfo?.dob);
    const gender = mapGender(patientInfo?.gender);
    
    if (age && gender) {
      return `${age} tuổi • ${gender}`;
    } else if (age) {
      return `${age} tuổi`;
    } else if (gender) {
      return gender;
    } else {
      return 'N/A';
    }
  };

  return (
    <div className="simplified-consultation-form">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN FORM - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* SECTION 1: Thông tin bệnh nhân (Read-only) */}
          <Card 
            title={
              <span className="flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-600" />
                Thông tin bệnh nhân
              </span>
            } 
            className="bg-slate-50"
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Họ tên:</span> {patientInfo?.name || patientInfo?.full_name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Tuổi/Giới:</span> {formatAgeGender()}
              </div>
              <div>
                <span className="font-medium">Điện thoại:</span> {patientInfo?.phone || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Địa chỉ:</span> {patientInfo?.address || 'N/A'}
              </div>
            </div>

            {patientInfo?.allergies_medications && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <span className="font-medium text-red-600">⚠️ Dị ứng thuốc:</span> {patientInfo.allergies_medications}
              </div>
            )}

            {patientInfo?.medical_history && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                <span className="font-medium text-blue-600 flex items-center gap-1">
                  <ClipboardList size={14} className="inline-block" />
                  Tiền sử:
                </span> {patientInfo.medical_history}
              </div>
            )}
          </Card>

          {/* SECTION 2: Sinh hiệu & Triệu chứng */}
          <Card 
            title={
              <span className="flex items-center gap-2">
                <Stethoscope size={18} className="text-emerald-600" />
                Sinh hiệu & Triệu chứng
              </span>
            }
          >
            {/* Vital Signs - Compact */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Huyết áp</label>
                <Input
                  placeholder="120/80"
                  value={formData.vital_signs.blood_pressure}
                  onChange={(e) => handleNestedChange('vital_signs', 'blood_pressure', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Mạch (bpm)</label>
                <Input
                  placeholder="72"
                  value={formData.vital_signs.heart_rate}
                  onChange={(e) => handleNestedChange('vital_signs', 'heart_rate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Nhiệt độ (°C)</label>
                <Input
                  placeholder="36.5"
                  value={formData.vital_signs.temperature}
                  onChange={(e) => handleNestedChange('vital_signs', 'temperature', e.target.value)}
                />
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Triệu chứng chính <span className="text-red-500">*</span>
              </label>
              <TextArea
                rows={2}
                placeholder="VD: Đau đầu kéo dài 3 ngày, kèm buồn nôn"
                value={formData.chief_complaint}
                onChange={(e) => handleChange('chief_complaint', e.target.value)}
              />
            </div>

            {/* History of Present Illness */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Bệnh sử hiện tại (HPI)
              </label>
              <TextArea
                rows={3}
                placeholder="Mô tả chi tiết: thời gian bắt đầu, đặc điểm triệu chứng, yếu tố làm tăng/giảm..."
                value={formData.history_present_illness}
                onChange={(e) => handleChange('history_present_illness', e.target.value)}
              />
            </div>

            {/* Physical Exam */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Khám lâm sàng
              </label>
              <TextArea
                rows={2}
                placeholder="Kết quả khám: tình trạng chung, các hệ thống cơ quan..."
                value={formData.examination_notes}
                onChange={(e) => handleChange('examination_notes', e.target.value)}
              />
            </div>
          </Card>

          {/* SECTION 3: Chẩn đoán */}
          <Card 
            title={
              <span className="flex items-center gap-2">
                <Target size={18} className="text-purple-600" />
                Chẩn đoán
              </span>
            }
          >
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Chẩn đoán chính <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="VD: Viêm họng cấp"
                value={formData.diagnosis_primary}
                onChange={(e) => handleChange('diagnosis_primary', e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Mã ICD-10 (nếu có)
              </label>
              <Input
                placeholder="VD: J02.9"
                value={formData.diagnosis_icd10}
                onChange={(e) => handleChange('diagnosis_icd10', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú chẩn đoán
              </label>
              <TextArea
                rows={2}
                placeholder="Thêm thông tin về chẩn đoán, chẩn đoán phụ..."
                value={formData.diagnosis_notes}
                onChange={(e) => handleChange('diagnosis_notes', e.target.value)}
              />
            </div>
          </Card>

          {/* SECTION 4: Điều trị & Đơn thuốc */}
          <Card 
            title={
              <span className="flex items-center gap-2">
                <Pill size={18} className="text-rose-600" />
                Điều trị & Đơn thuốc
              </span>
            }
          >
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Kế hoạch điều trị
              </label>
              <TextArea
                rows={2}
                placeholder="Phương pháp điều trị, tư vấn, dặn dò..."
                value={formData.treatment_plan}
                onChange={(e) => handleChange('treatment_plan', e.target.value)}
              />
            </div>

            {/* Medications */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Đơn thuốc</label>
                <Button
                  type="dashed"
                  size="small"
                  icon={<Plus size={16} />}
                  onClick={addMedication}
                >
                  Thêm thuốc
                </Button>
              </div>

              {formData.medications.map((med, index) => (
                <div key={med.id} className="grid grid-cols-5 gap-2 mb-2 p-2 bg-gray-50 rounded">
                  <Input
                    placeholder="Tên thuốc"
                    value={med.name}
                    onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Liều"
                    value={med.dosage}
                    onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                  />
                  <Input
                    placeholder="Tần suất"
                    value={med.frequency}
                    onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                  />
                  <Input
                    placeholder="Thời gian"
                    value={med.duration}
                    onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                  />
                  <Button
                    danger
                    size="small"
                    icon={<Trash2 size={16} />}
                    onClick={() => removeMedication(med.id)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* 📅 SECTION 5: Tái khám & Ghi chú (Collapse) */}
          <Collapse>
            <Panel header="📅 Tái khám & Ghi chú bổ sung" key="1">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Cần tái khám?
                </label>
                <Select
                  value={formData.follow_up_required}
                  onChange={(value) => handleChange('follow_up_required', value)}
                  className="w-full"
                >
                  <Option value={false}>Không</Option>
                  <Option value={true}>Có</Option>
                </Select>
              </div>

              {formData.follow_up_required && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Ngày tái khám
                    </label>
                    <Input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => handleChange('follow_up_date', e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Ghi chú tái khám
                    </label>
                    <TextArea
                      rows={2}
                      placeholder="Lý do tái khám, những gì cần theo dõi..."
                      value={formData.follow_up_notes}
                      onChange={(e) => handleChange('follow_up_notes', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ghi chú bác sĩ (riêng tư)
                </label>
                <TextArea
                  rows={3}
                  placeholder="Ghi chú cá nhân, quan sát thêm..."
                  value={formData.doctor_notes}
                  onChange={(e) => handleChange('doctor_notes', e.target.value)}
                />
              </div>
            </Panel>
          </Collapse>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              type="default"
              icon={<Save size={16} />}
              onClick={handleSave}
              loading={loading}
              size="large"
            >
              Lưu nháp
            </Button>
            <Button
              type="primary"
              icon={<CheckCircle2 size={16} />}
              onClick={handleComplete}
              loading={loading}
              size="large"
            >
              Hoàn thành khám
            </Button>
          </div>
        </div>

        {/* AI SUGGESTION PANEL - 1/3 width */}
        <div className="lg:col-span-1">
          <Card 
            title={<><Lightbulb className="mr-2 inline-block" size={18} />Gợi ý AI</>}
            className="sticky top-4"
          >
            <div className="mb-4">
              <Button
                type="dashed"
                block
                icon={<Lightbulb size={16} />}
                onClick={getAISuggestion}
                loading={aiLoading}
                disabled={!formData.chief_complaint?.trim()}
              >
                Lấy gợi ý từ AI
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                AI sẽ phân tích triệu chứng và đưa ra gợi ý chẩn đoán
              </p>
            </div>

            {aiSuggestion && (
              <div className="space-y-3">
                {aiSuggestion.diagnosis && (
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium">Chẩn đoán gợi ý:</span>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => applyAISuggestion('diagnosis')}
                      >
                        Áp dụng
                      </Button>
                    </div>
                    <p className="text-sm">{aiSuggestion.diagnosis}</p>
                  </div>
                )}

                {aiSuggestion.treatment && (
                  <div className="p-3 bg-green-50 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium">Điều trị gợi ý:</span>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => applyAISuggestion('treatment')}
                      >
                        Áp dụng
                      </Button>
                    </div>
                    <p className="text-sm">{aiSuggestion.treatment}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500 italic">
                  ℹ️ Gợi ý AI chỉ mang tính tham khảo. Bác sĩ tự chịu trách nhiệm quyết định cuối cùng.
                </p>
              </div>
            )}

            {!aiSuggestion && !aiLoading && (
              <div className="text-center text-gray-400 py-8">
                <Lightbulb size={48} className="opacity-30" />
                <p className="text-sm mt-2">Chưa có gợi ý</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Completion Modal */}
      <CompletionModal
        visible={showCompletionModal}
        onClose={handleModalClose}
        onGoHome={handleGoHome}
        patientName={patientInfo?.name || patientInfo?.full_name}
        appointmentDate={appointment?.date}
      />
    </div>
  );
};

export default SimplifiedConsultationForm;

  