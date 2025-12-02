// src/components/consultation/steps/ChiefComplaintStep.js
import React from 'react';
import { Card, Input, Select, Checkbox, Row, Col } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

const ChiefComplaintStep = ({ data, onChange, patientInfo }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  const handleReviewOfSystemsChange = (system, checked) => {
    const ros = data.review_of_systems || {};
    onChange({
      ...data,
      review_of_systems: {
        ...ros,
        [system]: checked
      }
    });
  };

  const systemsList = [
    { key: 'constitutional', label: 'Toàn thân (sốt, mệt, giảm cân...)' },
    { key: 'cardiovascular', label: 'Tim mạch (đau ngực, hồi hộp...)' },
    { key: 'respiratory', label: 'Hô hấp (ho, khó thở, đau ngực...)' },
    { key: 'gastrointestinal', label: 'Tiêu hóa (đau bụng, buồn nôn...)' },
    { key: 'genitourinary', label: 'Tiết niệu (đi tiểu nhiều, đau...)' },
    { key: 'musculoskeletal', label: 'Cơ xương khớp (đau khớp, sưng...)' },
    { key: 'neurological', label: 'Thần kinh (đau đầu, chóng mặt...)' },
    { key: 'skin', label: 'Da (phát ban, ngứa...)' },
  ];

  return (
    <div className="chief-complaint-step">
      <Card title="Triệu chứng chính">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Chief Complaint (Triệu chứng chính) <span className="text-red-500">*</span>
          </label>
          <TextArea
            rows={3}
            placeholder="Mô tả ngắn gọn triệu chứng chính mà bệnh nhân đến khám..."
            value={data.chief_complaint}
            onChange={(e) => handleChange('chief_complaint', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            History of Present Illness (Bệnh sử hiện tại)
          </label>
          <TextArea
            rows={6}
            placeholder="Mô tả chi tiết quá trình phát triển bệnh:
- Thời gian bắt đầu
- Đặc điểm triệu chứng (OPQRST)
- Yếu tố làm tăng/giảm
- Triệu chứng kèm theo
- Can thiệp đã thử"
            value={data.history_present_illness}
            onChange={(e) => handleChange('history_present_illness', e.target.value)}
          />
        </div>
      </Card>

      <Card title="Review of Systems (Hệ thống cơ quan)" className="mt-4">
        <p className="text-sm text-gray-600 mb-3">
          Đánh dấu các hệ thống cơ quan có liên quan đến triệu chứng
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemsList.map(system => (
            <div key={system.key}>
              <Checkbox
                checked={data.review_of_systems?.[system.key] || false}
                onChange={(e) => handleReviewOfSystemsChange(system.key, e.target.checked)}
              >
                {system.label}
              </Checkbox>
            </div>
          ))}
        </div>
      </Card>

      {patientInfo?.medical_history && (
        <Card title="Tiền sử bệnh (từ hồ sơ)" className="mt-4 bg-blue-50">
          <p className="text-sm">{patientInfo.medical_history}</p>
        </Card>
      )}

      {patientInfo?.current_medications && (
        <Card title="Thuốc đang dùng (từ hồ sơ)" className="mt-4 bg-green-50">
          <p className="text-sm">{patientInfo.current_medications}</p>
        </Card>
      )}
    </div>
  );
};

export default ChiefComplaintStep;
