import React, { useState } from "react";
import { uploadToCloudinary } from "../lib/cloudinaryUpload";
import { FiUpload, FiImage, FiCheckCircle, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";

function getErrorMessage(err) {
  const msg =
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    err?.message ??
    (typeof err === "string" ? err : null);

  if (typeof msg === "string") return msg;
  try {
    return JSON.stringify(msg || err) || "Upload failed";
  } catch {
    return "Upload failed";
  }
}

export default function ImageUploader({
  label = "Upload image",
  value,
  onChange, // (secureUrl) => void
  accept = "image/*",
  className = "",
}) {
  const { token } = useSelector((s) => s.user);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (file) => {
    setError("");
    setBusy(true);
    setProgress(0);
    try {
      console.log("Starting upload for file:", file.name);
      const res = await uploadToCloudinary({
        file,
        token,
        onProgress: (p) => {
          console.log("Upload progress:", p);
          setProgress(p);
        },
      });
      console.log("Upload successful:", res);
      onChange?.(res.secure_url);
    } catch (e) {
      const errorMsg = getErrorMessage(e);
      console.error("Upload error:", errorMsg);
      setError(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {hasValue ? (
          <span className="inline-flex items-center text-green-600 text-xs">
            <FiCheckCircle className="mr-1" /> uploaded
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <label
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
            busy ? "opacity-60" : "hover:bg-gray-50"
          } cursor-pointer`}
        >
          <FiUpload />
          <span>{busy ? "Uploading..." : "Choose file"}</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                console.log("File selected:", f.name);
                onFile(f);
              }
              e.currentTarget.value = ""; // allow reselect same file
            }}
          />
        </label>

        {hasValue && (
          <>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
            >
              <FiImage />
              Preview
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
              onClick={() => onChange?.("")}
              title="Remove image"
            >
              <FiX /> Remove
            </button>
          </>
        )}
      </div>

      {busy && (
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {hasValue && (
        <p className="text-xs text-gray-500 mt-2 break-all">{value}</p>
      )}
    </div>
  );
}
