import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import axios from "axios";

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("Đang xác nhận email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Thiếu token xác nhận. Vui lòng kiểm tra lại link trong email.");
      return;
    }

    // Call backend to verify email
    const verifyEmail = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/auth/verify-email?token=${token}`
        );

        if (response.data?.success) {
          setStatus("success");
          setMessage(
            response.data?.data?.message ||
              "Email đã được xác nhận thành công! Tài khoản đã được tạo."
          );

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login", {
              state: {
                message:
                  "Email đã được xác nhận thành công! Bạn có thể đăng nhập ngay bây giờ.",
                defaultEmail: response.data?.data?.email,
              },
            });
          }, 3000);
        } else {
          setStatus("error");
          setMessage(
            response.data?.message || "Xác nhận email thất bại. Vui lòng thử lại."
          );
        }
      } catch (error) {
        setStatus("error");
        const errorMessage =
          error?.response?.data?.message ||
          "Không thể xác nhận email. Token có thể đã hết hạn hoặc không hợp lệ.";
        setMessage(errorMessage);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-teal-900/20 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center"
      >
        {status === "loading" && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mx-auto w-16 h-16 mb-4"
            >
              <Loader2 className="w-full h-full text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Đang xác nhận email...
            </h2>
            <p className="text-slate-600 dark:text-slate-400">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 mb-4 text-emerald-600"
            >
              <CheckCircle className="w-full h-full" />
            </motion.div>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              Xác nhận thành công!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Đang chuyển hướng đến trang đăng nhập...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 mb-4 text-red-600"
            >
              <XCircle className="w-full h-full" />
            </motion.div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              Xác nhận thất bại
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Đi đến trang đăng nhập
              </button>
              <button
                onClick={() => navigate("/login?mode=register")}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Đăng ký lại
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;

