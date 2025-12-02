// frontend/src/pages/ChatPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Send, Loader2, Trash2,
  Users, MessageCircle, Bot, X, File
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

import {
  listConversations,
  createConversation,
  getConversation,
  sendMessage,
  deleteConversation
} from "../../services/chatService";
import { getPatients } from "../../services/services";
import socket, { setSocketToken } from "../../services/socket";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ---------------- helpers ---------------- */
const asArr = (x) => (Array.isArray(x) ? x : []);
const pickArray = (...candidates) => { for (const c of candidates) if (Array.isArray(c)) return c; return []; };
const unwrap = (res) => (res && (res.data?.data ?? res.data ?? res)) || res || {};

const canonConv = (cRaw = {}) => {
  const c = cRaw.data ? cRaw.data : cRaw;
  return {
    _id: c._id || c.id || c.conversation_id,
    mode: c.mode || (c.is_ai ? "ai" : "patient"),
    title: c.title || c.patient_name || c.name || "Hội thoại",
    patient_id: c.patient_id || c.patientId || null,
    doctor_id: c.doctor_id || c.doctorId || null,
    lastSnippet: c.lastSnippet || c.last_message || c.last || "",
    updated_at: c.updated_at || c.updatedAt || c.ts || c.timestamp || null,
  };
};

const canonMsg = (m = {}) => ({
  id: m._id || m.id || m.message_id || m.clientId,
  role: (m.role || m.sender || "patient").toLowerCase(),
  content: m.message || m.content || m.text || "",
  ts: m.timestamp || m.ts || m.created_at || new Date().toISOString(),
  file_url: m.file_url,
  file_name: m.file_name,
  file_type: m.file_type,
});

const fmtTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

/* ===== UI components (inline để khỏi import lặt vặt) ===== */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
      </div>
      <span className="text-sm">Đang nhập...</span>
    </div>
  );
}

function MessageBubble({ role, children, ts, meRole, markdown = false, fileUrl, fileName, fileType, token }) {
  const mine = role === meRole;
  const isAI = role === "ai";

  const bubbleClasses = () => {
    if (isAI) return "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25";
    if (mine) return "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25";
    return "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 shadow-sm";
    };
  const avatarClasses = () => {
    if (isAI) return "bg-gradient-to-br from-purple-500 to-purple-600 text-white";
    if (mine) return "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white";
    return "bg-gradient-to-br from-blue-500 to-blue-600 text-white";
  };

  return (
    <div className={`flex items-end gap-3 mb-4 ${mine ? "flex-row-reverse" : ""}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${avatarClasses()}`}>
        {isAI ? <Bot size={16} /> : mine ? "BS" : <Users size={16} />}
      </div>
      <div className={`max-w-[75%] ${bubbleClasses()} rounded-2xl px-4 py-3 ${mine ? "rounded-br-md" : "rounded-bl-md"}`}>
        {/* File attachment preview */}
        {fileUrl && (
          <div className="mb-2">
            {fileType?.startsWith('image/') ? (
              <a 
                href={`http://localhost:8000${fileUrl}?token=${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img 
                  src={`http://localhost:8000${fileUrl}?token=${token}`}
                  alt={fileName || 'Attached image'}
                  className="max-w-full rounded-xl border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              </a>
            ) : (
              <a 
                href={`http://localhost:8000${fileUrl}?token=${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-3 rounded-xl ${
                  mine
                    ? 'bg-white/20 hover:bg-white/30'
                    : 'bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'
                } transition-colors`}
              >
                <File size={20} className={mine ? 'text-white' : 'text-slate-600 dark:text-slate-300'} />
                <span className="text-sm flex-1 truncate">
                  {fileName || 'File đính kèm'}
                </span>
              </a>
            )}
          </div>
        )}
        
        <div className={`prose prose-sm ${isAI ? "prose-invert" : ""} max-w-none`}>
          {markdown && isAI ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {String(children || "")}
            </ReactMarkdown>
          ) : (
            <div className="whitespace-pre-wrap break-words">{children}</div>
          )}
        </div>
        {ts && (
          <div className={`text-xs mt-2 opacity-70 ${mine ? "text-right" : ""}`}>
            {fmtTime(ts)}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({ conv, active, unread = 0, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
        active ? "bg-emerald-50 dark:bg-emerald-900/20 border-r-2 border-emerald-500" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
            <Users size={12} />
            Bệnh nhân
          </span>
        </div>
        {unread > 0 && (
          <span className="bg-rose-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate mb-1">
        {conv.title || "Hội thoại"}
      </h3>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="truncate max-w-[70%]">{conv.lastSnippet || "—"}</span>
        <span>{conv.updated_at ? fmtTime(conv.updated_at) : ""}</span>
      </div>
    </div>
  );
}

function ContactItem({ p, online, onClick }) {
  const initials = (p.full_name || p.name || "BN")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className="p-4 cursor-pointer border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {initials}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
            online ? "bg-emerald-500" : "bg-slate-400"
          }`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">
            {p.full_name || p.name || "Bệnh nhân"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {p.phone || p.email || "—"}
          </p>
        </div>
        <div className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
      </div>
    </div>
  );
}

function PatientSelectorModal({ isOpen, onClose, patients = [], onSelectPatient }) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(p =>
      (p.full_name || p.name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q)
    );
  }, [patients, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Chọn Bệnh nhân</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Chọn bệnh nhân để bắt đầu tư vấn</p>
            <div className="relative mt-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bệnh nhân..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-96">
            <div className="grid gap-3">
              {filtered.length ? (
                filtered.map((p) => (
                  <motion.button
                    key={p._id}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectPatient(p)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                        {(p.full_name || p.name || "BN").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                          {p.full_name || p.name || "Bệnh nhân"}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {p.phone || p.email || "Chưa có thông tin liên hệ"}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Không tìm thấy bệnh nhân
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ===== Page ===== */
export default function ChatPage() {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const { notify, setMessageUnreadTotal } = useNotifications?.() || { notify: () => {}, setMessageUnreadTotal: () => {} };

  const [tab, setTab] = useState("convs");
  const [convs, setConvs] = useState([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientFilter, setPatientFilter] = useState("");
  const [onlineMap, setOnlineMap] = useState({});
  const [showPatientSelector, setShowPatientSelector] = useState(false);

  const scrollRef = useRef(null);
  const meRole = (user?.role || "doctor").toLowerCase();

  /* ✅ Set socket token đúng chỗ */
  useEffect(() => {
    if (token) setSocketToken(token);
  }, [token]);

  /* Auth gate */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [authLoading, isAuthenticated]);

  /* Socket: conversation_deleted */
  useEffect(() => {
    const handleConversationDeleted = (data) => {
      const deletedConvId = data.conversation_id || data.conv_id;
      if (!deletedConvId) return;
      setConvs(prev => prev.filter(c => c._id !== deletedConvId));
      if (selected?._id === deletedConvId) {
        setSelected(null);
        setMessages([]);
        toast.info("Hội thoại đã bị xóa");
      }
      setUnreadMap(prev => {
        const n = { ...prev }; delete n[deletedConvId]; return n;
      });
    };
    socket.on("conversation_deleted", handleConversationDeleted);
    return () => socket.off("conversation_deleted", handleConversationDeleted);
  }, [selected]);

  /* Load convs + patients */
  const fetchConvs = async (pickFirst = false) => {
    if (!token) return;
    try {
      const res = await listConversations();
      const payload = res?.data ?? res;
      const rows = pickArray(payload, payload?.items, payload?.data, payload?.conversations).map(canonConv);
      setConvs(rows);
      if (pickFirst && rows.length) {
        const ai = rows.find((x) => x.mode === "ai");
        selectConversation(ai || rows[0]);
      }
    } catch (e) {
      if (e?.response?.status !== 401) {
        setConvs([]);
        toast.error("Không tải được danh sách hội thoại");
      }
    }
  };

  const fetchPatients = async () => {
    if (!token) return;
    try {
      const res = await getPatients();
      const payload = res?.data ?? res;
      const rows = pickArray(payload, payload?.items, payload?.data, payload?.patients);
      setPatients(rows);
    } catch (e) {
      if (e?.response?.status !== 401) {
        setPatients([]);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      fetchConvs(true);
      fetchPatients();
    }
  }, [authLoading, isAuthenticated, token]);

  /* Join room + receive realtime */
  useEffect(() => {
    if (!selected?._id || !token) return;

    const handleIncoming = (data) => {
      const convId = data.conversation_id || data.conv_id;
      if (convId !== selected._id) return;
      const newMsg = canonMsg(data);
      setMessages((prev) => {
        const isDuplicate = prev.some(msg =>
          (msg.id && newMsg.id && msg.id === newMsg.id) ||
          (msg.content === newMsg.content && msg.role === newMsg.role &&
            Math.abs(new Date(msg.ts) - new Date(newMsg.ts)) < 5000)
        );
        if (isDuplicate) return prev;
        if (newMsg.role !== meRole) {
          notify?.({
            title: "Tin nhắn mới",
            message: String(newMsg.content).slice(0, 80),
            type: "info",
          });
        }
        return [...prev, newMsg];
      });
      // refresh sidebar time/last snippet nhẹ
      setTimeout(fetchConvs, 600);
      scrollBottom();
    };

    socket.off("new_message", handleIncoming);
    socket.off("receive_message", handleIncoming);

    socket.emit("join_room", { conv_id: selected._id, token });
    socket.on("new_message", handleIncoming);
    socket.on("receive_message", handleIncoming);

    return () => {
      socket.emit("leave_room", { conv_id: selected._id, token });
      socket.off("new_message", handleIncoming);
      socket.off("receive_message", handleIncoming);
    };
  }, [selected?._id, token, meRole]);

  /* Unread badge tổng */
  useEffect(() => {
    const total = Object.values(unreadMap).reduce((a, b) => a + (b || 0), 0);
    setMessageUnreadTotal?.(total);
  }, [unreadMap, setMessageUnreadTotal]);

  /* Actions */
  const selectConversation = async (conv) => {
    if (!token) return;
    try {
      const cc = canonConv(conv);
      const convId = cc._id;
      if (!convId) {
        toast.warn("Hội thoại không hợp lệ");
        return;
      }
      setSelected(cc);
      setLoading(true);
      const res = await getConversation(convId);
      const payload = unwrap(res);
      const msgs = Array.isArray(payload.messages) ? payload.messages.map(canonMsg) : [];
      setMessages(msgs);
      setUnreadMap((m) => ({ ...m, [convId]: 0 }));
      setTimeout(scrollBottom, 0);
    } catch (e) {
      if (e?.response?.status !== 401) {
        toast.error("Không tải được lịch sử chat");
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const onSend = async () => {
    if (!selected || !input.trim() || !token) return;
    const text = input.trim();

    // Optimistic UI
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, role: meRole, content: text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    scrollBottom();

    setSending(true);
    try {
      await sendMessage(selected._id, { role: meRole, content: text });
      // Socket event sẽ đổ về -> anti-dup bằng check ở handler
    } catch (err) {
      toast.error("Không thể gửi tin nhắn");
      // rollback optimistic nếu thất bại
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = useMemo(() => {
    const base = asArr(convs);
    const q = (filter || "").toLowerCase().trim();
    let arr = q ? base.filter((c) => (c.title || "").toLowerCase().includes(q)) : base.slice();
    if (selected?._id) {
      arr.sort((a, b) => (a._id === selected._id ? -1 : b._id === selected._id ? 1 : 0));
    }
    return arr;
  }, [convs, filter, selected]);

  const filteredPatients = useMemo(() => {
    const base = asArr(patients);
    const q = (patientFilter || "").toLowerCase().trim();
    return q ? base.filter((p) => (p.full_name || p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q)) : base;
  }, [patients, patientFilter]);

  const createNewConversation = async (patient_id) => {
    if (!token) return toast.error("Chưa đăng nhập");
    try {
      if (!patient_id) {
        setShowPatientSelector(true);
        return;
      }
      const patient = patients.find(p => p._id === patient_id);
      const title = patient ? (patient.full_name || patient.name || "Bệnh nhân") : "Hội thoại với bệnh nhân";
      const res = await createConversation({ mode: "patient", patient_id, title });
      const conv = canonConv(unwrap(res));
      setConvs(prev => [conv, ...prev]);
      selectConversation(conv);
      toast.success("Đã tạo hội thoại mới!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể tạo hội thoại");
    }
  };

  const ensurePatientConversation = async (p) => {
    if (!token) return toast.error("Chưa đăng nhập");
    try {
      if (!p || !p._id) return toast.error("Thiếu thông tin bệnh nhân");
      const existed = convs.find(c => c.patient_id === p._id);
      if (existed) return selectConversation(existed);
      const res = await createConversation({
        mode: "patient",
        patient_id: p._id,
        title: p.full_name || p.name || "Bệnh nhân"
      });
      const conv = canonConv(unwrap(res));
      setConvs(prev => [conv, ...prev]);
      selectConversation(conv);
      toast.success("Đã tạo hội thoại với bệnh nhân");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể tạo hội thoại với bệnh nhân");
    }
  };

  const handleSelectPatient = async (patient) => {
    setShowPatientSelector(false);
    await ensurePatientConversation(patient);
  };

  const deleteConv = async (conv, onDeleted = () => {}) => {
    if (!conv || !conv._id || !token) {
      toast.warn("Không thể xác định hội thoại để xoá");
      return;
    }
    const toastId = toast(
      ({ closeToast }) => (
        <div>
          <p>Bạn có chắc muốn xoá hội thoại <b>"{conv.title}"</b>?</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="px-3 py-1 text-sm bg-rose-600 text-white rounded hover:bg-rose-700"
              onClick={async () => {
                try {
                  await deleteConversation(conv._id);
                  setConvs(prev => prev.filter(c => c._id !== conv._id));
                  if (selected?._id === conv._id) {
                    setSelected(null);
                    setMessages([]);
                  }
                  onDeleted();
                  toast.success("Đã xoá hội thoại");
                } catch (err) {
                  toast.error("Xoá hội thoại thất bại");
                } finally {
                  toast.dismiss(toastId);
                }
              }}
            >
              Xoá
            </button>
            <button
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-slate-600 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
              onClick={() => toast.dismiss(toastId)}
            >
              Hủy
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false, closeButton: false, position: "top-center" }
    );
  };

  /* ====== Render ====== */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-top-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <MessageCircle size={64} className="mx-auto text-emerald-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Chưa đăng nhập</h2>
          <p className="text-slate-600 mb-6">Vui lòng đăng nhập để sử dụng tính năng chat</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="h-full grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageCircle size={20} className="text-emerald-500" />
                Chat
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPatientSelector(true)}
                  className="btn btn-sm btn-ghost text-blue-600 dark:text-blue-400"
                  title="Chat với bệnh nhân"
                >
                  <Plus size={14} />
                  Bệnh nhân
                </button>
              </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  tab === "convs"
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                onClick={() => setTab("convs")}
              >
                Hội thoại
              </button>
              <button
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  tab === "contacts"
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                onClick={() => setTab("contacts")}
              >
                Danh bạ
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={tab === "convs" ? "Tìm hội thoại..." : "Tìm bệnh nhân..."}
                value={tab === "convs" ? filter : patientFilter}
                onChange={(e) => tab === "convs" ? setFilter(e.target.value) : setPatientFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "convs" ? (
              filteredConvs.length > 0 ? (
                filteredConvs.map((c) => (
                  <ConversationItem
                    key={c._id}
                    conv={c}
                    active={selected?._id === c._id}
                    unread={unreadMap[c._id] || 0}
                    onClick={() => selectConversation(c)}
                  />
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có hội thoại nào</p>
                </div>
              )
            ) : (
              filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <ContactItem
                    key={p._id || p.id}
                    p={p}
                    online={!!onlineMap[p._id || p.id]}
                    onClick={() => ensurePatientConversation(p)}
                  />
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có bệnh nhân nào</p>
                </div>
              )
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <section className="col-span-12 md:col-span-8 lg:col-span-9 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${selected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {selected ? selected.title : "Chọn hội thoại"}
                  </h2>
                  {selected && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        <Users size={12} />
                        Bệnh nhân
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Hoạt động</span>
                    </div>
                  )}
                </div>
              </div>
              {selected && (
                <button
                  className="btn btn-ghost btn-sm gap-1 text-rose-500 hover:text-rose-600"
                  onClick={() => deleteConv(selected, () => setSelected(null))}
                  title="Xóa hội thoại"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-1 max-h-0"
            style={{ minHeight: '200px', maxHeight: 'calc(100vh - 300px)' }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400">Đang tải tin nhắn...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <MessageCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Chưa có tin nhắn</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {selected ? "Bắt đầu cuộc trò chuyện với bệnh nhân" : "Chọn một hội thoại để bắt đầu"}
                  </p>
                  {!selected && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => setShowPatientSelector(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Chat với bệnh nhân
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, idx) => (
                  <MessageBubble
                    key={String(m.id || m._id || m.clientId || `${m.ts}-${idx}`)}
                    role={m.role}
                    ts={m.ts}
                    meRole={meRole}
                    markdown
                    fileUrl={m.file_url}
                    fileName={m.file_name}
                    fileType={m.file_type}
                    token={token}
                  >
                    {m.content}
                  </MessageBubble>
                ))}
                {typing && <TypingIndicator />}
              </>
            )}
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder={selected ? "Nhập tin nhắn..." : "Chọn hội thoại để bắt đầu"}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none"
                  style={{ minHeight: '48px' }}
                />
              </div>
              <button
                className="btn btn-primary gap-2"
                onClick={onSend}
                disabled={!selected || sending || !input.trim()}
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span><kbd className="kbd kbd-xs">Enter</kbd> để gửi</span>
                <span><kbd className="kbd kbd-xs">Shift</kbd> + <kbd className="kbd kbd-xs">Enter</kbd> để xuống dòng</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PatientSelectorModal
        isOpen={showPatientSelector}
        onClose={() => setShowPatientSelector(false)}
        patients={patients}
        onSelectPatient={handleSelectPatient}
      />
    </div>
  );
}
