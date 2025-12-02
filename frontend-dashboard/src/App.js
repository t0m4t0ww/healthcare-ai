// src/App.js - Multi-role với HomePage tách riêng + Chat Widget + Ant Design + Code Splitting
import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme as antdTheme, Spin } from "antd"; // ✅ ANT DESIGN
import viVN from "antd/locale/vi_VN"; // ✅ VIETNAMESE LOCALE

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AppointmentProvider } from "./context/AppointmentContext";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import SkipToContent from "./components/ui/SkipToContent";
import { antdTheme as customAntdTheme } from "./config/antdTheme"; // ✅ CUSTOM THEME

// Layouts - Keep synchronous for initial load
import PublicLayout from "./components/layout/PublicLayout";
import { AdminRoute } from "./router/AdminRouter"; // ✅ Admin Route guard

// ✅ CODE SPLITTING: Lazy load routes for better performance
// Admin routes
const AdminRoutes = lazy(() => import("./router/AdminRouter").then(module => ({ default: module.default })));

// Doctor routes
const DoctorRoutes = lazy(() => import("./router/DoctorRoutes"));

// Pages - Lazy load
const HomePage = lazy(() => import("./pages/HomePage"));
const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

// Patient pages - Lazy load
const PatientDashboard = lazy(() => import("./pages/public/PatientDashboard"));
const PublicBooking = lazy(() => import("./pages/public/PublicBooking"));
const AppointmentsPage = lazy(() => import("./pages/public/AppointmentsPage"));
const PatientRecordsPage = lazy(() => import("./pages/public/PatientRecordsPage"));
const PublicChat = lazy(() => import("./pages/public/PublicChat"));
const CompleteProfile = lazy(() => import("./pages/public/CompleteProfile"));
const PatientProfile = lazy(() => import("./pages/public/PatientProfile"));
const PharmacyPrescriptionView = lazy(() => import("./pages/public/PharmacyPrescriptionView"));

// Route guards
import PrivateRoute from "./router/PrivateRoute";
import DoctorRoute from "./router/DoctorRoute"; // ✅ THÊM DoctorRoute
import { attachAuth } from "./services/chatService";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ Loading component for Suspense
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="text-center">
      <Spin size="large" />
      <p className="text-slate-600 dark:text-slate-400 mt-4">Đang tải...</p>
    </div>
  </div>
);

// Toast theo theme
function ThemedToast() {
  const { theme } = useTheme();
  const toastTheme = theme === "dark" ? "dark" : "light";
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme={toastTheme}
    />
  );
}

// Role-based redirect component
function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const role = (user.role || "").toString().toLowerCase();

  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
  if (role === "patient") return <Navigate to="/patient/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

// ✅ Ant Design Wrapper Component with Theme Support
function AntdThemeWrapper({ children }) {
  const { isDark } = useTheme();
  
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        ...customAntdTheme,
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default function App() {
  useEffect(() => {
    const eject = attachAuth(() => localStorage.getItem("token"));
    return () => eject();
  }, []);
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AntdThemeWrapper>
          <SkipToContent />
          <AuthProvider>
            <NotificationProvider>
              <AppointmentProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      {/* ========== SMART ROUTER HOME ========== */}
                      <Route path="/" element={<HomePage />} />
                      
                      {/* ========== PUBLIC WEBSITE ========== */}
                      <Route path="/" element={<PublicLayout />}>
                        <Route path="landing" element={<LandingPage />} />
                        <Route path="doctors" element={<div className="container mx-auto px-6 py-8"><h1>Public Doctors List</h1></div>} />
                        <Route path="services" element={<div className="container mx-auto px-6 py-8"><h1>Services Page</h1></div>} />
                        <Route path="contact" element={<ContactPage />} />
                        
                        {/* ========== PHARMACY QR VIEW (Public) ========== */}
                        <Route path="pharmacy/prescription/:ehrId" element={<PharmacyPrescriptionView />} />
                      </Route>

                      {/* ========== AUTHENTICATION ========== */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />

                      {/* ========== DOCTOR DASHBOARD ========== */}
                      {/* ✅ Sử dụng DoctorRoutes với layout và menu riêng cho doctor */}
                      <Route 
                        path="/doctor/*" 
                        element={
                          <DoctorRoute>
                            <Suspense fallback={<LoadingFallback />}>
                              <DoctorRoutes />
                            </Suspense>
                          </DoctorRoute>
                        } 
                      />

                      {/* ========== ADMIN DASHBOARD ========== */}
                      {/* ✅ Sử dụng AdminRoutes với layout và menu riêng cho admin */}
                      <Route 
                        path="/admin/*" 
                        element={
                          <AdminRoute>
                            <Suspense fallback={<LoadingFallback />}>
                              <AdminRoutes />
                            </Suspense>
                          </AdminRoute>
                        } 
                      />

                      {/* ========== PATIENT PORTAL ========== */}
                      <Route path="/patient" element={<PublicLayout />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        
                        {/* ✅ Complete Profile - KHÔNG CẦN PrivateRoute vì đã check trong component */}
                        <Route path="complete-profile" element={<CompleteProfile />} />
                        
                        {/* ✅ Patient Profile - Edit thông tin */}
                        <Route 
                          path="profile" 
                          element={
                            <PrivateRoute allowedRoles={["patient"]}>
                              <PatientProfile />
                            </PrivateRoute>
                          } 
                        />
                        
                        <Route 
                          path="dashboard" 
                          element={
                            <PrivateRoute allowedRoles={["patient"]}>
                              <PatientDashboard />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="booking" 
                          element={
                            <PrivateRoute allowedRoles={["patient"]}>
                              <PublicBooking />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="appointments"
                          element={
                            <PrivateRoute allowedRoles={["patient"]}>
                              <AppointmentsPage />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="records" 
                          element={
                            <PrivateRoute allowedRoles={["patient"]}>
                              <PatientRecordsPage />
                            </PrivateRoute>
                          } 
                        />

                        <Route 
                          path="messages" 
                          element={
                            <PrivateRoute allowedRoles={["patient"]}>
                              <PublicChat />
                            </PrivateRoute>
                          } 
                        />
                      </Route>

                      {/* ========== LEGACY ROUTES & REDIRECTS ========== */}
                      <Route path="/dashboard" element={<RoleBasedRedirect />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
       
                  <ThemedToast />
                </AppointmentProvider>
            </NotificationProvider>
          </AuthProvider>
        </AntdThemeWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}