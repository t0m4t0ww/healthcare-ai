// Sidebar constants
import { Bell, Settings, HelpCircle, Shield } from "lucide-react";

export const SIDEBAR_WIDTH = {
  EXPANDED: 'w-72',
  COLLAPSED: 'w-20',
  MOBILE: 'w-72'
};

export const QUICK_ACTIONS = [
  { 
    icon: Bell, 
    settingsKey: "notif", 
    label: "Thông báo", 
    action: () => {},
    color: "text-amber-500"
  },
  { 
    icon: Settings, 
    settingsKey: "pref", 
    label: "Cài đặt", 
    action: () => {},
    color: "text-slate-500"
  },
  { 
    icon: HelpCircle, 
    settingsKey: "help", 
    label: "Trợ giúp", 
    action: () => {},
    color: "text-blue-500"
  },
  { 
    icon: Shield, 
    settingsKey: "sec", 
    label: "Bảo mật", 
    action: () => {},
    color: "text-emerald-500"
  },
];

export const KEYBOARD_SHORTCUTS = {
  TOGGLE_SIDEBAR: 'Ctrl+B',
  CLOSE_MOBILE: 'Escape'
};

