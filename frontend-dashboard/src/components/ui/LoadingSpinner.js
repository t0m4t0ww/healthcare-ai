// src/components/ui/LoadingSpinner.js - Reusable Loading Component
import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', text = 'Đang tải...', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 
        className={`${sizeClasses[size]} text-blue-600 dark:text-blue-400 animate-spin`}
      />
      {text && (
        <p className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};

export const LoadingOverlay = ({ isLoading, children }) => {
  if (!isLoading) return children;
  
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
};

export const SkeletonLoader = ({ type = 'text', count = 1, className = '' }) => {
  const skeletons = {
    text: 'h-4 bg-slate-200 dark:bg-slate-700 rounded',
    card: 'h-32 bg-slate-200 dark:bg-slate-700 rounded-lg',
    avatar: 'w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full',
    button: 'h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg'
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${skeletons[type]} animate-pulse`} />
      ))}
    </div>
  );
};

export default LoadingSpinner;
