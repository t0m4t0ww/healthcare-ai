import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2 } from "lucide-react";
import axios from "axios";
import RegisterForm from "../components/forms/RegisterForm";

const RegisterPage = () => {
  const navigate = useNavigate();

  // Handle register (patient only) - THỐNG NHẤT: redirect về /login
  const handleRegister = async (values, { setSubmitting, setFieldError, setStatus }) => {
    try {
      const payload = {
        ...values,
        role: 'patient'
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
        successMessage += ' Bạn có thể đăng nhập ngay bây giờ.';
      }
      
      setStatus({
        type: 'success',
        message: successMessage
      });
      
      // Redirect về /login sau 3 giây
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: emailSent 
              ? 'Tài khoản đã được kích hoạt! Vui lòng kiểm tra email để xem thông tin chi tiết.'
              : 'Tài khoản đã được kích hoạt! Bạn có thể đăng nhập ngay.',
            defaultEmail: values.email 
          }
        });
      }, 3000);

    } catch (err) {
      const msg = err?.response?.data?.message || "Đăng ký thất bại.";
      setFieldError("email", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center p-3 md:p-6">
      {/* Background animations */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"
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
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl"
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
            className="absolute w-2 h-2 bg-emerald-400/40 rounded-full"
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
        <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200/50 dark:border-emerald-700/50 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl">
          {/* Header with logo */}
          <div className="text-center mb-4 md:mb-6 lg:mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl"
            >
              <Building2 size={40} className="text-white" strokeWidth={1.5} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2"
            >
              Healthcare AI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-slate-600 dark:text-slate-400 text-xs md:text-sm"
            >
              Đăng ký tài khoản bệnh nhân
            </motion.p>
          </div>

          {/* Register form using component */}
          <RegisterForm 
            onSubmit={handleRegister}
            onSwitchToLogin={() => navigate('/login')}
            submitButtonText="Đăng ký tài khoản"
            showSwitchToLogin={true}
          />

          {/* Back to home button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm transition-colors"
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
            className="text-center mt-8 text-slate-500 dark:text-slate-400 text-sm"
          >
            <p>Phiên bản dành cho Bệnh nhân</p>
            <div className="flex justify-center items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs">Hệ thống hoạt động</span>
            </div>
          </motion.div>
        </div>

        {/* Additional decorative elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute -bottom-20 -left-20 w-32 h-32 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full blur-2xl"
        />
      </motion.div>
    </div>
  );
};

export default RegisterPage;