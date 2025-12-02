// src/components/doctor/VitalSignsInput.jsx
import React from 'react';
import { Activity, Thermometer, Heart, Droplet, Ruler, Weight } from 'lucide-react';

const clsInput =
  "w-full min-w-0 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg " +
  "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-500";

const SectionLabel = ({ icon: Icon, colorClass, children }) => (
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
    <Icon className={`inline mr-1 ${colorClass}`} size={16} />
    {children}
  </label>
);

const VitalSignsInput = ({ vitals = {}, onChange }) => {
  const safeVitals = {
    blood_pressure: { systolic: '', diastolic: '', ...(vitals.blood_pressure || {}) },
    heart_rate: vitals.heart_rate ?? '',
    temperature: vitals.temperature ?? '',
    respiratory_rate: vitals.respiratory_rate ?? '',
    spo2: vitals.spo2 ?? '',
    weight: vitals.weight ?? '',
    height: vitals.height ?? '',
    blood_type: vitals.blood_type ?? '',
    notes: vitals.notes ?? '',
  };

  const handleChange = (field, value) => {
    onChange?.({
      ...safeVitals,
      [field]: value,
    });
  };

  const handleNestedChange = (parent, field, value) => {
    onChange?.({
      ...safeVitals,
      [parent]: {
        ...(safeVitals[parent] || {}),
        [field]: value,
      },
    });
  };

  const weightNum = parseFloat(safeVitals.weight);
  const heightNum = parseFloat(safeVitals.height);
  const bmi = Number.isFinite(weightNum) && Number.isFinite(heightNum) && heightNum > 0
    ? weightNum / ((heightNum / 100) ** 2)
    : null;

  const bmiLabel = (() => {
    if (!(bmi > 0)) return '';
    if (bmi < 18.5) return 'Thiếu cân';
    if (bmi < 25) return 'Bình thường';
    if (bmi < 30) return 'Thừa cân';
    return 'Béo phì';
  })();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Activity className="text-emerald-500" size={20} />
        Sinh hiệu
      </h3>

      {/* Grid chính: thêm auto-rows-min để tránh tràn, gap-6 để không dính nhau */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
        {/* Blood Pressure – khít khoảng cách giữa 2 ô */}
            <div className="col-span-1 md:col-span-2">
            <SectionLabel icon={Heart} colorClass="text-red-500">
                Huyết áp (mmHg)
            </SectionLabel>

            {/* 1fr | auto | 1fr để dấu '/' chỉ chiếm đúng kích thước của nó */}
            <div className="grid [grid-template-columns:minmax(0,1fr)_auto_minmax(0,1fr)] gap-1 items-center">
                <input
                type="number"
                inputMode="numeric"
                placeholder="Tâm thu"
                aria-label="Huyết áp tâm thu"
                value={safeVitals.blood_pressure.systolic}
                onChange={(e) => handleNestedChange('blood_pressure', 'systolic', e.target.value)}
                className={clsInput + " min-w-0"}
                />
                <span className="px-1 text-slate-500">/</span>
                <input
                type="number"
                inputMode="numeric"
                placeholder="Tâm trương"
                aria-label="Huyết áp tâm trương"
                value={safeVitals.blood_pressure.diastolic}
                onChange={(e) => handleNestedChange('blood_pressure', 'diastolic', e.target.value)}
                className={clsInput + " min-w-0"}
                />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ví dụ: 120/80</p>
            </div>


        {/* Heart Rate */}
        <div>
          <SectionLabel icon={Activity} colorClass="text-pink-500">
            Nhịp tim (bpm)
          </SectionLabel>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Nhập nhịp tim"
            value={safeVitals.heart_rate}
            onChange={(e) => handleChange('heart_rate', e.target.value)}
            className={clsInput}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bình thường: 60–100</p>
        </div>

        {/* Temperature */}
        <div>
          <SectionLabel icon={Thermometer} colorClass="text-orange-500">
            Nhiệt độ (°C)
          </SectionLabel>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="Nhập nhiệt độ"
            value={safeVitals.temperature}
            onChange={(e) => handleChange('temperature', e.target.value)}
            className={clsInput}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bình thường: 36–37.5°C</p>
        </div>

        {/* Respiratory Rate */}
        <div>
          <SectionLabel icon={Activity} colorClass="text-blue-500">
            Nhịp thở (lần/phút)
          </SectionLabel>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Nhập nhịp thở"
            value={safeVitals.respiratory_rate}
            onChange={(e) => handleChange('respiratory_rate', e.target.value)}
            className={clsInput}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bình thường: 12–20</p>
        </div>

        {/* SpO2 */}
        <div>
          <SectionLabel icon={Droplet} colorClass="text-cyan-500">
            SpO₂ (%)
          </SectionLabel>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Nhập SpO₂"
            value={safeVitals.spo2}
            onChange={(e) => handleChange('spo2', e.target.value)}
            className={clsInput}
            min="0"
            max="100"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bình thường: ≥95%</p>
        </div>

        {/* Weight */}
        <div>
          <SectionLabel icon={Weight} colorClass="text-purple-500">
            Cân nặng (kg)
          </SectionLabel>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="Nhập cân nặng"
            value={safeVitals.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            className={clsInput}
          />
        </div>

        {/* Height */}
        <div>
          <SectionLabel icon={Ruler} colorClass="text-indigo-500">
            Chiều cao (cm)
          </SectionLabel>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="Nhập chiều cao"
            value={safeVitals.height}
            onChange={(e) => handleChange('height', e.target.value)}
            className={clsInput}
          />
        </div>

        {/* Blood Type */}
        <div>
          <SectionLabel icon={Droplet} colorClass="text-red-600">
            Nhóm máu
          </SectionLabel>
          <select
            value={safeVitals.blood_type}
            onChange={(e) => handleChange('blood_type', e.target.value)}
            className={clsInput}
          >
            <option value="">-- Chọn nhóm máu --</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        {/* BMI */}
        {bmi && bmi > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              BMI
            </label>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {bmi.toFixed(1)}
              </span>
              {bmiLabel && (
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  {bmiLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Ghi chú về sinh hiệu
        </label>
        <textarea
          placeholder="Ghi chú thêm về tình trạng sinh hiệu của bệnh nhân..."
          value={safeVitals.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className={
            "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg " +
            "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 " +
            "focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-20"
          }
        />
      </div>
    </div>
  );
};

export default VitalSignsInput;
