// context/AuthContext.js - FIXED ROUTING VERSION
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { setAuthToken } from '../services/chatService';

const AuthContext = createContext(null);

// ✅ Create dedicated axios instance for AuthContext
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const authApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasValidatedRef = useRef(false);

  // ❌ REMOVED: axios.defaults.baseURL = API_URL; 
  // This causes double /api/api prefix! Each service should use its own axios instance.

  // ✅ Helper functions
  const getRole = () => String(user?.role || '').toLowerCase();
  const isPatient = () => getRole() === 'patient';
  const isDoctor = () => ['doctor', 'radiologist'].includes(getRole());
  const isAdmin = () => getRole() === 'admin';

  // ✅ NEW: Get correct dashboard path based on role
  const getDashboardPath = (role) => {
    const normalizedRole = String(role || '').toLowerCase();
    
    switch (normalizedRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'doctor':
      case 'radiologist':
        return '/doctor/dashboard';  // ✅ FIXED
      case 'patient':
        return '/patient/dashboard';
      default:
        return '/';
    }
  };

  // ✅ Restore user from storage on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser) {
          const userData = JSON.parse(storedUser);

          if (!userData.token && storedToken) {
            userData.token = storedToken;
          }

          setUser(userData);
          setAuthToken(userData.token || storedToken);
          
          if (userData.token) {
            axios.defaults.headers.common.Authorization = `Bearer ${userData.token}`;
          }
        } else {
          const sessionUser = sessionStorage.getItem('user');
          const sessionToken = sessionStorage.getItem('token');

          if (sessionUser) {
            const userData = JSON.parse(sessionUser);
            if (!userData.token && sessionToken) {
              userData.token = sessionToken;
            }
            setUser(userData);
            setAuthToken(userData.token || sessionToken);
            
            if (userData.token || sessionToken) {
              axios.defaults.headers.common.Authorization = `Bearer ${userData.token || sessionToken}`;
            }
          } else {
            const fallbackToken = storedToken || sessionToken;
            if (fallbackToken) {
              setAuthToken(fallbackToken);
              axios.defaults.headers.common.Authorization = `Bearer ${fallbackToken}`;
            }
          }
        }
      } catch (error) {
        console.error('⌛ Error restoring user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        setAuthToken(null);
        delete axios.defaults.headers.common.Authorization;
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ✅ Setup axios interceptor
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token =
          user?.token ||
          localStorage.getItem('token') ||
          sessionStorage.getItem('token');

        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          console.warn('⚠️ 401 Unauthorized - logging out');
          setAuthToken(null);
          delete axios.defaults.headers.common.Authorization;
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [user]);

  // ✅ Logout function - Call backend to set last_activity to far past
  const logout = useCallback(async () => {
    try {
      // ✅ Call backend logout endpoint to immediately mark user as offline
      const token = user?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        try {
          await authApi.post('/auth/logout', {}, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ Backend logout successful - user will appear offline immediately');
        } catch (error) {
          console.warn('⚠️ Backend logout failed, continuing with local logout:', error.message);
          // Continue with local logout even if backend fails
        }
      }

      // Clear local state
      setUser(null);

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');

      // ✅ Clear AI Assistant conversation on logout
      localStorage.removeItem('ai_assistant_conversation');
      localStorage.removeItem('ai_assistant_conversation_id');
      localStorage.removeItem('ai_assistant_suggestions');

      setAuthToken(null);
      delete axios.defaults.headers.common.Authorization;

    } finally {
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register'
      ) {
        window.location.href = '/login';
      }
    }
  }, [user]);

  const revalidateSession = useCallback(async () => {
    if (!user?.token) {
      return;
    }

    try {
      const response = await authApi.get('/auth/me', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const payload = response?.data?.data || response?.data;
      if (!payload?.id) {
        return;
      }

      const normalizedRole = String(payload.role || user.role || 'patient').toLowerCase();
      const serverUser = {
        id: payload.id,
        email: payload.email || user.email,
        name: payload.name || user.name,
        role: normalizedRole,
        token: user.token,
        patient_id: payload.patient_id ?? user.patient_id ?? null,
        doctor_id: payload.doctor_id ?? user.doctor_id ?? null,
        must_change_password: payload.must_change_password ?? user.must_change_password ?? false,
        avatar: payload.avatar ?? user.avatar ?? null,
      };

      const hasDiff =
        serverUser.role !== user.role ||
        serverUser.id !== user.id ||
        serverUser.patient_id !== user.patient_id ||
        serverUser.doctor_id !== user.doctor_id;

      if (hasDiff) {
        setUser(serverUser);
        const storage =
          localStorage.getItem('user') != null
            ? localStorage
            : sessionStorage.getItem('user') != null
            ? sessionStorage
            : localStorage;
        storage.setItem('user', JSON.stringify(serverUser));
        storage.setItem('token', user.token);
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        console.warn('⚠️ Session invalid after backend restart. Logging out.');
        await logout();
      } else {
        console.warn('⚠️ Failed to revalidate session:', error?.message || error);
      }
    }
  }, [user, logout]);

  useEffect(() => {
    if (loading || !user || hasValidatedRef.current) {
      return;
    }
    hasValidatedRef.current = true;
    revalidateSession();
  }, [user, loading, revalidateSession]);

  // ✅ Login function
  const login = async (email, password, rememberMe = true) => {
    try {
      function pickStr(v) {
        if (v && typeof v === 'object') return String(v.value || v.label || '').trim();
        return String(v ?? '').trim();
      }

      const payload = {
        email: pickStr(email),
        password: pickStr(password),
      };

      const response = await authApi.post('/auth/login', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const envelope = response?.data ?? {};
      const data = envelope?.data ?? {};
      const token = data?.token || '';
      const u = data?.user ?? {};

      if (!token || !u?.email) {
        console.log('[login] unexpected payload:', response?.data);
        throw new Error('Phản hồi đăng nhập không hợp lệ (thiếu token hoặc user.email).');
      }

      const userData = {
        id: u.id || u.user_id || data.user_id || null,
        email: u.email,
        name: u.name || u.full_name || '',
        role: String(u.role || 'patient').toLowerCase(),
        token,
        patient_id: u.patient_id ?? null,
        doctor_id: u.doctor_id ?? null,
        must_change_password: !!u.must_change_password,
        avatar: u.avatar ?? null,
      };

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(userData));
      storage.setItem('token', token);

      setUser(userData);
      setAuthToken(token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;

      // ✅ Return must_change_password flag - let dashboard handle it (don't redirect)
      return { 
        success: true, 
        user: userData, 
        mustChange: !!userData.must_change_password 
      };

    } catch (error) {
      console.error('⌛ Login error:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Đăng nhập thất bại';
      return { success: false, error: errorMessage };
    }
  };

  // ✅ Register function
  const register = async (userData) => {
    try {
      const response = await authApi.post('/auth/register', userData);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('⌛ Registration error:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Đăng ký thất bại';
      return { success: false, error: errorMessage };
    }
  };

  // ✅ NEW: Refresh user data and auto-fetch patient_id if missing
  const refreshUser = async () => {
    if (!user) return;

    try {
      // If patient_id is already present, no need to refresh
      if (user.patient_id) return;

      // Only fetch for patient role
      if (user.role !== 'patient') return;

      console.log('🔄 Auto-fetching patient_id for user:', user.id);

      // Try to find patient by user_id
      const response = await authApi.get('/patients');
      const patients = response.data || [];
      
      const linkedPatient = patients.find(p => 
        p.user_id === user.id || p.email === user.email
      );

      if (linkedPatient) {
        const updatedUser = {
          ...user,
          patient_id: linkedPatient._id || linkedPatient.id
        };

        // Update both state and storage
        setUser(updatedUser);
        const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(updatedUser));

        console.log('✅ Auto-fetched patient_id:', updatedUser.patient_id);
      } else {
        console.warn('⚠️ No patient record found for user');
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }
  };

  // ✅ Auto-refresh patient_id on mount if missing
  useEffect(() => {
    if (user && user.role === 'patient' && !user.patient_id) {
      console.log('🔍 Patient user missing patient_id, auto-fetching...');
      refreshUser();
    }
  }, [user?.id]); // Only run when user.id changes

  // ✅ Update user data (e.g., after password change)
  const updateUser = (updates) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Update storage
    const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('✅ User updated:', updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    refreshUser,      // ✅ Export refresh function
    updateUser,       // ✅ Export update function
    getDashboardPath,
    isAuthenticated: !!user,
    token: user?.token,
    isPatient,
    isDoctor,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;