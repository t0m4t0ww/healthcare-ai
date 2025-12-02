// pages/LoginPage.js - Ant Design Version ✅
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Form,
  Input,
  Button,
  Checkbox,
  Alert,
  message,
  Typography,
  Space,
  Segmented
} from "antd";
import {
  MailOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  LoginOutlined,
  UserAddOutlined,
  KeyOutlined
} from "@ant-design/icons";
import { Stethoscope, Building2, UserCog, Shield, FileEdit, KeyRound } from "lucide-react";
import api from "../services/services";
import RegisterForm from "../components/forms/RegisterForm";
import ChangePasswordModal from "../pages/public/components/ChangePasswordModal";
import axios from "axios";
import { setAuthToken } from '../services/chatService';
import { loadCredentials, saveCredentials, clearCredentials } from "../utils/credentialStorage";

const { Title, Text } = Typography;

const LoginPage = () => {
  const { login, user, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  
  // State management
  const [authMode, setAuthMode] = useState('login');
  const [userRole, setUserRole] = useState('doctor');
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleMismatchError, setRoleMismatchError] = useState(null); // ✅ Thêm state cho role mismatch error
  
  // Change password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);

  // Sync authMode with URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode === 'register' && userRole === 'patient') {
      setAuthMode('register');
    } else if (mode === 'forgot' && userRole !== 'admin') {
      setAuthMode('forgot');
    }
  }, [location.search, userRole]);

  // Pre-fill credentials when mode/role changes
  useEffect(() => {
    const saved = loadCredentials(userRole);
    const nextValues = {};

    if (saved?.email) {
      nextValues.email = saved.email;
      nextValues.remember = true;
    } else if (location.state?.defaultEmail) {
      nextValues.email = location.state.defaultEmail;
    }

    nextValues.password = saved?.password || "";
    if (!saved) {
      nextValues.remember = false;
    }

    form.setFieldsValue(nextValues);
  }, [authMode, userRole, form, location.state?.defaultEmail]);

  // Update URL when authMode changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (authMode === 'register') {
      params.set('mode', 'register');
    } else if (authMode === 'forgot') {
      params.set('mode', 'forgot');
    } else {
      params.delete('mode');
    }
    const newSearch = params.toString();
    const newUrl = `/login${newSearch ? `?${newSearch}` : ''}`;
    if (location.pathname + location.search !== newUrl) {
      navigate(newUrl, { replace: true, state: location.state });
    }
  }, [authMode, navigate, location.pathname, location.search, location.state]);

  // Auto-redirect logic
  useEffect(() => {
    const from = location.state?.from?.pathname;
    const isFromHomepage = from === "/" || !from;
    
    if (user?.token && !showLogin && !isFromHomepage) {
      const dashboardPath = getDashboardPath(user.role);
      navigate(dashboardPath, { replace: true });
    }
  }, [navigate, user, showLogin, location.state, getDashboardPath]);

  // ✅ Helper: Check role mismatch and return error message
  const checkRoleMismatch = (selectedRole, apiRole) => {
    if (selectedRole === apiRole) return null;
    
    const roleNames = {
      admin: "Quản lý",
      doctor: "Bác sĩ",
      patient: "Bệnh nhân"
    };
    
    const apiName = roleNames[apiRole] || apiRole;
    
    return {
      message: `⚠️ Tài khoản này là tài khoản ${apiName}. Vui lòng đăng nhập ở tab '${apiName}'.`
    };
  };

  // Handle Login
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const payload = {
        email: values.email.trim(),
        password: values.password,
      };

      const res = await axios.post("http://localhost:8000/api/auth/login", payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      const envelope = res?.data ?? {};
      const data = envelope?.data ?? {};
      const token = data?.token ?? '';
      const u = data?.user ?? {};
      
      if (!token || !u?.email) {
        messageApi.error("Phản hồi đăng nhập không hợp lệ");
        return;
      }

      const apiRole = String(u.role || '').toLowerCase();
      const selectedRole = userRole;

      // ✅ Check role match - Cảnh báo nếu đăng nhập sai tab
      const roleMismatch = checkRoleMismatch(selectedRole, apiRole);
      if (roleMismatch) {
        setRoleMismatchError(roleMismatch.message);
        messageApi.error(roleMismatch.message);
        return;
      }

      // ✅ Clear role mismatch error if role matches
      setRoleMismatchError(null);

      // ✅ Role match - Log success
      console.log("[DEBUG] ✅ Login success:", {
        email: u.email,
        role: apiRole,
        selectedTab: selectedRole,
        status: "Role matched"
      });

      if (values.remember) {
        saveCredentials(selectedRole, payload.email, payload.password);
      } else {
        clearCredentials(selectedRole);
      }

      // Build user data
      const userToStore = {
        id: u.id || data.user_id,
        name: u.name || u.full_name,
        role: apiRole,
        token,
        patient_id: data.patient_id ?? null,
        doctor_id: data.doctor_id ?? null,
        must_change_password: !!u.must_change_password,
      };

      // Store token
      const storage = values.remember ? localStorage : sessionStorage;
      storage.setItem("token", token);
      storage.setItem("user", JSON.stringify(userToStore));

      // Set auth for services
      setAuthToken(token);

      // Update AuthContext
      if (typeof login === "function") {
        await login(values.email, values.password, !!values.remember);
      }

      // Check must change password
      if (userToStore.must_change_password) {
        setTempUserData({ user: userToStore, token });
        sessionStorage.setItem("temp_token", token);
        setMustChangePassword(true);
        setShowChangePassword(true);
        return;
      }

      // Redirect to dashboard
      const dashboardPath = getDashboardPath(userToStore.role);
      messageApi.success(`Đăng nhập thành công! Chào mừng ${userToStore.name}`);
      navigate(dashboardPath, { replace: true });

    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Đăng nhập thất bại.";
      messageApi.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Change Success
  const handlePasswordChangeSuccess = () => {
    if (!tempUserData) {
      messageApi.error("Không tìm thấy thông tin đăng nhập");
      return;
    }

    const { user: userFromTemp, token } = tempUserData;
    
    const updatedUser = { ...userFromTemp, must_change_password: false };
    
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(updatedUser));

    messageApi.success("Đổi mật khẩu thành công! 🎉");

    setShowChangePassword(false);
    setMustChangePassword(false);
    setTempUserData(null);

    const path = getDashboardPath(updatedUser.role);
    navigate(path);
  };

  // ✅ Helper: Validate required fields
  const validateRequiredFields = (values, requiredFields, setFieldError) => {
    for (const field of requiredFields) {
      if (!values[field]) {
        setFieldError(field, `Thiếu trường bắt buộc: ${field}`);
        messageApi.error(`Vui lòng điền đầy đủ thông tin: ${field}`);
        return false;
      }
    }
    return true;
  };

  // Handle Register
  const handleRegister = async (values, { setSubmitting, setFieldError, setStatus }) => {
    try {
      const requiredFields = ['full_name', 'email', 'phone', 'dob', 'gender', 'address', 'password'];
      if (!validateRequiredFields(values, requiredFields, setFieldError)) {
        return;
      }

      const payload = {
        full_name: values.full_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        dob: values.dob,
        gender: values.gender.toLowerCase(),
        address: values.address.trim(),
        password: values.password,
        role: 'patient'
      };

      const response = await api.post("/auth/register", payload);

      const successMessage = response.data?.data?.message || 
                           response.data?.message || 
                           'Đăng ký thành công!';
      const autoVerified = response.data?.data?.auto_verified || false;

      setStatus({ type: 'success', message: successMessage });
      messageApi.success(successMessage);
      
      if (autoVerified) {
        setTimeout(() => {
          setAuthMode('login');
          setStatus(null);
        }, 2000);
      } else {
        setTimeout(() => {
          setAuthMode('login');
          setStatus(null);
          navigate('/login', { 
            replace: true,
            state: { 
              message: 'Vui lòng kiểm tra email để xác nhận tài khoản.',
              defaultEmail: values.email 
            }
          });
        }, 2000);
      }

    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Đăng ký thất bại.";
      setFieldError("email", msg);
      setStatus({ type: 'error', message: msg });
      messageApi.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (values) => {
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", values);
      messageApi.success('Email khôi phục mật khẩu đã được gửi!');
      setTimeout(() => {
        setAuthMode('login');
      }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || "Gửi email thất bại.";
      messageApi.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Render Role Selector
  const renderRoleSelector = () => (
    <div className="mb-6">
      <style>
        {`
          .role-segmented .ant-segmented-item-selected {
            background: linear-gradient(to right, #10b981, #14b8a6) !important;
            color: white !important;
          }
          .role-segmented .ant-segmented-item {
            color: rgba(255, 255, 255, 0.7);
          }
          .role-segmented .ant-segmented-item:hover {
            color: white;
          }
        `}
      </style>
      <Segmented
        block
        size="large"
        value={userRole}
        onChange={(value) => {
          setUserRole(value);
          setRoleMismatchError(null); // ✅ Clear role mismatch error when changing role tab
          if (value === 'admin' && (authMode === 'register' || authMode === 'forgot')) {
            setAuthMode('login');
          }
          if (value === 'doctor' && authMode === 'register') {
            setAuthMode('login');
          }
        }}
        className="role-segmented"
        options={[
          {
            label: (
              <div className="py-1 md:py-2 px-2 md:px-3 flex items-center justify-center gap-1 md:gap-2">
                <UserCog size={20} className="text-white" />
                <span className="font-semibold text-sm md:text-base">Quản lý</span>
              </div>
            ),
            value: 'admin',
          },
          {
            label: (
              <div className="py-1 md:py-2 px-2 md:px-3 flex items-center justify-center gap-1 md:gap-2">
                <Stethoscope size={20} className="text-white" />
                <span className="font-semibold text-sm md:text-base">Bác sĩ</span>
              </div>
            ),
            value: 'doctor',
          },
          {
            label: (
              <div className="py-1 md:py-2 px-2 md:px-3 flex items-center justify-center gap-1 md:gap-2">
                <Building2 size={20} className="text-white" />
                <span className="font-semibold text-sm md:text-base">Bệnh nhân</span>
              </div>
            ),
            value: 'patient',
          },
        ]}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '6px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      />
    </div>
  );

  // Render Mode Tabs
  const renderModeTabs = () => {
    const options = [
      {
        label: (
          <Space>
            <LoginOutlined />
            <span className="font-semibold">Đăng nhập</span>
          </Space>
        ),
        value: 'login',
      },
    ];

    if (userRole === 'patient') {
      options.push({
        label: (
          <Space>
            <UserAddOutlined />
            <span className="font-semibold">Đăng ký</span>
          </Space>
        ),
        value: 'register',
      });
    }

    if (userRole !== 'admin') {
      options.push({
        label: (
          <Space>
            <KeyOutlined />
            <span className="font-semibold">Quên MK</span>
          </Space>
        ),
        value: 'forgot',
      });
    }

    return (
      <div className="mb-6">
        <style>
          {`
            .mode-segmented .ant-segmented-item-selected {
              background: linear-gradient(to right, #10b981, #14b8a6) !important;
              color: white !important;
            }
            .mode-segmented .ant-segmented-item {
              color: rgba(255, 255, 255, 0.7);
            }
            .mode-segmented .ant-segmented-item:hover {
              color: white;
            }
          `}
        </style>
        <Segmented
          block
          size="large"
          value={authMode}
          onChange={setAuthMode}
          options={options}
          className="mode-segmented"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      </div>
    );
  };

  // Render Login Form
  const renderLoginForm = () => (
    <Form
      form={form}
      name="login"
      layout="vertical"
      onFinish={handleLogin}
      initialValues={{ 
        email: location.state?.defaultEmail || "", 
        remember: false,
      }}
      size="large"
    >
      {location.state?.message && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Alert
            message={location.state.message}
            type="info"
            icon={<CheckCircleOutlined />}
            showIcon
            closable
          />
        </motion.div>
      )}

      {/* ✅ Role Mismatch Error Alert - Beautiful Design */}
      {roleMismatchError && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="mb-6"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-red-400/50 bg-gradient-to-br from-red-50/90 via-orange-50/90 to-amber-50/90 dark:from-red-950/30 dark:via-orange-950/30 dark:to-amber-950/30 backdrop-blur-sm shadow-xl">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 animate-pulse"></div>
            
            {/* Content */}
            <div className="relative p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg animate-pulse">
                    <ExclamationCircleOutlined className="text-white text-xl" />
                  </div>
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-red-700 dark:text-red-300 font-bold text-base mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Sai vai trò đăng nhập
                  </h4>
                  <p className="text-red-600 dark:text-red-400 text-sm leading-relaxed">
                    {roleMismatchError}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setRoleMismatchError(null)}
                  className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  aria-label="Đóng"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>
            
            {/* Bottom accent line */}
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"></div>
          </div>
        </motion.div>
      )}

      <Form.Item
        label={<span className="text-white font-semibold text-base">Email</span>}
        name="email"
        rules={[
          { required: true, message: 'Vui lòng nhập email!' },
          { type: 'email', message: 'Email không hợp lệ!' }
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-emerald-500" />}
          placeholder={
            userRole === 'admin' ? "admin@healthcare.com" : 
            userRole === 'doctor' ? "doctor@example.com" : 
            "patient@example.com"
          }
          className="py-3"
        />
      </Form.Item>

      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Mật khẩu</span>}
        name="password"
        rules={[
          { required: true, message: 'Vui lòng nhập mật khẩu!' },
          { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-emerald-500" />}
          placeholder="Nhập mật khẩu"
          className="py-2 md:py-3"
        />
      </Form.Item>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 mb-4 md:mb-6">
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox className="text-white">
            <span className="text-white/90 text-sm md:text-base">Ghi nhớ đăng nhập & mật khẩu</span>
          </Checkbox>
        </Form.Item>
        
        {userRole !== 'admin' && (
          <Button
            type="link"
            onClick={() => setAuthMode('forgot')}
            className="text-emerald-400 hover:text-emerald-300 p-0 text-sm md:text-base"
          >
            Quên mật khẩu?
          </Button>
        )}
      </div>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          icon={<LoginOutlined />}
          className="h-11 md:h-12 text-base md:text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0"
        >
          Đăng nhập ngay
        </Button>
      </Form.Item>

      {userRole === 'patient' && (
        <div className="text-center">
          <Text className="text-white/80">Chưa có tài khoản? </Text>
          <Button
            type="link"
            onClick={() => setAuthMode('register')}
            className="text-emerald-400 hover:text-emerald-300 p-0 font-semibold"
          >
            Đăng ký ngay
          </Button>
        </div>
      )}
    </Form>
  );

  // Render Forgot Password Form
  const renderForgotPasswordForm = () => (
    <Form
      form={form}
      name="forgot"
      layout="vertical"
      onFinish={handleForgotPassword}
      size="large"
    >
      <div className="text-center mb-6">
        <Title level={3} className="!text-white !mb-2">Quên mật khẩu?</Title>
        <Text className="text-white/80">
          Nhập email của bạn để nhận liên kết khôi phục mật khẩu
        </Text>
      </div>

      <Form.Item
        label={<span className="text-white font-semibold text-base">Email</span>}
        name="email"
        rules={[
          { required: true, message: 'Vui lòng nhập email!' },
          { type: 'email', message: 'Email không hợp lệ!' }
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-orange-500" />}
          placeholder="your-email@example.com"
          className="py-3"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          danger
          className="h-12 text-lg font-semibold"
        >
          Gửi email khôi phục
        </Button>
      </Form.Item>

      <div className="text-center">
        <Button
          type="link"
          onClick={() => setAuthMode('login')}
          className="text-orange-400 hover:text-orange-300 font-semibold"
          icon={<ArrowLeftOutlined />}
        >
          Quay lại đăng nhập
        </Button>
      </div>
    </Form>
  );

  return (
    <>
      {contextHolder}
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-3 md:p-6">
      {/* Advanced Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <motion.div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Animated Grid Overlay */}
      <motion.div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)',
        }}
        animate={{
          backgroundPosition: ['0px 0px', '50px 50px'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Floating Medical Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))',
            }}
            animate={{
              y: [-30, -80, -30],
              x: [0, (Math.random() - 0.5) * 40, 0],
              rotate: [0, 360],
              scale: [0.8, 1.3, 0.8],
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          >
            {['🩺', '💊', '🔬', '📊', '⚕️'][i % 5]}
          </motion.div>
        ))}
      </div>

      {/* Particle System */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-emerald-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-40, -150, -40],
              x: [0, (Math.random() - 0.5) * 60, 0],
              opacity: [0, 0.8, 0],
              scale: [0.5, 2, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 50 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }} 
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl md:rounded-3xl p-4 md:p-8 lg:p-10 shadow-2xl">
          {/* Header with logo */}
          <div className="text-center mb-4 md:mb-6 lg:mb-8">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }} 
              className="relative w-20 h-20 md:w-28 md:h-28 mx-auto mb-4 md:mb-6"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-3xl shadow-2xl flex items-center justify-center"
                animate={{
                  boxShadow: [
                    '0 20px 60px rgba(16,185,129,0.4)',
                    '0 20px 80px rgba(20,184,166,0.6)',
                    '0 20px 60px rgba(16,185,129,0.4)',
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              >
                <motion.div
                  className="text-white flex items-center justify-center"
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                  }}
                >
                  {userRole === 'admin' ? (
                    <UserCog size={64} strokeWidth={1.5} />
                  ) : userRole === 'doctor' ? (
                    <Stethoscope size={64} strokeWidth={1.5} />
                  ) : (
                    <Building2 size={64} strokeWidth={1.5} />
                  )}
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-3xl"></div>
              </motion.div>
              <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-3xl blur-2xl animate-pulse"></div>
            </motion.div>
            
            <Title level={1} className="!text-white !mb-2 !text-2xl md:!text-3xl lg:!text-4xl">
              <span className="bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                Healthcare AI
              </span>
            </Title>
            
            <Text className="text-emerald-200 text-sm md:text-base lg:text-lg flex items-center justify-center gap-2">
              {authMode === 'login' && userRole === 'admin' && (
                <>
                  <Shield size={18} />
                  <span>Khu vực quản trị viên</span>
                </>
              )}
              {authMode === 'login' && userRole !== 'admin' && (
                <>
                  <LoginOutlined />
                  <span>Đăng nhập vào hệ thống</span>
                </>
              )}
              {authMode === 'register' && (
                <>
                  <FileEdit size={18} />
                  <span>Tạo tài khoản mới</span>
                </>
              )}
              {authMode === 'forgot' && (
                <>
                  <KeyRound size={18} />
                  <span>Khôi phục tài khoản</span>
                </>
              )}
            </Text>
          </div>

          {/* Forms */}
          {(!user?.token || showLogin) && (
            <AnimatePresence mode="wait">
              <motion.div 
                key={`${authMode}-${userRole}`} 
                initial={{ opacity: 0, x: 50 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -50 }} 
                transition={{ duration: 0.3 }}
              >
                {renderRoleSelector()}
                {renderModeTabs()}
                {authMode === 'login' && renderLoginForm()}
                {authMode === 'register' && (
                  <RegisterForm 
                    onSubmit={handleRegister} 
                    onSwitchToLogin={() => setAuthMode('login')} 
                    submitButtonText="Đăng ký tài khoản" 
                    showSwitchToLogin={true} 
                  />
                )}
                {authMode === 'forgot' && renderForgotPasswordForm()}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 1 }} 
            className="text-center mt-8 pt-6 border-t border-emerald-200/30"
          >
            <Button
              type="link"
              onClick={() => navigate("/landing")}
              icon={<ArrowLeftOutlined />}
              className="text-white/80 hover:text-emerald-400"
            >
              Quay lại trang chủ
            </Button>
          </motion.div>
        </div>
      </motion.div>

        <ChangePasswordModal 
          open={showChangePassword}
          onClose={mustChangePassword ? undefined : () => setShowChangePassword(false)}
          isFirstTime={mustChangePassword}
          onSuccess={handlePasswordChangeSuccess}
        /> 
      </div>
    </>
  );
};

export default LoginPage;
