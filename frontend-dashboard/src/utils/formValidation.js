// src/utils/formValidation.js - Centralized Form Validation Schemas
import * as Yup from 'yup';

// Phone number validation (Vietnam format)
const phoneRegex = /^(0|\+84)[0-9]{9}$/;

// Common validation schemas
export const validationSchemas = {
  // Login Form
  login: Yup.object({
    username: Yup.string()
      .required('Vui lòng nhập tên đăng nhập')
      .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
    password: Yup.string()
      .required('Vui lòng nhập mật khẩu')
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  }),

  // Register Form
  register: Yup.object({
    username: Yup.string()
      .required('Vui lòng nhập tên đăng nhập')
      .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
      .max(30, 'Tên đăng nhập không quá 30 ký tự'),
    email: Yup.string()
      .required('Vui lòng nhập email')
      .email('Email không hợp lệ'),
    password: Yup.string()
      .required('Vui lòng nhập mật khẩu')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .matches(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
      .matches(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
    confirmPassword: Yup.string()
      .required('Vui lòng xác nhận mật khẩu')
      .oneOf([Yup.ref('password')], 'Mật khẩu không khớp'),
    name: Yup.string()
      .required('Vui lòng nhập họ tên')
      .min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    phone: Yup.string()
      .matches(phoneRegex, 'Số điện thoại không hợp lệ')
  }),

  // Profile Form
  profile: Yup.object({
    name: Yup.string()
      .required('Vui lòng nhập họ tên')
      .min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: Yup.string()
      .required('Vui lòng nhập email')
      .email('Email không hợp lệ'),
    phone: Yup.string()
      .required('Vui lòng nhập số điện thoại')
      .matches(phoneRegex, 'Số điện thoại không hợp lệ'),
    dateOfBirth: Yup.date()
      .max(new Date(), 'Ngày sinh không được trong tương lai')
      .required('Vui lòng chọn ngày sinh'),
    gender: Yup.string()
      .oneOf(['male', 'female', 'other'], 'Vui lòng chọn giới tính'),
    address: Yup.string()
      .min(5, 'Địa chỉ phải có ít nhất 5 ký tự')
  }),

  // Appointment Booking
  appointment: Yup.object({
    doctor_id: Yup.string()
      .required('Vui lòng chọn bác sĩ'),
    date: Yup.date()
      .min(new Date(), 'Không thể đặt lịch trong quá khứ')
      .required('Vui lòng chọn ngày khám'),
    slot_id: Yup.string()
      .required('Vui lòng chọn giờ khám'),
    reason: Yup.string()
      .required('Vui lòng nhập lý do khám')
      .min(10, 'Lý do khám phải có ít nhất 10 ký tự')
      .max(500, 'Lý do khám không quá 500 ký tự'),
    symptoms: Yup.string()
      .max(1000, 'Triệu chứng không quá 1000 ký tự')
  }),

  // Change Password
  changePassword: Yup.object({
    currentPassword: Yup.string()
      .required('Vui lòng nhập mật khẩu hiện tại'),
    newPassword: Yup.string()
      .required('Vui lòng nhập mật khẩu mới')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .matches(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
      .matches(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
      .notOneOf([Yup.ref('currentPassword')], 'Mật khẩu mới phải khác mật khẩu cũ'),
    confirmPassword: Yup.string()
      .required('Vui lòng xác nhận mật khẩu mới')
      .oneOf([Yup.ref('newPassword')], 'Mật khẩu không khớp')
  }),

  // Contact/Support Form
  contact: Yup.object({
    name: Yup.string()
      .required('Vui lòng nhập họ tên')
      .min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: Yup.string()
      .required('Vui lòng nhập email')
      .email('Email không hợp lệ'),
    subject: Yup.string()
      .required('Vui lòng nhập tiêu đề')
      .min(5, 'Tiêu đề phải có ít nhất 5 ký tự'),
    message: Yup.string()
      .required('Vui lòng nhập nội dung')
      .min(20, 'Nội dung phải có ít nhất 20 ký tự')
      .max(2000, 'Nội dung không quá 2000 ký tự')
  }),

  // Medical Record Form
  medicalRecord: Yup.object({
    diagnosis: Yup.string()
      .required('Vui lòng nhập chẩn đoán')
      .min(10, 'Chẩn đoán phải có ít nhất 10 ký tự'),
    prescription: Yup.string()
      .max(2000, 'Đơn thuốc không quá 2000 ký tự'),
    bloodPressure: Yup.string()
      .matches(/^\d{2,3}\/\d{2,3}$/, 'Huyết áp không hợp lệ (ví dụ: 120/80)'),
    heartRate: Yup.number()
      .min(40, 'Nhịp tim phải từ 40-200')
      .max(200, 'Nhịp tim phải từ 40-200'),
    temperature: Yup.number()
      .min(35, 'Nhiệt độ phải từ 35-42°C')
      .max(42, 'Nhiệt độ phải từ 35-42°C'),
    weight: Yup.number()
      .min(1, 'Cân nặng phải lớn hơn 0')
      .max(500, 'Cân nặng không hợp lệ')
  }),

  // Doctor Add/Edit Form
  doctor: Yup.object({
    name: Yup.string()
      .required('Vui lòng nhập họ tên bác sĩ')
      .min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: Yup.string()
      .required('Vui lòng nhập email')
      .email('Email không hợp lệ'),
    phone: Yup.string()
      .required('Vui lòng nhập số điện thoại')
      .matches(phoneRegex, 'Số điện thoại không hợp lệ'),
    specialization: Yup.string()
      .required('Vui lòng chọn chuyên khoa'),
    licenseNumber: Yup.string()
      .required('Vui lòng nhập số giấy phép hành nghề')
      .min(5, 'Số giấy phép không hợp lệ'),
    experience: Yup.number()
      .min(0, 'Số năm kinh nghiệm không hợp lệ')
      .max(60, 'Số năm kinh nghiệm không hợp lệ')
  })
};

// Validation helper functions
export const validateField = async (schema, field, value) => {
  try {
    await schema.validateAt(field, { [field]: value });
    return null; // No error
  } catch (error) {
    return error.message;
  }
};

export const validateForm = async (schema, values) => {
  try {
    await schema.validate(values, { abortEarly: false });
    return {}; // No errors
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return errors;
  }
};

// Custom validators
export const validators = {
  isVietnamesePhone: (phone) => phoneRegex.test(phone),
  
  isValidDate: (date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  },
  
  isAdult: (dateOfBirth) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const age = today.getFullYear() - birth.getFullYear();
    return age >= 18;
  },
  
  isValidBloodPressure: (bp) => {
    return /^\d{2,3}\/\d{2,3}$/.test(bp);
  },
  
  isValidEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

export default validationSchemas;
