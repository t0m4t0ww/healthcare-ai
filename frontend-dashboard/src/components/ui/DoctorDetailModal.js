// components/ui/DoctorDetailModal.js - WITH AUTO SLOTS (Add/Edit/View)
import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  X, Edit3, Save, User, Phone, Mail, Stethoscope,
  Calendar, Award, Clock, AlertCircle, UserPlus,
  GraduationCap, Globe, Briefcase, Users, BookOpen
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/services";

// Specialty name mapping
const SPECIALTY_NAMES = {
  'general_medicine': 'Nội tổng quát',
  'obstetrics': 'Sản phụ khoa',
  'pediatrics': 'Nhi khoa'
};

// Department name mapping
const DEPARTMENT_NAMES = {
  'general_medicine': 'Nội tổng quát',
  'obstetrics': 'Sản phụ khoa',
  'pediatrics': 'Nhi khoa'
};

const Schema = Yup.object({
  name: Yup.string()
    .required("Bắt buộc nhập họ tên")
    .min(3, "Họ tên phải có ít nhất 3 ký tự"),
  license_no: Yup.string()
    .required("Bắt buộc nhập số CCHN")
    .min(5, "Số CCHN phải có ít nhất 5 ký tự"),
  department: Yup.string().required("Bắt buộc chọn khoa"),
  specialty: Yup.string().required("Bắt buộc nhập chuyên khoa"),
  email: Yup.string().email("Email không hợp lệ").nullable(),
  phone: Yup.string()
    .matches(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số")
    .nullable(),
  years_of_experience: Yup.number()
    .min(0, "Kinh nghiệm không được âm")
    .max(60, "Kinh nghiệm tối đa 60 năm")
    .nullable(),
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayLabels = {
  Mon: "T2", Tue: "T3", Wed: "T4", Thu: "T5",
  Fri: "T6", Sat: "T7", Sun: "CN"
};

// ✅ Mapping days
const daysMap = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
  Sun: "sunday"
};

export default function DoctorDetailModal({
  open,
  onClose,
  doctorId = null,
  onUpdate
}) {
  const isAddMode = !doctorId;
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(isAddMode);

  useEffect(() => {
    if (!open) return;
    if (doctorId) {
      loadDoctorDetail();
      setEditMode(false);
    } else {
      setDoctor(null);
      setEditMode(true);
      setLoading(false);
    }
  }, [open, doctorId]);

  const loadDoctorDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctors/${doctorId}`);
      setDoctor(response.data);
    } catch (error) {
      console.error("❌ Error loading doctor:", error);
      toast.error("Không thể tải thông tin bác sĩ");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Parse working_hours từ doctor data cho initial values
  const parseWorkingHours = (doc) => {
    const workingHours = doc?.doctor_profile?.working_hours || doc?.working_hours || doc?.shift || {};
    const result = {
      monday: { enabled: false, start: "09:00", end: "17:00" },
      tuesday: { enabled: false, start: "09:00", end: "17:00" },
      wednesday: { enabled: false, start: "09:00", end: "17:00" },
      thursday: { enabled: false, start: "09:00", end: "17:00" },
      friday: { enabled: false, start: "09:00", end: "17:00" },
      saturday: { enabled: false, start: "09:00", end: "13:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" }
    };
    
    // Nếu có working_hours
    if (workingHours && typeof workingHours === 'object') {
      Object.keys(workingHours).forEach(day => {
        const config = workingHours[day];
        if (config && config.start && config.end) {
          result[day] = {
            enabled: true,
            start: config.start,
            end: config.end
          };
        }
      });
    }
    
    // Fallback: parse từ shift.days nếu có
    if (doc?.shift?.days && Array.isArray(doc.shift.days)) {
      doc.shift.days.forEach(day => {
        const dayLower = day.toLowerCase();
        if (result[dayLower]) {
          result[dayLower].enabled = true;
          result[dayLower].start = doc.shift.start || "09:00";
          result[dayLower].end = doc.shift.end || "17:00";
        }
      });
    }
    
    return result;
  };

  // ✅ Format working_hours cho View mode
  const formatWorkingHours = (workingHours) => {
    if (!workingHours) return "Chưa cập nhật";
    const workingDays = [];
    Object.keys(workingHours).forEach(day => {
      const config = workingHours[day];
      if (config && config.start && config.end) {
        const dayLabel = {
          monday: "T2", tuesday: "T3", wednesday: "T4", thursday: "T5",
          friday: "T6", saturday: "T7", sunday: "CN"
        }[day];
        workingDays.push(`${dayLabel}: ${config.start}-${config.end}`);
      }
    });
    return workingDays.length > 0 ? workingDays.join(", ") : "Chưa cập nhật";
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // ✅ Build working_hours từ form
      const working_hours = {};
      Object.keys(values.working_hours).forEach(day => {
        const dayConfig = values.working_hours[day];
        if (dayConfig.enabled) {
          working_hours[day] = {
            start: dayConfig.start,
            end: dayConfig.end
          };
        } else {
          working_hours[day] = null;
        }
      });

      // ✅ Build days array cho shift
      const enabledDays = Object.keys(values.working_hours)
        .filter(day => values.working_hours[day].enabled);
      
      // ✅ Get shift start/end từ working hours
      const enabledHours = Object.values(values.working_hours)
        .filter(config => config.enabled);
      
      const shiftStart = enabledHours.length > 0 ? enabledHours[0].start : "09:00";
      const shiftEnd = enabledHours.length > 0 ? enabledHours[0].end : "17:00";

      const payload = {
        full_name: values.name?.trim(),
        license_no: values.license_no?.trim(),
        issuing_authority: values.issuing_authority?.trim() || "",
        department: values.department?.trim(),
        specialty: values.specialty?.trim(),
        subspecialty: values.subspecialty?.trim() || "",
        years_of_experience: parseInt(values.years_of_experience) || 0,
        email: values.email?.trim().toLowerCase() || "",
        phone: values.phone?.trim() || "",
        status: values.status || "active",
        role: values.role || "doctor",

        // ✅ Shift info
        shift: {
          days: enabledDays,
          start: shiftStart,
          end: shiftEnd
        },

        // ✅ New working hours model
        working_hours,
        slot_duration: parseInt(values.slot_duration) || 30,

        on_call: !!values.on_call,

        qualifications: values.qualifications_input
          ? values.qualifications_input.split(",").map(s => s.trim()).filter(Boolean)
          : [],

        languages: values.languages_input
          ? values.languages_input.split(",").map(s => s.trim()).filter(Boolean)
          : ["Tiếng Việt"],

        bio: values.bio?.trim() || `Bác sĩ ${values.specialty} giàu kinh nghiệm`,
        avatar: values.avatar || "👨‍⚕️",
        consultation_fee: parseInt(values.consultation_fee || 500000)
      };

      // ✅ THÊM: Auto regenerate slots option (CHỈ KHI EDIT)
      if (!isAddMode && values.regenerate_slots) {
        payload.regenerate_slots = true;
        payload.slots_duration_days = parseInt(values.slots_duration_days) || 30;
      }
      
      // ✅ THÊM: Auto generate slots (KHI ADD)
      if (isAddMode) {
        payload.auto_generate_slots = values.auto_generate_slots;
        payload.slots_duration_days = parseInt(values.slots_duration_days) || 30;
      }

      const response = isAddMode
        ? await api.post("/doctors", payload)
        : await api.patch(`/doctors/${doctorId}`, payload);

      // ✅ Show success message with slots info
      const slotsInfo = response.data?.slots_info;
      if (slotsInfo && slotsInfo.slots_created > 0) {
        toast.success(
          isAddMode 
            ? `✅ Đã thêm bác sĩ mới! ${slotsInfo.message}`
            : `✅ Đã cập nhật thông tin! ${slotsInfo.message}`
        );
      } else {
        toast.success(isAddMode ? "✅ Đã thêm bác sĩ mới" : "✅ Đã cập nhật thông tin");
      }
      
      if (onUpdate) onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error("❌ Submit error:", error);
      toast.error(error.response?.data?.error || (isAddMode ? "Thêm thất bại" : "Cập nhật thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // ========= View Mode =========
  const ViewMode = () => (
    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Thông tin cơ bản */}
      <div className="space-y-2">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <User size={18} className="text-emerald-500" />
          Thông tin cơ bản
        </h4>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <User size={16} className="text-slate-400 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Họ tên</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {doctor?.name || doctor?.full_name || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <Award size={16} className="text-slate-400 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Số CCHN / Cơ quan cấp</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {doctor?.license_no || "N/A"}
                {doctor?.issuing_authority ? ` / ${doctor.issuing_authority}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <Stethoscope size={16} className="text-slate-400 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Khoa / Chuyên khoa</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {DEPARTMENT_NAMES[doctor?.department] || doctor?.department || "N/A"} / {SPECIALTY_NAMES[doctor?.specialty] || doctor?.specialty || "N/A"}
              </p>
              {doctor?.subspecialty && (
                <p className="text-xs text-slate-500 mt-1">Phân khoa: {doctor.subspecialty}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <Phone size={16} className="text-slate-400 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Số điện thoại</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {doctor?.phone || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <Mail size={16} className="text-slate-400 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {doctor?.email || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lịch làm việc + bổ sung */}
      <div className="space-y-2">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock size={18} className="text-emerald-500" />
          Lịch làm việc & thông tin bổ sung
        </h4>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kinh nghiệm</p>
              <p className="text-sm font-medium">{doctor?.years_of_experience || 0} năm</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trạng thái</p>
              <span
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  doctor?.status === "active"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : doctor?.status === "inactive"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {doctor?.status === "active"
                  ? "Đang làm"
                  : doctor?.status === "inactive"
                  ? "Tạm nghỉ"
                  : "Nghỉ phép"}
              </span>
            </div>
          </div>

          {/* Working hours */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Giờ làm việc</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {formatWorkingHours(doctor?.working_hours || doctor?.shift)}
            </p>
          </div>

          {(doctor?.slot_duration || doctor?.doctor_profile?.slot_duration) && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Thời lượng slot</p>
                  <p className="text-sm font-medium">
                    {doctor?.slot_duration || doctor?.doctor_profile?.slot_duration} phút
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phí khám</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                      doctor?.consultation_fee ||
                        doctor?.price ||
                        500000
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Qualifications */}
          {doctor?.qualifications?.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Bằng cấp</p>
              <div className="flex flex-wrap gap-1">
                {doctor.qualifications.map((qual, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium"
                  >
                    {qual}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {doctor?.languages?.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Ngôn ngữ</p>
              <div className="flex flex-wrap gap-1">
                {doctor.languages.map((lang, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {doctor?.bio && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Tiểu sử</p>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {(() => {
                  const bio = doctor.bio;
                  
                  // Handle structured bio (object)
                  if (typeof bio === 'object' && bio !== null) {
                    return (
                      <div className="space-y-2">
                        {bio.education && (
                          <div className="flex items-start gap-2">
                            <GraduationCap size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Đào tạo:</strong> {bio.education}</span>
                          </div>
                        )}
                        {bio.international_training && (
                          <div className="flex items-start gap-2">
                            <Globe size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Tu nghiệp:</strong> {bio.international_training}</span>
                          </div>
                        )}
                        {bio.experience && (
                          <div className="flex items-start gap-2">
                            <Briefcase size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Kinh nghiệm:</strong> {bio.experience}</span>
                          </div>
                        )}
                        {bio.memberships && (
                          <div className="flex items-start gap-2">
                            <Users size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Hội viên:</strong> {bio.memberships}</span>
                          </div>
                        )}
                        {bio.awards && (
                          <div className="flex items-start gap-2">
                            <Award size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Thành tích:</strong> {bio.awards}</span>
                          </div>
                        )}
                        {bio.publications && (
                          <div className="flex items-start gap-2">
                            <BookOpen size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
                            <span><strong>Công trình:</strong> {bio.publications}</span>
                          </div>
                        )}
                        {bio.summary && <div className="italic mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">{bio.summary}</div>}
                      </div>
                    );
                  }
                  
                  // Handle simple bio (string)
                  return bio;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl my-8 min-h-0">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg text-2xl">
              {doctor?.avatar || (isAddMode ? "👨‍⚕️" : "👨‍⚕️")}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? "Đang tải..." : isAddMode ? "Thêm bác sĩ mới" : doctor?.name || doctor?.full_name || "Chi tiết bác sĩ"}
              </h3>
              {!isAddMode && (
                <p className="text-slate-600 dark:text-slate-400">
                  CCHN: {doctor?.license_no || "N/A"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && !loading && !isAddMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors flex items-center gap-2"
              >
                <Edit3 size={16} />
                Chỉnh sửa
              </button>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Đang tải thông tin...</p>
          </div>
        ) : editMode ? (
          <Formik
            initialValues={{
              name: doctor?.name || doctor?.full_name || "",
              license_no: doctor?.license_no || "",
              issuing_authority: doctor?.issuing_authority || "",
              department: doctor?.department || "",
              specialty: doctor?.specialty || "",
              subspecialty: doctor?.subspecialty || "",
              years_of_experience: doctor?.years_of_experience || "",
              email: doctor?.email || "",
              phone: doctor?.phone || "",
              status: doctor?.status || "active",
              role: doctor?.role || "doctor",
              shift: doctor?.shift || { days: [], start: "08:00", end: "17:00" },

              // ✅ Working hours
              working_hours: parseWorkingHours(doctor),
              slot_duration: doctor?.slot_duration || doctor?.doctor_profile?.slot_duration || 30,

              on_call: doctor?.on_call || false,
              qualifications_input: doctor?.qualifications?.join(", ") || "",
              languages_input: doctor?.languages?.join(", ") || "",
              bio: (() => {
                const bio = doctor?.bio;
                if (!bio) return "";
                // If bio is object (structured), convert to summary text
                if (typeof bio === 'object' && bio !== null) {
                  return bio.summary || bio.education || "";
                }
                // If bio is string, return as is
                return bio;
              })(),
              avatar: doctor?.avatar || "👨‍⚕️",
              consultation_fee: doctor?.consultation_fee || doctor?.price || 500000,
              
              // ✅ THÊM: Auto slots options
              auto_generate_slots: isAddMode ? true : false,
              regenerate_slots: false,
              slots_duration_days: 30
            }}
            validationSchema={Schema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => (
              <Form>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  
                  {/* Thông tin cơ bản */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User size={18} className="text-emerald-500" />
                      Thông tin cơ bản
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Họ và tên *
                        </label>
                        <Field
                          name="name"
                          placeholder="BS. Nguyễn Văn A"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                        {errors.name && touched.name && (
                          <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {errors.name}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Số CCHN *
                        </label>
                        <Field
                          name="license_no"
                          placeholder="BYT-12345"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                        {errors.license_no && touched.license_no && (
                          <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {errors.license_no}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Cơ quan cấp
                        </label>
                        <Field
                          name="issuing_authority"
                          placeholder="Bộ Y tế"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Khoa *
                        </label>
                        <Field
                          name="department"
                          placeholder="Khoa nội"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                        {errors.department && touched.department && (
                          <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {errors.department}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chuyên môn */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Stethoscope size={18} className="text-emerald-500" />
                      Chuyên môn
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Chuyên khoa *
                        </label>
                        <Field
                          name="specialty"
                          placeholder="Tim mạch"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                        {errors.specialty && touched.specialty && (
                          <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {errors.specialty}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Phân khoa
                        </label>
                        <Field
                          name="subspecialty"
                          placeholder="Tim mạch can thiệp"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Số năm kinh nghiệm
                        </label>
                        <Field
                          name="years_of_experience"
                          type="number"
                          min="0"
                          max="60"
                          placeholder="10"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Bằng cấp (phân cách bằng dấu phẩy)
                        </label>
                        <Field
                          name="qualifications_input"
                          placeholder="Thạc sĩ, Bác sĩ nội trú"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Ngôn ngữ (phân cách bằng dấu phẩy)
                        </label>
                        <Field
                          name="languages_input"
                          placeholder="Tiếng Việt, English"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Liên hệ */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Mail size={18} className="text-emerald-500" />
                      Thông tin liên hệ
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Email
                        </label>
                        <Field
                          name="email"
                          type="email"
                          placeholder="doctor@hospital.com"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                        {errors.email && touched.email && (
                          <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {errors.email}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Số điện thoại
                        </label>
                        <Field
                          name="phone"
                          placeholder="0901234567"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                        {errors.phone && touched.phone && (
                          <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {errors.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lịch làm việc */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Clock size={18} className="text-emerald-500" />
                      Lịch làm việc & Giờ khám
                    </h4>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-3">
                      {days.map((shortDay) => {
                        const fullDay = daysMap[shortDay];
                        const dayConfig = values.working_hours[fullDay];
                        
                        return (
                          <div key={fullDay} className="flex items-center gap-4">
                            {/* Checkbox enable/disable */}
                            <label className="flex items-center gap-2 w-20">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-emerald-600 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                                checked={dayConfig.enabled}
                                onChange={(e) => {
                                  setFieldValue(`working_hours.${fullDay}.enabled`, e.target.checked);
                                }}
                              />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {dayLabels[shortDay]}
                              </span>
                            </label>
                            
                            {/* Time inputs */}
                            {dayConfig.enabled ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="time"
                                  className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                                  value={dayConfig.start}
                                  onChange={(e) => {
                                    setFieldValue(`working_hours.${fullDay}.start`, e.target.value);
                                  }}
                                />
                                <span className="text-slate-500">đến</span>
                                <input
                                  type="time"
                                  className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                                  value={dayConfig.end}
                                  onChange={(e) => {
                                    setFieldValue(`working_hours.${fullDay}.end`, e.target.value);
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex-1 text-sm text-slate-400 italic">
                                Ngày nghỉ
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Thời lượng mỗi slot (phút)
                        </label>
                        <Field
                          name="slot_duration"
                          type="number"
                          min="15"
                          max="120"
                          step="15"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Phí khám (VNĐ)
                        </label>
                        <Field
                          name="consultation_fee"
                          type="number"
                          min="0"
                          step="50000"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 w-full">
                          <Field
                            type="checkbox"
                            name="on_call"
                            className="w-4 h-4 text-emerald-600 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Trực on-call
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ✅ AUTO GENERATE/REGENERATE SLOTS SECTION */}
                  <div className="space-y-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl p-5">
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                      <Calendar size={18} className="text-emerald-600" />
                      {isAddMode ? "Tự động tạo lịch khám" : "Cập nhật lịch khám"}
                    </h4>
                    
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAddMode ? values.auto_generate_slots : values.regenerate_slots}
                        onChange={(e) => {
                          if (isAddMode) {
                            setFieldValue('auto_generate_slots', e.target.checked);
                          } else {
                            setFieldValue('regenerate_slots', e.target.checked);
                          }
                        }}
                        className="mt-1 w-5 h-5 text-emerald-600 bg-white dark:bg-slate-700 border-emerald-300 dark:border-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-100 block">
                          {isAddMode 
                            ? "Tự động tạo time slots sau khi thêm bác sĩ"
                            : "Tạo lại time slots dựa trên giờ làm việc mới"
                          }
                        </span>
                        <span className="text-sm text-emerald-700 dark:text-emerald-300">
                          {isAddMode 
                            ? "Hệ thống sẽ tự động tạo lịch khám dựa trên giờ làm việc đã cài đặt"
                            : "⚠️  Slots cũ (chưa book) sẽ bị xóa và tạo mới. Slots đã có lịch hẹn sẽ được giữ nguyên"
                          }
                        </span>
                      </div>
                    </label>
                    
                    {((isAddMode && values.auto_generate_slots) || (!isAddMode && values.regenerate_slots)) && (
                      <div>
                        <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                          Tạo lịch cho bao nhiêu ngày tới?
                        </label>
                        <select
                          value={values.slots_duration_days}
                          onChange={(e) => setFieldValue('slots_duration_days', parseInt(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                        >
                          <option value="7">7 ngày (1 tuần)</option>
                          <option value="14">14 ngày (2 tuần)</option>
                          <option value="30">30 ngày (1 tháng)</option>
                          <option value="60">60 ngày (2 tháng)</option>
                          <option value="90">90 ngày (3 tháng)</option>
                        </select>
                        
                        {(() => {
                          const enabledDays = Object.values(values.working_hours).filter(d => d.enabled).length;
                          const estimatedSlots = Math.floor((values.slots_duration_days / 7) * enabledDays * ((17 - 9) * 60 / values.slot_duration));
                          return (
                            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                              💡 Hệ thống sẽ tự động tạo khoảng <span className="font-bold">{estimatedSlots} slots</span> khám
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Vai trò & Trạng thái */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Stethoscope size={18} className="text-emerald-500" />
                      Vai trò & Trạng thái
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Vai trò *
                        </label>
                        <Field
                          as="select"
                          name="role"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        >
                          <option value="doctor">Bác sĩ lâm sàng</option>
                          <option value="radiologist">Bác sĩ X-quang</option>
                          <option value="admin">Quản trị viên</option>
                        </Field>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Trạng thái
                        </label>
                        <Field
                          as="select"
                          name="status"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        >
                          <option value="active">Đang làm</option>
                          <option value="inactive">Tạm nghỉ</option>
                          <option value="on_leave">Nghỉ phép</option>
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tiểu sử
                      </label>
                      <Field
                        as="textarea"
                        name="bio"
                        rows="3"
                        placeholder="Giới thiệu ngắn về bác sĩ..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAddMode) {
                        onClose();
                      } else {
                        setEditMode(false);
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <X size={16} />
                    {isAddMode ? "Hủy" : "Hủy chỉnh sửa"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {isAddMode ? "Lưu bác sĩ" : "Lưu thay đổi"}
                      </>
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <ViewMode />
        )}
      </div>
    </div>
  );
}