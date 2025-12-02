// src/services/socket.js
import { io } from "socket.io-client";

const WS_URL =
  process.env.REACT_APP_WS_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:8000";

console.log("🔌 Initializing socket with URL:", WS_URL);

const socket = io(WS_URL, {
  path: "/socket.io",
  transports: ["polling", "websocket"],  // ✅ CHO PHÉP CẢ 2
  withCredentials: true,                  // ✅ GỬI CREDENTIALS
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
});

// Set token for authentication
export function setSocketToken(token) {
  try {
    socket.auth = { ...(socket.auth || {}), token };
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
    console.log("🔑 Socket token updated");
  } catch (err) {
    console.error("❌ Failed to set socket token:", err);
  }
}

// Helper functions
export const joinConvRoom = (convId, token) => {
  if (convId) {
    const room = `room:${convId}`;
    console.log("🚪 Joining room:", room);
    socket.emit("join_room", { conv_id: convId, room, token });
  }
};

export const leaveConvRoom = (convId) => {
  if (convId) {
    const room = `room:${convId}`;
    console.log("🚪 Leaving room:", room);
    socket.emit("leave_room", { conv_id: convId, room });
  }
};

// Socket event listeners
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id, "→", WS_URL);
  console.log("🔌 Transport:", socket.io.engine.transport.name);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connect_error:", err?.message || err);
});

socket.on("reconnect", (attemptNumber) => {
  console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
});

socket.on("system", (data) => {
  console.log("📢 System message:", data);
});

socket.io.engine.on("upgrade", (transport) => {
  console.log("⬆️ Socket upgraded to:", transport.name);
});

export default socket;