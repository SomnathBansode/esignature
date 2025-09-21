import React, { useEffect, useMemo, useRef } from "react";

/**
 * Backwards-compatible ConfirmModal with enhanced UI
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
  onCancel, // alias
  loading = false,
  closeOnEsc = true,
  closeOnOverlay = true,
}) {
  const visible = typeof isOpen === "boolean" ? isOpen : !!open;
  const content = children ?? body ?? message ?? null;

  const overlayRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const modalRef = useRef(null);

  const titleId = useMemo(
    () => `confirm-title-${Math.random().toString(36).slice(2, 8)}`,
    []
  );
  const descId = useMemo(
    () => `confirm-desc-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

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

  useEffect(() => {
    if (visible && modalRef.current) {
      modalRef.current.style.transform = "scale(0.95) translateY(-10px)";
      modalRef.current.style.opacity = "0";
      requestAnimationFrame(() => {
        if (modalRef.current) {
          modalRef.current.style.transition = "all 0.2s ease-out";
          modalRef.current.style.transform = "scale(1) translateY(0px)";
          modalRef.current.style.opacity = "1";
        }
      });
    }
  }, [visible]);

  if (!visible) return null;

  const handleConfirm = async () => {
    try {
      const result = await Promise.resolve(onConfirm?.());
      if (result === false) return;
    } finally {
      (onClose || onCancel)?.();
    }
  };

  const isDestructive =
    confirmText.toLowerCase().includes("delete") ||
    confirmText.toLowerCase().includes("remove") ||
    confirmText.toLowerCase().includes("destroy") ||
    title.toLowerCase().includes("delete") ||
    title.toLowerCase().includes("remove");

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={content ? descId : undefined}
      style={{ animation: visible ? "fadeIn 0.2s ease-out" : "none" }}
      onMouseDown={(e) => {
        if (!closeOnOverlay) return;
        if (e.target === e.currentTarget) (onClose || onCancel)?.();
      }}
    >
      {/* NOTE: plain <style>, no `jsx` prop */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0px); }
        }
      `}</style>

      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ animation: "slideUp 0.2s ease-out" }}
      >
        <div className="relative px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
          <div className="flex items-center">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                isDestructive ? "bg-red-100" : "bg-blue-100"
              }`}
            >
              {isDestructive ? (
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <h3
                id={titleId}
                className="text-lg font-semibold text-gray-900 leading-tight"
              >
                {title}
              </h3>
            </div>

            {closeOnEsc && (
              <button
                type="button"
                onClick={onClose || onCancel}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors duration-200"
                disabled={loading}
                aria-label="Close dialog"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {content ? (
          <div id={descId} className="px-6 py-5 text-gray-700 leading-relaxed">
            {content}
          </div>
        ) : null}

        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              ref={cancelBtnRef}
              onClick={onClose || onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center ${
                isDestructive
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Please wait...
                </>
              ) : (
                <>
                  {isDestructive ? (
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ConfirmModal = ConfirmModalComponent;
export default ConfirmModalComponent;
