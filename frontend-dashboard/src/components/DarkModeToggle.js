/**
 * Dark Mode Toggle Component
 * UI component để toggle dark mode
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';

export const DarkModeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex items-center justify-center
        w-12 h-12 rounded-2xl
        bg-slate-100 dark:bg-slate-800
        hover:bg-slate-200 dark:hover:bg-slate-700
        transition-all duration-300 ease-in-out
        group
        ${className}
      `}
      aria-label="Toggle dark mode"
      title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
    >
      {/* Sun icon (light mode) */}
      <Sun 
        size={20} 
        className={`
          absolute text-amber-500
          transition-all duration-300
          ${isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
        `}
      />
      
      {/* Moon icon (dark mode) */}
      <Moon 
        size={20} 
        className={`
          absolute text-slate-400
          transition-all duration-300
          ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
        `}
      />
    </button>
  );
};

// Alternative: Switch style toggle
export const DarkModeSwitch = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex items-center
        w-16 h-8 rounded-full
        transition-colors duration-300
        ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}
        ${className}
      `}
      aria-label="Toggle dark mode"
    >
      {/* Slider */}
      <span
        className={`
          absolute inline-block w-6 h-6 rounded-full
          bg-white shadow-lg
          transition-transform duration-300
          ${isDarkMode ? 'translate-x-9' : 'translate-x-1'}
        `}
      >
        {/* Icon inside slider */}
        <span className="absolute inset-0 flex items-center justify-center">
          {isDarkMode ? (
            <Moon size={14} className="text-slate-700" />
          ) : (
            <Sun size={14} className="text-amber-500" />
          )}
        </span>
      </span>
    </button>
  );
};

// Dropdown menu item version
export const DarkModeMenuItem = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {isDarkMode ? (
        <>
          <Sun size={18} className="text-amber-500" />
          <span className="text-slate-900 dark:text-slate-100">Chế độ sáng</span>
        </>
      ) : (
        <>
          <Moon size={18} className="text-slate-600" />
          <span className="text-slate-900 dark:text-slate-100">Chế độ tối</span>
        </>
      )}
    </button>
  );
};

export default DarkModeToggle;
