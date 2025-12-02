import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    // Default to light mode instead of system preference
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    // DaisyUI
    root.setAttribute("data-theme", theme);
    // Tailwind 'dark:' utilities (nếu bạn dùng)
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const value = useMemo(() => ({ theme, isDark: theme === "dark", toggleTheme }), [theme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
