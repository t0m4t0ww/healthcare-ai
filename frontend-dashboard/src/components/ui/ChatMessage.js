// 
import React from "react";
export default function ChatMessage({ role, content, ts }) {
  const isMe = role === "doctor";
  const isAI = role === "ai";
  return (
    <div className={`chat ${isMe ? "chat-end" : "chat-start"}`}>
      <div className="chat-image avatar">
        <div className={`w-10 rounded-full ring ${isAI ? "ring-purple-500" : "ring-primary"}`}>
          <img alt="avatar" src={isAI ? "/assets/ai.png" : "/assets/doctor-avatar.png"} />
        </div>
      </div>
      <div className={`chat-bubble ${isAI ? "bg-purple-600 text-white" : (isMe ? "bg-primary text-white" : "bg-base-200")}`}>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
      <div className="chat-footer opacity-60 text-xs mt-1">
        {ts ? new Date(ts).toLocaleString() : ""}
      </div>
    </div>
  );
}
