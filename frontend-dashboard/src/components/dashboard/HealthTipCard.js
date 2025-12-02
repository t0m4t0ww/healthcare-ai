// frontend-dashboard/src/components/dashboard/HealthTipCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const HealthTipCard = ({ tip, index }) => {
  const Icon = tip.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 ${
        tip.urgent 
          ? 'border-amber-300 dark:border-amber-700 ring-2 ring-amber-100 dark:ring-amber-900/30' 
          : 'border-emerald-100 dark:border-emerald-700'
      } hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 ${
        tip.urgent ? 'animate-pulse-glow' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          tip.urgent ? 'animate-bounce' : ''
        }`}>
          <Icon size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{tip.title}</h4>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{tip.description}</p>
          {tip.urgent && (
            <Link 
              to="/patient/profile"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors text-sm"
            >
              Cập nhật ngay
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HealthTipCard;
