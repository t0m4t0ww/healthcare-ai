// Doctor Card Component
import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Phone, Star, Award } from "lucide-react";

export default function DoctorCard({ doctor, index = 0 }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className={`bg-white dark:bg-slate-800 group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border-2 ${
        doctor.featured 
          ? 'border-emerald-500 dark:border-emerald-400' 
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="h-72 relative bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <img 
          src={doctor.image} 
          alt={doctor.name} 
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {doctor.featured && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <Star size={12} fill="white" />
            Nổi bật
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/90 via-emerald-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={() => navigate('/patient/booking')}
            className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
            aria-label={`Đặt lịch với ${doctor.name}`}
          >
            <Calendar size={20} />
          </button>
          <button 
            className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
            aria-label={`Gọi điện cho ${doctor.name}`}
          >
            <Phone size={20} />
          </button>
        </div>
      </div>
      <div className="p-6 text-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{doctor.name}</h3>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-3">
          {doctor.specialtyTag}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Award size={14} className="text-amber-500" />
          <span>{doctor.yearsOfExperience} năm kinh nghiệm</span>
        </div>
      </div>
    </motion.div>
  );
}

