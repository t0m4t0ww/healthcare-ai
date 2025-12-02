import React from "react";

const OnlineStatus = ({ online = true, label = "Online" }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${online ? "bg-green-400" : "bg-gray-400"} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-3 w-3 ${online ? "bg-green-500" : "bg-gray-500"}`} />
      </span>
      <span className="text-xs opacity-80">{online ? label : "Offline"}</span>
    </div>
  );
};

export default OnlineStatus;
