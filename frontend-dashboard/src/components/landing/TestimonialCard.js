// Testimonial Card Component - Enhanced with real images
import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

export default function TestimonialCard({ testimonial, index = 0 }) {
  // Check if avatar is an image (imported image) or emoji
  // Emoji will be a string with unicode characters, images will be imported paths
  const isEmoji = typeof testimonial.avatar === 'string' && 
                  testimonial.avatar.length <= 5 && 
                  !testimonial.avatar.includes('/') &&
                  !testimonial.avatar.includes('.');
  const isImage = !isEmoji;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="relative bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 overflow-hidden group"
    >
      {/* Decorative quote icon */}
      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Quote size={60} className="text-emerald-500" />
      </div>

      {/* Rating Stars */}
      <div className="flex mb-4 gap-1">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} size={18} className="text-amber-400 fill-amber-400" />
        ))}
      </div>

      {/* Content */}
      <p className="text-slate-700 dark:text-slate-300 mb-6 italic leading-relaxed relative z-10 text-base">
        "{testimonial.content}"
      </p>

      {/* Tags */}
      {testimonial.tags && testimonial.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {testimonial.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Author Info */}
      <div className="flex items-center gap-4 border-t border-slate-200 dark:border-slate-700 pt-4 relative z-10">
        {/* Avatar with focus on face */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-emerald-100 dark:ring-emerald-900/50 shadow-lg group-hover:ring-emerald-300 dark:group-hover:ring-emerald-700 transition-all">
            {isImage ? (
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-full h-full object-cover object-center"
                style={{
                  objectPosition: 'center 30%', // Focus on face area
                  transform: 'scale(1.1)' // Slight zoom for better face visibility
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl">
                {testimonial.avatar}
              </div>
            )}
          </div>
          {/* Decorative ring */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-pulse"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-white text-base truncate">
            {testimonial.name}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {testimonial.role}
          </p>
        </div>
      </div>

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-300 pointer-events-none rounded-2xl"></div>
    </motion.div>
  );
}

