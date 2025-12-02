// router/DoctorRoute.js - Bảo vệ route doctor với logic phân quyền
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * DoctorRoute - Component bảo vệ các route dành riêng cho doctor
 * 
 * Logic phân quyền:
 * 1. Không có token/user → Redirect về /login
 * 2. Role không phải doctor → Redirect về dashboard của role đó
 * 3. Doctor đúng role → Cho phép truy cập
 */
export default function DoctorRoute({ children }) {
  const { user, loading, getDashboardPath } = useAuth(); // ✅ Thêm loading
  const location = useLocation();

  // Lấy user/token dự phòng từ storage
  let storedUser = null;
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }

  const token =
    user?.token ||
    storedUser?.token ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const currentUser = user || storedUser;

  // ✅ Đợi AuthContext load xong trước khi check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  // ❌ Không có token → Redirect về login
  if (!token || !currentUser) {
    console.warn("🚫 DoctorRoute: No token/user found, redirecting to login");
    return (
      <Navigate 
        to="/login" 
        state={{ from: location, message: "Vui lòng đăng nhập để truy cập trang bác sĩ." }}
        replace 
      />
    );
  }

  const userRole = String(currentUser.role || '').toLowerCase();

  // ❌ Không phải doctor → Redirect về dashboard của role đó
  if (userRole !== 'doctor') {
    console.warn(`🚫 DoctorRoute: User role is "${userRole}", not "doctor". Redirecting to their dashboard.`);
    
    const dashboardPath = getDashboardPath(userRole);
    
    return (
      <Navigate 
        to={dashboardPath} 
        state={{ 
          from: location, 
          message: `Bạn không có quyền truy cập trang bác sĩ. Đây là trang dành cho ${userRole === 'admin' ? 'quản trị viên' : 'bệnh nhân'}.` 
        }}
        replace 
      />
    );
  }

  // ✅ Doctor đúng role → Cho phép truy cập
  console.log("✅ DoctorRoute: Doctor access granted");
  return children;
}
