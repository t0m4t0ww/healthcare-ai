// frontend-dashboard/src/components/dashboard/StatCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp } from "lucide-react";

const StatCard = ({ title, value, subtitle, icon: Icon, gradient, trend, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-700 p-6 shadow-lg hover:shadow-2xl hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-500"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
    
    {loading ? (
      <div className="relative flex items-center justify-center h-32">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    ) : (
      <>
        <div className="relative flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon size={24} className="text-white" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              <TrendingUp size={16} />
              +{trend}%
            </div>
          )}
        </div>
        
        <div className="relative">
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{title}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
      </>
    )}
  </motion.div>
);

export default StatCard;
