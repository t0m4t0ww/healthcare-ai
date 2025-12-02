// src/components/ui/NotificationBell.js
import React, { useEffect, useRef, useState } from "react";
import { Bell, Check, X, Trash2 } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

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

export default function NotificationBell() {
  const {
    items = [],
    unread = 0,
    markAllAsRead,
    markAsRead,
    remove,
    clear,
    msgUnreadTotal = 0,
  } = useNotifications() || {};

  const totalBadge = (unread || 0) + (msgUnreadTotal || 0);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-ghost btn-circle relative hover:bg-base-200/80 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell size={18} className="text-base-content/70" />
        {totalBadge > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm animate-pulse">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Invisible backdrop for mobile to ensure dropdown stays on top */}
          <div className="notification-backdrop md:hidden" onClick={() => setOpen(false)} />
          
          {/* Dropdown - với z-index cao nhất */}
          <div className="notification-dropdown absolute right-0 mt-2 w-96 max-w-[90vw] bg-base-100 border border-base-300 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-base-300/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-primary" />
                  <h3 className="font-semibold text-base-content">Thông báo</h3>
                  {totalBadge > 0 && (
                    <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-medium">
                      {totalBadge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      className="btn btn-ghost btn-xs gap-1 text-success hover:bg-success/10"
                      onClick={markAllAsRead}
                      title="Đánh dấu đã đọc"
                    >
                      <Check size={12} />
                      Đọc hết
                    </button>
                  )}
                  {items.length > 0 && (
                    <button
                      className="btn btn-ghost btn-xs gap-1 text-error hover:bg-error/10"
                      onClick={clear}
                      title="Xoá tất cả"
                    >
                      <Trash2 size={12} />
                      Xoá
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={32} className="mx-auto text-base-content/30 mb-2" />
                  <p className="text-sm text-base-content/60">Chưa có thông báo mới</p>
                </div>
              ) : (
                <div className="divide-y divide-base-300/50">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className={[
                        "px-4 py-3 hover:bg-base-200/40 transition-colors cursor-default",
                        !it.read ? "bg-primary/5" : ""
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-medium text-sm text-base-content truncate">
                              {it.title || "Thông báo"}
                            </h4>
                            <time className="text-xs text-base-content/50 whitespace-nowrap">
                              {timeAgo(it.ts)}
                            </time>
                          </div>
                          
                          <p className="text-xs text-base-content/80 line-clamp-2 mb-2">
                            {it.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            {!it.read && (
                              <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                                <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!it.read && (
                            <button
                              className="btn btn-ghost btn-xs w-8 h-8 p-0 text-success hover:bg-success/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(it.id);
                              }}
                              title="Đánh dấu đã đọc"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-xs w-8 h-8 p-0 text-error hover:bg-error/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(it.id);
                            }}
                            title="Xoá"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-4 py-2 bg-base-200/30 border-t border-base-300/50">
                <button className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1">
                  Xem tất cả thông báo
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}