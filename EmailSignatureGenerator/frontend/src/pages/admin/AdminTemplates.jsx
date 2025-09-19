// frontend/src/pages/admin/AdminTemplates.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTemplates,
  addTemplate as addTemplateThunk,
  updateTemplate as updateTemplateThunk,
  deleteTemplate as deleteTemplateThunk,
  clearTemplateError,
} from "../../redux/slices/templateSlice";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiEye,
  FiCopy,
  FiDownload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import Modal from "../../components/Modal";
import TemplateForm from "../../components/TemplateForm";
import { renderWithPlaceholders } from "../../utils/renderTemplatePreview";

export default function AdminTemplates() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { templates, loading, error } = useSelector((s) => s.template);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState(null);
  const previewRef = useRef(null);

  // UI: search, category, sort
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category || "Uncategorized"));
    return ["All", ...Array.from(set).sort()];
  }, [templates]);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest"); // name-asc, name-desc, newest, oldest

  // fetch
  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  // errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTemplateError());
    }
  }, [error, dispatch]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      200
    );
    return () => clearTimeout(id);
  }, [search]);

  // filtered + sorted
  const filtered = useMemo(() => {
    const base =
      category === "All"
        ? templates
        : templates.filter((t) => (t.category || "Uncategorized") === category);

    const searched = debouncedSearch
      ? base.filter((t) => {
          const name = (t.name || "").toLowerCase();
          const cat = (t.category || "Uncategorized").toLowerCase();
          const tokens = t.tokens
            ? Object.values(t.tokens).join(" ").toLowerCase()
            : "";
          const placeholders = Array.isArray(t.placeholders)
            ? t.placeholders.join(" ").toLowerCase()
            : "";
          const haystack = [name, cat, tokens, placeholders].join(" ");
          return haystack.includes(debouncedSearch);
        })
      : base;

    const withDate = (t) => new Date(t.updatedAt || t.createdAt || 0).getTime();

    const sorted = [...searched].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "oldest":
          return withDate(a) - withDate(b);
        case "newest":
        default:
          return withDate(b) - withDate(a);
      }
    });

    return sorted;
  }, [templates, category, debouncedSearch, sortBy]);

  // handlers
  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };
  const openEdit = (tpl) => {
    setEditing(tpl);
    setIsFormOpen(true);
  };
  const closeForm = () => setIsFormOpen(false);

  const openPreview = (tpl) => {
    setPreviewTpl(tpl);
    setIsPreviewOpen(true);
  };
  const closePreview = () => setIsPreviewOpen(false);

  const onCreateOrUpdate = async (data) => {
    try {
      setSubmitting(true);
      if (editing) {
        await dispatch(
          updateTemplateThunk({ id: editing.id, ...data })
        ).unwrap();
        toast.success("Template updated");
      } else {
        await dispatch(addTemplateThunk(data)).unwrap();
        toast.success("Template created");
      }
      setIsFormOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(e || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this template? This cannot be undone.");
    if (!ok) return;
    try {
      await dispatch(deleteTemplateThunk(id)).unwrap();
      toast.success("Template deleted");
    } catch (e) {
      toast.error(e || "Delete failed");
    }
  };

  const onUse = (tpl) => {
    navigate(`/signatures/create?templateId=${tpl.id}`);
  };

  const copyPreviewHtml = async () => {
    try {
      const html = previewHtml;
      if (!html) return;
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
      toast.success("Copied rich HTML.");
    } catch {
      toast.error("Copy failed");
    }
  };

  const downloadPreviewPng = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: Math.min(2, (window.devicePixelRatio || 1) * 1.2),
        imageTimeout: 10000,
      });
      const link = document.createElement("a");
      link.download = `${(previewTpl?.name || "signature")
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error("PNG export failed. Ensure images are CORS-enabled.");
    }
  };

  const previewHtml = useMemo(() => {
    if (!previewTpl) return "";
    return renderWithPlaceholders(
      previewTpl.html || "",
      previewTpl.placeholders || [],
      previewTpl.tokens || {}
    );
  }, [previewTpl]);

  const onCardKeyDown = (e, tpl) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onUse(tpl);
    }
  };

  const clearFilters = () => {
    setCategory("All");
    setSearch("");
    setSortBy("newest");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Templates</h1>
          <p className="text-sm text-gray-600">Click any card to use it.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
            Showing <span className="font-semibold">{filtered.length}</span> of{" "}
            <span className="font-semibold">{templates.length}</span>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <FiPlus /> New Template
          </button>
        </div>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 border-y border-gray-200 bg-white/85 backdrop-blur mb-4">
        <div className="py-3 sm:py-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          {/* Search */}
          <div className="w-full md:w-auto">
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
                placeholder="Name, category, tokens, placeholders..."
                className="w-full md:w-[380px] px-3 py-2.5 text-gray-900 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none"
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

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

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

            {(search || category !== "All" || sortBy !== "newest") && (
              <button
                onClick={clearFilters}
                className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
          {debouncedSearch || category !== "All"
            ? "No templates match your search or filters."
            : "No templates yet."}
        </div>
      ) : (
        // Fixed-height, scrollable cards area
        <div
          className="
            relative rounded-2xl border border-gray-200 bg-white/60 backdrop-blur
            p-4 sm:p-5
            h-[70vh] sm:h-[75vh] lg:h-[78vh]
            overflow-y-auto scroll-smooth
            scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
          "
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filtered.map((t) => {
              const cardHtml = renderWithPlaceholders(
                t.html || "",
                t.placeholders || [],
                t.tokens || {}
              );
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onUse(t)}
                  onKeyDown={(e) => onCardKeyDown(e, t)}
                  className="
                    group relative flex flex-col overflow-hidden
                    rounded-2xl border border-gray-200 bg-white
                    shadow-[0_6px_24px_rgba(2,6,23,0.06)]
                    transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(2,6,23,0.10)]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                  "
                >
                  {/* Accent bar */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                  {/* Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <h3 className="flex-1 min-w-0 truncate text-base font-extrabold text-gray-900">
                        {t.name || "Untitled"}
                      </h3>
                      <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        {t.category || "Uncategorized"}
                      </span>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-gray-50">
                    <div
                      className="border rounded-lg bg-white p-2 max-h-64 overflow-auto"
                      dangerouslySetInnerHTML={{ __html: cardHtml }}
                    />
                  </div>

                  {/* Hover overlay actions */}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(t);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow hover:bg-white"
                        title="Preview"
                      >
                        <FiEye />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(t);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow hover:bg-white"
                        title="Edit"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(t.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-red-600 shadow hover:bg-white"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>

                    <div className="absolute bottom-3 right-3 rounded-full bg-gray-900/90 px-3 py-1 text-[11px] font-bold text-white">
                      Click to use
                    </div>
                  </div>

                  {/* Footer actions for touch devices */}
                  <div className="px-4 py-3 border-t mt-auto flex flex-wrap gap-2 sm:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(t);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      <FiEye /> Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(t);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      <FiEdit2 /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(t.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
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

      {/* Create/Edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? "Edit Template" : "New Template"}
        maxWidth="max-w-5xl"
      >
        <TemplateForm
          template={editing}
          submitting={submitting}
          onSubmit={onCreateOrUpdate}
          onCancel={closeForm}
        />
      </Modal>

      {/* Preview */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        title={previewTpl ? `Preview — ${previewTpl.name}` : "Preview"}
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col gap-3">
          <div
            ref={previewRef}
            className="border rounded-lg bg-white p-3 overflow-auto"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={copyPreviewHtml}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <FiCopy /> Copy
            </button>
            <button
              onClick={downloadPreviewPng}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <FiDownload /> PNG
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Copy uses rich HTML so links and images stay intact. PNG export
            requires CORS-enabled images.
          </p>
        </div>
      </Modal>
    </div>
  );
}
