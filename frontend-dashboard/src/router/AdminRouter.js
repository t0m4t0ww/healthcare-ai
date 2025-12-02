// src/router/AdminRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  LogoutOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import {
  AdminDashboard,
  DoctorManagement,
  PatientManagement,
  AppointmentManagement,
  PatientRecordsManagement,
  Statistics,
} from '../pages/admin/pages';

const { Header, Sider, Content } = Layout;

/**
 * AdminRoute - Guard bảo vệ các route dành riêng cho admin
 * Logic:
 * 1) Không có token/user → về /login
 * 2) Không phải admin → về dashboard của role tương ứng
 * 3) Admin hợp lệ → render children
 */
export function AdminRoute({ children }) {
  const { user, loading, getDashboardPath } = useAuth(); // ✅ Thêm loading
  const location = useLocation();

  // Lấy user/token dự phòng từ storage
  let storedUser = null;
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }

  const token =
    user?.token ||
    storedUser?.token ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token');

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

  if (!token || !currentUser) {
    console.warn('🚫 AdminRoute: No token/user found, redirecting to login');
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: 'Vui lòng đăng nhập để truy cập trang quản trị.' }}
        replace
      />
    );
  }

  const userRole = String(currentUser.role || '').toLowerCase();

  if (userRole !== 'admin') {
    console.warn(`🚫 AdminRoute: User role is "${userRole}", not "admin". Redirecting to their dashboard.`);
    const dashboardPath = typeof getDashboardPath === 'function' ? getDashboardPath(userRole) : '/';
    return (
      <Navigate
        to={dashboardPath}
        state={{
          from: location,
          message: `Bạn không có quyền truy cập trang quản trị. Đây là trang dành cho ${
            userRole === 'doctor' ? 'bác sĩ' : 'bệnh nhân'
          }.`,
        }}
        replace
      />
    );
  }

  console.log('✅ AdminRoute: Admin access granted');
  return children;
}

/**
 * AdminRoutes - Layout + routing cho admin pages (được bọc bởi AdminRoute)
 * /admin
 *   /dashboard     -> AdminDashboard
 *   /doctors       -> DoctorManagement
 *   /patients      -> PatientManagement
 *   /appointments  -> AppointmentManagement
 *   /statistics    -> Statistics
 */
export default function AdminRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/doctors', icon: <MedicineBoxOutlined />, label: 'Quản lý Bác sĩ' },
    { key: '/admin/patients', icon: <UserOutlined />, label: 'Quản lý Bệnh nhân' },
    { key: '/admin/appointments', icon: <CalendarOutlined />, label: 'Quản lý Lịch hẹn' },
    { key: '/admin/records', icon: <FileTextOutlined />, label: 'Hồ sơ bệnh án' },
    { key: '/admin/statistics', icon: <BarChartOutlined />, label: 'Thống kê' },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
    } else {
      navigate(key);
    }
  };

  // Chọn menu theo path hiện tại (ưu tiên khớp tiền tố)
  const selectedPath = React.useMemo(() => {
    const found = menuItems.find((i) => location.pathname.startsWith(i.key));
    return found ? found.key : '/admin/dashboard';
  }, [location.pathname]);

  return (
    <AdminRoute>
      <Layout className="min-h-screen">
        {/* Sidebar */}
        <Sider
          breakpoint="lg"
          collapsedWidth="0"
          width={250}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
          theme="dark"
        >
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-blue-600">
            <h1 className="text-white text-xl font-bold">Healthcare AI</h1>
          </div>

          {/* Menu */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedPath]}
            onClick={handleMenuClick}
            items={menuItems}
            style={{ marginTop: 16 }}
          />

          {/* Logout ở cuối */}
          <div className="absolute bottom-0 w-full p-4">
            <Menu
              theme="dark"
              mode="inline"
              items={[
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Đăng xuất',
                  danger: true,
                },
              ]}
              onClick={handleMenuClick}
            />
          </div>
        </Sider>

        {/* Main */}
        <Layout style={{ marginLeft: 250 }}>
          {/* Header */}
          <Header
            style={{
              padding: '0 24px',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center justify-between h-full">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">
                  Xin chào, <strong>{user?.name || 'Admin'}</strong>
                </span>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0) || 'A'}
                </div>
              </div>
            </div>
          </Header>

          {/* Content */}
          <Content style={{ margin: 0 }}>
            <Routes>
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Admin Pages */}
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/doctors" element={<DoctorManagement />} />
              <Route path="/patients" element={<PatientManagement />} />
              <Route path="/appointments" element={<AppointmentManagement />} />
              <Route path="/records" element={<PatientRecordsManagement />} />
              <Route path="/statistics" element={<Statistics />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </AdminRoute>
  );
}
