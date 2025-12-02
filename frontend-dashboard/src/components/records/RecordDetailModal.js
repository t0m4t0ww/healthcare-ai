// src/components/records/RecordDetailModal.jsx - UPDATED ✅
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X, FileText, Calendar, User, Stethoscope, Pill,
  AlertTriangle, Download, MapPin, Phone, Shield
} from "lucide-react";
import PrescriptionQRCode from "../medical/PrescriptionQRCode";
import { getSpecialtyName } from "../../constants/specialtyConstants"; // ✅ Import specialty mapping
import { toast } from "react-toastify";

const RecordDetailModal = ({ record, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!record) return null;

  // Helper: Calculate age from date_of_birth (consistent with consultation form)
  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  };

  // Helper: Map gender to Vietnamese (consistent with consultation form)
  const mapGender = (gender) => {
    if (!gender) return null;
    const genderMap = {
      'male': 'Nam',
      'female': 'Nữ',
      'other': 'Khác',
      'nam': 'Nam',
      'nữ': 'Nữ',
      'khác': 'Khác'
    };
    return genderMap[gender.toLowerCase()] || gender;
  };

  // Helper: Format age and gender display (consistent with consultation form)
  const formatAgeGender = (patientData) => {
    const age = calculateAge(patientData?.date_of_birth || patientData?.dob);
    const gender = mapGender(patientData?.gender);
    
    if (age && gender) {
      return `${age} tuổi • ${gender}`;
    } else if (age) {
      return `${age} tuổi`;
    } else if (gender) {
      return gender;
    } else {
      return 'N/A';
    }
  };

  // Helper: Map visit_type to Vietnamese
  const mapVisitType = (type) => {
    const typeMap = {
      'consultation': 'Khám tư vấn',
      'checkup': 'Khám tổng quát',
      'emergency': 'Cấp cứu',
      'followup': 'Tái khám'
    };
    return typeMap[type] || 'Khám bệnh';
  };

  // Helper: Format date to DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return 'N/A';
    }
  };

  // Helper: Format medication dosage info
  const formatMedicationInfo = (med) => {
    const parts = [];
    if (med.dosage) parts.push(`Liều: ${med.dosage}`);
    if (med.frequency) parts.push(`Hàm lượng: ${med.frequency}`);
    if (med.duration) parts.push(`Thời gian: ${med.duration}`);
    return parts.join(' • ');
  };

  // Extract data
  const patientInfo = record.patient_info || {};
  const doctorInfo = record.doctor || record.doctor_info || {};
  const visitType = mapVisitType(record.visit_type || record.type);
  const visitDate = record.visit_date || record.created_at || record.date;
  const medications = record.medications || [];
  const ageGender = formatAgeGender(patientInfo);

  // Section Component - Unified emerald theme
  const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-emerald-200">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center shadow-lg flex-shrink-0">
            <Icon size={18} className="text-white" />
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  // Field Component
  const Field = ({ label, value }) => (
    <div>
      <span className="font-medium text-slate-600">{label}:</span>{" "}
      <span className="text-slate-900 font-semibold">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-lg">
              <FileText size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Chi tiết hồ sơ khám bệnh
              </h2>
              <p className="text-emerald-50 text-sm font-medium mt-1">
                {formatDate(visitDate)} • {patientInfo?.name || patientInfo?.full_name || 'Bệnh nhân'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* <button
              onClick={() => {
                // TODO: Download functionality
                toast.info('Tính năng tải xuống đang được phát triển');
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold transition-colors backdrop-blur-sm border border-white/30 flex items-center gap-2"
              disabled={isDownloading}
            >
              <Download size={18} />
              Tải về
            </button> */}
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors border border-white/30"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* BODY - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* (a) KHỐI: Thông tin lần khám */}
            <Section title="Thông tin lần khám" icon={Calendar}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Loại khám" value={visitType} />
                <Field label="Thời gian khám" value={formatDate(visitDate)} />
                {doctorInfo?.full_name && (
                  <div className="col-span-2">
                    <span className="font-medium text-slate-600">Bác sĩ:</span>{" "}
                    <span className="text-slate-900 font-semibold">
                      {doctorInfo.full_name}
                      {/* ✅ Map specialty code to Vietnamese */}
                      {doctorInfo.specialty && ` – ${getSpecialtyName(doctorInfo.specialty)}`}
                      {doctorInfo.subspecialty && `, ${getSpecialtyName(doctorInfo.subspecialty)}`}
                    </span>
                  </div>
                )}
                {(record.id || record._id || record.consultation_id) && (
                  <Field 
                    label="Mã lần khám" 
                    value={record.consultation_id || record.id || record._id} 
                  />
                )}
              </div>
            </Section>

            {/* (b) KHỐI: Thông tin bệnh nhân */}
            <Section title="Thông tin bệnh nhân" icon={User}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field 
                  label="Họ tên" 
                  value={patientInfo.name || patientInfo.full_name} 
                />
                {ageGender && ageGender !== 'N/A' && (
                  <Field label="Tuổi/Giới" value={ageGender} />
                )}
                {patientInfo.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-500" />
                    <Field label="SĐT" value={patientInfo.phone} />
                  </div>
                )}
                {patientInfo.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500" />
                    <Field label="Địa chỉ" value={patientInfo.address} />
                  </div>
                )}
                {patientInfo.insurance_bhyt && (
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-slate-500" />
                    <Field label="BHYT" value={patientInfo.insurance_bhyt} />
                  </div>
                )}
                {patientInfo.insurance?.provider && (
                  <div className="col-span-2">
                    <Field 
                      label="Bảo hiểm" 
                      value={`${patientInfo.insurance.provider} – ${patientInfo.insurance.number || ''}`} 
                    />
                  </div>
                )}
              </div>

              {/* Dị ứng thuốc (Highlight red) */}
              {patientInfo.allergies_medications && (
                <div className="mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-700">⚠️ Dị ứng thuốc:</span>{" "}
                      <span className="text-red-800 font-medium">{patientInfo.allergies_medications}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiền sử bệnh (Highlight) */}
              {patientInfo.medical_history && (
                <div className="mt-3 p-3 bg-teal-50 border-2 border-teal-300 rounded-xl">
                  <div className="flex items-start gap-2">
                    <FileText size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-teal-700">📋 Tiền sử bệnh:</span>{" "}
                      <span className="text-teal-900 font-medium">{patientInfo.medical_history}</span>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* (c) KHỐI: Lý do khám & chẩn đoán */}
            <Section title="Lý do khám & chẩn đoán" icon={Stethoscope}>
              {record.chief_complaint && (
                <div className="mb-4 pb-4 border-b-2 border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                    Lý do khám
                  </div>
                  <p className="text-base text-slate-900 font-medium leading-relaxed">
                    {record.chief_complaint}
                  </p>
                </div>
              )}
              
              {record.diagnosis && (
                <div>
                  <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-2">
                    Chẩn đoán
                  </div>
                  <p className="text-base text-slate-900 font-semibold leading-relaxed">
                    {record.diagnosis}
                  </p>
                </div>
              )}

              {!record.chief_complaint && !record.diagnosis && (
                <p className="text-sm text-slate-500 italic">Chưa có thông tin</p>
              )}
            </Section>

            {/* (d) KHỐI: Điều trị & thuốc */}
            {(record.treatment || medications.length > 0) && (
              <Section title="Điều trị & thuốc" icon={Pill}>
                {/* Hướng dẫn điều trị */}
                {record.treatment && (
                  <div className="mb-6 pb-6 border-b-2 border-emerald-200">
                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                      Hướng dẫn điều trị
                    </div>
                    <p className="text-base text-slate-900 font-medium leading-relaxed">
                      {record.treatment}
                    </p>
                  </div>
                )}

                {/* Thuốc kê đơn */}
                {medications.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-4">
                      Thuốc kê đơn ({medications.length} loại)
                    </div>
                    <div className="space-y-3">
                      {medications.map((med, index) => (
                        <div 
                          key={med.id || index} 
                          className="bg-white rounded-xl p-4 border-2 border-emerald-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 text-base mb-2">
                                {med.name || med.drug_name || 'Tên thuốc'}
                              </h4>
                              <div className="text-sm text-slate-600 space-y-1">
                                {formatMedicationInfo(med) && (
                                  <p className="font-medium">{formatMedicationInfo(med)}</p>
                                )}
                                {med.instructions && (
                                  <p className="text-xs text-slate-500 italic mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                                    💡 {med.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* QR Code for Prescription */}
                    <div className="mt-6 pt-6 border-t-2 border-emerald-200">
                      <PrescriptionQRCode
                        prescription={medications}
                        ehrId={record._id || record.id}
                        patientInfo={patientInfo}
                      />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* (e) KHỐI: Ghi chú thêm */}
            {record.notes && (
              <Section title="Ghi chú của bác sĩ" icon={FileText}>
                <div className="bg-white rounded-xl p-4 border-2 border-emerald-200">
                  <p className="text-base text-slate-900 leading-relaxed">
                    {record.notes}
                  </p>
                </div>
              </Section>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-8 py-4 border-t-2 border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Hồ sơ được tạo: {formatDate(record.created_at || visitDate)}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RecordDetailModal;
