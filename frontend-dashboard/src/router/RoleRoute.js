// src/router/RoleRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleRoute = ({ allowedRoles = [], redirectTo = "/login" }) => {
  const { user } = useAuth();

  // Chưa đăng nhập
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  const userRole = user.role?.toLowerCase();
  const normalizedRoles = allowedRoles.map(role => role.toLowerCase());

  // Không có quyền truy cập
  if (normalizedRoles.length > 0 && !normalizedRoles.includes(userRole)) {
    // Redirect về dashboard phù hợp với role thay vì login
    if (userRole === 'doctor') {
      return <Navigate to="/dashboard/doctor" replace />;
    }
    if (userRole === 'patient') {
      return <Navigate to="/dashboard/patient" replace />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Có quyền - render child routes
  return <Outlet />;
};

export default RoleRoute;