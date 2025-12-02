// src/pages/HomePage.js - Smart Router (Minimalist)
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

/**
 * HomePage - Smart routing based on user authentication status
 * 
 * Routes:
 * - Not logged in → /landing (Public landing page)
 * - Patient → /patient/dashboard
 * - Doctor → /doctor/dashboard  
 * - Admin → /admin/dashboard
 * 
 * This keeps URL "/" always relevant to user context
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // Route based on user status
    if (!user) {
      // Not logged in → Public landing page
      navigate("/landing", { replace: true });
      return;
    }

    // Logged in → Route based on role
    const role = user.role?.toLowerCase();
    
    switch (role) {
      case "patient":
        navigate("/patient/dashboard", { replace: true });
        break;
      
      case "doctor":
        navigate("/doctor/dashboard", { replace: true });
        break;
      
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;
      
      default:
        // Unknown role → Fallback to landing
        console.warn(`Unknown role: ${role}. Redirecting to landing.`);
        navigate("/landing", { replace: true });
    }
  }, [user, loading, navigate]);

  // Minimal loading screen while routing
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
          }}
        />
      </div>

      {/* Loading Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl max-w-md"
      >
        <div className="text-center">
          {/* Logo */}
          <motion.div 
            className="relative w-24 h-24 mx-auto mb-6"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-2xl shadow-2xl flex items-center justify-center">
              <Activity size={40} className="text-white" />
            </div>
            <div className="absolute -inset-3 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-2xl blur-xl animate-pulse"></div>
          </motion.div>
          
          {/* Loading Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-white mb-2">Healthcare AI</h1>
            <div className="flex items-center justify-center gap-3 text-emerald-200">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-medium">Đang tải...</span>
            </div>
          </motion.div>

          {/* Loading Dots */}
          <div className="flex gap-2 justify-center mt-6">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-emerald-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}