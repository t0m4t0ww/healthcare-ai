// src/services/userServices.js - Complete User Management API
// Lưu ý: file này dùng Axios instance từ './services' (đã cấu hình baseURL, interceptors token)
import api from './services';

/* ==========================================================================
 * Utils
 * =========================================================================*/
const extractMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const handleApiError = (error, fallback = 'Có lỗi xảy ra. Vui lòng thử lại!') => {
  const msg = extractMessage(error, fallback);
  // Log chi tiết để debug
  // eslint-disable-next-line no-console
  console.error('[UserServices] API Error:', error);
  throw new Error(msg);
};

const makeFormData = (obj = {}) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  return fd;
};

/* ==========================================================================
 * AUTHENTICATION API
 * =========================================================================*/

/**
 * Đăng nhập user
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {boolean} [credentials.remember_me]
 * @returns {Promise<Object>} { user, access_token, refresh_token }
 */
export const login = async (credentials) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  } catch (error) {
    handleApiError(error, 'Đăng nhập thất bại');
  }
};

/**
 * Đăng ký user mới (bệnh nhân)
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
export const register = async (userData) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    return data;
  } catch (error) {
    handleApiError(error, 'Đăng ký thất bại');
  }
};

/**
 * Đăng xuất (server may clear refresh token cookie)
 * @returns {Promise<Object>}
 */
export const logout = async () => {
  try {
    const { data } = await api.post('/auth/logout');
    return data;
  } catch (error) {
    // Không throw để client vẫn clear local state
    // eslint-disable-next-line no-console
    console.warn('[UserServices] Logout failed (ignored):', error);
    return { success: false };
  }
};

/**
 * Làm mới token
 * @param {string} refreshToken
 * @returns {Promise<Object>} { access_token, refresh_token? }
 */
export const refreshToken = async (refreshToken) => {
  try {
    const { data } = await api.post('/auth/refresh-token', { refresh_token: refreshToken });
    return data;
  } catch (error) {
    handleApiError(error, 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
  }
};

/**
 * Quên mật khẩu - gửi email reset
 * @param {string} email
 */
export const forgotPassword = async (email) => {
  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể gửi email khôi phục mật khẩu');
  }
};

/**
 * Reset mật khẩu bằng token
 * @param {{token: string, password: string}} payload
 */
export const resetPassword = async (payload) => {
  try {
    const { data } = await api.post('/auth/reset-password', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể đặt lại mật khẩu');
  }
};

/**
 * Xác minh email
 * @param {string} token
 */
export const verifyEmail = async (token) => {
  try {
    const { data } = await api.post('/auth/verify-email', { token });
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể xác minh email');
  }
};

/**
 * Gửi lại email xác minh
 * @param {string} email
 */
export const resendVerifyEmail = async (email) => {
  try {
    const { data } = await api.post('/auth/resend-verify-email', { email });
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể gửi lại email xác minh');
  }
};

/* ==========================================================================
 * USER PROFILE API
 * =========================================================================*/

/**
 * Lấy profile người dùng hiện tại
 */
export const getCurrentUser = async () => {
  try {
    const { data } = await api.get('/users/me');
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể tải thông tin người dùng');
  }
};

/**
 * Cập nhật profile cá nhân
 * @param {Object} payload
 */
export const updateProfile = async (payload) => {
  try {
    const { data } = await api.put('/users/me/profile', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể cập nhật thông tin cá nhân');
  }
};

/**
 * Đổi mật khẩu
 * @param {{current_password: string, new_password: string}} payload
 */
export const changePassword = async (payload) => {
  try {
    const { data } = await api.put('/users/me/password', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể đổi mật khẩu');
  }
};

/**
 * Upload avatar (multipart/form-data)
 * @param {File} file
 */
export const uploadAvatar = async (file) => {
  try {
    const form = makeFormData({ avatar: file });
    const { data } = await api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data; // { url }
  } catch (error) {
    handleApiError(error, 'Không thể tải ảnh đại diện');
  }
};

/**
 * Xóa avatar hiện tại
 */
export const deleteAvatar = async () => {
  try {
    const { data } = await api.delete('/users/me/avatar');
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể xóa ảnh đại diện');
  }
};

/**
 * Cập nhật email (yêu cầu xác minh lại)
 * @param {{email: string}} payload
 */
export const updateEmail = async (payload) => {
  try {
    const { data } = await api.put('/users/me/email', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể cập nhật email');
  }
};

/**
 * Cập nhật cài đặt thông báo
 * @param {Object} payload
 */
export const updateNotificationSettings = async (payload) => {
  try {
    const { data } = await api.put('/users/me/settings/notifications', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể cập nhật cài đặt thông báo');
  }
};

export const getNotificationSettings = async () => {
  try {
    const { data } = await api.get('/users/me/settings/notifications');
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể tải cài đặt thông báo');
  }
};

/* ==========================================================================
 * SECURITY: 2FA & SESSIONS
 * =========================================================================*/

/** Bắt đầu thiết lập 2FA: trả về QR/secret */
export const startTwoFactorSetup = async () => {
  try {
    const { data } = await api.post('/auth/2fa/setup');
    return data; // { otpauth_url, secret }
  } catch (error) {
    handleApiError(error, 'Không thể khởi tạo 2FA');
  }
};

/** Xác minh & bật 2FA bằng mã OTP */
export const verifyTwoFactor = async (code) => {
  try {
    const { data } = await api.post('/auth/2fa/verify', { code });
    return data; // { enabled: true }
  } catch (error) {
    handleApiError(error, 'Mã OTP không hợp lệ hoặc đã hết hạn');
  }
};

/** Tắt 2FA */
export const disableTwoFactor = async (code) => {
  try {
    const { data } = await api.post('/auth/2fa/disable', { code });
    return data; // { enabled: false }
  } catch (error) {
    handleApiError(error, 'Không thể tắt 2FA');
  }
};

/** Danh sách phiên đăng nhập của thiết bị */
export const getSessions = async () => {
  try {
    const { data } = await api.get('/auth/sessions');
    return data; // [{ id, device, ip, last_active, current }]
  } catch (error) {
    handleApiError(error, 'Không thể tải danh sách phiên đăng nhập');
  }
};

/** Thu hồi một phiên */
export const revokeSession = async (sessionId) => {
  try {
    const { data } = await api.delete(`/auth/sessions/${sessionId}`);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể thu hồi phiên');
  }
};

/** Thu hồi tất cả phiên (trừ phiên hiện tại tuỳ server) */
export const revokeAllSessions = async () => {
  try {
    const { data } = await api.delete('/auth/sessions');
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể đăng xuất tất cả thiết bị');
  }
};

/* ==========================================================================
 * ADMIN / USER MANAGEMENT (tùy quyền)
 * =========================================================================*/

/**
 * Lấy user theo id
 */
export const getUserById = async (userId) => {
  try {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể tải thông tin người dùng');
  }
};

/**
 * Tìm kiếm / phân trang danh sách user
 * @param {{page?: number, limit?: number, q?: string, role?: string, status?: string, sort?: string}} params
 */
export const listUsers = async (params = {}) => {
  try {
    const { data } = await api.get('/users', { params });
    return data; // { items, total, page, limit }
  } catch (error) {
    handleApiError(error, 'Không thể tải danh sách người dùng');
  }
};

/**
 * Cập nhật thông tin user (admin/self-service mở rộng)
 */
export const updateUser = async (userId, payload) => {
  try {
    const { data } = await api.put(`/users/${userId}`, payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể cập nhật người dùng');
  }
};

/**
 * Cập nhật vai trò/quyền
 */
export const updateUserRoles = async (userId, roles = []) => {
  try {
    const { data } = await api.put(`/users/${userId}/roles`, { roles });
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể cập nhật vai trò');
  }
};

/**
 * Vô hiệu hoá / kích hoạt lại user
 */
export const deactivateUser = async (userId, reason) => {
  try {
    const { data } = await api.post(`/users/${userId}/deactivate`, { reason });
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể vô hiệu hoá tài khoản');
  }
};

export const reactivateUser = async (userId) => {
  try {
    const { data } = await api.post(`/users/${userId}/reactivate`);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể kích hoạt lại tài khoản');
  }
};

/* ==========================================================================
 * PATIENT EXTRAS (phù hợp app phòng khám, tuỳ backend hỗ trợ)
 * =========================================================================*/

/** Lưu người liên hệ khẩn cấp */
export const saveEmergencyContact = async (payload) => {
  try {
    const { data } = await api.put('/users/me/emergency-contact', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể lưu liên hệ khẩn cấp');
  }
};

/** Sổ địa chỉ (điều trị tại nhà / hóa đơn) */
export const getAddresses = async () => {
  try {
    const { data } = await api.get('/users/me/addresses');
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể tải sổ địa chỉ');
  }
};

export const addAddress = async (payload) => {
  try {
    const { data } = await api.post('/users/me/addresses', payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể thêm địa chỉ');
  }
};

export const updateAddress = async (addressId, payload) => {
  try {
    const { data } = await api.put(`/users/me/addresses/${addressId}`, payload);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể cập nhật địa chỉ');
  }
};

export const deleteAddress = async (addressId) => {
  try {
    const { data } = await api.delete(`/users/me/addresses/${addressId}`);
    return data;
  } catch (error) {
    handleApiError(error, 'Không thể xóa địa chỉ');
  }
};

/* ==========================================================================
 * DATA PRIVACY / PORTABILITY
 * =========================================================================*/

/** Yêu cầu tải về dữ liệu cá nhân (GDPR-like) */
export const requestDataExport = async () => {
  try {
    const { data } = await api.post('/users/me/export');
    return data; // { job_id }
  } catch (error) {
    handleApiError(error, 'Không thể gửi yêu cầu xuất dữ liệu');
  }
};

/** Yêu cầu xoá tài khoản */
export const requestAccountDeletion = async (reason) => {
  try {
    const { data } = await api.post('/users/me/delete', { reason });
    return data; // { scheduled_at }
  } catch (error) {
    handleApiError(error, 'Không thể gửi yêu cầu xoá tài khoản');
  }
};

/* ==========================================================================
 * Named export tập trung (tuỳ file import muốn dùng style nào)
 * =========================================================================*/
export default {
  // auth
  login,
  register,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerifyEmail,
  // profile
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
  updateEmail,
  updateNotificationSettings,
  getNotificationSettings,
  // security
  startTwoFactorSetup,
  verifyTwoFactor,
  disableTwoFactor,
  getSessions,
  revokeSession,
  revokeAllSessions,
  // admin
  getUserById,
  listUsers,
  updateUser,
  updateUserRoles,
  deactivateUser,
  reactivateUser,
  // patient extras
  saveEmergencyContact,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  // privacy
  requestDataExport,
  requestAccountDeletion,
};
