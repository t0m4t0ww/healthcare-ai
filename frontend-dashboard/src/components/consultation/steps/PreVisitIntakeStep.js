// src/components/consultation/steps/PreVisitIntakeStep.js
import React from 'react';
import { Form, Input, Select, Card, Row, Col } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

const PreVisitIntakeStep = ({ data, onChange, patientInfo }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="pre-visit-intake-step">
      <Card title="Thông tin hành chính" className="mb-4">
        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Họ tên:</label>
              <Input value={patientInfo?.name} disabled />
            </div>
          </Col>
          <Col span={6}>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Giới tính:</label>
              <Input value={patientInfo?.gender} disabled />
            </div>
          </Col>
          <Col span={6}>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Tuổi:</label>
              <Input 
                value={
                  patientInfo?.dob 
                    ? new Date().getFullYear() - new Date(patientInfo.dob).getFullYear() 
                    : 'N/A'
                } 
                disabled 
              />
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Số điện thoại:</label>
              <Input value={patientInfo?.phone} disabled />
            </div>
          </Col>
          <Col span={12}>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Địa chỉ:</label>
              <Input value={patientInfo?.address} disabled />
            </div>
          </Col>
        </Row>

        {patientInfo?.allergies_medications && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 font-medium mb-1">⚠️ Dị ứng thuốc:</p>
            <p className="text-sm">{patientInfo.allergies_medications}</p>
          </div>
        )}

        {patientInfo?.medical_history && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-600 font-medium mb-1">📋 Tiền sử bệnh:</p>
            <p className="text-sm">{patientInfo.medical_history}</p>
          </div>
        )}
      </Card>

      <Card title="Triệu chứng từ bệnh nhân">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Lý do khám <span className="text-red-500">*</span>
          </label>
          <TextArea
            rows={2}
            placeholder="VD: Đau đầu, sốt, ho..."
            value={data.reason_for_visit}
            onChange={(e) => handleChange('reason_for_visit', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Mô tả triệu chứng chi tiết
          </label>
          <TextArea
            rows={4}
            placeholder="Mô tả chi tiết về triệu chứng: vị trí, mức độ, thời gian xuất hiện..."
            value={data.symptoms_description}
            onChange={(e) => handleChange('symptoms_description', e.target.value)}
          />
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Thời gian bắt đầu triệu chứng
              </label>
              <Input
                placeholder="VD: 3 ngày trước, 1 tuần..."
                value={data.symptom_onset}
                onChange={(e) => handleChange('symptom_onset', e.target.value)}
              />
            </div>
          </Col>
          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Mức độ nghiêm trọng
              </label>
              <Select
                placeholder="Chọn mức độ"
                value={data.symptom_severity}
                onChange={(value) => handleChange('symptom_severity', value)}
                className="w-full"
              >
                <Option value="mild">Nhẹ</Option>
                <Option value="moderate">Trung bình</Option>
                <Option value="severe">Nặng</Option>
              </Select>
            </div>
          </Col>
        </Row>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Đã điều trị gì chưa?
          </label>
          <TextArea
            rows={2}
            placeholder="Các phương pháp điều trị đã thử (nếu có)..."
            value={data.previous_treatments}
            onChange={(e) => handleChange('previous_treatments', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Đã dùng thuốc gì?
          </label>
          <TextArea
            rows={2}
            placeholder="Các loại thuốc đã sử dụng (nếu có)..."
            value={data.medications_taken}
            onChange={(e) => handleChange('medications_taken', e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
};

export default PreVisitIntakeStep;
