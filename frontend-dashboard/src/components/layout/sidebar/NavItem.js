// NavItem Component
import React from "react";
import { NavLink } from "react-router-dom";

export default function NavItem({ item, basePath, collapsed, mobile = false }) {
  const Icon = item.icon;
  const fullPath = basePath ? `${basePath}/${item.to}` : item.to;
  
  return (
    <NavLink
      to={fullPath}
      end
      className={({ isActive }) => [
        "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
        // Hover effects
        "hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50",
        "dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20",
        "hover:shadow-md hover:scale-[1.02]",
        // Focus effects
        "focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-2",
        "dark:focus:ring-offset-slate-800",
        // Active state
        isActive
          ? [
              "bg-gradient-to-r from-emerald-500/15 to-teal-500/10",
              "text-emerald-700 dark:text-emerald-300 font-semibold",
              "shadow-lg shadow-emerald-500/20",
              "border-l-4 border-emerald-500",
              "pl-3"
            ].join(" ")
          : [
              "text-slate-700 dark:text-slate-300",
              "hover:text-emerald-700 dark:hover:text-emerald-300",
              "border-l-4 border-transparent pl-3"
            ].join(" "),
      ].join(" ")}
    >
      {/* Icon with badge */}
      <div className="relative flex-shrink-0">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 group-hover:scale-110 transition-transform duration-300">
          <Icon size={mobile ? 20 : 18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        {item.badge && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold shadow-lg shadow-rose-500/50 animate-pulse">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </div>

      {/* Label */}
      {(!collapsed || mobile) && (
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium leading-tight">{item.label}</div>
          {!mobile && item.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
              {item.description}
            </div>
          )}
        </div>
      )}

      {/* Badge (alternative position) */}
      {(!collapsed || mobile) && item.badge && (
        <span className="flex-shrink-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold backdrop-blur-sm border border-emerald-500/30">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

