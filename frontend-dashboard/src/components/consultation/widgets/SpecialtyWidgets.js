// src/components/consultation/widgets/SpecialtyWidgets.js
import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Statistic, Alert, Progress } from 'antd';
import { CalculatorOutlined, LineChartOutlined, HeartOutlined, InfoCircleOutlined } from '@ant-design/icons';

/**
 * 🏥 INTERNAL MEDICINE WIDGETS
 */

// BMI Calculator
export const BMICalculator = ({ weight, height, onUpdate }) => {
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (weight && height) {
      const heightM = height / 100;
      const bmiValue = (weight / (heightM * heightM)).toFixed(1);
      setBmi(bmiValue);

      // Determine category
      if (bmiValue < 18.5) {
        setCategory('Gầy');
        setColor('blue');
      } else if (bmiValue < 25) {
        setCategory('Bình thường');
        setColor('green');
      } else if (bmiValue < 30) {
        setCategory('Thừa cân');
        setColor('orange');
      } else {
        setCategory('Béo phì');
        setColor('red');
      }
    }
  }, [weight, height]);

  return (
    <Card size="small" className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">
          <CalculatorOutlined className="mr-2" />
          BMI Calculator
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Input
          type="number"
          placeholder="Cân nặng (kg)"
          value={weight || ''}
          onChange={(e) => onUpdate('weight', parseFloat(e.target.value))}
          addonAfter="kg"
        />
        <Input
          type="number"
          placeholder="Chiều cao (cm)"
          value={height || ''}
          onChange={(e) => onUpdate('height', parseFloat(e.target.value))}
          addonAfter="cm"
        />
      </div>
      {bmi && (
        <div className="text-center">
          <Statistic
            value={bmi}
            suffix={<span className={`text-${color}-600`}>({category})</span>}
            valueStyle={{ color: color === 'green' ? '#52c41a' : color === 'orange' ? '#fa8c16' : color === 'red' ? '#f5222d' : '#1890ff' }}
          />
        </div>
      )}
    </Card>
  );
};

// Cardiovascular Risk Calculator
export const CardiovascularRiskCalculator = ({ age, gender, cholesterol, bloodPressure, smoking, diabetes }) => {
  const [risk, setRisk] = useState(0);
  const [riskLevel, setRiskLevel] = useState('');

  useEffect(() => {
    let score = 0;
    
    // Age points
    if (age > 65) score += 3;
    else if (age > 55) score += 2;
    else if (age > 45) score += 1;

    // Gender
    if (gender === 'male') score += 1;

    // Cholesterol
    if (cholesterol > 240) score += 2;
    else if (cholesterol > 200) score += 1;

    // Blood pressure
    const [systolic] = (bloodPressure || '120/80').split('/').map(Number);
    if (systolic > 160) score += 2;
    else if (systolic > 140) score += 1;

    // Smoking
    if (smoking) score += 2;

    // Diabetes
    if (diabetes) score += 2;

    const riskPercent = Math.min(score * 8, 100);
    setRisk(riskPercent);

    if (riskPercent < 20) setRiskLevel('Thấp');
    else if (riskPercent < 40) setRiskLevel('Trung bình');
    else if (riskPercent < 60) setRiskLevel('Cao');
    else setRiskLevel('Rất cao');
  }, [age, gender, cholesterol, bloodPressure, smoking, diabetes]);

  const getColor = () => {
    if (risk < 20) return 'success';
    if (risk < 40) return 'normal';
    if (risk < 60) return 'warning';
    return 'exception';
  };

  return (
    <Card size="small" className="mb-4" title={<><HeartOutlined /> Đánh giá nguy cơ tim mạch</>}>
      <Progress 
        percent={risk} 
        status={getColor()}
        format={() => `${riskLevel}`}
      />
      {risk >= 40 && (
        <Alert
          message="Cảnh báo"
          description="Bệnh nhân có nguy cơ tim mạch cao. Cần điều chỉnh lối sống và dùng thuốc."
          type="warning"
          showIcon
          className="mt-3"
        />
      )}
    </Card>
  );
};

/**
 * 👶 OBSTETRIC WIDGETS
 */

// EDD Calculator (Expected Date of Delivery)
export const EDDCalculator = ({ lmp, onUpdate }) => {
  const [edd, setEdd] = useState('');
  const [gestationalAge, setGestationalAge] = useState('');

  useEffect(() => {
    if (lmp) {
      const lmpDate = new Date(lmp);
      // Naegele's rule: LMP + 280 days
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
      setEdd(eddDate.toLocaleDateString('vi-VN'));

      // Calculate gestational age
      const today = new Date();
      const diffTime = Math.abs(today - lmpDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(diffDays / 7);
      const days = diffDays % 7;
      setGestationalAge(`${weeks} tuần ${days} ngày`);

      // Auto update
      if (onUpdate) {
        onUpdate('edd', eddDate.toISOString().split('T')[0]);
        onUpdate('gestational_age_weeks', weeks);
      }
    }
  }, [lmp, onUpdate]);

  return (
    <Card size="small" className="mb-4">
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">
          <InfoCircleOutlined className="mr-2" />
          Ngày kinh cuối (LMP)
        </label>
        <Input
          type="date"
          value={lmp || ''}
          onChange={(e) => onUpdate && onUpdate('lmp', e.target.value)}
        />
      </div>
      {edd && (
        <div className="bg-blue-50 p-3 rounded">
          <div className="mb-2">
            <span className="text-sm text-gray-600">Tuổi thai:</span>
            <span className="ml-2 font-semibold text-blue-700">{gestationalAge}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Ngày sinh dự kiến (EDD):</span>
            <span className="ml-2 font-semibold text-blue-700">{edd}</span>
          </div>
        </div>
      )}
    </Card>
  );
};

// Fetal Heart Rate Monitor
export const FetalHeartRateMonitor = ({ fhr }) => {
  const [status, setStatus] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (fhr) {
      if (fhr < 110) {
        setStatus('⚠️ Chậm tim thai - Cần can thiệp ngay!');
        setColor('error');
      } else if (fhr < 120) {
        setStatus('⚠️ Nhịp tim thấp - Cần theo dõi');
        setColor('warning');
      } else if (fhr <= 160) {
        setStatus('✅ Nhịp tim bình thường');
        setColor('success');
      } else if (fhr <= 180) {
        setStatus('⚠️ Nhịp tim cao - Cần theo dõi');
        setColor('warning');
      } else {
        setStatus('⚠️ Nhanh tim thai - Cần can thiệp!');
        setColor('error');
      }
    }
  }, [fhr]);

  return (
    <Card size="small" className="mb-4">
      <div className="text-center">
        <Statistic
          title="Nhịp tim thai (FHR)"
          value={fhr || '---'}
          suffix="bpm"
          valueStyle={{ 
            color: color === 'success' ? '#52c41a' : color === 'warning' ? '#fa8c16' : '#f5222d' 
          }}
        />
        {status && (
          <Alert
            message={status}
            type={color}
            showIcon
            className="mt-3"
          />
        )}
      </div>
    </Card>
  );
};

/**
 * 🧒 PEDIATRIC WIDGETS
 */

// WHO Growth Chart (Z-score calculator)
export const WHOGrowthChart = ({ age, weight, height, gender = 'male' }) => {
  const [weightZScore, setWeightZScore] = useState(null);
  const [heightZScore, setHeightZScore] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (age && weight && height) {
      // Simplified WHO standards (approximate)
      // Real implementation would use WHO tables
      const medianWeight = gender === 'male' ? 3.5 + (age * 0.5) : 3.3 + (age * 0.45);
      const medianHeight = gender === 'male' ? 50 + (age * 2) : 49 + (age * 1.9);
      const sdWeight = 0.5;
      const sdHeight = 2;

      const wz = ((weight - medianWeight) / sdWeight).toFixed(1);
      const hz = ((height - medianHeight) / sdHeight).toFixed(1);

      setWeightZScore(wz);
      setHeightZScore(hz);

      // Determine nutritional status
      if (wz < -3) setStatus('Suy dinh dưỡng nặng');
      else if (wz < -2) setStatus('Suy dinh dưỡng vừa');
      else if (wz < -1) setStatus('Suy dinh dưỡng nhẹ');
      else if (wz <= 1) setStatus('Dinh dưỡng bình thường');
      else if (wz <= 2) setStatus('Thừa cân');
      else setStatus('Béo phì');
    }
  }, [age, weight, height, gender]);

  const getColor = () => {
    if (weightZScore < -2) return 'red';
    if (weightZScore < -1) return 'orange';
    if (weightZScore <= 1) return 'green';
    return 'orange';
  };

  return (
    <Card size="small" className="mb-4" title={<><LineChartOutlined /> Biểu đồ tăng trưởng WHO</>}>
      {weightZScore && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Z-score cân nặng</div>
              <div className={`text-lg font-bold text-${getColor()}-600`}>{weightZScore}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Z-score chiều cao</div>
              <div className="text-lg font-bold">{heightZScore}</div>
            </div>
          </div>
          <Alert
            message={status}
            type={getColor() === 'green' ? 'success' : getColor() === 'red' ? 'error' : 'warning'}
            showIcon
          />
          {weightZScore < -2 && (
            <Alert
              message="⚠️ Cần tư vấn dinh dưỡng và theo dõi sát"
              type="warning"
              className="mt-2"
            />
          )}
        </div>
      )}
    </Card>
  );
};

// Immunization Tracker
export const ImmunizationTracker = ({ ageMonths, immunizationStatus }) => {
  const getVaccineSchedule = (age) => {
    const schedule = [];
    
    if (age >= 0) schedule.push({ name: 'BCG, Viêm gan B (liều 1)', due: 'Sơ sinh', status: 'due' });
    if (age >= 2) schedule.push({ name: 'DPT-VGB-Hib (liều 1), Polio', due: '2 tháng', status: age >= 2 ? 'due' : 'pending' });
    if (age >= 3) schedule.push({ name: 'DPT-VGB-Hib (liều 2), Polio', due: '3 tháng', status: age >= 3 ? 'due' : 'pending' });
    if (age >= 4) schedule.push({ name: 'DPT-VGB-Hib (liều 3), Polio', due: '4 tháng', status: age >= 4 ? 'due' : 'pending' });
    if (age >= 9) schedule.push({ name: 'Sởi - Rubella (liều 1)', due: '9 tháng', status: age >= 9 ? 'due' : 'pending' });
    if (age >= 12) schedule.push({ name: 'Thủy đậu', due: '12 tháng', status: age >= 12 ? 'due' : 'pending' });
    if (age >= 18) schedule.push({ name: 'DPT (nhắc lại), Sởi - Rubella (liều 2)', due: '18 tháng', status: age >= 18 ? 'due' : 'pending' });

    return schedule;
  };

  const schedule = getVaccineSchedule(ageMonths);
  const completed = immunizationStatus ? immunizationStatus.split(',').map(s => s.trim()) : [];

  return (
    <Card size="small" className="mb-4" title="💉 Lịch tiêm chủng">
      <div className="space-y-2">
        {schedule.filter(v => v.status === 'due').map((vaccine, idx) => {
          const isCompleted = completed.some(c => vaccine.name.includes(c));
          return (
            <div key={idx} className={`p-2 rounded text-sm ${isCompleted ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className="flex justify-between items-center">
                <span>{vaccine.name}</span>
                <span className={`text-xs ${isCompleted ? 'text-green-600' : 'text-orange-600'}`}>
                  {isCompleted ? '✅ Đã tiêm' : '⏰ Cần tiêm'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default {
  BMICalculator,
  CardiovascularRiskCalculator,
  EDDCalculator,
  FetalHeartRateMonitor,
  WHOGrowthChart,
  ImmunizationTracker
};
