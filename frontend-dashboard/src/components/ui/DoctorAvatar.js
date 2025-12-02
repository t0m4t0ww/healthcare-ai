import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "antd";

/**
 * Props:
 * - compact: boolean        → chỉ hiện avatar (ẩn tên & chevron)
 * - initials: string        → chữ viết tắt trong vòng tròn (mặc định "BS")
 * - imageSrc: string        → đường dẫn ảnh avatar (nếu có)
 * - online: boolean         → trạng thái online (mặc định true)
 * - showPing: boolean       → hiệu ứng ping (mặc định true)
 * - statusPos: "tr"|"br"|"tl"|"bl" → vị trí dot (mặc định "tr")
 */
export default function DoctorAvatar({
  name,
  initials = "BS",
  compact = false,
  imageSrc,
  online = true,
  showPing = true,
  statusPos = "tr",
}) {
  const { user, logout } = useAuth();
  const displayName = name || user?.name || "Bác sĩ";
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOut = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  const onLogoutClick = () => {
    setLogoutVisible(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
      setLogoutVisible(false);
    }
  };

  const posClass =
    statusPos === "br"
      ? "bottom-0 right-0 translate-x-1 translate-y-1"
      : statusPos === "tl"
      ? "top-0 left-0 -translate-x-1 -translate-y-1"
      : statusPos === "bl"
      ? "bottom-0 left-0 -translate-x-1 translate-y-1"
      : "top-0 right-0 translate-x-1 -translate-y-1"; // "tr" default

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-base-200 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Avatar container để đặt dot online */}
        <div className="relative">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="avatar"
              className="w-9 h-9 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100"
              onError={(e) => (e.currentTarget.src = "")}
            />
          ) : (
            <div className="w-9 h-9 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100 bg-primary/10 text-primary grid place-items-center font-semibold">
              {initials}
            </div>
          )}

          {/* Online status dot */}
          <span
            className={`absolute ${posClass} flex h-3 w-3`}
            aria-label={online ? "Online" : "Offline"}
            title={online ? "Online" : "Offline"}
          >
            <span
              className={[
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                online ? "bg-green-400" : "bg-gray-400",
                showPing && online ? "animate-ping" : "",
              ].join(" ")}
            />
            <span
              className={[
                "relative inline-flex rounded-full h-3 w-3 border-2",
                "border-base-100", 
                online ? "bg-green-500" : "bg-gray-500",
              ].join(" ")}
            />
          </span>
        </div>

        {!compact && <span className="text-sm font-medium">{displayName}</span>}
        {!compact && <ChevronDown size={16} className="opacity-70" />}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-xl border border-base-300 bg-base-100 shadow-lg p-2 z-50"
          role="menu"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs opacity-70">{user?.role || "Hệ thống"}</p>
          </div>
          <button
            onClick={onLogoutClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-100 text-red-600"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      )}

      <Modal
        open={logoutVisible}
        title="Đăng xuất khỏi hệ thống?"
        okText="Đăng xuất"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        centered
        confirmLoading={isLoggingOut}
        onOk={handleConfirmLogout}
        onCancel={() => {
          if (!isLoggingOut) {
            setLogoutVisible(false);
          }
        }}
      >
        <p className="text-slate-600">
          Phiên làm việc hiện tại sẽ kết thúc và bạn cần đăng nhập lại để tiếp tục sử dụng hệ thống.
        </p>
      </Modal>
    </div>
  );
}
