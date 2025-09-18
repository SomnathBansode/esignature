import React, { useEffect } from "react";

export default function ConfirmModal({
  isOpen,
  open,
  title = "Are you sure?",
  body,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  loading = false,
}) {
  const visible = typeof isOpen === "boolean" ? isOpen : !!open;
  const text = body || message || "";

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && visible && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [visible, onClose]);

  if (!visible) return null;

  const handleConfirm = async () => {
    try {
      await Promise.resolve(onConfirm?.());
    } finally {
      onClose?.(); // auto-close after confirm
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {text && <div className="px-5 py-4 text-gray-700">{text}</div>}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 hover:bg-gray-50"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Please wait…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
