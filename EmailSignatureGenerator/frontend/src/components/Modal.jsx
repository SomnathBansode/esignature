// frontend/src/components/Modal.jsx
import React, { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-3xl",
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-xl shadow-xl max-h-[85vh] overflow-auto`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
