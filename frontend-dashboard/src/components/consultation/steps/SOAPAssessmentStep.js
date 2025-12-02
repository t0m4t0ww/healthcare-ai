// src/components/consultation/steps/SOAPAssessmentStep.js
import React, { useEffect } from 'react';
import { Card, Input, Button, message } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const SOAPAssessmentStep = ({ data, onChange, consultationData }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  // Auto-populate Subjective and Objective from previous steps
  useEffect(() => {
    if (!data.subjective) {
      const subjective = generateSubjective(consultationData);
      handleChange('subjective', subjective);
    }
    if (!data.objective) {
      const objective = generateObjective(consultationData);
      handleChange('objective', objective);
    }
  }, []);

  const handleAIAssist = async () => {
    message.info('Tính năng AI đang được phát triển');
    // TODO: Call AI service for assessment suggestions
  };

  return (
    <div className="soap-assessment-step">
      <Card 
        title="SOAP Note" 
        extra={
          <Button 
            icon={<RobotOutlined />} 
            onClick={handleAIAssist}
            type="dashed"
          >
            Gợi ý AI
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          SOAP = Subjective, Objective, Assessment, Plan
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            <strong>S</strong>ubjective (Chủ quan - từ bệnh nhân)
          </label>
          <TextArea
            rows={6}
            placeholder="Triệu chứng, cảm giác của bệnh nhân...
(Đã tự động tổng hợp từ các bước trước)"
            value={data.subjective}
            onChange={(e) => handleChange('subjective', e.target.value)}
            className="bg-blue-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Bao gồm: Chief complaint, HPI, triệu chứng từ bệnh nhân
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            <strong>O</strong>bjective (Khách quan - từ bác sĩ)
          </label>
          <TextArea
            rows={6}
            placeholder="Kết quả khám, sinh hiệu, xét nghiệm...
(Đã tự động tổng hợp từ các bước trước)"
            value={data.objective}
            onChange={(e) => handleChange('objective', e.target.value)}
            className="bg-green-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Bao gồm: Vital signs, Physical exam, Lab results, X-ray
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            <strong>A</strong>ssessment (Đánh giá/Chẩn đoán) <span className="text-red-500">*</span>
          </label>
          <TextArea
            rows={5}
            placeholder="Chẩn đoán chính và chẩn đoán phân biệt...
VD:
1. Chẩn đoán chính: Viêm phế quản cấp
2. Chẩn đoán phân biệt: Viêm phổi, Hen phế quản
3. Mức độ: Nhẹ/Trung bình/Nặng"
            value={data.assessment}
            onChange={(e) => handleChange('assessment', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            <strong>P</strong>lan (Kế hoạch điều trị) <span className="text-red-500">*</span>
          </label>
          <TextArea
            rows={6}
            placeholder="Kế hoạch điều trị chi tiết...
VD:
1. Thuốc: (sẽ nhập chi tiết ở bước tiếp theo)
2. Chế độ: Nghỉ ngơi, uống nhiều nước
3. Theo dõi: Tái khám sau 3-5 ngày nếu không cải thiện
4. Giáo dục: Tránh tiếp xúc khói thuốc, giữ ấm
5. Xét nghiệm thêm: (nếu cần)"
            value={data.plan}
            onChange={(e) => handleChange('plan', e.target.value)}
          />
        </div>
      </Card>

      <Card title="Tóm tắt dữ liệu đã nhập" className="mt-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-1">Bệnh nhân:</p>
            <p>{consultationData.patientInfo?.name}</p>
          </div>
          <div>
            <p className="font-medium mb-1">Sinh hiệu:</p>
            <p>
              BP: {consultationData.vitalSigns?.blood_pressure || 'N/A'}, 
              HR: {consultationData.vitalSigns?.heart_rate || 'N/A'} bpm, 
              Temp: {consultationData.vitalSigns?.temperature || 'N/A'}°C
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Triệu chứng chính:</p>
            <p>{consultationData.chiefComplaint?.chief_complaint || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium mb-1">Khám lâm sàng:</p>
            <p>{consultationData.examData?.general_appearance || 'N/A'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Helper functions to auto-generate SOAP
function generateSubjective(data) {
  const { preVisitData, chiefComplaint, patientInfo } = data;
  
  let subjective = '';
  
  if (chiefComplaint?.chief_complaint) {
    subjective += `CHIEF COMPLAINT: ${chiefComplaint.chief_complaint}\n\n`;
  }
  
  if (chiefComplaint?.history_present_illness) {
    subjective += `HISTORY OF PRESENT ILLNESS:\n${chiefComplaint.history_present_illness}\n\n`;
  }
  
  if (preVisitData?.symptoms_description) {
    subjective += `TRIỆU CHỨNG:\n`;
    subjective += `- Mô tả: ${preVisitData.symptoms_description}\n`;
    if (preVisitData.symptom_onset) {
      subjective += `- Thời gian: ${preVisitData.symptom_onset}\n`;
    }
    if (preVisitData.symptom_severity) {
      subjective += `- Mức độ: ${preVisitData.symptom_severity}\n`;
    }
    subjective += '\n';
  }
  
  if (preVisitData?.previous_treatments) {
    subjective += `ĐÃ ĐIỀU TRỊ: ${preVisitData.previous_treatments}\n\n`;
  }
  
  return subjective.trim();
}

function generateObjective(data) {
  const { vitalSigns, examData, specialtyData } = data;
  
  let objective = '';
  
  // Vital signs
  if (vitalSigns && Object.keys(vitalSigns).length > 0) {
    objective += `VITAL SIGNS:\n`;
    if (vitalSigns.blood_pressure) objective += `- BP: ${vitalSigns.blood_pressure} mmHg\n`;
    if (vitalSigns.heart_rate) objective += `- HR: ${vitalSigns.heart_rate} bpm\n`;
    if (vitalSigns.respiratory_rate) objective += `- RR: ${vitalSigns.respiratory_rate} /min\n`;
    if (vitalSigns.temperature) objective += `- Temp: ${vitalSigns.temperature}°C\n`;
    if (vitalSigns.oxygen_saturation) objective += `- SpO2: ${vitalSigns.oxygen_saturation}%\n`;
    if (vitalSigns.weight) objective += `- Weight: ${vitalSigns.weight} kg\n`;
    if (vitalSigns.height) objective += `- Height: ${vitalSigns.height} cm\n`;
    objective += '\n';
  }
  
  // Physical exam
  if (examData && Object.keys(examData).length > 0) {
    objective += `PHYSICAL EXAMINATION:\n`;
    if (examData.general_appearance) objective += `- General: ${examData.general_appearance}\n`;
    if (examData.heent) objective += `- HEENT: ${examData.heent}\n`;
    if (examData.cardiovascular) objective += `- CVS: ${examData.cardiovascular}\n`;
    if (examData.respiratory) objective += `- Resp: ${examData.respiratory}\n`;
    if (examData.abdomen) objective += `- Abd: ${examData.abdomen}\n`;
    if (examData.neurological) objective += `- Neuro: ${examData.neurological}\n`;
    objective += '\n';
  }
  
  // Specialty exam
  if (specialtyData && Object.keys(specialtyData).length > 0) {
    objective += `SPECIALTY EXAMINATION:\n`;
    if (specialtyData.xray_analysis) {
      objective += `- X-ray AI: ${specialtyData.xray_analysis.ai_prediction} (${(specialtyData.xray_analysis.confidence * 100).toFixed(1)}%)\n`;
    }
    if (specialtyData.notes) {
      objective += `- Notes: ${specialtyData.notes}\n`;
    }
  }
  
  return objective.trim();
}

export default SOAPAssessmentStep;
