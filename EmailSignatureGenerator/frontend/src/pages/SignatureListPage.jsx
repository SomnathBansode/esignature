import React, { useEffect, useMemo, useRef, useState } from "react";
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // UI state (same pattern as /templates)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | name-asc | name-desc
  const [withImages, setWithImages] = useState(false);

  const previewRefs = useRef({});

  // Fetch list
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/signatures`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (alive) setSignatures(res.data || []);
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.error || "Failed to fetch signatures");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, token, navigate]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      200
    );
    return () => clearTimeout(id);
  }, [search]);

  // Filter + sort (no hooks inside loops)
  const filtered = useMemo(() => {
    const dateVal = (s) =>
      new Date(
        s.updatedAt || s.updated_at || s.createdAt || s.created_at || 0
      ).getTime();

    const base = withImages
      ? signatures.filter((s) => /<img\b/i.test(s.html_code || ""))
      : signatures;

    const searched = debouncedSearch
      ? base.filter((s) => {
          const fd = s.form_data || {};
          const fields = [
            fd.name,
            fd.email,
            fd.company,
            fd.title,
            fd.role,
            fd.position,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return fields.includes(debouncedSearch);
        })
      : base;

    const sorted = [...searched].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a?.form_data?.name || "").localeCompare(
            b?.form_data?.name || ""
          );
        case "name-desc":
          return (b?.form_data?.name || "").localeCompare(
            a?.form_data?.name || ""
          );
        case "oldest":
          return dateVal(a) - dateVal(b);
        case "newest":
        default:
          return dateVal(b) - dateVal(a);
      }
    });

    return sorted;
  }, [signatures, debouncedSearch, sortBy, withImages]);

  // Precompute cleaned HTML once per list (safe hook placement)
  const cleanedById = useMemo(() => {
    const out = {};
    for (const s of filtered) {
      out[s.id] = cleanSignatureHtml(s.html_code || "");
    }
    return out;
  }, [filtered]);

  // Normalize <img> sources for visible cards and add safe fallbacks
  useEffect(() => {
    filtered.forEach((sig) => {
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
  }, [filtered]);

  // Actions
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
      const html = cleanedById[sig.id] || "";
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

  const clearFilters = () => {
    setSearch("");
    setSortBy("newest");
    setWithImages(false);
  };

  // Loading / error
  if (loading) {
    return (
      <div className="flex items-center justify-center mt-24">
        <ClipLoader size={42} color="#2563eb" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center mt-20 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8">
      {/* Sticky toolbar (mirrors /templates pattern) */}
      <div className="sticky top-16 z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="py-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          {/* Left: Title + counts */}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              My Signatures
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              Showing <span className="font-semibold">{filtered.length}</span>{" "}
              of <span className="font-semibold">{signatures.length}</span>
            </p>
          </div>

          {/* Right: controls */}
          <div className="flex flex-wrap gap-3 md:items-end">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Search
              </label>
              <div className="relative flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
                <svg
                  className="ml-3 h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, company..."
                  className="w-[260px] md:w-[340px] px-3 py-2.5 text-gray-900 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mr-2 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Clear search"
                  >
                    x
                  </button>
                )}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Sort
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-sm"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>
            </div>

            {/* Filter: has images */}
            <div className="flex items-center gap-2">
              <input
                id="withImages"
                type="checkbox"
                checked={withImages}
                onChange={(e) => setWithImages(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label
                htmlFor="withImages"
                className="text-sm font-semibold text-gray-700"
              >
                Has images
              </label>
            </div>

            {(search || sortBy !== "newest" || withImages) && (
              <button
                onClick={clearFilters}
                className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Clear
              </button>
            )}

            <button
              onClick={() => navigate("/signatures/create")}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Create New
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {signatures.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
          No signatures found.
        </div>
      ) : (
        <div
          className="
            mt-6 relative rounded-2xl border border-gray-200 bg-white/60 backdrop-blur
            p-4 sm:p-5
            h-[70vh] sm:h-[75vh] lg:h-[78vh]
            overflow-y-auto hide-scrollbar
          "
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filtered.map((signature) => {
              const title = signature.form_data?.name || "Untitled";
              const cleanedHtml = cleanedById[signature.id] || "";

              return (
                <div
                  key={signature.id}
                  className="
                    group relative flex flex-col overflow-hidden
                    rounded-2xl border border-gray-200 bg-white
                    shadow-[0_6px_24px_rgba(2,6,23,0.06)]
                    transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(2,6,23,0.10)]
                  "
                >
                  {/* Accent bar */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                  {/* Card header */}
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="min-w-0 truncate text-base font-extrabold text-gray-900">
                      {title}
                    </h3>
                  </div>

                  {/* Preview frame */}
                  <div className="p-4 bg-gray-50">
                    <div
                      ref={(el) => {
                        previewRefs.current[signature.id] = el;
                      }}
                      className="
                        border rounded-lg bg-white p-3
                        max-h-64 overflow-auto hide-scrollbar
                        [&_img]:max-w-[120px] [&_img]:h-auto [&_img]:rounded-md
                      "
                      dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                    />
                  </div>

                  {/* Hover actions (desktop) */}
                  <div
                    className="
                      pointer-events-none absolute inset-0
                      opacity-0 group-hover:opacity-100 transition
                    "
                  >
                    <div
                      className="
                        absolute top-3 right-3 flex gap-2
                        pointer-events-auto
                      "
                    >
                      <button
                        onClick={() =>
                          navigate(`/signatures/edit/${signature.id}`)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow hover:bg-white"
                        title="Edit"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleCopy(signature)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow hover:bg-white"
                        title="Copy"
                      >
                        <FiCopy />
                      </button>
                      <button
                        onClick={() => handleDownloadPng(signature)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow hover:bg-white"
                        title="Download PNG"
                      >
                        <FiDownload />
                      </button>
                      <button
                        onClick={() =>
                          setIsModalOpen(true) ||
                          setPendingDelete({
                            id: signature.id,
                            name: signature.form_data?.name || "this signature",
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-red-600 shadow hover:bg-white"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {/* Touch actions (always visible on small screens) */}
                  <div className="px-4 py-3 border-t mt-auto flex flex-wrap gap-2 sm:hidden">
                    <button
                      onClick={() =>
                        navigate(`/signatures/edit/${signature.id}`)
                      }
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
              );
            })}
          </div>
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
