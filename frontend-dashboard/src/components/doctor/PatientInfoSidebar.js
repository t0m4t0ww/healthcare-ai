// src/components/doctor/PatientInfoSidebar.jsx
import React from 'react';
import { User, Phone, Mail, Calendar, Heart, AlertCircle, Pill, FileText } from 'lucide-react';

const PatientInfoSidebar = ({ patient, appointment }) => {
  if (!patient) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="text-center text-slate-500 dark:text-slate-400">
          Đang tải thông tin bệnh nhân...
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-4">
      {/* Patient Basic Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {patient.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{patient.full_name || 'Bệnh nhân'}</h3>
              <p className="text-white/80 text-sm">ID: {patient.patient_code || patient._id || patient.id || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Tuổi:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {calculateAge(patient.date_of_birth)} tuổi ({formatDate(patient.date_of_birth)})
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <User size={16} className="text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Giới tính:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {patient.gender === 'male' ? 'Nam' : patient.gender === 'female' ? 'Nữ' : 'Khác'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Phone size={16} className="text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">SĐT:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {patient.phone || 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Mail size={16} className="text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Email:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {patient.email || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Appointment Info */}
      {appointment && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Calendar size={18} className="text-emerald-500" />
            Thông tin lịch khám
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Ngày khám:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatDate(appointment.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Giờ khám:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {appointment.start_time || appointment.time || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Lý do khám:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {typeof appointment.chief_complaint === 'string' 
                  ? appointment.chief_complaint 
                  : appointment.chief_complaint?.main_symptom || 'Khám tổng quát'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Medical History */}
      {patient.medical_history && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Heart size={18} className="text-red-500" />
            Tiền sử bệnh
          </h4>
          
          {patient.medical_history.chronic_diseases && patient.medical_history.chronic_diseases.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Bệnh mãn tính:</p>
              <div className="flex flex-wrap gap-1">
                {patient.medical_history.chronic_diseases.map((disease, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                    {disease}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patient.medical_history.allergies && patient.medical_history.allergies.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Dị ứng:</p>
              <div className="flex flex-wrap gap-1">
                {patient.medical_history.allergies.map((allergy, idx) => (
                  <span key={idx} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs flex items-center gap-1">
                    <AlertCircle size={12} />
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patient.medical_history.current_medications && patient.medical_history.current_medications.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Thuốc đang dùng:</p>
              <div className="flex flex-wrap gap-1">
                {patient.medical_history.current_medications.map((med, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-1">
                    <Pill size={12} />
                    {med}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patient.medical_history.previous_surgeries && patient.medical_history.previous_surgeries.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phẫu thuật:</p>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                {patient.medical_history.previous_surgeries.map((surgery, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-slate-400">•</span>
                    <span>{surgery}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recent Records */}
      {patient.recent_records && patient.recent_records.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-blue-500" />
            Lần khám gần nhất
          </h4>
          <div className="space-y-2">
            {patient.recent_records.slice(0, 3).map((record, idx) => (
              <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(record.created_at)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {record.doctor_name || 'N/A'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {record.diagnosis?.primary || 'Khám tổng quát'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {patient.emergency_contact && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-orange-500" />
            Liên hệ khẩn cấp
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Người liên hệ:</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {patient.emergency_contact.name || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Quan hệ:</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {patient.emergency_contact.relationship || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">SĐT:</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {patient.emergency_contact.phone || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInfoSidebar;