import React from "react";
import { FiCopy } from "react-icons/fi";
import toast from "react-hot-toast";
import copyHtml from "@/utils/copyHtml";

export default function CopyHtmlButton({
  html,
  label = "Copy (HTML)",
  className = "",
  disabled = false,
}) {
  const onClick = async () => {
    try {
      if (!html || typeof html !== "string") {
        toast.error("Nothing to copy.");
        return;
      }
      const ok = await copyHtml(html);
      if (ok) toast.success("Copied rich HTML.");
      else toast.error("Copy failed. Try a desktop browser.");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title="Copy as rich HTML"
    >
      <span className="inline-flex items-center gap-2">
        <FiCopy aria-hidden /> {label}
      </span>
    </button>
  );
}
