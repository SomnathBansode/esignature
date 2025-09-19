import React, { useEffect, useMemo, useRef } from "react";

/**
 * Backwards-compatible ConfirmModal
 * - Props kept: isOpen, open, title, body, message, confirmText, cancelText, onConfirm, onClose, loading
 * - Also supports: children (optional), onCancel (alias), closeOnEsc=true, closeOnOverlay=true
 * - Exports both default and named for import flexibility.
 */
function ConfirmModalComponent({
  isOpen,
  open, // alias
  title = "Are you sure?",
  body,
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  onCancel, // alias (if some places used it)
  loading = false,
  closeOnEsc = true,
  closeOnOverlay = true,
}) {
  const visible = typeof isOpen === "boolean" ? isOpen : !!open;
  const content = children ?? body ?? message ?? null;

  const overlayRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const titleId = useMemo(
    () => `confirm-title-${Math.random().toString(36).slice(2, 8)}`,
    []
  );
  const descId = useMemo(
    () => `confirm-desc-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  // Escape to close (kept simple like original)
  useEffect(() => {
    if (!closeOnEsc) return;
    const onKey = (e) => {
      if (e.key === "Escape" && visible) {
        (onClose || onCancel)?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose, onCancel, closeOnEsc]);

  if (!visible) return null;

  const handleConfirm = async () => {
    try {
      const result = await Promise.resolve(onConfirm?.());
      // Preserve original behavior: auto-close after confirm
      // If you ever need to prevent auto-close, make onConfirm return false
      if (result === false) return;
    } finally {
      (onClose || onCancel)?.();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={content ? descId : undefined}
      onMouseDown={(e) => {
        if (!closeOnOverlay) return;
        if (e.target === e.currentTarget) (onClose || onCancel)?.();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h3 id={titleId} className="text-lg font-semibold">
            {title}
          </h3>
        </div>

        {content ? (
          <div id={descId} className="px-5 py-4 text-gray-700">
            {content}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            ref={cancelBtnRef}
            onClick={onClose || onCancel}
            className="rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Named + default export (to cover different import styles)
export const ConfirmModal = ConfirmModalComponent;
export default ConfirmModalComponent;
