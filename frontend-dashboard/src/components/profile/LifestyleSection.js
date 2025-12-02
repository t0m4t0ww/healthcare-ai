// components/profile/LifestyleSection.js
import React from 'react';
import { Field } from 'formik';
import { Activity, Cigarette, Wine, Dumbbell } from 'lucide-react';

export default function LifestyleSection({ editMode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
          <Activity size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Thói quen sống
        </h3>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Hút thuốc */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Cigarette size={16} className="text-slate-500" />
            Tình trạng hút thuốc
          </label>
          <Field
            as="select"
            name="smoking_status"
            disabled={!editMode}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">-- Chọn --</option>
            <option value="never">Không bao giờ</option>
            <option value="former">Đã bỏ</option>
            <option value="current">Hiện tại</option>
          </Field>
        </div>

        {/* Uống rượu */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Wine size={16} className="text-slate-500" />
            Uống rượu/bia
          </label>
          <Field
            as="select"
            name="alcohol_consumption"
            disabled={!editMode}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">-- Chọn --</option>
            <option value="never">Không bao giờ</option>
            <option value="occasional">Thỉnh thoảng</option>
            <option value="regular">Thường xuyên</option>
          </Field>
        </div>

        {/* Tập thể dục */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Dumbbell size={16} className="text-slate-500" />
            Tần suất tập luyện
          </label>
          <Field
            as="select"
            name="exercise_frequency"
            disabled={!editMode}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">-- Chọn --</option>
            <option value="never">Không bao giờ</option>
            <option value="rarely">Hiếm khi</option>
            <option value="sometimes">Thỉnh thoảng</option>
            <option value="often">Thường xuyên</option>
            <option value="daily">Hàng ngày</option>
          </Field>
        </div>
      </div>
    </div>
  );
}
