// src/pages/public/LandingPage.js - CLEAN & REFACTORED ✅
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, Phone, Mail, Play, ArrowRight, X, Zap
} from "lucide-react";

// Components
import {
  SectionHeader,
  FeatureCard,
  DoctorCard,
  TestimonialCard,
  SpecialtyCard
} from "../../components/landing";

// Constants
import {
  FEATURES,
  STATS,
  TESTIMONIALS,
  DOCTORS,
  INTERNAL_MEDICINE_SPECIALTIES,
  HOW_IT_WORKS,
  OPENING_HOURS,
  CERTIFICATIONS,
  CONTACT_INFO
} from "../../constants/landingPageData";

// Assets
import backgroundImage from "../../assets/background.jpg";

export default function LandingPage() {
  const navigate = useNavigate();
  const [playingVideo, setPlayingVideo] = useState(false);

  return (
    <div className="font-sans text-slate-600 bg-white dark:bg-slate-900">
      
      {/* ========== HERO SECTION ========== */}
      <HeroSection onPlayVideo={() => setPlayingVideo(true)} />

      {/* ========== INFO BAR ========== */}
      <InfoBar />

      {/* ========== FEATURES ========== */}
      <FeaturesSection />

      {/* ========== STATS ========== */}
      <StatsSection />

      {/* ========== SPECIALTIES ========== */}
      <SpecialtiesSection />

      {/* ========== HOW IT WORKS ========== */}
      <HowItWorksSection />

      {/* ========== DOCTORS ========== */}
      <DoctorsSection />

      {/* ========== TESTIMONIALS ========== */}
      <TestimonialsSection />

      {/* ========== AWARDS ========== */}
      <AwardsSection />

      {/* ========== FINAL CTA ========== */}
      <FinalCTASection />

      {/* ========== VIDEO MODAL ========== */}
      <VideoModal isOpen={playingVideo} onClose={() => setPlayingVideo(false)} />

    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function HeroSection({ onPlayVideo }) {
  return (
    <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={backgroundImage} alt="Healthcare Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-teal-900/60 to-cyan-900/60 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="relative z-20 max-w-7xl w-full px-6 text-white py-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6" style={{ lineHeight: '1.2' }}>
            <span className="block text-white mb-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] py-1">
              Chăm Sóc Sức Khỏe
            </span>
            <span 
              className="block py-2 px-1"
              style={{
                background: 'linear-gradient(to right, #6ee7b7, #5eead4, #67e8f9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 4px 12px rgba(110, 231, 183, 0.6)',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))',
                lineHeight: '1.2'
              }}
            >
              Thông Minh & Toàn Diện
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-100 max-w-2xl mb-10 font-light leading-relaxed">
            Hệ thống quản lý lịch khám và hồ sơ bệnh án điện tử hiện đại, tích hợp AI hỗ trợ chẩn đoán nhanh chóng và chính xác.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/patient/booking" 
              className="group px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Calendar size={20} />
              Đặt lịch khám ngay
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={onPlayVideo} 
              className="group px-8 py-4 border-2 border-white/50 hover:bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={16} className="text-white ml-0.5" />
              </div>
              Xem video giới thiệu
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function InfoBar() {
  return (
    <section className="relative z-20 -mt-20">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 shadow-2xl rounded-sm overflow-hidden">
        {/* About */}
        <div className="bg-white dark:bg-slate-800 p-10 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Về Healthcare AI</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Nền tảng y tế tiên phong ứng dụng AI vào chẩn đoán và đặt lịch, mang lại trải nghiệm chăm sóc sức khỏe tốt nhất.
          </p>
          <Link 
            to="/landing" 
            className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest hover:underline flex items-center gap-2 group"
          >
            Xem thêm
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Opening Hours */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-10 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-emerald-200" size={24} />
            <h3 className="text-xl font-bold">Giờ làm việc</h3>
          </div>
          <div className="space-y-3 text-sm">
            {OPENING_HOURS.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-white/20 pb-2">
                <span className="font-medium">{item.day}</span>
                <span className="opacity-90">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency */}
        <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-10 text-white flex flex-col justify-center">
          <h3 className="text-xl font-bold mb-2">Khẩn cấp?</h3>
          <p className="mb-6 text-white/90 text-sm">Đội ngũ cấp cứu của chúng tôi luôn sẵn sàng 24/7.</p>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Gọi ngay</p>
              <p className="text-2xl font-bold">{CONTACT_INFO.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Email</p>
              <p className="text-lg font-bold">{CONTACT_INFO.email}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader 
          title="Tính Năng Vượt Trội" 
          subtitle="Công nghệ hiện đại mang đến trải nghiệm y tế tốt nhất" 
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, idx) => (
            <FeatureCard 
              key={idx} 
              icon={feature.icon} 
              title={feature.title} 
              description={feature.desc}
              index={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_1px,_transparent_1px)] [background-size:20px_20px] opacity-30"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group"
            >
              <Icon size={48} className="mx-auto mb-4 opacity-90 group-hover:scale-110 transition-transform" />
              <p className="text-4xl lg:text-5xl font-black mb-2">{stat.value}</p>
              <p className="text-sm uppercase tracking-widest opacity-90 font-semibold">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function SpecialtiesSection() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-slate-200 dark:border-slate-700 pb-6">
          <div>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-2">
              Chuyên Khoa Nội
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
              Đội ngũ bác sĩ chuyên sâu trong từng lĩnh vực
            </p>
          </div>
          <Link 
            to="/patient/booking" 
            className="mt-4 md:mt-0 text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2 group"
          >
            Xem tất cả 
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {INTERNAL_MEDICINE_SPECIALTIES.map((spec, idx) => (
            <SpecialtyCard key={spec.id} specialty={spec} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader 
          title="Quy Trình Đơn Giản" 
          subtitle="Chỉ 4 bước để bắt đầu hành trình chăm sóc sức khỏe" 
        />
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900"></div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-center relative"
                >
                  <div className="relative z-10 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-black text-white">{item.step}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl blur-xl opacity-40 -z-10"></div>
                  </div>
                  
                  <div className="mb-4">
                    <Icon className="w-12 h-12 mx-auto text-emerald-600 dark:text-emerald-400" />
                  </div>
                  
                  <h4 className="font-bold text-xl text-slate-900 dark:text-white mb-3">{item.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DoctorsSection() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader 
          title="Đội Ngũ Bác Sĩ" 
          subtitle="Bác sĩ giàu kinh nghiệm, tận tâm và chuyên nghiệp" 
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {DOCTORS.map((doc, idx) => (
            <DoctorCard key={doc.id} doctor={doc} index={idx} />
          ))}
        </div>
        
        {/* CTA Button */}
        <div className="text-center mt-12">
          <Link
            to="/patient/booking"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Calendar size={20} />
            Xem tất cả bác sĩ
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-emerald-200/50 dark:bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-teal-200/50 dark:bg-teal-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <SectionHeader 
          title="Khách Hàng Nói Gì" 
          subtitle="Trải nghiệm thực tế từ bệnh nhân và bác sĩ" 
        />
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, idx) => (
            <TestimonialCard 
              key={idx} 
              testimonial={testimonial} 
              index={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AwardsSection() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader 
          title="Chứng Nhận & Giải Thưởng" 
          subtitle="Được công nhận bởi các tổ chức y tế uy tín" 
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {CERTIFICATIONS.map((cert, idx) => {
            const Icon = cert.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl text-center border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all"
              >
                <Icon size={40} className="mx-auto mb-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{cert.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{cert.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-32 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
        />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
            Sẵn Sàng Bắt Đầu?
          </h2>
          <p className="text-xl lg:text-2xl text-emerald-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Tham gia cùng hàng nghìn người đã tin tưởng Healthcare AI để chăm sóc sức khỏe thông minh hơn
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link
              to="/patient/booking"
              className="group px-10 py-5 bg-white text-emerald-600 font-black text-lg rounded-2xl hover:bg-emerald-50 transition-all duration-300 shadow-2xl hover:shadow-white/30 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-3">
                Đặt lịch ngay
                <Calendar className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              </span>
            </Link>
            
            <a
              href={`tel:${CONTACT_INFO.emergencyPhone}`}
              className="group px-10 py-5 border-2 border-white/50 text-white font-black text-lg rounded-2xl hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-3">
                <Phone className="w-6 h-6" />
                {CONTACT_INFO.emergencyPhone}
              </span>
            </a>
          </div>

          {/* Emergency Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-red-500/20 border-2 border-red-300/50 rounded-2xl backdrop-blur-sm"
          >
            <Zap className="w-5 h-5 text-red-200" />
            <span className="font-semibold text-red-50">
              Khẩn cấp? Gọi 115 ngay
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function VideoModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative max-w-4xl w-full aspect-video bg-black shadow-2xl"
          >
            <button 
              onClick={onClose} 
              className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors"
              aria-label="Đóng video"
            >
              <X size={32} />
            </button>
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <Play size={64} className="mb-4 text-emerald-400" />
              <p className="text-xl font-semibold mb-2">Demo Video</p>
              <p className="text-slate-300">Video demo hệ thống sẽ được hiển thị tại đây</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
