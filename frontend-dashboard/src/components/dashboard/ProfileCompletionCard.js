// frontend-dashboard/src/components/dashboard/ProfileCompletionCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { User, AlertCircle, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { calculateProfileCompletion } from "../../utils/dashboardHelpers";

const ProfileCompletionCard = ({ user, patientData, loading }) => {
  const completionData = calculateProfileCompletion(patientData);
  const { percentage, missingFields, criticalMissing, totalFields, filledCount } = completionData;
  const needsUpdate = percentage < 100;

  // ✅ DEBUG: Log logic ẩn/hiện
  console.log('👁️ [ProfileCompletionCard] Display logic:', {
    percentage,
    needsUpdate,
    willRender: needsUpdate ? 'YES (card sẽ hiện)' : 'NO (card bị ẩn)'
  });

  // ✅ Không render card nếu đã 100%
  if (!needsUpdate) {
    return null;
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg"
      >
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={`relative overflow-hidden rounded-3xl p-8 border-2 shadow-xl transition-all duration-300 ${
        needsUpdate 
          ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 border-amber-300 dark:border-amber-700' 
          : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border-emerald-300 dark:border-emerald-700'
      }`}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full -mr-20 -mt-20 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/20 rounded-full -ml-16 -mb-16 blur-xl"></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${
              needsUpdate ? 'bg-amber-500' : 'bg-emerald-500'
            } flex items-center justify-center shadow-lg`}>
              <User size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {needsUpdate ? '⚠️ Hoàn thiện hồ sơ' : '✅ Hồ sơ đã hoàn thiện'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {needsUpdate 
                  ? `Còn thiếu ${missingFields.length} mục thông tin` 
                  : 'Thông tin của bạn đã đầy đủ'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-black ${
              needsUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {percentage}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-semibold">
              <span className={needsUpdate ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>{filledCount}</span>
              <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
              <span className="text-slate-500 dark:text-slate-400">{totalFields}</span>
              <span className="text-slate-400 dark:text-slate-500 ml-1">mục</span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative w-full h-4 bg-white/50 rounded-full overflow-hidden mb-6 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full ${
              needsUpdate 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            } rounded-full shadow-lg`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
        </div>

        {/* Missing fields */}
        {needsUpdate && criticalMissing.length > 0 && (
          <div className="mb-6 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-amber-200 dark:border-amber-700">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  {missingFields.length > 5 
                    ? `Top ${criticalMissing.length} mục quan trọng nhất cần bổ sung:` 
                    : 'Thông tin cần bổ sung:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {criticalMissing.map((field, idx) => (
                    <span 
                      key={idx}
                      className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                        field.priority === 'critical' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : field.priority === 'high'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {field.priority === 'critical' ? '🔴' : field.priority === 'high' ? '⚠️' : '💡'} {field.label}
                    </span>
                  ))}
                </div>
                {missingFields.length > 5 && (
                  <p className="text-xs text-amber-700 mt-2">
                    Còn <strong>{missingFields.length - 5} mục khác</strong> cần cập nhật. 
                    Click vào nút bên dưới để xem chi tiết.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        {needsUpdate ? (
          <Link
            to="/patient/profile"
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105"
          >
            <User size={20} />
            Cập nhật hồ sơ ngay
            <ArrowRight size={20} />
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold shadow-lg">
            <CheckCircle size={20} />
            Hồ sơ đã hoàn chỉnh
          </div>
        )}
        
        {/* Info note */}
        <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
            <strong>💡 Lợi ích:</strong> Hồ sơ đầy đủ giúp bác sĩ chẩn đoán chính xác hơn và tiết kiệm thời gian khám
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileCompletionCard;
