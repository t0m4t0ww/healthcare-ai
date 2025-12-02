// components/profile/MedicalHistorySection.js
import React from 'react';
import { Field } from 'formik';
import { FileText, Activity, AlertCircle } from 'lucide-react';

export default function MedicalHistorySection({ editMode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Tiền sử bệnh & Dị ứng
        </h3>
      </div>

      <div className="space-y-6">
        {/* Tiền sử bệnh */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Activity size={16} className="text-slate-500" />
            Tiền sử bệnh
          </label>
          <Field
            name="medical_history"
            as="textarea"
            rows="3"
            disabled={!editMode}
            placeholder="Ví dụ: Đã từng mắc viêm phổi (2018), hen suyễn..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Bệnh mãn tính */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Bệnh mãn tính
          </label>
          <Field
            name="chronic_conditions"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="Ví dụ: Cao huyết áp, Tiểu đường type 2..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Phẫu thuật đã qua */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Phẫu thuật đã qua
          </label>
          <Field
            name="past_surgeries"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="Ví dụ: Mổ ruột thừa (2015), Mổ túi mật (2020)..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Dị ứng thuốc */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            Dị ứng thuốc
          </label>
          <Field
            name="allergies_medications"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="Ví dụ: Penicillin, Aspirin..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Dị ứng thực phẩm */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="text-orange-500" />
            Dị ứng thực phẩm
          </label>
          <Field
            name="allergies_food"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="Ví dụ: Hải sản, đậu phộng..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Dị ứng môi trường */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="text-yellow-500" />
            Dị ứng môi trường
          </label>
          <Field
            name="allergies_environment"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="Ví dụ: Phấn hoa, bụi, lông mèo..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Thuốc đang dùng */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Thuốc đang sử dụng
          </label>
          <Field
            name="current_medications"
            as="textarea"
            rows="3"
            disabled={!editMode}
            placeholder="Ví dụ: Metformin 500mg x2/ngày, Amlodipine 5mg x1/ngày..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Tiêm chủng */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Lịch sử tiêm chủng
          </label>
          <Field
            name="vaccination_history"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="Ví dụ: COVID-19 (3 mũi), Cúm (2024), Viêm gan B..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>

        {/* Tiền sử gia đình */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Tiền sử bệnh gia đình
          </label>
          <Field
            name="family_history"
            as="textarea"
            rows="3"
            disabled={!editMode}
            placeholder="Ví dụ: Bố: Đái tháo đường, Mẹ: Cao huyết áp..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}
