// components/profile/InsuranceSection.js
import React from 'react';
import { Field } from 'formik';
import { Shield, CreditCard } from 'lucide-react';

export default function InsuranceSection({ editMode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Bảo hiểm
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Nhà cung cấp */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Shield size={16} className="text-slate-500" />
            Nhà cung cấp
          </label>
          <Field
            name="insurance_provider"
            disabled={!editMode}
            placeholder="Bảo Việt, Prudential..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Số hợp đồng */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <CreditCard size={16} className="text-slate-500" />
            Số hợp đồng bảo hiểm
          </label>
          <Field
            name="insurance_number"
            disabled={!editMode}
            placeholder="BH-123456789"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
