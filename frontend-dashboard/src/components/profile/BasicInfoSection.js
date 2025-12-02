// components/profile/BasicInfoSection.js
import React from 'react';
import { Field, ErrorMessage } from 'formik';
import { User, Phone, Mail, MapPin, Calendar, Users } from 'lucide-react';

export default function BasicInfoSection({ editMode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
          <User size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Thông tin cơ bản
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Họ và tên */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Họ và tên *
          </label>
          <Field
            name="full_name"
            disabled={!editMode}
            placeholder="Nguyễn Văn A"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          <ErrorMessage name="full_name" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Phone size={16} className="text-slate-500" />
            Số điện thoại *
          </label>
          <Field
            name="phone"
            disabled={!editMode}
            placeholder="0901234567"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          <ErrorMessage name="phone" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Mail size={16} className="text-slate-500" />
            Email
          </label>
          <Field
            name="email"
            type="email"
            disabled={!editMode}
            placeholder="patient@example.com"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Ngày sinh */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Calendar size={16} className="text-slate-500" />
            Ngày sinh *
          </label>
          <Field
            name="date_of_birth"
            type="date"
            disabled={!editMode}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          <ErrorMessage name="date_of_birth" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* Giới tính */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            Giới tính *
          </label>
          <Field
            as="select"
            name="gender"
            disabled={!editMode}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">-- Chọn giới tính --</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </Field>
          <ErrorMessage name="gender" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* Địa chỉ */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <MapPin size={16} className="text-slate-500" />
            Địa chỉ *
          </label>
          <Field
            name="address"
            as="textarea"
            rows="2"
            disabled={!editMode}
            placeholder="123 Đường ABC, Quận 1, TP.HCM"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors resize-none"
          />
          <ErrorMessage name="address" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* CCCD/CMND */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            CCCD/CMND
          </label>
          <Field
            name="citizen_id"
            disabled={!editMode}
            placeholder="001234567890"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          <ErrorMessage name="citizen_id" component="div" className="mt-1 text-sm text-red-500" />
        </div>

        {/* Nghề nghiệp */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Nghề nghiệp
          </label>
          <Field
            name="occupation"
            disabled={!editMode}
            placeholder="Giáo viên"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Số thẻ BHYT */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Số thẻ BHYT
          </label>
          <Field
            name="insurance_bhyt"
            disabled={!editMode}
            placeholder="DN1234567890"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          />
          <ErrorMessage name="insurance_bhyt" component="div" className="mt-1 text-sm text-red-500" />
        </div>
      </div>
    </div>
  );
}
