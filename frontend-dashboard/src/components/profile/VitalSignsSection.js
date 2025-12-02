// components/profile/VitalSignsSection.js
import React from 'react';
import { Field } from 'formik';
import { Heart, Droplet, Thermometer, Wind, Activity, Ruler, Weight } from 'lucide-react';

export default function VitalSignsSection({ editMode, values }) {
  // Tính BMI tự động
  const calculateBMI = () => {
    const height = parseFloat(values.height);
    const weight = parseFloat(values.weight);
    if (height && weight && height > 0) {
      const bmi = weight / Math.pow(height / 100, 2);
      return bmi.toFixed(1);
    }
    return '';
  };

  const bmi = calculateBMI();
  const getBMICategory = (bmiValue) => {
    if (!bmiValue) return '';
    const bmi = parseFloat(bmiValue);
    if (bmi < 18.5) return { text: 'Thiếu cân', color: 'text-yellow-600' };
    if (bmi < 25) return { text: 'Bình thường', color: 'text-green-600' };
    if (bmi < 30) return { text: 'Thừa cân', color: 'text-orange-600' };
    return { text: 'Béo phì', color: 'text-red-600' };
  };

  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
          <Heart size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Dấu hiệu sinh tồn
        </h3>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          (Có thể tự cập nhật)
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Chiều cao */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Ruler size={16} className="text-slate-500" />
            Chiều cao (cm)
          </label>
          <Field
            name="height"
            type="number"
            step="0.1"
            disabled={!editMode}
            placeholder="170"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Cân nặng */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Weight size={16} className="text-slate-500" />
            Cân nặng (kg)
          </label>
          <Field
            name="weight"
            type="number"
            step="0.1"
            disabled={!editMode}
            placeholder="65"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* BMI */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Activity size={16} className="text-slate-500" />
            BMI (Tự tính)
          </label>
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 font-semibold">
            {bmi || '--'}
            {bmiCategory && (
              <span className={`ml-2 text-sm font-normal ${bmiCategory.color}`}>
                ({bmiCategory.text})
              </span>
            )}
          </div>
        </div>

        {/* Nhóm máu */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Droplet size={16} className="text-slate-500" />
            Nhóm máu
          </label>
          <Field
            as="select"
            name="blood_type"
            disabled={!editMode}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">-- Chọn --</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </Field>
        </div>
      </div>
    </div>
  );
}
