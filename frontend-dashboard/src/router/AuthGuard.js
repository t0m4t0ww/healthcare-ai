// router/AuthGuard.js - Route guard để check must_change_password
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import ChangePasswordModal from "../components/ui/ChangePasswordModal";
import api from "../services/services";
import { toast } from "react-toastify";

/**
 * AuthGuard component
 * - Check if user is authenticated
 * - Check if user must change password
 * - Show ChangePasswordModal if must_change_password = true
 * - Redirect to login if not authenticated
 */
export default function AuthGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Get token from storage
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      if (!token) {
        setChecking(false);
        return;
      }

      // Call /api/auth/me to get current user info
      const response = await api.get("/auth/me");
      const userData = response.data;
      
      setUser(userData);
      
      // ✅ Check must_change_password
      if (userData.must_change_password) {
        setMustChangePassword(true);
        setShowChangePassword(true);
        
        toast.warning(
          "Bạn phải đổi mật khẩu trước khi sử dụng hệ thống",
          { autoClose: false }
        );
      }
      
    } catch (error) {
      console.error("Auth check failed:", error);
      
      // Token invalid or expired
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      
    } finally {
      setChecking(false);
    }
  };

  const handlePasswordChangeSuccess = async () => {
    setMustChangePassword(false);
    setShowChangePassword(false);
    
    toast.success("Đổi mật khẩu thành công! 🎉");
    
    // Refresh user data
    await checkAuth();
  };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Must change password - Show modal (cannot close until password changed)
  if (mustChangePassword) {
    return (
      <>
        {/* Overlay - Cannot interact with anything */}
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-10 h-10 text-amber-600 dark:text-amber-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Đổi mật khẩu bắt buộc
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Vì lý do bảo mật, bạn cần đổi mật khẩu mặc định trước khi tiếp tục sử dụng hệ thống
              </p>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        <ChangePasswordModal
          open={showChangePassword}
          onClose={undefined} // ✅ Cannot close until password changed
          isFirstTime={true}
          onSuccess={handlePasswordChangeSuccess}
        />
      </>
    );
  }

  // ✅ Authenticated and password is OK
  return <>{children}</>;
}