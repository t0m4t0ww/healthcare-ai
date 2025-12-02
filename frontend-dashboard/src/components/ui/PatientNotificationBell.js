// src/components/ui/PatientNotificationBell.js - Notification Bell dành riêng cho Patient
import React, { useEffect, useRef, useState } from "react";
import { Bell, Check, X, Trash2, Pill, FileText, MessageCircle, Calendar } from "lucide-react";
import { usePatientNotificationsAPI } from "../../hooks/usePatientNotificationsAPI";
import { useNavigate } from "react-router-dom";

function useClickOutside(ref, handler) {
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) handler();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [ref, handler]);
}

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return `${Math.floor(s)}s trước`;
    const m = s / 60;
    if (m < 60) return `${Math.floor(m)}m trước`;
    const h = m / 60;
    if (h < 24) return `${Math.floor(h)}h trước`;
    const days = Math.floor(h / 24);
    return `${days}d trước`;
  } catch {
    return "";
  }
}

const getNotificationIcon = (type) => {
  switch (type) {
    case 'consultation_completed':
      return <Check size={16} className="text-green-500" />;
    case 'ehr_created':
      return <FileText size={16} className="text-blue-500" />;
    case 'follow_up_reminder':
      return <Calendar size={16} className="text-amber-500" />;
    case 'prescription':
      return <Pill size={16} className="text-blue-500" />;
    case 'test_result':
      return <FileText size={16} className="text-green-500" />;
    case 'message':
      return <MessageCircle size={16} className="text-purple-500" />;
    default:
      return <Bell size={16} className="text-slate-500" />;
  }
};

export default function PatientNotificationBell() {
  const navigate = useNavigate();
  
  // ✅ Dùng API-based hook thay vì localStorage
  const {
    notifications = [],
    unreadCount = 0,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = usePatientNotificationsAPI(true, 60000); // Auto-fetch, refresh mỗi 60s

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const handleNotificationClick = (notification) => {
    // Đánh dấu đã đọc
    markAsRead(notification._id);
    
    // Navigate dựa trên type
    if (notification.type === 'consultation_completed' || notification.type === 'ehr_created') {
      navigate('/patient/medical-records');
    } else if (notification.type === 'follow_up_reminder') {
      navigate('/patient/appointments');
    } else if (notification.type === 'prescription') {
      navigate('/patient/medical-records');
    } else if (notification.type === 'test_result') {
      navigate('/patient/test-results');
    } else if (notification.type === 'message') {
      navigate('/patient/messages');
    }
    
    setOpen(false);
  };
  
  const handleDeleteAll = () => {
    // Xóa tất cả notifications
    notifications.forEach(notif => deleteNotification(notif._id));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Thông báo. ${unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} className="text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          
          <div 
            className="absolute right-0 mt-2 w-96 max-w-[90vw] sm:max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
            role="dialog"
            aria-label="Thông báo của bạn"
            aria-modal="true"
          >
            {/* Header - Patient Style */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Thông báo của bạn</h3>
                  {unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-1"
                      onClick={markAllAsRead}
                      title="Đánh dấu đã đọc"
                      disabled={loading}
                    >
                      <Check size={12} />
                      Đọc hết
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
                      onClick={handleDeleteAll}
                      title="Xoá tất cả"
                      disabled={loading}
                    >
                      <Trash2 size={12} />
                      Xoá
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">Đang tải...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Bell size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Không có thông báo mới</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Thông báo về toa thuốc, kết quả xét nghiệm sẽ hiển thị ở đây
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={[
                        "px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group",
                        !notification.is_read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                      ].join(" ")}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                              {notification.title || "Thông báo"}
                            </h4>
                            <time className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {timeAgo(notification.created_at)}
                            </time>
                          </div>
                          
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            {!notification.is_read && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 ml-2">
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            title="Xoá"
                            disabled={loading}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <button 
                  className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1"
                  onClick={() => {
                    navigate('/patient/appointments');
                    setOpen(false);
                  }}
                >
                  Xem lịch hẹn của tôi
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
