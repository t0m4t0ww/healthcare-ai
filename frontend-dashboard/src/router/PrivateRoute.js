import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/services";

export default function PrivateRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth(); // ✅ Thêm loading từ AuthContext
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

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

  // ✅ Check profile completion cho patient
  // ⚠️ IMPORTANT: useEffect phải được gọi TRƯỚC mọi early return để tuân thủ Rules of Hooks
  useEffect(() => {
    // Đợi AuthContext load xong trước khi check
    if (loading) {
      return;
    }

    const checkProfileCompletion = async () => {
      // Chỉ check cho patient
      if (currentUser?.role !== "patient") {
        setChecking(false);
        return;
      }

      // Nếu đang ở trang complete-profile thì không check nữa
      if (location.pathname === "/patient/complete-profile") {
        setChecking(false);
        return;
      }

      try {
        // ✅ Use patient_id from user object (not user_id from users collection)
        const patientId = currentUser.patient_id || currentUser.id;
        if (!patientId) {
          console.error("No patient_id found in user object");
          setChecking(false);
          return;
        }

        const response = await api.get(`/patients/${patientId}`);
        const data = response.data?.data || response.data;

        // Check 9/10 required fields (trừ email)
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

        // Nếu < 7 fields → cần hoàn thiện
        if (filledCount < 7) {
          setNeedsProfileCompletion(true);
        }
      } catch (error) {
        console.error("Check profile error:", error);
      } finally {
        setChecking(false);
      }
    };

    if (token && currentUser) {
      checkProfileCompletion();
    } else {
      setChecking(false);
    }
  }, [currentUser, location.pathname, token, loading]);

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

  // Chưa có token => đá về login
  if (!token || !currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Check role nếu có yêu cầu
  if (allowedRoles.length > 0) {
    const userRole = (currentUser.role || "").toString().toLowerCase();
    const allowedRolesLower = allowedRoles.map((r) => r.toString().toLowerCase());
    
    if (!allowedRolesLower.includes(userRole)) {
      return <Navigate to="/login" replace />;
    }
  }

  // ✅ Đang check profile
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  // ✅ Redirect to complete-profile nếu cần
  if (needsProfileCompletion && location.pathname !== "/patient/complete-profile") {
    return <Navigate to="/patient/complete-profile" replace />;
  }

  return children;
}