// components/profile/EmergencyContactSection.js
import React from 'react';
import { Field, ErrorMessage } from 'formik';
import { Phone, User, Users } from 'lucide-react';

export default function EmergencyContactSection({ editMode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Phone size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Liên hệ khẩn cấp
        </h3>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Tên người liên hệ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            Họ và tên
          </label>
          <Field
            name="emergency_contact_name"
            disabled={!editMode}
            placeholder="Nguyễn Thị B"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Phone size={16} className="text-slate-500" />
            Số điện thoại
          </label>
          <Field
            name="emergency_contact_phone"
            disabled={!editMode}
            placeholder="0987654321"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          <ErrorMessage name="emergency_contact_phone" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* Mối quan hệ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            Mối quan hệ
          </label>
          <Field
            name="emergency_contact_relationship"
            disabled={!editMode}
            placeholder="Vợ / Chồng / Con"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
