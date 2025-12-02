// src/services/chatService.js
import axios from "axios";

/**
 * Base URL (CRA):
 * - Đọc REACT_APP_API_BASE hoặc fallback http://127.0.0.1:8000
 * - Luôn đảm bảo có hậu tố /api (kể cả bạn không thêm trong .env)
 */
const RAW = (process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const BASE = RAW.endsWith("/api") ? RAW : `${RAW}/api`;

// 1 axios instance cho toàn bộ chat APIs
export const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

/**
 * Đặt/Bỏ Authorization header (nếu backend yêu cầu JWT)
 *   setAuthToken(token)        // gắn 1 lần sau khi login
 *   setAuthToken(null)         // xoá khi logout
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

/**
 * attachAuth(getToken) — tuỳ chọn:
 *   Tự động lấy token mỗi request (lỡ token đổi động).
 *   Trả về hàm eject nếu bạn muốn gỡ interceptor.
 */
export function attachAuth(getToken) {
  const id = api.interceptors.request.use((config) => {
    const t = typeof getToken === "function" ? getToken() : null;
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });
  return () => api.interceptors.request.eject(id);
}

/* ---------- Chat APIs ---------- */

// Danh sách hội thoại
export const listConversations = (params = {}) =>
  api.get("/chat/conversations", { params });

// Tạo hội thoại (mode: "ai" | "patient", patient_id?, title?)
export const createConversation = (payload) =>
  api.post("/chat/conversations", payload);

// Lấy chi tiết + lịch sử tin nhắn của 1 hội thoại
export const getConversation = (id) =>
  api.get(`/chat/conversations/${encodeURIComponent(id)}`);

// Xoá toàn bộ hội thoại
export const deleteConversation = (id) =>
  api.delete(`/chat/conversations/${encodeURIComponent(id)}`);

// Xóa tin nhắn riêng lẻ
export const deleteMessage = (messageId) =>
  api.delete(`/chat/messages/${encodeURIComponent(messageId)}`);

// Gửi tin nhắn thường (doctor/patient)
export const sendMessage = (convId, body) =>
  api.post(`/chat/conversations/${encodeURIComponent(convId)}/messages`, {
    content: body.content || body.message || body.text,
    role: body.role || "patient",
    file_url: body.file_url,
    file_name: body.file_name,
    file_type: body.file_type,
  });
console.log("Auth headers:", api.defaults.headers.common.Authorization);

// Upload file (hỗ trợ ảnh, PDF, documents)
export const uploadFile = (file, metadata = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (Object.keys(metadata).length > 0) {
    formData.append("metadata", JSON.stringify(metadata));
  }
  
  return api.post("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Chat với AI (Gemini)
export const chatAI = (convId, body) =>
  api.post("/chat/ai", {
    conv_id: convId,
    content: body.message,
  });


// Alias tiện dụng nếu code cũ gọi getHistory(roomId)
export const getHistory = (convId) => getConversation(convId);

// Export mặc định để ai cần dùng trực tiếp axios instance
export default api;
