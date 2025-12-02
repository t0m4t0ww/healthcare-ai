// QuickAction Component
import React from "react";

export default function QuickAction({ item, collapsed, mobile = false }) {
  const Icon = item.icon;
  
  return (
    <button
      onClick={item.action}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
        "hover:bg-slate-100/80 dark:hover:bg-slate-700/80",
        "hover:shadow-md hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-emerald-400/40",
        "text-slate-600 dark:text-slate-400",
        "hover:text-slate-800 dark:hover:text-slate-200",
        "group",
        collapsed && !mobile ? "justify-center" : "",
        mobile ? "w-full text-left" : ""
      ].join(" ")}
      title={collapsed && !mobile ? item.label : undefined}
    >
      <div className={`p-2 rounded-lg ${item.color || 'text-slate-500'} bg-slate-100 dark:bg-slate-700/50 group-hover:scale-110 transition-transform`}>
        <Icon size={16} />
      </div>
      {(!collapsed || mobile) && (
        <span className="text-sm font-medium flex-1">{item.label}</span>
      )}
    </button>
  );
}

