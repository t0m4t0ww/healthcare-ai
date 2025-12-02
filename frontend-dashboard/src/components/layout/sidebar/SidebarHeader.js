// Sidebar Header Component
import React from "react";
import { Link } from "react-router-dom";
import { Activity, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";

export default function SidebarHeader({ collapsed, setCollapsed, toggleTheme, isDark }) {
  return (
    <div className="flex items-center justify-between p-4 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20">
      <Link
        to="/dashboard"
        className={[
          "flex items-center gap-3 hover:opacity-90 transition-all duration-300 hover:scale-105",
          collapsed ? "justify-center" : ""
        ].join(" ")}
      >
        <div className="relative">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold shadow-xl ring-2 ring-emerald-400/30 hover:ring-4 hover:ring-emerald-400/50 transition-all">
            <Activity size={22} className="drop-shadow-lg" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>
        </div>
        
        {!collapsed && (
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent leading-tight">
              HealthCare AI
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Hệ thống y tế thông minh
            </p>
          </div>
        )}
      </Link>

      {!collapsed && (
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-700 transition-all hover:scale-110"
            title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-700 transition-all hover:scale-110"
            title="Thu gọn sidebar (Ctrl+B)"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-110 animate-pulse"
          title="Mở rộng sidebar (Ctrl+B)"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

