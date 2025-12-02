// components/ui/ChangePasswordModal.js
import React, { useState } from "react";
import { X, Lock, Eye, EyeOff, AlertTriangle, Check } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/services";

export default function ChangePasswordModal({ 
  open, 
  onClose, 
  isFirstTime = false,
  onSuccess 
}) {
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Phải có ít nhất 1 chữ hoa");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Phải có ít nhất 1 chữ thường");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Phải có ít nhất 1 số");
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    // Validate current password (nếu không phải first-time)
    if (!isFirstTime && !formData.current_password) {
      newErrors.current_password = "Vui lòng nhập mật khẩu hiện tại";
    }
    
    // Validate new password
    if (!formData.new_password) {
      newErrors.new_password = "Vui lòng nhập mật khẩu mới";
    } else {
      const passwordErrors = validatePassword(formData.new_password);
      if (passwordErrors.length > 0) {
        newErrors.new_password = passwordErrors[0];
      }
    }
    
    // Validate confirm password
    if (!formData.confirm_password) {
      newErrors.confirm_password = "Vui lòng xác nhận mật khẩu";
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "Mật khẩu xác nhận không khớp";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        new_password: formData.new_password
      };
      
      if (!isFirstTime) {
        payload.current_password = formData.current_password;
      }
      
      const response = await api.post("/change-password", payload);
      
      toast.success("Đổi mật khẩu thành công! 🎉");
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
      
      // Close modal sau 1s
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || "Đổi mật khẩu thất bại";
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error khi user đang nhập
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  if (!open) return null;

  const passwordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const labels = ["", "Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh"];
    const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-green-500"];
    
    return {
      strength,
      label: labels[strength],
      color: colors[strength],
      percentage: (strength / 5) * 100
    };
  };

  const strength = passwordStrength(formData.new_password);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Lock size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {isFirstTime ? "Đổi mật khẩu bắt buộc" : "Đổi mật khẩu"}
                </h3>
                {isFirstTime && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Bạn phải đổi mật khẩu trước khi tiếp tục
                  </p>
                )}
              </div>
            </div>
            {!isFirstTime && (
              <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Warning banner for first-time */}
          {isFirstTime && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-1">Đây là lần đăng nhập đầu tiên</p>
                  <p className="text-xs">
                    Vì lý do bảo mật, bạn cần đổi mật khẩu mặc định trước khi sử dụng hệ thống.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Password (nếu không phải first-time) */}
          {!isFirstTime && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={formData.current_password}
                  onChange={(e) => handleChange("current_password", e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-700 border ${
                    errors.current_password ? "border-red-500" : "border-slate-200 dark:border-slate-600"
                  } rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-red-500 text-xs mt-1">{errors.current_password}</p>
              )}
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) => handleChange("new_password", e.target.value)}
                className={`w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-700 border ${
                  errors.new_password ? "border-red-500" : "border-slate-200 dark:border-slate-600"
                } rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`}
                placeholder="Nhập mật khẩu mới"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.new_password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Độ mạnh</span>
                  <span className={`font-medium ${
                    strength.strength <= 2 ? "text-red-500" : 
                    strength.strength <= 3 ? "text-yellow-500" : 
                    "text-emerald-500"
                  }`}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.percentage}%` }}
                  />
                </div>
              </div>
            )}
            
            {errors.new_password && (
              <p className="text-red-500 text-xs mt-1">{errors.new_password}</p>
            )}
            
            {/* Password Requirements */}
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Yêu cầu:</p>
              <div className="space-y-1">
                {[
                  { test: (p) => p.length >= 8, label: "Ít nhất 8 ký tự" },
                  { test: (p) => /[A-Z]/.test(p), label: "Có chữ hoa" },
                  { test: (p) => /[a-z]/.test(p), label: "Có chữ thường" },
                  { test: (p) => /[0-9]/.test(p), label: "Có số" },
                ].map((req, i) => {
                  const passed = req.test(formData.new_password);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        passed ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                      }`}>
                        {passed && <Check size={10} />}
                      </div>
                      <span className={passed ? "text-emerald-600 dark:text-emerald-500" : "text-slate-500 dark:text-slate-400"}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirm_password}
                onChange={(e) => handleChange("confirm_password", e.target.value)}
                className={`w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-700 border ${
                  errors.confirm_password ? "border-red-500" : "border-slate-200 dark:border-slate-600"
                } rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`}
                placeholder="Nhập lại mật khẩu mới"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>
            )}
            {formData.confirm_password && formData.new_password === formData.confirm_password && (
              <p className="text-emerald-500 text-xs mt-1 flex items-center gap-1">
                <Check size={14} /> Mật khẩu khớp
              </p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {!isFirstTime && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
                disabled={loading}
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !formData.new_password || !formData.confirm_password}
              className="btn btn-primary gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Đổi mật khẩu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}