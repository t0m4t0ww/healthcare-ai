// src/context/NotificationContext.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast as toastify } from "react-toastify";

const Ctx = createContext(null);
const LS_KEY = "hcai_notifications_v1";

function loadFromLS() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState(loadFromLS);
  const [msgUnreadTotal, setMsgUnreadTotalState] = useState(0); // 🔥 tổng unread tin nhắn (chat)

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {} }, [items]);

  const notify = useCallback(({ title, message, type = "default", showToast = true }) => {
    const id = Date.now().toString();
    setItems(prev => [{ id, title: title || "Thông báo", message: message || "", type, ts: new Date().toISOString(), read: false }, ...prev].slice(0, 100));
    if (showToast) { try { (toastify[type] || toastify.info)(`${title || "Thông báo"}: ${message || ""}`); } catch {} }
    return id;
  }, []);

  const markAsRead = useCallback((id) => setItems(prev => prev.map(it => it.id === id ? { ...it, read: true } : it)), []);
  const markAllAsRead = useCallback(() => setItems(prev => prev.map(it => it.read ? it : ({ ...it, read: true }))), []);
  const remove = useCallback((id) => setItems(prev => prev.filter(it => it.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const unread = useMemo(() => items.filter(x => !x.read).length, [items]);

  // Setter an toàn
  const setMsgUnreadTotal = useCallback((n) => setMsgUnreadTotalState(Number.isFinite(n) ? Math.max(0, n|0) : 0), []);
  // 👇 alias để code cũ vẫn chạy
  const setMessageUnreadTotal = setMsgUnreadTotal;

  const value = useMemo(() => ({
    items, unread, notify, markAsRead, markAllAsRead, remove, clear,
    msgUnreadTotal, setMsgUnreadTotal, setMessageUnreadTotal,   // 👈 expose cả 2
  }), [items, unread, notify, markAsRead, markAllAsRead, remove, clear, msgUnreadTotal, setMsgUnreadTotal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useNotifications = () => useContext(Ctx);
