// src/components/doctor/ConsultationForm.jsx
import React from 'react';
import { FileText, Stethoscope, ClipboardList, Calendar } from 'lucide-react';

const ConsultationForm = ({ formData, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  const handleDiagnosisChange = (field, value) => {
    onChange({
      ...formData,
      diagnosis: {
        ...formData.diagnosis,
        [field]: value
      }
    });
  };

  const handleSymptomAdd = (symptom) => {
    if (symptom && !formData.symptoms.includes(symptom)) {
      onChange({
        ...formData,
        symptoms: [...formData.symptoms, symptom]
      });
    }
  };

  const handleSymptomRemove = (symptom) => {
    onChange({
      ...formData,
      symptoms: formData.symptoms.filter(s => s !== symptom)
    });
  };

  return (
    <div className="space-y-6">
      {/* Chief Complaint */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FileText className="text-emerald-500" size={20} />
          Lý do khám
        </h3>
        <textarea
          placeholder="Lý do bệnh nhân đến khám..."
          value={formData.chief_complaint}
          onChange={(e) => handleChange('chief_complaint', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-24"
        />
      </div>

      {/* Symptoms */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <ClipboardList className="text-orange-500" size={20} />
          Triệu chứng
        </h3>
        
        {/* Current Symptoms */}
        {formData.symptoms && formData.symptoms.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {formData.symptoms.map((symptom, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm flex items-center gap-2"
              >
                {symptom}
                <button
                  type="button"
                  onClick={() => handleSymptomRemove(symptom)}
                  className="hover:text-orange-900 dark:hover:text-orange-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add Symptom */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập triệu chứng và nhấn Enter"
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSymptomAdd(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>

        {/* Common Symptoms */}
        <div className="mt-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Triệu chứng phổ biến:</p>
          <div className="flex flex-wrap gap-2">
            {['Sốt', 'Ho', 'Đau đầu', 'Đau bụng', 'Buồn nôn', 'Chóng mặt', 'Mệt mỏi'].map(symptom => (
              <button
                key={symptom}
                type="button"
                onClick={() => handleSymptomAdd(symptom)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                + {symptom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Stethoscope className="text-blue-500" size={20} />
          Chẩn đoán
        </h3>

        <div className="space-y-4">
          {/* Primary Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Chẩn đoán chính <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Viêm họng cấp"
              value={formData.diagnosis?.primary || ''}
              onChange={(e) => handleDiagnosisChange('primary', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Secondary Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Chẩn đoán phụ (nếu có)
            </label>
            <input
              type="text"
              placeholder="Các chẩn đoán bổ sung..."
              value={formData.diagnosis?.secondary || ''}
              onChange={(e) => handleDiagnosisChange('secondary', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ICD Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mã ICD-10 (nếu có)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: J02.9"
              value={formData.diagnosis?.icd_code || ''}
              onChange={(e) => handleDiagnosisChange('icd_code', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Differential Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Chẩn đoán phân biệt
            </label>
            <textarea
              placeholder="Các chẩn đoán cần loại trừ..."
              value={formData.diagnosis?.differential || ''}
              onChange={(e) => handleDiagnosisChange('differential', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
            />
          </div>
        </div>
      </div>

      {/* Treatment Plan */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <ClipboardList className="text-purple-500" size={20} />
          Kế hoạch điều trị
        </h3>
        <textarea
          placeholder="Mô tả chi tiết về kế hoạch điều trị (không bao gồm thuốc - sẽ kê đơn ở phần riêng)..."
          value={formData.treatment_plan || ''}
          onChange={(e) => handleChange('treatment_plan', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-24"
        />
      </div>

      {/* Doctor Notes */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FileText className="text-slate-500" size={20} />
          Ghi chú của bác sĩ
        </h3>
        <textarea
          placeholder="Ghi chú chi tiết về quá trình khám, quan sát, khuyến cáo..."
          value={formData.doctor_notes || ''}
          onChange={(e) => handleChange('doctor_notes', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-32"
        />
      </div>

      {/* Follow-up */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Calendar className="text-teal-500" size={20} />
          Tái khám
        </h3>
        
        <div className="space-y-4">
          {/* Follow-up Required */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="follow_up_required"
              checked={formData.follow_up_required || false}
              onChange={(e) => handleChange('follow_up_required', e.target.checked)}
              className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="follow_up_required" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Yêu cầu tái khám
            </label>
          </div>

          {/* Follow-up Date */}
          {formData.follow_up_required && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ngày tái khám dự kiến
                </label>
                <input
                  type="date"
                  value={formData.follow_up_date || ''}
                  onChange={(e) => handleChange('follow_up_date', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Follow-up Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ghi chú tái khám
                </label>
                <textarea
                  placeholder="Lý do và hướng dẫn cho lần tái khám..."
                  value={formData.follow_up_notes || ''}
                  onChange={(e) => handleChange('follow_up_notes', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-20"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultationForm;