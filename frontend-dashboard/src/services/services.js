// services.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ===== Interceptors: tự gắn Authorization cho mọi request =====
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
      } catch {}
      window.location.href = "/login"; // tránh loop khi token hết hạn
    }
    return Promise.reject(err);
  }
);

api.interceptors.request.use((config) => {
  try {
    // ✅ FIX: Đọc token giống services.js
    const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    const token =
      user?.token ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore parse error
  }
  return config;
});
// ===============================================================

// ---------------- Patients ----------------
export const getPatients = async (params) =>
  (await api.get("/patients", { params })).data;

export const getPatient = async (id) =>
  (await api.get(`/patients/${id}`)).data;

export const getHealthScore = async (patientId) =>
  (await api.get(`/patients/${patientId}/health-score`)).data;

export const createPatient = async (payload) =>
  (await api.post("/patients", payload)).data;

export const updatePatient = async (id, patch) =>
  (await api.patch(`/patients/${id}`, patch)).data;

export const deletePatient = async (id) =>
  (await api.delete(`/patients/${id}`)).data;

// ---------------- Doctors ----------------
export const getDoctors = async (params) =>
  (await api.get("/doctors", { params })).data;

export const createDoctor = async (payload) =>
  (await api.post("/doctors", payload)).data;

export const updateDoctor = async (id, patch) =>
  (await api.patch(`/doctors/${id}`, patch)).data;

export const deleteDoctor = async (id) =>
  (await api.delete(`/doctors/${id}`)).data;

// ---------------- Admin Accounts ----------------
export const setDoctorAccountStatus = async (doctorId, isActive, reason) =>
  (await api.patch(`/admin/accounts/doctors/${doctorId}/status`, {
    is_active: isActive,
    reason,
  })).data;

export const setPatientAccountStatus = async (patientId, isActive, reason) =>
  (await api.patch(`/admin/accounts/patients/${patientId}/status`, {
    is_active: isActive,
    reason,
  })).data;

// ---------------- X-ray ----------------
export const predictXray = async (file, patientName, opts = {}) => {
  if (!file) throw new Error("Thiếu file X-ray");

  const fd = new FormData();
  fd.append("file", file);
  if (patientName) fd.append("patient_name", patientName);
  if (opts.conf != null)  fd.append("conf",  String(opts.conf));
  if (opts.iou  != null)  fd.append("iou",   String(opts.iou));
  if (opts.imgsz!= null)  fd.append("imgsz", String(opts.imgsz));
  if (opts.device)        fd.append("device", String(opts.device));

  const multipartConfig = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };

  let res;
  try {
    res = await api.post("/xray/predict", fd, multipartConfig);
  } catch (err) {
    if (err?.response?.status === 404) {
      res = await api.post("/predict-xray", fd, multipartConfig);
    } else {
      throw err;
    }
  }

  const payload = (res && (res.data?.data ?? res.data)) || {};

  const toProb = (x) => {
    const v = Number(x);
    if (!Number.isFinite(v)) return 0;
    if (v > 1 && v <= 100) return v / 100;
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  };

  const predictions = Array.isArray(payload.predictions)
    ? payload.predictions
        .map((p) => {
          const raw = p.prob ?? p.confidence ?? p.score ?? p.conf ?? 0;
          return {
            label: p.label || p.name || p.class || "Unknown",
            prob: toProb(raw),
            box: p.box || p.bbox || null,
          };
        })
        .sort((a, b) => b.prob - a.prob)
    : [];

  return {
    ...payload,
    predictions,
    top: payload.top && Number.isFinite(payload.top?.prob)
      ? { ...payload.top, prob: toProb(payload.top.prob) }
      : (predictions[0] ?? null),
  };
};

// ---------------- Reports ----------------
export const getDailyReport = async (date) =>
  (await api.get("/report/statistics", { params: { date } })).data;

export default api;
