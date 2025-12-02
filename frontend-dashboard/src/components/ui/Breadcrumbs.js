import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const labelMap = {
  // Common
  "": "Home",
  
  // Doctor routes
  doctor: "Bác sĩ",
  dashboard: "Dashboard",
  schedule: "Lịch hẹn",
  patients: "Bệnh nhân",
  consultation: "Khám bệnh",
  xray: "X-quang",
  chat: "Tin nhắn",
  "ai-assistant": "AI Trợ lý",
  reports: "Báo cáo",
  
  // Admin routes
  admin: "Quản trị",
  doctors: "Bác sĩ",
  appointments: "Lịch hẹn",
  
  // Patient routes
  patient: "Bệnh nhân",
  
  // Others
  xrays: "X-quang",
  report: "Báo cáo",
};

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  // ✅ Debug log
  React.useEffect(() => {
    console.log('🍞 Breadcrumbs render - pathname:', pathname);
  }, [pathname]);

  return (
    <nav className="text-sm text-slate-600 dark:text-slate-300">
      <ul className="flex gap-1 items-center">
        <li><Link to="/" className="hover:underline hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</Link></li>
        {parts.map((seg, i) => {
          const to = "/" + parts.slice(0, i + 1).join("/");
          const label = labelMap[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          const last = i === parts.length - 1;
          return (
            <li key={to} className="flex items-center gap-1">
              <ChevronRight size={14} className="opacity-50" />
              {last ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{label}</span>
              ) : (
                <Link 
                  to={to} 
                  className="hover:underline hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors capitalize"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default React.memo(Breadcrumbs);