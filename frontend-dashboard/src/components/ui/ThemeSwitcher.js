import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeSwitcher() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-base-200 transition"
      title={isDark ? "Chuyển sáng" : "Chuyển tối"}
    >
      {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      <span className="text-sm">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
