// Reusable Section Header Component
import React from "react";
import { motion } from "framer-motion";

export default function SectionHeader({ title, subtitle, align = "center" }) {
  const alignmentClasses = {
    center: "text-center",
    left: "text-left",
    right: "text-right"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`mb-16 ${alignmentClasses[align]}`}
    >
      <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4">
        {title}
      </h2>
      {align === "center" && (
        <div className="w-20 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mb-6 rounded-full"></div>
      )}
      {subtitle && (
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

