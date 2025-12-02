// pages/public/CompleteProfile.js - REFACTORED WITH ANT DESIGN ✅
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Card,
  Steps,
  Button,
  Input,
  Select,
  DatePicker,
  Form as AntForm,
  Space,
  Typography,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Progress,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import api from "../../services/services";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CompleteProfileSchema = Yup.object({
  // ✅ Basic Information (Required)
  full_name: Yup.string()
    .required("Họ và tên là bắt buộc")
    .min(2, "Tối thiểu 2 ký tự")
    .max(100, "Tối đa 100 ký tự"),
  
  phone: Yup.string()
    .matches(/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/, "Số điện thoại Việt Nam không hợp lệ")
    .required("Số điện thoại là bắt buộc"),
  
  date_of_birth: Yup.string()
    .required("Ngày sinh là bắt buộc")
    .test("is-valid-date", "Ngày sinh không hợp lệ", function(value) {
      if (!value) return false;
      const date = dayjs(value);
      if (!date.isValid()) return false;
      if (date.isAfter(dayjs())) return false;
      return true;
    }),
  
  gender: Yup.string()
    .oneOf(["male", "female", "other"], "Giới tính không hợp lệ")
    .required("Giới tính là bắt buộc"),
  
  address: Yup.string()
    .required("Địa chỉ là bắt buộc")
    .min(10, "Địa chỉ quá ngắn (tối thiểu 10 ký tự)")
    .max(300, "Địa chỉ quá dài (tối đa 300 ký tự)"),
  
  // ✅ Medical Information (Required)
  blood_type: Yup.string()
    .oneOf(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], "Nhóm máu không hợp lệ")
    .required("Nhóm máu là bắt buộc"),
  
  // ✅ Emergency Contact (Required)
  emergency_contact_name: Yup.string()
    .required("Tên người liên hệ khẩn cấp là bắt buộc")
    .min(2, "Tối thiểu 2 ký tự")
    .max(100, "Tối đa 100 ký tự"),
  
  emergency_contact_phone: Yup.string()
    .matches(/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/, "Số điện thoại không hợp lệ")
    .required("Số điện thoại liên hệ khẩn cấp là bắt buộc"),
  
  emergency_contact_relationship: Yup.string()
    .trim()
    .max(50, "Tối đa 50 ký tự")
    .nullable(),
  
  // ✅ Insurance (Required)
  insurance_provider: Yup.string()
    .trim()
    .max(100, "Tối đa 100 ký tự")
    .nullable(),
  
  insurance_number: Yup.string()
    .required("Số thẻ bảo hiểm là bắt buộc")
    .min(10, "Số thẻ bảo hiểm không hợp lệ (tối thiểu 10 ký tự)")
    .max(30, "Số thẻ bảo hiểm quá dài (tối đa 30 ký tự)"),
});

export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Nếu không phải patient hoặc đã complete profile → redirect
    if (user.role !== "patient") {
      navigate("/");
      return;
    }

    loadPatientProfile();
  }, [user, navigate]);

  const loadPatientProfile = async () => {
    try {
      // ✅ Use patient_id from user object
      const patientId = user.patient_id || user.id;
      
      console.log("🔍 CompleteProfile - Loading patient:", {
        user_id: user.id,
        patient_id: user.patient_id,
        role: user.role,
        email: user.email,
        using_id: patientId,
        full_user_object: user
      });
      
      if (!patientId) {
        message.error("Không tìm thấy thông tin bệnh nhân. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }

      console.log(`📡 Calling API: GET /patients/${patientId}`);
      const response = await api.get(`/patients/${patientId}`);
      const data = response.data?.data || response.data;
      console.log("✅ Patient data loaded:", data);
      setPatientData(data);
      
      // Check if profile is already complete
      const requiredFields = [
        data.full_name,
        data.phone,
        data.date_of_birth || data.dob,
        data.gender,
        data.address,
        data.blood_type,
        data.emergency_contact?.name,
        data.emergency_contact?.phone,
        data.insurance?.number
      ];
      
      const filledCount = requiredFields.filter(f => f && String(f).trim() !== "").length;
      
      if (filledCount >= 9) {
        // Profile đã đầy đủ → redirect to dashboard
        message.info("Hồ sơ của bạn đã hoàn thiện!");
        navigate("/patient/dashboard");
        return;
      }
      
      setLoading(false);
    } catch (error) {
      console.error("❌ Load patient error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Better error messages
      if (error.response?.status === 404) {
        message.error("⚠️ Không tìm thấy hồ sơ bệnh nhân. Bác sĩ chưa tạo hồ sơ cho bạn. Vui lòng liên hệ bác sĩ.");
      } else if (error.response?.status === 401) {
        message.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        message.error(error.response?.data?.error || "Không thể tải thông tin. Vui lòng thử lại.");
      }
      
      setLoading(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    console.log("🚀 handleSubmit called with values:", values);
    console.log("🚀 User object:", user);
    
    try {
      // ✅ Use patient_id from user object
      const patientId = user.patient_id || user.id;
      if (!patientId) {
        console.error("❌ No patient_id found in user object");
        message.error("Không tìm thấy thông tin bệnh nhân");
        setSubmitting(false);
        return;
      }
      
      console.log("✅ Patient ID:", patientId);

      // ✅ Validate required fields before submit
      const missingFields = [];
      
      if (!values.full_name?.trim()) missingFields.push("Họ và tên");
      if (!values.phone?.trim()) missingFields.push("Số điện thoại");
      if (!values.date_of_birth) missingFields.push("Ngày sinh");
      if (!values.gender) missingFields.push("Giới tính");
      if (!values.address?.trim()) missingFields.push("Địa chỉ");
      if (!values.blood_type) missingFields.push("Nhóm máu");
      if (!values.emergency_contact_name?.trim()) missingFields.push("Tên người liên hệ khẩn cấp");
      if (!values.emergency_contact_phone?.trim()) missingFields.push("SĐT liên hệ khẩn cấp");
      if (!values.insurance_number?.trim()) missingFields.push("Số thẻ bảo hiểm");

      if (missingFields.length > 0) {
        message.error(`⚠️ Vui lòng điền đầy đủ: ${missingFields.join(", ")}`);
        setSubmitting(false);
        return;
      }

      // ✅ Validate emergency contact phone format
      const phoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/;
      if (values.emergency_contact_phone && !phoneRegex.test(values.emergency_contact_phone.trim())) {
        setErrors({ emergency_contact_phone: "Số điện thoại không hợp lệ" });
        message.error("Số điện thoại liên hệ khẩn cấp không hợp lệ");
        setSubmitting(false);
        return;
      }

      // ✅ Format date_of_birth to ISO string (YYYY-MM-DD)
      let formattedDob = values.date_of_birth;
      if (formattedDob) {
        // If it's a dayjs object, format it
        if (dayjs.isDayjs(formattedDob)) {
          formattedDob = formattedDob.format('YYYY-MM-DD');
        } 
        // If it's a Date object, format it
        else if (formattedDob instanceof Date) {
          formattedDob = dayjs(formattedDob).format('YYYY-MM-DD');
        }
        // If it's already a string, ensure it's in YYYY-MM-DD format
        else if (typeof formattedDob === 'string') {
          formattedDob = dayjs(formattedDob).format('YYYY-MM-DD');
        }
      }

      // ✅ Build payload
      const payload = {
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        date_of_birth: formattedDob,
        dob: formattedDob, // Backend might use both fields
        gender: values.gender,
        address: values.address.trim(),
        blood_type: values.blood_type || null,
        
        emergency_contact: {
          name: values.emergency_contact_name?.trim() || "",
          phone: values.emergency_contact_phone?.trim() || "",
          relationship: values.emergency_contact_relationship?.trim() || ""
        },
        
        insurance: {
          provider: values.insurance_provider?.trim() || "",
          number: values.insurance_number?.trim() || "",
        }
      };

      console.log("📤 Submitting patient profile update:", {
        patientId,
        payload,
        originalDate: values.date_of_birth,
        formattedDate: formattedDob
      });

      // ✅ Call API
      const response = await api.patch(`/patients/${patientId}`, payload);
      console.log("✅ Profile updated successfully:", response.data);
      
      message.success("✅ Đã hoàn thiện hồ sơ thành công!");
      
      // ✅ Refresh user data to get latest profile
      await refreshUser();
      
      // ✅ Redirect to dashboard after successful update
      setTimeout(() => {
        navigate("/patient/dashboard");
      }, 1000);
      
    } catch (error) {
      console.error("❌ Update profile error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // ✅ Better error handling
      if (error.response?.status === 404) {
        message.error("Không tìm thấy hồ sơ bệnh nhân. Vui lòng liên hệ bác sĩ.");
      } else if (error.response?.status === 401) {
        message.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || "Dữ liệu không hợp lệ";
        message.error(`❌ ${errorMsg}`);
        
        // ✅ Show validation errors if any
        if (error.response?.data?.errors && setErrors) {
          const validationErrors = error.response.data.errors;
          Object.keys(validationErrors).forEach(field => {
            setErrors({ [field]: validationErrors[field] });
          });
        }
      } else if (error.response?.status === 403) {
        message.error("Bạn không có quyền cập nhật hồ sơ này.");
      } else if (!error.response) {
        message.error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
        message.error(`❌ ${errorMsg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl shadow-xl mb-4">
            <UserOutlined style={{ fontSize: 40, color: 'white' }} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Hoàn thiện hồ sơ bệnh án
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Vui lòng cung cấp đầy đủ thông tin để bác sĩ có thể chăm sóc bạn tốt hơn
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            step === 1 ? "bg-emerald-500 text-white" : "bg-white text-slate-600"
          } shadow-lg transition-all`}>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <span className="font-medium">Thông tin cơ bản</span>
          </div>
          <ArrowRightOutlined style={{ fontSize: 20, color: '#94a3b8' }} />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            step === 2 ? "bg-emerald-500 text-white" : "bg-white text-slate-600"
          } shadow-lg transition-all`}>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <span className="font-medium">Thông tin y tế</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
          <Formik
            initialValues={{
              full_name: patientData?.full_name || user?.name || "",
              phone: patientData?.phone || "",
              date_of_birth: (patientData?.date_of_birth || patientData?.dob || "").slice(0, 10),
              gender: patientData?.gender || "male",
              address: patientData?.address || "",
              blood_type: patientData?.blood_type || "",
              
              emergency_contact_name: patientData?.emergency_contact?.name || "",
              emergency_contact_phone: patientData?.emergency_contact?.phone || "",
              emergency_contact_relationship: patientData?.emergency_contact?.relationship || "",
              
              insurance_provider: patientData?.insurance?.provider || "",
              insurance_number: patientData?.insurance?.number || "",
            }}
            validationSchema={CompleteProfileSchema}
            validateOnChange={true}
            validateOnBlur={true}
            enableReinitialize={true}
            onSubmit={(values, formikBag) => {
              console.log("✅ Formik onSubmit triggered with values:", values);
              console.log("✅ Formik bag:", formikBag);
              handleSubmit(values, formikBag);
            }}
          >
            {({ errors, touched, isSubmitting, values, isValid }) => {
              // ✅ Debug: Log form state
              console.log("📋 Form state:", {
                isSubmitting,
                isValid,
                errors,
                values: {
                  ...values,
                  date_of_birth: values.date_of_birth ? (typeof values.date_of_birth === 'string' ? values.date_of_birth : values.date_of_birth.toString()) : null
                }
              });
              
              return (
                <FormikForm className="space-y-6">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <UserOutlined style={{ fontSize: 24, color: '#10b981' }} />
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Thông tin cơ bản</h2>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <Field
                        name="full_name"
                        placeholder="Nguyễn Văn A"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all text-slate-900 dark:text-white"
                      />
                      <ErrorMessage name="full_name" component="div" className="text-rose-500 text-sm mt-1" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Số điện thoại <span className="text-rose-500">*</span>
                        </label>
                        <Field
                          name="phone"
                          placeholder="0901234567"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all text-slate-900 dark:text-white"
                        />
                        <ErrorMessage name="phone" component="div" className="text-rose-500 text-sm mt-1" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Ngày sinh <span className="text-rose-500">*</span>
                        </label>
                        <Field
                          type="date"
                          name="date_of_birth"
                          max={new Date().toISOString().slice(0, 10)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all text-slate-900 dark:text-white"
                        />
                        <ErrorMessage name="date_of_birth" component="div" className="text-rose-500 text-sm mt-1" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Giới tính <span className="text-rose-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="gender"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </Field>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Địa chỉ <span className="text-rose-500">*</span>
                      </label>
                      <Field
                        as="textarea"
                        name="address"
                        rows={3}
                        placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all resize-none text-slate-900 dark:text-white"
                      />
                      <ErrorMessage name="address" component="div" className="text-rose-500 text-sm mt-1" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // Validate step 1 fields
                        const step1Errors = ["full_name", "phone", "date_of_birth", "gender", "address"]
                          .filter(field => errors[field] || !values[field]);
                        
                        if (step1Errors.length > 0) {
                          toast.error("Vui lòng điền đầy đủ thông tin cơ bản");
                          return;
                        }
                        
                        setStep(2);
                      }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      Tiếp tục
                      <ArrowRightOutlined style={{ fontSize: 20 }} />
                    </button>
                  </div>
                )}

                {/* Step 2: Medical Info */}
                {step === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <HeartOutlined style={{ fontSize: 24, color: '#ef4444' }} />
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Thông tin y tế</h2>
                    </div>

                    {/* Blood Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Nhóm máu <span className="text-rose-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="blood_type"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-600 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">-- Chọn nhóm máu --</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </Field>
                      <ErrorMessage name="blood_type" component="div" className="text-rose-500 text-sm mt-1" />
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <ExclamationCircleOutlined style={{ fontSize: 20, color: '#d97706' }} />
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Liên hệ khẩn cấp <span className="text-rose-500">*</span>
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Họ tên <span className="text-rose-500">*</span>
                          </label>
                          <Field
                            name="emergency_contact_name"
                            placeholder="Nguyễn Văn B (người thân)"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                          />
                          <ErrorMessage name="emergency_contact_name" component="div" className="text-rose-500 text-sm mt-1" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Số điện thoại <span className="text-rose-500">*</span>
                            </label>
                            <Field
                              name="emergency_contact_phone"
                              placeholder="0901234567"
                              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-600 transition-all text-slate-900 dark:text-white"
                            />
                            <ErrorMessage name="emergency_contact_phone" component="div" className="text-rose-500 text-sm mt-1" />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quan hệ</label>
                            <Field
                              name="emergency_contact_relationship"
                              placeholder="Vợ/Chồng/Cha/Mẹ/Con..."
                              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            />
                            <ErrorMessage name="emergency_contact_relationship" component="div" className="text-rose-500 text-sm mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <SafetyOutlined style={{ fontSize: 20, color: '#2563eb' }} />
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Bảo hiểm y tế <span className="text-rose-500">*</span>
                        </h3>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nhà cung cấp</label>
                          <Field
                            name="insurance_provider"
                            placeholder="BHYT / Bảo Việt / Prudential..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-slate-900 dark:text-white"
                          />
                          <ErrorMessage name="insurance_provider" component="div" className="text-rose-500 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Số thẻ <span className="text-rose-500">*</span>
                          </label>
                          <Field
                            name="insurance_number"
                            placeholder="DN1234567890"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-slate-900 dark:text-white"
                          />
                          <ErrorMessage name="insurance_number" component="div" className="text-rose-500 text-sm mt-1" />
                        </div>
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all duration-300"
                      >
                        Quay lại
                      </button>
                      
                      <button
                        type="submit"
                        disabled={isSubmitting || !isValid}
                        onClick={(e) => {
                          console.log("🔘 Submit button clicked");
                          console.log("🔘 Form state:", { isSubmitting, isValid, errors, values });
                          // Let Formik handle the submit
                        }}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <CheckCircleOutlined style={{ fontSize: 20 }} />
                            Hoàn tất
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </FormikForm>
              );
            }}
          </Formik>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <DashboardOutlined style={{ fontSize: 24, color: '#2563eb', flexShrink: 0, marginTop: 4 }} />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Tại sao cần thông tin này?</h3>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li>✅ Giúp bác sĩ chẩn đoán chính xác hơn</li>
                <li>✅ Lưu trữ hồ sơ bệnh án điện tử (EHR) an toàn</li>
                <li>✅ Liên hệ khẩn cấp khi cần thiết</li>
                <li>✅ Thanh toán bảo hiểm thuận tiện</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
