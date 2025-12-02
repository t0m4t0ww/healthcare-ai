// src/components/consultation/steps/VitalSignsStep.js
import React from 'react';
import { Card, Row, Col, Input, InputNumber, Alert } from 'antd';
import { HeartOutlined, DashboardOutlined } from '@ant-design/icons';

const VitalSignsStep = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  // Validate vital signs ranges
  const getValidationStatus = (field, value) => {
    const ranges = {
      heart_rate: { min: 40, max: 200, unit: 'bpm', normal: '60-100' },
      temperature: { min: 35, max: 42, unit: '°C', normal: '36.1-37.2' },
      respiratory_rate: { min: 10, max: 40, unit: '/phút', normal: '12-20' },
      oxygen_saturation: { min: 70, max: 100, unit: '%', normal: '95-100' }
    };

    if (!ranges[field]) return null;
    const range = ranges[field];
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) return null;
    if (numValue < range.min || numValue > range.max) {
      return { type: 'error', text: `Ngoài khoảng hợp lệ (${range.min}-${range.max} ${range.unit})` };
    }
    return { type: 'success', text: `Bình thường: ${range.normal} ${range.unit}` };
  };

  return (
    <div className="vital-signs-step">
      <Alert
        message="Dấu hiệu sinh tồn"
        description="Vui lòng nhập các dấu hiệu sinh tồn bắt buộc: Huyết áp, Nhịp tim, Nhiệt độ"
        type="info"
        showIcon
        className="mb-4"
      />

      <Card title={<><HeartOutlined className="mr-2" />Dấu hiệu sinh tồn cơ bản</>}>
        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Huyết áp (mmHg) <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="120/80"
                value={data.blood_pressure}
                onChange={(e) => handleChange('blood_pressure', e.target.value)}
                size="large"
              />
              <p className="text-xs text-gray-500 mt-1">Bình thường: 90/60 - 120/80 mmHg</p>
            </div>
          </Col>

          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nhịp tim (bpm) <span className="text-red-500">*</span>
              </label>
              <InputNumber
                placeholder="72"
                value={data.heart_rate}
                onChange={(value) => handleChange('heart_rate', value)}
                min={40}
                max={200}
                size="large"
                className="w-full"
              />
              {data.heart_rate && (
                <p className={`text-xs mt-1 ${
                  getValidationStatus('heart_rate', data.heart_rate)?.type === 'error' 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                }`}>
                  {getValidationStatus('heart_rate', data.heart_rate)?.text}
                </p>
              )}
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nhiệt độ (°C) <span className="text-red-500">*</span>
              </label>
              <InputNumber
                placeholder="36.5"
                value={data.temperature}
                onChange={(value) => handleChange('temperature', value)}
                min={35}
                max={42}
                step={0.1}
                size="large"
                className="w-full"
              />
              {data.temperature && (
                <p className={`text-xs mt-1 ${
                  getValidationStatus('temperature', data.temperature)?.type === 'error' 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                }`}>
                  {getValidationStatus('temperature', data.temperature)?.text}
                </p>
              )}
            </div>
          </Col>

          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nhịp thở (/phút)
              </label>
              <InputNumber
                placeholder="16"
                value={data.respiratory_rate}
                onChange={(value) => handleChange('respiratory_rate', value)}
                min={10}
                max={40}
                size="large"
                className="w-full"
              />
              {data.respiratory_rate && (
                <p className={`text-xs mt-1 ${
                  getValidationStatus('respiratory_rate', data.respiratory_rate)?.type === 'error' 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                }`}>
                  {getValidationStatus('respiratory_rate', data.respiratory_rate)?.text}
                </p>
              )}
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                SpO2 (%)
              </label>
              <InputNumber
                placeholder="98"
                value={data.oxygen_saturation}
                onChange={(value) => handleChange('oxygen_saturation', value)}
                min={70}
                max={100}
                size="large"
                className="w-full"
              />
              {data.oxygen_saturation && (
                <p className={`text-xs mt-1 ${
                  getValidationStatus('oxygen_saturation', data.oxygen_saturation)?.type === 'error' 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                }`}>
                  {getValidationStatus('oxygen_saturation', data.oxygen_saturation)?.text}
                </p>
              )}
            </div>
          </Col>

          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Cân nặng (kg)
              </label>
              <InputNumber
                placeholder="65"
                value={data.weight}
                onChange={(value) => handleChange('weight', value)}
                min={1}
                max={300}
                step={0.1}
                size="large"
                className="w-full"
              />
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Chiều cao (cm)
              </label>
              <InputNumber
                placeholder="170"
                value={data.height}
                onChange={(value) => handleChange('height', value)}
                min={50}
                max={250}
                step={0.1}
                size="large"
                className="w-full"
              />
            </div>
          </Col>

          <Col span={12}>
            {data.weight && data.height && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">BMI</label>
                <Input
                  value={calculateBMI(data.weight, data.height)}
                  disabled
                  size="large"
                  className="bg-gray-100"
                />
              </div>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

function calculateBMI(weight, height) {
  if (!weight || !height) return '';
  const bmi = weight / ((height / 100) ** 2);
  let category = '';
  if (bmi < 18.5) category = 'Thiếu cân';
  else if (bmi < 25) category = 'Bình thường';
  else if (bmi < 30) category = 'Thừa cân';
  else category = 'Béo phì';
  
  return `${bmi.toFixed(1)} - ${category}`;
}

export default VitalSignsStep;
