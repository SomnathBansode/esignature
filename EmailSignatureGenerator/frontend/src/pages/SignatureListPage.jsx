// dont change main code make it resopnsive
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import ConfirmModal from "../components/ConfirmModal.jsx";
import cleanSignatureHtml from "../../test/cleanSignatureHtml.js";
import copyHtml from "@/utils/copyHtml";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(
  /\/$/,
  ""
);

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

function EmailPreviewBox({ html, baseWidth = 520, isVisible }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);

  const recalc = () => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    inner.style.transform = "scale(1)";
    inner.style.width = `${baseWidth}px`;

    const availW = Math.max(0, (outer.clientWidth || baseWidth) - 24);
    const naturalH =
      inner.scrollHeight || inner.getBoundingClientRect().height || 120;

    const scale = Math.min(1, availW / baseWidth);
    inner.style.transformOrigin = "top left";
    inner.style.transform = `scale(${scale})`;

    const scaledH = naturalH * scale;
    outer.style.height = `${Math.max(120, scaledH + 20)}px`;
  };

  useEffect(() => {
    if (!isVisible) return;

    recalc();
    const ro = new ResizeObserver(recalc);
    if (outerRef.current) ro.observe(outerRef.current);

    const onWinResize = () => recalc();
    window.addEventListener("resize", onWinResize, { passive: true });
    window.addEventListener("orientationchange", onWinResize, {
      passive: true,
    });

    const imgs = innerRef.current?.querySelectorAll?.("img") || [];
    imgs.forEach((img) => {
      const raw = img.getAttribute("src");
      const abs = absolutize(raw);
      img.setAttribute("crossorigin", "anonymous");
      img.src = abs || BROKEN_PLACEHOLDER;
      img.onerror = () => {
        img.onerror = null;
        img.src = BROKEN_PLACEHOLDER;
      };
      img.addEventListener("load", recalc);
    });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("orientationchange", onWinResize);
      imgs.forEach((img) => img.removeEventListener("load", recalc));
    };
  }, [html, baseWidth, isVisible]);

  return (
    <div
      ref={outerRef}
      className="relative w-full rounded-xl border border-slate-200 bg-white shadow-inner"
      role="region"
      aria-label="Signature preview"
    >
      {isVisible ? (
        html ? (
          <div
            ref={innerRef}
            className="p-3 sm:p-4 break-words animate-fade-in min-h-[120px]
            [&_img]:max-w-full [&_img]:h-auto [&_img]:align-middle
            [&_table]:border-collapse [&_td]:border-0 [&_th]:border-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[120px] text-slate-600">
            No preview available
          </div>
        )
      ) : (
        <div className="flex items-center justify-center min-h-[120px]">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin motion-reduce:hidden" />
        </div>
      )}
    </div>
  );
}

function PreviewModal({ isOpen, onClose, signature }) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const finalizeHtml = async () => {
      if (!isOpen || !signature || !signature.html_code) {
        setPreviewHtml("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const cleaned = cleanSignatureHtml(signature.html_code || "");
        let finalized = "";
        try {
          const result = await copyHtml(cleaned, true);
          finalized = typeof result === "string" ? result : "";
        } catch {
          finalized = cleaned; // Fallback to cleaned if copyHtml fails
        }
        setPreviewHtml(
          finalized || cleaned || "<div>No content available</div>"
        );
      } catch (error) {
        toast.error(
          "Failed to generate preview: " + (error.message || "Unknown error")
        );
        setPreviewHtml("<div>Error loading preview</div>");
      } finally {
        setIsLoading(false);
      }
    };

    finalizeHtml();
  }, [isOpen, signature]);

  const downloadPreviewPng = async () => {
    if (!previewHtml) {
      toast.error("No preview available to export");
      return;
    }
    try {
      const offscreen = document.createElement("div");
      offscreen.style.cssText =
        "position:fixed;left:-99999px;top:-99999px;pointer-events:none;width:520px;max-width:520px;padding:16px;";
      offscreen.innerHTML = previewHtml;
      document.body.appendChild(offscreen);

      const canvas = await html2canvas(offscreen, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
      });

      document.body.removeChild(offscreen);

      const link = document.createElement("a");
      link.download = `${(signature?.form_data?.name || "signature")
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      toast.error(
        "PNG export failed: " +
          (error.message || "Ensure images are CORS-enabled")
      );
    }
  };

  const handleCopy = async () => {
    if (!previewHtml) {
      toast.error("No HTML available to copy");
      return;
    }
    try {
      const ok = await copyHtml(previewHtml);
      if (ok) toast.success("Copied rich HTML (cleaned)");
      else toast.error("Copy failed. Try a desktop browser.");
    } catch {
      toast.error("Copy failed");
    }
  };

  const baseWidth = 520;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Full signature preview"
    >
      <div
        className="relative bg-white rounded-2xl w-full mx-3 sm:mx-4 p-4 sm:p-6 shadow-xl transform transition-transform duration-300 max-w-[95vw] sm:max-w-3xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 text-slate-600 hover:bg-slate-100 rounded-full"
          aria-label="Close preview"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">
          {signature?.form_data?.name || "Preview"}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin motion-reduce:hidden" />
          </div>
        ) : (
          <EmailPreviewBox html={previewHtml} baseWidth={baseWidth} isVisible />
        )}
        <div className="flex flex-wrap gap-2 justify-end mt-4">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            aria-label="Copy HTML"
            disabled={!previewHtml}
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            Copy
          </button>
          <button
            onClick={downloadPreviewPng}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            aria-label="Download as PNG"
            disabled={!previewHtml}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            PNG
          </button>
        </div>
      </div>
    </div>
  );
}

const SignatureListPage = () => {
  const { user, token } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSig, setPreviewSig] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [withImages, setWithImages] = useState(false);

  const [visibility, setVisibility] = useState({});

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
        if (alive)
          setError(err.response?.data?.error || "Failed to fetch signatures");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, token, navigate]);

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      200
    );
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (isPreviewOpen && previewSig) {
      const fresh = signatures.find((s) => s.id === previewSig.id);
      if (fresh && fresh !== previewSig) {
        setPreviewSig(fresh);
      } else if (!fresh) {
        setIsPreviewOpen(false);
        toast.error("Signature no longer exists");
      }
    }
  }, [signatures, isPreviewOpen, previewSig]);

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

  const cleanedById = useMemo(() => {
    const out = {};
    for (const s of filtered) {
      const cleaned = cleanSignatureHtml(s.html_code || "");
      out[s.id] = cleaned;
    }
    return out;
  }, [filtered]);

  useEffect(() => {
    const observers = filtered.map((s) => {
      const el = document.getElementById(`signature-card-${s.id}`);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibility((prev) => ({ ...prev, [s.id]: true }));
              observer.disconnect();
            }
          });
        },
        { rootMargin: "200px" }
      );
      observer.observe(el);
      return observer;
    });

    return () => observers.forEach((obs) => obs?.disconnect());
  }, [filtered]);

  const doDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/signatures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSignatures((prev) => prev.filter((s) => s.id !== id));
      toast.success("Signature deleted");
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete signature");
    }
  };

  const handleDelete = (id, name) => {
    setPendingDelete({ id, name });
    setIsModalOpen(true);
  };

  const handleCopy = async (sig) => {
    if (!cleanedById[sig.id]) {
      toast.error("No HTML available to copy");
      return;
    }
    try {
      const ok = await copyHtml(cleanedById[sig.id]);
      if (ok) toast.success("Copied rich HTML (cleaned)");
      else toast.error("Copy failed. Try a desktop browser.");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownloadPng = async (sig) => {
    if (!cleanedById[sig.id]) {
      toast.error("No preview available to export");
      return;
    }
    try {
      const node = document.getElementById(`signature-preview-${sig.id}`);
      if (!node) {
        toast.error("Preview element not found");
        return;
      }
      const canvas = await html2canvas(node, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        ignoreElements: (el) =>
          el.tagName === "IMG" && !absolutize(el.getAttribute("src")),
      });
      const link = document.createElement("a");
      link.download = `${(sig?.form_data?.name || "signature")
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      toast.error(
        "PNG export failed: " +
          (error.message || "Ensure images are CORS-enabled")
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("newest");
    setWithImages(false);
  };

  const onCardKeyDown = (e, sig) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/signatures/edit/${sig.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(59,130,246,0.08),transparent),radial-gradient(900px_500px_at_80%_-10%,rgba(147,51,234,0.08),transparent)]">
        <ClipLoader size={42} color="#2563eb" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(59,130,246,0.08),transparent),radial-gradient(900px_500px_at_80%_-10%,rgba(147,51,234,0.08),transparent)] px-4">
        <div className="text-center text-red-600 text-sm sm:text-base">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(59,130,246,0.08),transparent),radial-gradient(900px_500px_at_80%_-10%,rgba(147,51,234,0.08),transparent)]">
      <header className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-6 sm:pt-12 pb-4">
        <div className="flex items-start sm:items-center justify-between gap-4 sm:gap-6 flex-col sm:flex-row">
          <div className="w-full sm:w-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1">
              <MagnifyingGlassIcon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">
                My Signatures
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
              My Signatures
            </h1>
            <p className="mt-1 text-slate-600 text-sm sm:text-base">
              Manage your email signatures below.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <DocumentDuplicateIcon className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {filtered.length} signatures
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/signatures/create")}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              aria-label="Create new signature"
            >
              <PencilIcon className="h-4 w-4" />
              New Signature
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-y border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="relative group md:flex-1">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition group-focus-within:opacity-20" />
              <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <MagnifyingGlassIcon className="ml-3 h-5 w-5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, company..."
                  className="w-full px-3 py-2.5 text-slate-900 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none"
                  aria-label="Search signatures"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sort
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm"
                  aria-label="Sort signatures"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1 sm:pt-6">
                <input
                  id="withImages"
                  type="checkbox"
                  checked={withImages}
                  onChange={(e) => setWithImages(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label
                  htmlFor="withImages"
                  className="text-sm font-semibold text-slate-700"
                >
                  Has images
                </label>
              </div>

              {(search || sortBy !== "newest" || withImages) && (
                <button
                  onClick={clearFilters}
                  className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  aria-label="Clear filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
        <div
          className="
            relative rounded-2xl border border-slate-200 bg-white/60 backdrop-blur
            p-3 sm:p-5
            h-auto max-h-[78vh] sm:h-[75vh] lg:h-[78vh]
            overflow-y-auto
            scroll-smooth
            scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent
          "
          role="grid"
          aria-label="Signature gallery"
        >
          {signatures.length === 0 ? (
            <div className="grid h-full place-items-center text-center p-6">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <MagnifyingGlassIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  No signatures found
                </h3>
                <p className="mt-1 text-slate-600 text-sm sm:text-base">
                  Create a new signature to get started.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid h-full place-items-center text-center p-6">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <MagnifyingGlassIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Nothing matches your filters
                </h3>
                <p className="mt-1 text-slate-600 text-sm sm:text-base">
                  Try different keywords or reset filters.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="
                grid gap-4 sm:gap-5 lg:gap-6
                grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4
              "
            >
              {filtered.map((signature) => {
                const title = signature.form_data?.name || "Untitled";
                const html = cleanedById[signature.id] || "";

                return (
                  <div
                    key={signature.id}
                    id={`signature-card-${signature.id}`}
                    role="gridcell"
                    tabIndex={0}
                    onClick={() => navigate(`/signatures/edit/${signature.id}`)}
                    onKeyDown={(e) => onCardKeyDown(e, signature)}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 animate-fade-in"
                    aria-label={`Edit signature: ${title}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    <div className="p-3 sm:p-5 bg-slate-50">
                      <div id={`signature-preview-${signature.id}`}>
                        <EmailPreviewBox
                          html={html}
                          baseWidth={520}
                          isVisible={visibility[signature.id]}
                        />
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="flex-1 truncate text-sm sm:text-base font-extrabold text-slate-900">
                          {title}
                        </h3>
                        <div className="hidden sm:flex gap-2 pointer-events-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewSig(signature);
                              setIsPreviewOpen(true);
                            }}
                            className="rounded-lg bg-white/90 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                            aria-label={`Preview ${title} signature`}
                          >
                            <MagnifyingGlassIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/signatures/edit/${signature.id}`);
                            }}
                            className="rounded-lg bg-blue-100 px-3 py-1.5 text-blue-700 hover:bg-blue-200"
                            aria-label={`Edit ${title} signature`}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(signature);
                            }}
                            className="rounded-lg bg-white/90 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                            aria-label={`Copy ${title} signature`}
                          >
                            <DocumentDuplicateIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPng(signature);
                            }}
                            className="rounded-lg bg-white/90 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                            aria-label={`Download ${title} signature as PNG`}
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(signature.id, title);
                            }}
                            className="rounded-lg bg-white/90 px-3 py-1.5 text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${title} signature`}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-blue-700">
                          <MagnifyingGlassIcon className="h-4 w-4" />
                          Signature
                        </span>
                      </div>
                    </div>

                    {/* Mobile action bar */}
                    <div className="sm:hidden px-3 sm:px-5 py-3 border-t border-slate-200 mt-auto flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSig(signature);
                          setIsPreviewOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        aria-label="Preview signature"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/signatures/edit/${signature.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                        aria-label="Edit signature"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(signature);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        aria-label="Copy signature"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPng(signature);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        aria-label="Download signature as PNG"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        PNG
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(signature.id, title);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                        aria-label="Delete signature"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>

                    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Click to edit
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => pendingDelete?.id && doDelete(pendingDelete.id)}
        message={`Delete ${
          pendingDelete?.name || "this signature"
        }? This action cannot be undone.`}
      />

      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewSig(null);
        }}
        signature={previewSig}
      />
    </div>
  );
};

export default SignatureListPage;
