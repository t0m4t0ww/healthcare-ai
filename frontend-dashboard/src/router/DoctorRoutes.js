// src/router/DoctorRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  MessageSquare,
  Bot,
  BarChart3,
  Settings,
} from 'lucide-react';

// Doctor Pages
import DoctorDashboard from '../pages/doctor/DoctorDashboard';
import DoctorSchedule from '../pages/doctor/DoctorSchedule';
import MyPatientsPage from '../pages/doctor/MyPatientsPage';
import ConsultationPage from '../pages/doctor/ConsultationPage';
import XrayResultsPage from '../pages/doctor/XrayResultsPage';
import ChatPage from '../pages/doctor/ChatPage';
import AIAssistantPage from '../pages/doctor/AIAssistantPage';
import ReportsPage from '../pages/doctor/ReportsPage';
import DoctorSettingsPage from '../pages/doctor/DoctorSettingsPage';

// Navigation items cho Doctor
export const doctorNavItems = [
  {
    to: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Tổng quan công việc hôm nay',
  },
  {
    to: 'schedule',
    label: 'Lịch hẹn',
    icon: Calendar,
    badge: null,
    description: 'Quản lý lịch khám bệnh',
  },
  {
    to: 'patients',
    label: 'Bệnh nhân',
    icon: Users,
    badge: null,
    description: 'Danh sách bệnh nhân đã khám',
  },
  {
    to: 'xray',
    label: 'X-quang',
    icon: Activity,
    badge: null,
    description: 'Kết quả chẩn đoán hình ảnh',
  },
  {
    to: 'chat',
    label: 'Tin nhắn',
    icon: MessageSquare,
    badge: null,
    description: 'Chat với bệnh nhân',
  },
  {
    to: 'ai-assistant',
    label: 'AI Trợ lý',
    icon: Bot,
    badge: null,
    description: 'Hỗ trợ chẩn đoán AI',
  },
  {
    to: 'reports',
    label: 'Báo cáo',
    icon: BarChart3,
    badge: null,
    description: 'Thống kê & phân tích',
  },
  {
    to: 'settings',
    label: 'Cài đặt',
    icon: Settings,
    badge: null,
    description: 'Quản lý hồ sơ & bảo mật',
  },
];

const DoctorRoutes = () => {
  return (
    <Routes>
      <Route element={<SidebarLayout navItems={doctorNavItems} basePath="/doctor" />}>
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="consultation/:appointmentId" element={<ConsultationPage />} />
        <Route path="patients" element={<MyPatientsPage />} />
        <Route path="xray" element={<XrayResultsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:conversationId" element={<ChatPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<DoctorSettingsPage />} />
        <Route path="*" element={<Navigate to="/doctor/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default DoctorRoutes;