// src/pages/AuthPage.js - Complete auth system
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Eye, EyeOff, Mail, Lock, User, Phone, 
  Calendar, MapPin, Shield, CheckCircle, AlertCircle 
} from "lucide-react";

const AuthPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [forceShowAuth, setForceShowAuth] = useState(false);
  
  // Auth mode state
  const [authMode, setAuthMode] = useState(searchParams.get('mode') || 'login');
  const [userRole, setUserRole] = useState(searchParams.get('role') || 'doctor');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update URL when mode/role changes
  useEffect(() => {
    setSearchParams({ mode: authMode, role: userRole });
  }, [authMode, userRole, setSearchParams]);

  // Auto-redirect logic
  useEffect(() => {
    const from = location.state?.from?.pathname;
    const isFromHomepage = from === "/" || !from;
    
    if (user?.token && !forceShowAuth && !isFromHomepage) {
      const dashboardPath = user.role === 'patient' ? '/dashboard/patient' : '/dashboard';
      navigate(dashboardPath, { replace: true });
    }
  }, [navigate, user, forceShowAuth, location.state]);

  // Validation schemas
  const loginSchema = Yup.object({
    email: Yup.string().email("Email không hợp lệ").required("Bắt buộc"),
    password: Yup.string().min(6, "Tối thiểu 6 ký tự").required("Bắt buộc"),
  });

  const registerSchema = Yup.object({
    full_name: Yup.string().min(2, "Tên quá ngắn").required("Bắt buộc"),
    email: Yup.string().email("Email không hợp lệ").required("Bắt buộc"),
    phone: Yup.string().matches(/^[0-9+\-\s()]+$/, "Số điện thoại không hợp lệ").required("Bắt buộc"),
    password: Yup.string().min(8, "Tối thiểu 8 ký tự").required("Bắt buộc"),
    confirm_password: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Mật khẩu không khớp')
      .required("Bắt buộc"),
    dob: Yup.date().max(new Date(), "Ngày sinh không hợp lệ").required("Bắt buộc"),
    gender: Yup.string().oneOf(['male', 'female', 'other'], "Vui lòng chọn giới tính").required("Bắt buộc"),
    address: Yup.string().min(10, "Địa chỉ quá ngắn").required("Bắt buộc"),
    terms: Yup.bool().oneOf([true], 'Bạn phải đồng ý với điều khoản')
  });

  const forgotPasswordSchema = Yup.object({
    email: Yup.string().email("Email không hợp lệ").required("Bắt buộc"),
  });

  // Handle login
  const handleLogin = async (values, { setSubmitting, setFieldError }) => {
    try {
      const res = await axios.post("http://localhost:8000/api/auth/login", values, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      const userData = res.data.data;
      
      // ✅ Check role match - Cảnh báo nếu đăng nhập sai tab
      if (userRole === 'doctor' && userData.role !== 'doctor') {
        console.warn(`[DEBUG] ⚠️ Role mismatch: User trying to login as '${userRole}' but account is '${userData.role}'`);
        if (userData.role === 'patient') {
          setFieldError("email", "⚠️ Tài khoản này là tài khoản Bệnh nhân. Vui lòng đăng nhập ở tab 'Bệnh nhân'.");
        } else if (userData.role === 'admin') {
          setFieldError("email", "⚠️ Tài khoản này là tài khoản Quản lý. Vui lòng đăng nhập ở tab 'Quản lý'.");
        } else {
          setFieldError("email", "⚠️ Tài khoản này không phải của bác sĩ.");
        }
        return;
      }
      if (userRole === 'patient' && userData.role !== 'patient') {
        console.warn(`[DEBUG] ⚠️ Role mismatch: User trying to login as '${userRole}' but account is '${userData.role}'`);
        if (userData.role === 'doctor') {
          setFieldError("email", "⚠️ Tài khoản này là tài khoản Bác sĩ. Vui lòng đăng nhập ở tab 'Bác sĩ'.");
        } else if (userData.role === 'admin') {
          setFieldError("email", "⚠️ Tài khoản này là tài khoản Quản lý. Vui lòng đăng nhập ở tab 'Quản lý'.");
        } else {
          setFieldError("email", "⚠️ Tài khoản này không phải của bệnh nhân.");
        }
        return;
      }
      if (userRole === 'admin' && userData.role !== 'admin') {
        console.warn(`[DEBUG] ⚠️ Role mismatch: User trying to login as '${userRole}' but account is '${userData.role}'`);
        if (userData.role === 'patient') {
          setFieldError("email", "⚠️ Tài khoản này là tài khoản Bệnh nhân. Vui lòng đăng nhập ở tab 'Bệnh nhân'.");
        } else if (userData.role === 'doctor') {
          setFieldError("email", "⚠️ Tài khoản này là tài khoản Bác sĩ. Vui lòng đăng nhập ở tab 'Bác sĩ'.");
        } else {
          setFieldError("email", "⚠️ Tài khoản này không phải của quản lý.");
        }
        return;
      }

      // ✅ Role match - Log success
      console.log("[DEBUG] ✅ Login success:", {
        email: userData.email,
        role: userData.role,
        selectedTab: userRole,
        status: "Role matched"
      });

      localStorage.setItem("token", userData.token);
      login(userData);
      
      const dashboardPath = userData.role === 'patient' ? '/dashboard/patient' : '/dashboard';
      navigate(dashboardPath);
    } catch (err) {
      const msg = err?.response?.data?.message || "Đăng nhập thất bại.";
      setFieldError("email", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle register (patient only)
  const handleRegister = async (values, { setSubmitting, setFieldError, setStatus }) => {
    try {
      const payload = {
        ...values,
        role: 'patient',
        is_active: false // Requires email verification
      };
      delete payload.confirm_password;
      delete payload.terms;

      const res = await axios.post("http://localhost:8000/api/auth/register", payload, {
        headers: { "Content-Type": "application/json" },
      });

      // ✅ Check response for email status
      const emailSent = res.data?.data?.welcome_email_sent;
      const autoVerified = res.data?.data?.auto_verified;
      
      let successMessage = 'Đăng ký thành công!';
      if (emailSent) {
        successMessage += ' Email chào mừng đã được gửi đến hộp thư của bạn.';
      }
      if (autoVerified) {
        successMessage += ' Bạn có thể đăng nhập ngay.';
      }

      setStatus({
        type: 'success',
        message: successMessage
      });
      
      // Switch to login mode after 3 seconds
      setTimeout(() => {
        setAuthMode('login');
        setStatus(null);
      }, 3000);

    } catch (err) {
      const msg = err?.response?.data?.message || "Đăng ký thất bại.";
      setFieldError("email", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (values, { setSubmitting, setStatus }) => {
    try {
      await axios.post("http://localhost:8000/api/auth/forgot-password", values, {
        headers: { "Content-Type": "application/json" },
      });

      setStatus({
        type: 'success',
        message: 'Email khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.'
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Gửi email thất bại.";
      setStatus({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoutAndShowAuth = async () => {
    // ✅ Call backend logout if token exists
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.warn('Backend logout failed:', error);
      }
    }
    
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setForceShowAuth(true);
  };

  const renderRoleSelector = () => (
    <div className="flex bg-white/10 rounded-xl p-1 mb-6 backdrop-blur-sm border border-white/20">
      <button
        onClick={() => setUserRole('doctor')}
        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
          userRole === 'doctor'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
            : 'text-white/70 hover:text-white'
        }`}
      >
        👨‍⚕️ Bác sĩ
      </button>
      <button
        onClick={() => setUserRole('patient')}
        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
          userRole === 'patient'
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
            : 'text-white/70 hover:text-white'
        }`}
      >
        🏥 Bệnh nhân
      </button>
    </div>
  );

  const renderLoginForm = () => (
    <Formik
      initialValues={{ email: "", password: "" }}
      validationSchema={loginSchema}
      onSubmit={handleLogin}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <Field
                name="email"
                type="email"
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder={userRole === 'doctor' ? "doctor@example.com" : "patient@example.com"}
              />
            </div>
            <ErrorMessage name="email" component="div" className="text-red-300 text-sm mt-1" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-white/90 text-sm font-medium mb-2">Mật khẩu</label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <Field
                name="password"
                type={showPassword ? "text" : "password"}
                className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <ErrorMessage name="password" component="div" className="text-red-300 text-sm mt-1" />
          </motion.div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <Field type="checkbox" name="remember" className="mr-2" />
              <span className="text-sm text-white/70">Ghi nhớ đăng nhập</span>
            </label>
            <button
              type="button"
              onClick={() => setAuthMode('forgot')}
              className="text-sm text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              Quên mật khẩu?
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang đăng nhập...
              </div>
            ) : (
              "Đăng nhập"
            )}
          </motion.button>

          {userRole === 'patient' && (
            <div className="text-center">
              <span className="text-white/60">Chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors"
              >
                Đăng ký ngay
              </button>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );

  const renderRegisterForm = () => (
    <Formik
      initialValues={{
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirm_password: "",
        dob: "",
        gender: "",
        address: "",
        terms: false
      }}
      validationSchema={registerSchema}
      onSubmit={handleRegister}
    >
      {({ isSubmitting, status }) => (
        <Form className="space-y-4">
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                status.type === 'success' 
                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200' 
                  : 'bg-red-500/20 border-red-400/30 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <span className="text-sm">{status.message}</span>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <label className="block text-white/90 text-sm font-medium mb-2">Họ và tên *</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Field
                  name="full_name"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Nguyễn Văn An"
                />
              </div>
              <ErrorMessage name="full_name" component="div" className="text-red-300 text-xs mt-1" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <label className="block text-white/90 text-sm font-medium mb-2">Email *</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Field
                  name="email"
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="example@email.com"
                />
              </div>
              <ErrorMessage name="email" component="div" className="text-red-300 text-xs mt-1" />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <label className="block text-white/90 text-sm font-medium mb-2">Số điện thoại *</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Field
                  name="phone"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="0901234567"
                />
              </div>
              <ErrorMessage name="phone" component="div" className="text-red-300 text-xs mt-1" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <label className="block text-white/90 text-sm font-medium mb-2">Ngày sinh *</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Field
                  name="dob"
                  type="date"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                />
              </div>
              <ErrorMessage name="dob" component="div" className="text-red-300 text-xs mt-1" />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <label className="block text-white/90 text-sm font-medium mb-2">Giới tính *</label>
            <Field as="select" name="gender" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm">
              <option value="">Chọn giới tính</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </Field>
            <ErrorMessage name="gender" component="div" className="text-red-300 text-xs mt-1" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <label className="block text-white/90 text-sm font-medium mb-2">Địa chỉ *</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-3 text-white/50" />
              <Field
                name="address"
                as="textarea"
                rows="3"
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
                placeholder="Số nhà, đường, phường, quận, thành phố"
              />
            </div>
            <ErrorMessage name="address" component="div" className="text-red-300 text-xs mt-1" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
              <label className="block text-white/90 text-sm font-medium mb-2">Mật khẩu *</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Field
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <ErrorMessage name="password" component="div" className="text-red-300 text-xs mt-1" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
              <label className="block text-white/90 text-sm font-medium mb-2">Xác nhận mật khẩu *</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Field
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <ErrorMessage name="confirm_password" component="div" className="text-red-300 text-xs mt-1" />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <label className="flex items-start gap-3">
              <Field type="checkbox" name="terms" className="mt-1" />
              <span className="text-sm text-white/80 leading-relaxed">
                Tôi đồng ý với <a href="#" className="text-blue-300 hover:text-blue-200 underline">Điều khoản sử dụng</a> và 
                <a href="#" className="text-blue-300 hover:text-blue-200 underline"> Chính sách bảo mật</a> của hệ thống
              </span>
            </label>
            <ErrorMessage name="terms" component="div" className="text-red-300 text-xs mt-1" />
          </motion.div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang đăng ký...
              </div>
            ) : (
              "Đăng ký tài khoản"
            )}
          </motion.button>

          <div className="text-center">
            <span className="text-white/60">Đã có tài khoản? </span>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="text-blue-300 hover:text-blue-200 font-medium transition-colors"
            >
              Đăng nhập ngay
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );

  const renderForgotPasswordForm = () => (
    <Formik
      initialValues={{ email: "" }}
      validationSchema={forgotPasswordSchema}
      onSubmit={handleForgotPassword}
    >
      {({ isSubmitting, status }) => (
        <Form className="space-y-6">
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                status.type === 'success' 
                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200' 
                  : 'bg-red-500/20 border-red-400/30 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <span className="text-sm">{status.message}</span>
              </div>
            </motion.div>
          )}

          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Quên mật khẩu?</h3>
            <p className="text-white/70 text-sm">Nhập email của bạn để nhận liên kết khôi phục mật khẩu</p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <Field
                name="email"
                type="email"
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder="your-email@example.com"
              />
            </div>
            <ErrorMessage name="email" component="div" className="text-red-300 text-sm mt-1" />
          </motion.div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative overflow-hidden bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </div>
            ) : (
              "Gửi email khôi phục"
            )}
          </motion.button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="text-orange-300 hover:text-orange-200 font-medium transition-colors"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.8,
          type: "spring",
          stiffness: 100
        }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Glass morphism card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Header with logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl"
            >
              <span className="text-3xl">
                {userRole === 'doctor' ? '👨‍⚕️' : '🏥'}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-emerald-200 bg-clip-text text-transparent mb-2"
            >
              Healthcare AI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/70 text-sm"
            >
              {authMode === 'login' && 'Đăng nhập vào hệ thống'}
              {authMode === 'register' && 'Đăng ký tài khoản mới'}  
              {authMode === 'forgot' && 'Khôi phục mật khẩu'}
            </motion.p>
          </div>

          {/* Show current user info if logged in */}
          {user?.token && !forceShowAuth && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <p className="text-white/80 mb-4">Bạn đã đăng nhập với tài khoản:</p>
              <p className="text-emerald-300 font-semibold mb-4">{user.email}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const dashboardPath = user.role === 'patient' ? '/dashboard/patient' : '/dashboard';
                    navigate(dashboardPath);
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  Vào Dashboard
                </button>
                <button
                  onClick={handleLogoutAndShowAuth}
                  className="px-4 py-3 border border-white/30 text-white hover:bg-white/10 rounded-xl transition-all duration-300"
                >
                  Đổi tài khoản
                </button>
              </div>
            </motion.div>
          )}

          {/* Auth forms - only show when not logged in or forced */}
          {(!user?.token || forceShowAuth) && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${authMode}-${userRole}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {/* Role selector - only for login and register */}
                {(authMode === 'login' || authMode === 'register') && renderRoleSelector()}

                {/* Mode tabs */}
                <div className="flex bg-white/5 rounded-xl p-1 mb-6 backdrop-blur-sm border border-white/10">
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                      authMode === 'login'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Đăng nhập
                  </button>
                  {userRole === 'patient' && (
                    <button
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                        authMode === 'register'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Đăng ký
                    </button>
                  )}
                </div>

                {/* Forms */}
                {authMode === 'login' && renderLoginForm()}
                {authMode === 'register' && renderRegisterForm()}
                {authMode === 'forgot' && renderForgotPasswordForm()}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Back to home button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Quay lại trang chủ
            </button>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-8 text-white/60 text-sm"
          >
            <p>
              {userRole === 'doctor' ? 'Phiên bản dành cho Bác sĩ' : 'Phiên bản dành cho Bệnh nhân'}
            </p>
            <div className="flex justify-center items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs">Hệ thống hoạt động</span>
            </div>
          </motion.div>
        </div>

        {/* Additional decorative elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-400/20 to-emerald-400/20 rounded-full blur-2xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute -bottom-20 -left-20 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-purple-400/20 rounded-full blur-2xl"
        />
      </motion.div>
    </div>
  );
};

export default AuthPage;