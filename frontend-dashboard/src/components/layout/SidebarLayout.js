// components/layout/SidebarLayout.js - REFACTORED & CLEAN ✅
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "antd";

// Components
import Breadcrumbs from "../ui/Breadcrumbs";
import DoctorAvatar from "../ui/DoctorAvatar";
import DoctorNotificationBell from "../ui/DoctorNotificationBell";
import { NavItem, QuickAction, SidebarHeader, SearchBar } from "./sidebar";

// Context
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function SidebarLayout({ navItems = [], basePath = "" }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Handler: Đăng xuất - Call async logout
  const openLogoutModal = () => setLogoutModalVisible(true);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); // ✅ Call backend logout to mark user offline immediately
      navigate("/login", { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Filter navigation items
  const filteredNavItems = searchQuery
    ? navItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : navItems;

  // Quick actions with logout
  const actions = [
    { 
      icon: LogOut, 
      label: "Đăng xuất", 
      action: openLogoutModal,
      color: "text-red-500"
    },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? '5rem' : '18rem' }}
        className="hidden md:flex flex-col bg-white dark:bg-slate-800 shadow-2xl border-r-2 border-slate-200 dark:border-slate-700 transition-all duration-300"
      >
        {/* Header */}
        <SidebarHeader 
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          toggleTheme={toggleTheme}
          isDark={isDark}
        />

        {/* Search */}
        {!collapsed && (
          <SearchBar 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={[
              "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2",
              collapsed ? "justify-center" : ""
            ].join(" ")}
          >
            {!collapsed && (
              <>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                <span>Điều hướng</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
              </>
            )}
            {collapsed && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </motion.div>

          <AnimatePresence mode="wait">
            {filteredNavItems.length > 0 ? (
              filteredNavItems.map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NavItem 
                    item={item} 
                    basePath={basePath}
                    collapsed={collapsed}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-slate-500 dark:text-slate-400 py-8"
              >
                Không tìm thấy kết quả
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
          <div className={[
            "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2",
            collapsed ? "justify-center" : ""
          ].join(" ")}>
            {!collapsed && (
              <>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                <span>Hành động</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
              </>
            )}
            {collapsed && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
          </div>

          <div className="space-y-1.5">
            {actions.map((item, index) => (
              <QuickAction 
                key={index} 
                item={item} 
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-800 md:hidden flex flex-col border-r-2 border-slate-200 dark:border-slate-700 shadow-2xl"
          >
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold shadow-xl">
                    <Activity size={22} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                </div>
                <div>
                  <h1 className="text-xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    HealthCare AI
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Hệ thống y tế thông minh
                  </p>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all hover:scale-110"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                <span>Điều hướng</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
              </div>
              {navItems.map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NavItem 
                    item={item} 
                    basePath={basePath}
                    collapsed={false}
                    mobile 
                  />
                </motion.div>
              ))}
            </nav>

            {/* Mobile Quick Actions */}
            <div className="p-4 border-t-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                <span>Hành động</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
              </div>
              <div className="space-y-1.5">
                {actions.map((item, index) => (
                  <QuickAction 
                    key={index} 
                    item={item} 
                    collapsed={false}
                    mobile 
                  />
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="app-header sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-b-2 border-slate-200/50 dark:border-slate-700/50 px-6 py-4 z-50 shadow-lg"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileOpen(true)}
                className="p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 md:hidden transition-all shadow-sm"
              >
                <Menu size={20} />
              </motion.button>

              <Breadcrumbs />
            </div>

            <div className="flex items-center gap-3">
              <DoctorNotificationBell />
              <DoctorAvatar compact initials="BS" />
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="main-content flex-1 p-6 overflow-auto relative z-10 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950"
        >
          <Outlet />
        </motion.div>
      </main>
      <Modal
        open={logoutModalVisible}
        title="Đăng xuất khỏi hệ thống?"
        okText="Đăng xuất"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        centered
        confirmLoading={isLoggingOut}
        onOk={handleLogout}
        onCancel={() => {
          if (!isLoggingOut) {
            setLogoutModalVisible(false);
          }
        }}
      >
        <p className="text-slate-600">
          Phiên làm việc hiện tại sẽ kết thúc và bạn cần đăng nhập lại để tiếp tục sử dụng hệ thống.
        </p>
      </Modal>
    </div>
  );
}
