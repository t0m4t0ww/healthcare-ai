// Specialty Card Component
import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SpecialtyCard({ specialty, index = 0 }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300"
      onClick={() => navigate('/patient/booking')}
    >
      <div className="h-72 bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <img 
          src={specialty.image} 
          alt={specialty.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent opacity-90"></div>
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/80 backdrop-blur-sm rounded-full">
          <span className="text-xs font-bold">#{index + 1}</span>
        </div>
        <h3 className="text-2xl font-black mb-2">{specialty.name}</h3>
        <p className="text-sm opacity-90 mb-4 line-clamp-2 leading-relaxed">
          {specialty.shortDescription}
        </p>
        <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm group-hover:gap-3 transition-all">
          <span>Đặt lịch ngay</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}

