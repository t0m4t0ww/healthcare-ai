// pages/public/PatientProfile.js - REFACTORED WITH ANT DESIGN ✅
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Card,
  Button,
  Progress,
  Alert,
  Spin,
  Space,
  Typography,
  message,
  Badge,
  Collapse,
} from "antd";
import {
  SaveOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  FileTextOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { getPatient, updatePatient } from "../../services/services";

// Import các section components
import BasicInfoSection from "../../components/profile/BasicInfoSection";
import MedicalHistorySection from "../../components/profile/MedicalHistorySection";
import LifestyleSection from "../../components/profile/LifestyleSection";
import VitalSignsSection from "../../components/profile/VitalSignsSection";
import EmergencyContactSection from "../../components/profile/EmergencyContactSection";
import InsuranceSection from "../../components/profile/InsuranceSection";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const ProfileSchema = Yup.object({
  // Thông tin cơ bản
  full_name: Yup.string().required("Bắt buộc").min(2, "Tối thiểu 2 ký tự"),
  phone: Yup.string()
    .matches(/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/, "SĐT VN không hợp lệ")
    .required("Bắt buộc"),
  date_of_birth: Yup.date()
    .max(new Date(), "Ngày sinh phải trước hôm nay")
    .required("Bắt buộc"),
  gender: Yup.string()
    .oneOf(["male", "female", "other"], "Giới tính không hợp lệ")
    .required("Bắt buộc"),
  address: Yup.string().required("Bắt buộc").min(10, "Địa chỉ quá ngắn"),
  
  // Thông tin hành chính
  citizen_id: Yup.string().nullable().matches(/^[0-9]{9,12}$/, "CCCD/CMND phải là 9-12 số"),
  occupation: Yup.string().nullable(),
  insurance_bhyt: Yup.string().nullable().matches(/^[A-Z0-9-]{0,15}$/, "Số thẻ BHYT không hợp lệ"),
  
  // Thông tin y tế
  blood_type: Yup.string()
    .oneOf(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", ""], "Nhóm máu không hợp lệ")
    .nullable(),
  height: Yup.number().min(50, "Chiều cao không hợp lệ").max(250, "Chiều cao không hợp lệ").nullable(),
  weight: Yup.number().min(10, "Cân nặng không hợp lệ").max(300, "Cân nặng không hợp lệ").nullable(),
  
  // Tiền sử bệnh
  medical_history: Yup.string().nullable(),
  chronic_conditions: Yup.string().nullable(),
  past_surgeries: Yup.string().nullable(),
  
  // Dị ứng
  allergies_medications: Yup.string().nullable(),
  allergies_food: Yup.string().nullable(),
  allergies_environment: Yup.string().nullable(),
  
  // Thuốc đang dùng
  current_medications: Yup.string().nullable(),
  
  // Tiêm chủng
  vaccination_history: Yup.string().nullable(),
  
  // Tiền sử gia đình
  family_history: Yup.string().nullable(),
  
  // Thói quen sống
  smoking_status: Yup.string().oneOf(["never", "former", "current", ""], "").nullable(),
  alcohol_consumption: Yup.string().oneOf(["never", "occasional", "regular", ""], "").nullable(),
  exercise_frequency: Yup.string().oneOf(["never", "rarely", "sometimes", "often", "daily", ""], "").nullable(),
  
  // Liên hệ khẩn cấp
  emergency_contact_name: Yup.string().trim().nullable(),
  emergency_contact_phone: Yup.string()
    .matches(/^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/, "SĐT VN không hợp lệ")
    .nullable(),
  emergency_contact_relationship: Yup.string().trim().nullable(),
  
  // Bảo hiểm
  insurance_provider: Yup.string().trim().nullable(),
  insurance_number: Yup.string().trim().nullable(),
});

export default function PatientProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [patientData, setPatientData] = useState(null);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const convertToISODate = (dateString) => {
    if (!dateString) return "";
    try {
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!user || user.role !== "patient") {
      navigate("/login");
    } else {
      loadProfile();
    }
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      const data = await getPatient(user.patient_id);
      console.log('✅ [PatientProfile] Loaded patient data:', data);
      setPatientData(data); // ✅ getPatient() đã trả về data trực tiếp
    } catch (error) {
      console.error("❌ [PatientProfile] Error loading profile:", error);
      message.error("Không thể tải hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = () => {
    if (!patientData) return 0;
    
    // ✅ Đồng bộ với PatientDashboard.js - 21 trường
    const requiredFields = {
      // Thông tin cơ bản (bắt buộc) - 5 trường
      basic: [
        { label: 'Họ và tên', value: patientData.full_name },
        { label: 'Số điện thoại', value: patientData.phone },
        { label: 'Ngày sinh', value: patientData.date_of_birth || patientData.dob },
        { label: 'Giới tính', value: patientData.gender },
        { label: 'Địa chỉ', value: patientData.address },
      ],
      // Thông tin y tế (quan trọng) - 6 trường
      medical: [
        { label: 'Nhóm máu', value: patientData.blood_type },
        { label: 'Chiều cao', value: patientData.height },
        { label: 'Cân nặng', value: patientData.weight },
        { label: 'Tiền sử bệnh', value: patientData.medical_history },
        { label: 'Thông tin dị ứng', value: patientData.allergies_medications || patientData.allergies_food || patientData.allergies_environment },
        { label: 'Thuốc đang dùng', value: patientData.current_medications },
      ],
      // Tiền sử (khuyến khích) - 4 trường
      history: [
        { label: 'Bệnh mãn tính', value: patientData.chronic_conditions },
        { label: 'Phẫu thuật đã qua', value: patientData.past_surgeries },
        { label: 'Lịch sử tiêm chủng', value: patientData.vaccination_history },
        { label: 'Tiền sử gia đình', value: patientData.family_history },
      ],
      // Thói quen sống (khuyến khích) - 3 trường
      lifestyle: [
        { label: 'Tình trạng hút thuốc', value: patientData.smoking_status },
        { label: 'Sử dụng rượu', value: patientData.alcohol_consumption },
        { label: 'Tần suất tập thể dục', value: patientData.exercise_frequency },
      ],
      // Liên hệ khẩn cấp (quan trọng) - 2 trường
      emergency: [
        { label: 'Tên người liên hệ khẩn cấp', value: patientData.emergency_contact?.name },
        { label: 'SĐT liên hệ khẩn cấp', value: patientData.emergency_contact?.phone },
      ],
      // Bảo hiểm (khuyến khích) - 1 trường
      insurance: [
        { label: 'Số thẻ bảo hiểm', value: patientData.insurance_number || patientData.insurance_bhyt },
      ],
    };

    const allFields = [
      ...requiredFields.basic,
      ...requiredFields.medical,
      ...requiredFields.history,
      ...requiredFields.lifestyle,
      ...requiredFields.emergency,
      ...requiredFields.insurance,
    ];

    const filledCount = allFields.filter(field => field.value && String(field.value).trim() !== '').length;
    const percentage = Math.round((filledCount / allFields.length) * 100);
    
    return percentage;
  };

  const getMissingFields = () => {
    if (!patientData) return [];
    
    const requiredFields = {
      basic: [
        { label: 'Họ và tên', value: patientData.full_name },
        { label: 'Số điện thoại', value: patientData.phone },
        { label: 'Ngày sinh', value: patientData.date_of_birth || patientData.dob },
        { label: 'Giới tính', value: patientData.gender },
        { label: 'Địa chỉ', value: patientData.address },
      ],
      medical: [
        { label: 'Nhóm máu', value: patientData.blood_type },
        { label: 'Chiều cao', value: patientData.height },
        { label: 'Cân nặng', value: patientData.weight },
        { label: 'Tiền sử bệnh', value: patientData.medical_history },
        { label: 'Thông tin dị ứng', value: patientData.allergies_medications || patientData.allergies_food || patientData.allergies_environment },
        { label: 'Thuốc đang dùng', value: patientData.current_medications },
      ],
      history: [
        { label: 'Bệnh mãn tính', value: patientData.chronic_conditions },
        { label: 'Phẫu thuật đã qua', value: patientData.past_surgeries },
        { label: 'Lịch sử tiêm chủng', value: patientData.vaccination_history },
        { label: 'Tiền sử gia đình', value: patientData.family_history },
      ],
      lifestyle: [
        { label: 'Tình trạng hút thuốc', value: patientData.smoking_status },
        { label: 'Sử dụng rượu', value: patientData.alcohol_consumption },
        { label: 'Tần suất tập thể dục', value: patientData.exercise_frequency },
      ],
      emergency: [
        { label: 'Tên người liên hệ khẩn cấp', value: patientData.emergency_contact?.name },
        { label: 'SĐT liên hệ khẩn cấp', value: patientData.emergency_contact?.phone },
      ],
      insurance: [
        { label: 'Số thẻ bảo hiểm', value: patientData.insurance_number || patientData.insurance_bhyt },
      ],
    };

    const allFields = [
      ...requiredFields.basic,
      ...requiredFields.medical,
      ...requiredFields.history,
      ...requiredFields.lifestyle,
      ...requiredFields.emergency,
      ...requiredFields.insurance,
    ];

    return allFields
      .filter(field => !field.value || String(field.value).trim() === '')
      .map(field => field.label);
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      console.log('📤 [PatientProfile] Submitting update for patient_id:', user.patient_id);
      console.log('📤 [PatientProfile] Payload preview:', {
        full_name: values.full_name,
        phone: values.phone,
        blood_type: values.blood_type,
        height: values.height,
        weight: values.weight
      });
      
      const payload = {
        full_name: values.full_name,
        phone: values.phone,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        address: values.address,
        
        // Admin info
        citizen_id: values.citizen_id || null,
        occupation: values.occupation || null,
        insurance_bhyt: values.insurance_bhyt || null,
        
        // Medical info
        blood_type: values.blood_type || null,
        height: values.height ? parseFloat(values.height) : null,
        weight: values.weight ? parseFloat(values.weight) : null,
        
        // Medical history
        medical_history: values.medical_history || null,
        chronic_conditions: values.chronic_conditions || null,
        past_surgeries: values.past_surgeries || null,
        
        // Allergies
        allergies_medications: values.allergies_medications || null,
        allergies_food: values.allergies_food || null,
        allergies_environment: values.allergies_environment || null,
        
        // Current meds
        current_medications: values.current_medications || null,
        
        // Vaccination
        vaccination_history: values.vaccination_history || null,
        
        // Family history
        family_history: values.family_history || null,
        
        // Lifestyle
        smoking_status: values.smoking_status || null,
        alcohol_consumption: values.alcohol_consumption || null,
        exercise_frequency: values.exercise_frequency || null,
        
        // Emergency contact
        emergency_contact: {
          name: values.emergency_contact_name || null,
          phone: values.emergency_contact_phone || null,
          relationship: values.emergency_contact_relationship || null
        },
        
        // Insurance - ✅ FIX: Gửi dưới dạng nested object đúng với backend
        insurance: {
          provider: values.insurance_provider || null,
          number: values.insurance_number || null
        }
      };

      // ✅ Sử dụng service updatePatient thay vì api.patch trực tiếp
      const updatedData = await updatePatient(user.patient_id, payload);
      console.log('✅ [PatientProfile] Update successful:', updatedData);
      
      message.success("Cập nhật hồ sơ thành công! ✅");
      await loadProfile();
      await refreshUser();
      setEditMode(false);
    } catch (error) {
      console.error("❌ [PatientProfile] Error updating profile:", error);
      console.error("❌ [PatientProfile] Error response:", error.response?.data);
      message.error(error.response?.data?.error || error.message || "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" />
          <Paragraph className="mt-4 text-base">Đang tải hồ sơ...</Paragraph>
        </div>
      </div>
    );
  }

  const completion = calculateCompletion();
  const missingFields = getMissingFields();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg border-0 bg-gradient-to-r from-emerald-500 to-teal-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Link to="/patient/dashboard">
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined className="text-white" />}
                    size="large"
                    className="!text-white hover:!bg-white/20"
                  />
                </Link>
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                  <FileTextOutlined className="text-3xl text-white" />
                </div>
                <div>
                  <Title level={2} className="!text-white !mb-1">
                    Hồ sơ bệnh án điện tử (EHR)
                  </Title>
                  <Text className="text-white/90 text-base">
                    Quản lý thông tin y tế toàn diện
                  </Text>
                </div>
              </div>
              {!editMode && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  size="large"
                  onClick={() => setEditMode(true)}
                  className="!bg-white !text-emerald-600 !border-0 hover:!bg-emerald-50"
                >
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Completion Badge - Chỉ hiện khi chưa đủ 100% */}
        {completion < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert
              message={
                <Space>
                  <WarningOutlined />
                  <Text strong className="text-base">Độ hoàn thiện hồ sơ: {completion}%</Text>
                </Space>
              }
              description={
                <div>
                  <Paragraph className="!mb-3">
                    Còn {missingFields.length} thông tin cần bổ sung để hoàn thiện hồ sơ
                  </Paragraph>
                  <Progress
                    percent={completion}
                    status={completion === 100 ? "success" : "active"}
                    strokeColor={{
                      '0%': '#f59e0b',
                      '100%': '#10b981',
                    }}
                  />
                  {missingFields.length > 0 && (
                    <Collapse
                      ghost
                      className="mt-4"
                      items={[
                        {
                          key: '1',
                          label: <Text strong>Xem các trường còn thiếu ({missingFields.length})</Text>,
                          children: (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {missingFields.map((field, idx) => (
                                <Badge key={idx} status="warning" text={field} />
                              ))}
                            </div>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              }
              type="warning"
              showIcon
              className="shadow-lg"
            />
          </motion.div>
        )}

        {/* Form */}
        <Formik
          enableReinitialize
          initialValues={{
            // Thông tin cơ bản
            full_name: patientData?.full_name || "",
            phone: patientData?.phone || "",
            email: patientData?.email || "",
            date_of_birth: convertToISODate(patientData?.date_of_birth || patientData?.dob || ""),
            gender: patientData?.gender || "male",
            address: patientData?.address || "",
            
            // Thông tin hành chính
            citizen_id: patientData?.citizen_id || "",
            occupation: patientData?.occupation || "",
            insurance_bhyt: patientData?.insurance_bhyt || "",
            
            // Thông tin y tế
            blood_type: patientData?.blood_type || "",
            height: patientData?.height || "",
            weight: patientData?.weight || "",
            
            // Tiền sử bệnh
            medical_history: patientData?.medical_history || "",
            chronic_conditions: patientData?.chronic_conditions || "",
            past_surgeries: patientData?.past_surgeries || "",
            
            // Dị ứng
            allergies_medications: patientData?.allergies_medications || "",
            allergies_food: patientData?.allergies_food || "",
            allergies_environment: patientData?.allergies_environment || "",
            
            // Thuốc đang dùng
            current_medications: patientData?.current_medications || "",
            
            // Tiêm chủng
            vaccination_history: patientData?.vaccination_history || "",
            
            // Tiền sử gia đình
            family_history: patientData?.family_history || "",
            
            // Thói quen sống
            smoking_status: patientData?.smoking_status || "",
            alcohol_consumption: patientData?.alcohol_consumption || "",
            exercise_frequency: patientData?.exercise_frequency || "",
            
            // Liên hệ khẩn cấp
            emergency_contact_name: patientData?.emergency_contact?.name || "",
            emergency_contact_phone: patientData?.emergency_contact?.phone || "",
            emergency_contact_relationship: patientData?.emergency_contact?.relationship || "",
            
            // Bảo hiểm - ✅ FIX: Đọc từ nested object insurance.provider và insurance.number
            insurance_provider: patientData?.insurance?.provider || "",
            insurance_number: patientData?.insurance?.number || ""
          }}
          validationSchema={ProfileSchema}
          onSubmit={handleSubmit}
        >
          {({ values, isSubmitting }) => (
            <Form className="space-y-6">
              {/* 1. Thông tin cơ bản */}
              <BasicInfoSection editMode={editMode} />

              {/* 2. Tiền sử bệnh & Dị ứng */}
              <MedicalHistorySection editMode={editMode} />

              {/* 3. Thói quen sống */}
              <LifestyleSection editMode={editMode} />

              {/* 4. Dấu hiệu sinh tồn */}
              <VitalSignsSection editMode={editMode} values={values} />

              {/* 5. Liên hệ khẩn cấp */}
              <EmergencyContactSection editMode={editMode} />

              {/* 6. Bảo hiểm */}
              <InsuranceSection editMode={editMode} />

              {/* Action buttons */}
              {editMode && (
                <Card className="sticky bottom-0 shadow-xl border-0">
                  <Space className="w-full justify-end">
                    <Button
                      size="large"
                      icon={<CloseOutlined />}
                      onClick={() => setEditMode(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={isSubmitting}
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </Space>
                </Card>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
