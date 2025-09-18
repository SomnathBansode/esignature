import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import { FiCopy, FiDownload, FiEdit2, FiTrash2 } from "react-icons/fi";
import ConfirmModal from "../components/ConfirmModal.jsx";
import cleanSignatureHtml from "../../test/cleanSignatureHtml.js";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(
  /\/$/,
  ""
);

// ---- image helpers (absolutize + safe fallback) ----
const isHttp = (u) => /^https?:\/\//i.test(u || "");
const isProtocolRelative = (u) => /^\/\//.test(u || "");
const isDataImg = (u) =>
  /^data:image\/[a-z0-9.+-]+(?:;charset=[^;,]+)?(?:;base64)?,/i.test(u || "");
const absolutize = (u) => {
  if (!u) return null;
  try {
    if (isHttp(u) || isDataImg(u) || u.startsWith("blob:")) return u;
    if (isProtocolRelative(u)) return `${window.location.protocol}${u}`;
    return new URL(u, `${API}/`).href;
  } catch {
    return null;
  }
};

const BROKEN_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <g fill="#9ca3af" font-family="Arial" font-size="12">
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">image unavailable</text>
      </g>
    </svg>`
  );

const SignatureListPage = () => {
  const { user, token } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const previewRefs = useRef({});

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchSignatures = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/api/signatures`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSignatures(response.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch signatures");
      } finally {
        setLoading(false);
      }
    };
    fetchSignatures();
  }, [user, token, navigate]);

  // After render, fix up <img> src values and add safe fallbacks
  useEffect(() => {
    signatures.forEach((sig) => {
      const root = previewRefs.current[sig.id];
      if (!root) return;
      root.querySelectorAll("img").forEach((img) => {
        const raw = img.getAttribute("src");
        const abs = absolutize(raw);
        img.setAttribute("crossorigin", "anonymous");
        img.src = abs || BROKEN_PLACEHOLDER;
        img.onerror = () => {
          img.onerror = null;
          img.src = BROKEN_PLACEHOLDER;
        };
      });
    });
  }, [signatures]);

  const doDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/signatures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSignatures((prev) => prev.filter((s) => s.id !== id));
      toast.success("Signature deleted");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete signature");
    }
  };

  const handleDelete = (id, name) => {
    setPendingDelete({ id, name });
    setIsModalOpen(true);
  };

  const handleCopy = async (sig) => {
    try {
      const html = cleanSignatureHtml(sig.html_code || "");
      if (window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([html], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      toast.success("Copied rich HTML (cleaned).");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownloadPng = async (sig) => {
    try {
      const node = previewRefs.current[sig.id];
      if (!node) return;
      const canvas = await html2canvas(node, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        ignoreElements: (el) =>
          el.tagName === "IMG" && !absolutize(el.getAttribute("src")),
      });
      const link = document.createElement("a");
      link.download = `signature-${sig.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error("PNG export failed");
    }
  };

  if (loading)
    return (
      <div className="text-center mt-20">
        <ClipLoader size={40} color="#2563eb" />
      </div>
    );
  if (error)
    return <div className="text-center mt-20 text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Signatures</h1>
        <button
          onClick={() => navigate("/signatures/create")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create New
        </button>
      </div>

      {signatures.length === 0 ? (
        <p>No signatures found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {signatures.map((signature) => (
            <div
              key={signature.id}
              className="p-4 bg-white shadow rounded-lg flex flex-col"
            >
              <h3 className="text-lg font-semibold mb-2">
                {signature.form_data?.name || "Untitled"}
              </h3>

              <div
                ref={(el) => {
                  previewRefs.current[signature.id] = el;
                }}
                className="mt-2 border rounded bg-gray-50 p-3 [&_img]:max-w-[120px] [&_img]:h-auto [&_img]:rounded-md"
                // ⬇️ sanitized to remove invalid background/background-image etc.
                dangerouslySetInnerHTML={{
                  __html: cleanSignatureHtml(signature.html_code || ""),
                }}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/signatures/edit/${signature.id}`)}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
                >
                  <FiEdit2 /> Edit
                </button>

                <button
                  onClick={() => handleCopy(signature)}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                >
                  <FiCopy /> Copy
                </button>

                <button
                  onClick={() => handleDownloadPng(signature)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                >
                  <FiDownload /> PNG
                </button>

                <button
                  onClick={() =>
                    handleDelete(
                      signature.id,
                      signature.form_data?.name || "this signature"
                    )
                  }
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => pendingDelete?.id && doDelete(pendingDelete.id)}
        message={`Delete ${
          pendingDelete?.name || "this signature"
        }? This action cannot be undone.`}
      />
    </div>
  );
};

export default SignatureListPage;
