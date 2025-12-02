// src/components/ui/LoadingSkeleton.js
import React from 'react';

/**
 * Loading Skeleton Components
 * Hiển thị placeholder structure thay vì spinner
 */

// Base skeleton element
export const SkeletonBase = ({ className = '', width, height, rounded = 'rounded-lg' }) => (
  <div 
    className={`bg-slate-200 dark:bg-slate-700 animate-pulse ${rounded} ${className}`}
    style={{ width, height }}
  />
);

// Text skeleton
export const SkeletonText = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBase 
        key={i} 
        height="1rem" 
        width={i === lines - 1 ? '80%' : '100%'}
      />
    ))}
  </div>
);

// Card skeleton
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <SkeletonBase width="48px" height="48px" rounded="rounded-full" />
      <div className="flex-1">
        <SkeletonBase height="1.25rem" width="60%" className="mb-2" />
        <SkeletonBase height="0.875rem" width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

// Appointment card skeleton
export const SkeletonAppointment = () => (
  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
    <div className="flex items-center gap-4 flex-1">
      <SkeletonBase width="48px" height="48px" rounded="rounded-full" />
      <div className="flex-1">
        <SkeletonBase height="1.125rem" width="150px" className="mb-2" />
        <SkeletonBase height="0.875rem" width="200px" />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <SkeletonBase width="80px" height="28px" rounded="rounded-full" />
      <SkeletonBase width="120px" height="36px" rounded="rounded-lg" />
    </div>
  </div>
);

// Stats card skeleton
export const SkeletonStatsCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
    <div className="flex items-center justify-between mb-3">
      <SkeletonBase width="48px" height="48px" rounded="rounded-xl" />
      <SkeletonBase width="16px" height="16px" />
    </div>
    <SkeletonBase height="2rem" width="60px" className="mb-1" />
    <SkeletonBase height="0.875rem" width="100px" />
  </div>
);

// Table row skeleton
export const SkeletonTableRow = ({ columns = 4 }) => (
  <tr className="border-b border-slate-200 dark:border-slate-700">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <SkeletonBase height="1rem" width={i === 0 ? '80%' : '60%'} />
      </td>
    ))}
  </tr>
);

// Chat message skeleton
export const SkeletonChatMessage = ({ isOwn = false }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
    {!isOwn && <SkeletonBase width="32px" height="32px" rounded="rounded-full" className="mr-2" />}
    <div className={`${isOwn ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-700'} rounded-2xl p-3 max-w-xs`}>
      <SkeletonText lines={2} />
    </div>
  </div>
);

// Dashboard skeleton (full page)
export const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Header */}
    <div>
      <SkeletonBase height="2rem" width="200px" className="mb-2" />
      <SkeletonBase height="1.25rem" width="300px" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>

    {/* Today's Appointments */}
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <SkeletonBase height="1.5rem" width="200px" />
      </div>
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonAppointment key={i} />
        ))}
      </div>
    </div>
  </div>
);

// Patient list skeleton
export const SkeletonPatientList = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
      >
        <SkeletonBase width="56px" height="56px" rounded="rounded-full" />
        <div className="flex-1">
          <SkeletonBase height="1.25rem" width="180px" className="mb-2" />
          <SkeletonBase height="0.875rem" width="120px" />
        </div>
        <SkeletonBase width="100px" height="36px" rounded="rounded-lg" />
      </div>
    ))}
  </div>
);

// Default export
const LoadingSkeleton = {
  Base: SkeletonBase,
  Text: SkeletonText,
  Card: SkeletonCard,
  Appointment: SkeletonAppointment,
  StatsCard: SkeletonStatsCard,
  TableRow: SkeletonTableRow,
  ChatMessage: SkeletonChatMessage,
  Dashboard: SkeletonDashboard,
  PatientList: SkeletonPatientList,
};

export default LoadingSkeleton;

