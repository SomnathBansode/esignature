// frontend/src/components/CopyHtmlButton.jsx
import React from "react";
import toast from "react-hot-toast";
import { copyHtml } from "@/utils/copyHtml";

/**
 * CopyHtmlButton
 * - mobileSafe=true (default): copies HTML WITHOUT inlining images (works on Gmail iOS/Android)
 * - mobileSafe=false: copies HTML WITH inlined images (desktop-focused)
 */
export default function CopyHtmlButton({
  html,
  label = "Copy HTML",
  className = "",
  disabled = false,
  mobileSafe = true,
}) {
  const onClick = async (e) => {
    e?.stopPropagation?.();
    if (!html) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      const ok = await copyHtml(html, undefined, {
        inlineImages: !mobileSafe ? true : false,
        inlineCss: true,
      });
      if (ok) {
        toast.success(
          mobileSafe ? "Copied (mobile-safe HTML)" : "Copied (images inlined)"
        );
      } else {
        toast.error("Copy failed. Try a desktop browser.");
      }
    } catch (err) {
      toast.error("Copy failed");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        className ||
        "inline-flex items-center px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
      }
      aria-label={label}
      title={label}
    >
      {label}
    </button>
  );
}
