import React, { useEffect, useState } from "react";

export default function EditableCell({ value: initial, onSave, type = "text", className = "" }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");

  useEffect(() => setValue(initial ?? ""), [initial]);

  const commit = async () => {
    if (String(value) === String(initial)) {
      setEditing(false);
      return;
    }
    await onSave(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className={`cursor-pointer hover:bg-base-200 rounded px-2 py-1 ${className}`}
        onClick={() => setEditing(true)}
        title="Nhấp để sửa"
      >
        {initial ?? <span className="opacity-40">—</span>}
      </div>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="input input-sm input-bordered w-full"
    />
  );
}
