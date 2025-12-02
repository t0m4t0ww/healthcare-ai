import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Calendar, Phone, Mail, Menu, X, Stethoscope, Users, Clock, 
  ChevronDown, Star, Award, Shield, Globe, ArrowRight,
  Heart, Activity, Zap, MessageCircle, Bell, Home, LogOut, Sun, Moon,
  Send, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import PatientNotificationBell from "../ui/PatientNotificationBell";
import { Modal } from "antd";
import facebookIcon from "../../assets/fb.png";
import zaloIcon from "../../assets/zalo.png";
import tiktokIcon from "../../assets/tiktok.png";
import instagramIcon from "../../assets/insta.png";
import appStoreBadge from "../../assets/appstore.png";
import googlePlayBadge from "../../assets/googleplay.png";

const SOCIAL_LINKS = [
  { 
    name: "Facebook", 
    icon: facebookIcon, 
    href: "#", 
    // Facebook hình tròn xanh -> không cần màu nền container (transparent)
    containerClass: "bg-transparent", 
    // Scale-110 để nó phóng to lấp đầy cái viền bo góc
    imgClass: "w-full h-full object-cover scale-110" 
  },
  { 
    name: "Zalo", 
    icon: zaloIcon, 
    href: "#", 
    // Vẫn giữ nền trắng cho container
    containerClass: "bg-white", 
    // Bỏ padding, dùng scale-90 để logo to ra gần sát khung
    imgClass: "w-full h-full object-contain scale-90" 
  },
  { 
    name: "TikTok", 
    icon: tiktokIcon, 
    href: "#", 
    // TikTok chuẩn app là nền đen
    containerClass: "bg-black", 
    // Padding p-2 để logo chữ 't' nằm giữa
    imgClass: "w-full h-full object-contain p-2" 
  },
  { 
    name: "Instagram", 
    icon: instagramIcon, 
    href: "#", 
    // Instagram gradient -> không cần màu nền container
    containerClass: "bg-transparent", 
    // Scale to lên để lấp đầy khung
    imgClass: "w-full h-full object-cover" 
  }
];

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const isPatientRoute = location.pathname.startsWith('/patient');

  const handleLogoutClick = () => setLogoutModalVisible(true);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };
  
  // ✅ Notifications được handle bởi PatientNotificationBell component (dùng API + Socket.IO)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { 
      name: 'Trang chủ', 
      href: '/', 
      icon: Home
    },
    { 
      name: 'Dịch vụ', 
      href: '/services',
      icon: Stethoscope,
      dropdown: [
        { name: 'Khám tổng quát', href: '/services/general', icon: Stethoscope },
        { name: 'Chẩn đoán AI', href: '/services/ai-diagnosis', icon: Activity },
        { name: 'Tư vấn trực tuyến', href: '/services/consultation', icon: MessageCircle },
        { name: 'Khám cấp cứu', href: '/services/emergency', icon: Zap }
      ]
    },
    { 
      name: 'Bác sĩ', 
      href: '/doctors',
      icon: Users,
      dropdown: [
        { name: 'Nội hô hấp', href: '/doctors/noi_ho_hap', icon: Activity },
        { name: 'Nội tim mạch', href: '/doctors/noi_tim_mach', icon: Heart },
        { name: 'Nội tiêu hóa - Gan mật', href: '/doctors/noi_tieu_hoa', icon: Stethoscope },
        { name: 'Nội thận - Tiết niệu', href: '/doctors/noi_than', icon: Activity }
      ]
    },
    { 
      name: 'Liên hệ', 
      href: '/contact',
      icon: Phone
    }
  ];

  const patientRoutes = [
    { name: 'Tổng quan', href: '/patient/dashboard', icon: Home },
    { name: 'Đặt lịch', href: '/patient/booking', icon: Calendar }, 
    { name: 'Lịch khám', href: '/patient/appointments', icon: Clock },
    { name: 'Hồ sơ', href: '/patient/records', icon: Activity },
    { name: 'Chat', href: '/patient/messages', icon: MessageCircle }, 
  ];

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleDropdownToggle = (index) => {
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  // Different header for patient area
  const PatientHeader = () => (
    <div className="flex items-center justify-between w-full">
      {/* Logo Section */}
      <div className="flex-shrink-0">
        <Link to="/patient/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-blue-400/30 group-hover:ring-blue-400/50 transition-all">
            <Activity size={20} />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Portal Bệnh nhân
            </h1>
            <p className="text-xs text-slate-500">HealthCare AI</p>
          </div>
        </Link>
      </div>

      {/* Navigation - Center */}
      <nav className="hidden md:flex items-center justify-center flex-1 max-w-3xl mx-4">
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-1">
          {patientRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <Link 
                key={route.href}
                to={route.href} 
                className={`relative px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                  location.pathname === route.href 
                    ? 'text-blue-600 bg-white dark:bg-slate-700 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon size={16} />
                <span className="hidden xl:inline">{route.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Actions - Right */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Notifications - Using PatientNotificationBell component */}
        <div className="relative z-50">
          <PatientNotificationBell />
        </div>
        
        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
          <Link to="/patient/profile" className="group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold group-hover:ring-2 group-hover:ring-blue-400/50 transition-all">
              {user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
          </Link>
          <div className="hidden sm:block">
            <Link to="/patient/profile" className="group">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                {user?.name || 'Bệnh nhân'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email?.slice(0, 20) || `ID: ${user?.id?.slice(0, 8) || 'BN001'}`}
              </p>
            </Link>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors group"
            title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {isDark ? (
              <Sun size={18} className="group-hover:scale-110 transition-transform" />
            ) : (
              <Moon size={18} className="group-hover:scale-110 transition-transform" />
            )}
          </button>
          
          {/* Logout Button */}
          <button
          onClick={handleLogoutClick}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
            title="Đăng xuất"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <motion.header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-900/5' 
            : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <nav className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-4">
            
            {isPatientRoute ? <PatientHeader /> : (
              <>
                {/* Logo */}
                <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-all duration-300 group">
                  <motion.div 
                    className="relative w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-xl ring-2 ring-emerald-400/30 group-hover:ring-emerald-400/50 group-hover:shadow-2xl group-hover:shadow-emerald-500/25 transition-all duration-300"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                  >
                    <Activity size={24} />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                  </motion.div>
                  <div className="hidden sm:block">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                      HealthCare AI
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Hệ thống chăm sóc sức khỏe AI
                    </p>
                  </div>
                </Link>

                {/* Navigation */}
                <div className="hidden lg:flex items-center gap-8">
                  {navigation.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.name} className="relative">
                        {item.dropdown ? (
                          <div className="relative">
                            <button
                              onClick={() => handleDropdownToggle(index)}
                              className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-all duration-300 relative group py-2"
                            >
                              <Icon size={16} />
                              {item.name}
                              <ChevronDown 
                                size={16} 
                                className={`transition-transform duration-300 ${
                                  activeDropdown === index ? 'rotate-180' : ''
                                }`} 
                              />
                              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 group-hover:w-full"></span>
                            </button>

                            <AnimatePresence>
                              {activeDropdown === index && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 backdrop-blur-xl z-50"
                                  onMouseLeave={() => setActiveDropdown(null)}
                                >
                                  <div className="p-2">
                                    {item.dropdown.map((subItem) => {
                                      const SubIcon = subItem.icon;
                                      return (
                                        <Link
                                          key={subItem.name}
                                          to={subItem.href}
                                          className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all duration-200 group"
                                          onClick={() => setActiveDropdown(null)}
                                        >
                                          <SubIcon size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                                          <div>
                                            <div className="font-medium">{subItem.name}</div>
                                          </div>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <Link
                            to={item.href}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-all duration-300 relative group py-2"
                          >
                            <Icon size={16} />
                            {item.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 group-hover:w-full"></span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* CTA Buttons */}
                <div className="flex items-center gap-4">
                  {user ? (
                    <div className="flex items-center gap-3">
                      <Link
                        to="/patient/dashboard"
                        className="hidden sm:flex items-center gap-2 px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      >
                        <Home size={16} />
                        Chào {user.name || 'Bệnh nhân'}
                      </Link>
                      
                      <button
                        onClick={handleLogoutClick}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Đăng xuất"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleLoginClick}
                      className="hidden sm:flex items-center gap-2 px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Đăng nhập
                    </motion.button>
                  )}
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/patient/booking"
                      className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300 flex items-center gap-2 group"
                    >
                      <Calendar size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                      Đặt lịch ngay
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </motion.div>

                  <motion.button
                    type="button"
                    className="lg:hidden p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </nav>
      </motion.header>

      {/* Main Content */}
      <main className={isPatientRoute ? "pb-20 md:pb-0" : ""}>
        <Outlet />
      </main>

      {/* Bottom Navigation Bar for Mobile - Patient Routes Only */}
      {isPatientRoute && (
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-900/10"
        >
          <div className="flex items-center justify-around px-2 py-2 max-w-screen-sm mx-auto">
            {patientRoutes.map((route) => {
              const Icon = route.icon;
              const isActive = location.pathname === route.href;
              return (
                <Link
                  key={route.href}
                  to={route.href}
                  className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 flex-1 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon 
                    size={22} 
                    className={`relative z-10 transition-transform ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                  />
                  <span className={`relative z-10 text-xs font-medium transition-colors ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {route.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.nav>
      )}

{/* Footer Mới */}
<footer className={`bg-slate-950 text-slate-300 relative overflow-hidden font-sans border-t border-slate-800/50 ${isPatientRoute ? 'hidden md:block' : ''}`}>
        
        {/* Background Gradients & Patterns */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-soft-light"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-8">
          
          {/* Top Section: Newsletter & Branding */}
          <div className="grid lg:grid-cols-2 gap-12 items-center border-b border-slate-800 pb-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
                  <Activity size={22} />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  HealthCare AI
                </span>
              </div>
              <p className="text-slate-400 max-w-md">
                Đăng ký nhận bản tin sức khỏe và cập nhật công nghệ AI mới nhất trong y học hàng tuần.
              </p>
            </div>
            
            {/* Newsletter Input */}
            <div className="relative">
               <div className="flex gap-2">
                 <input 
                    type="email" 
                    placeholder="Nhập email của bạn..." 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                 />
                 <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30 whitespace-nowrap">
                    Đăng ký <Send size={16} />
                 </button>
               </div>
               <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                 <Shield size={12} /> Chúng tôi cam kết bảo mật thông tin của bạn.
               </p>
            </div>
          </div>

          {/* Main Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-16">
            
            {/* Column 1: Contact */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                Liên hệ
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">
                    Tầng 12, Tòa nhà Bitexco, Q.1, TP. Hồ Chí Minh
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={20} className="text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold hover:text-white transition-colors cursor-pointer">
                    1900 1234
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={20} className="text-emerald-500 shrink-0" />
                  <span className="text-sm hover:text-white transition-colors cursor-pointer">
                    contact@healthcare-ai.vn
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 2: Services */}
            <div>
              <h3 className="text-white font-bold mb-6">Dịch vụ</h3>
              <ul className="space-y-3">
                {['Khám tổng quát', 'Chẩn đoán AI', 'Bác sĩ gia đình', 'Xét nghiệm tại nhà', 'Đặt lịch khám'].map((item) => (
                  <li key={item}>
                    <Link to="#" className="text-sm hover:text-emerald-400 hover:pl-2 transition-all duration-300 block">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Company */}
            <div>
              <h3 className="text-white font-bold mb-6">Về chúng tôi</h3>
              <ul className="space-y-3">
                {['Giới thiệu', 'Đội ngũ bác sĩ', 'Tuyển dụng', 'Tin tức y tế', 'Đối tác'].map((item) => (
                  <li key={item}>
                    <Link to="#" className="text-sm hover:text-emerald-400 hover:pl-2 transition-all duration-300 block">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Social & Download */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-white font-bold mb-6">Kết nối</h3>
              {/*  trong Footer*/}
                  <div className="flex flex-wrap gap-4 mb-8">
                    {SOCIAL_LINKS.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        // Class cho cái khung: rounded-xl, shadow, hover effect...
                        className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-slate-900/20 hover:scale-110 hover:shadow-xl transition-all duration-300 ${item.containerClass}`}
                        aria-label={item.name}
                      >
                        <img
                          src={item.icon}
                          alt={item.name}
                          // Class cho cái ảnh bên trong: object-cover/contain, scale...
                          className={item.imgClass}
                        />
                      </a>
                    ))}
                  </div>
              
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                Tải ứng dụng
              </h4>
              <div className="flex flex-col gap-3">
                 <a
                   href="#"
                   className="bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-3 transition-all flex items-center gap-3 shadow-lg shadow-slate-900/20"
                   aria-label="Tải trên App Store"
                 >
                   <img
                     src={appStoreBadge}
                     alt="App Store"
                     className="h-10 w-auto object-contain"
                   />
                   <div>
                     <div className="text-[10px] text-slate-500 uppercase leading-none">Download on the</div>
                     <div className="text-sm font-semibold text-white">App Store</div>
                   </div>
                 </a>
                 <a
                   href="#"
                   className="bg-slate-900 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-3 transition-all flex items-center gap-3 shadow-lg shadow-slate-900/20"
                   aria-label="Tải trên Google Play"
                 >
                   <img
                     src={googlePlayBadge}
                     alt="Google Play"
                     className="h-10 w-auto object-contain"
                   />
                   <div>
                     <div className="text-[10px] text-slate-500 uppercase leading-none">Get it on</div>
                     <div className="text-sm font-semibold text-white">Google Play</div>
                   </div>
                 </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2025 HealthCare AI. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6">
               <Link to="/privacy" className="text-sm text-slate-500 hover:text-white transition-colors">Bảo mật</Link>
               <Link to="/terms" className="text-sm text-slate-500 hover:text-white transition-colors">Điều khoản</Link>
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-500">Systems Normal</span>
               </div>
            </div>
          </div>
        </div>
      </footer>

      <Modal
        open={logoutModalVisible}
        title="Đăng xuất khỏi HealthCare AI?"
        okText="Đăng xuất"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        centered
        onOk={handleConfirmLogout}
        confirmLoading={isLoggingOut}
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