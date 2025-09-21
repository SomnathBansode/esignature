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
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import Modal from "../../components/Modal";
import TemplateForm from "../../components/TemplateForm";
import ConfirmModal from "../../components/ConfirmModal";
import { renderWithPlaceholders } from "../../utils/renderTemplatePreview";
import cleanSignatureHtml from "../../../test/cleanSignatureHtml";
import { emailizeHtml } from "@/utils/copyHtml";
import CopyHtmlButton from "@/components/CopyHtmlButton";

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
    imgs.forEach((img) => img.addEventListener("load", recalc));

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
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner"
      role="region"
      aria-label="Template preview"
    >
      {isVisible ? (
        html ? (
          <div
            ref={innerRef}
            className="p-4 break-words animate-fade-in
            [&_img]:max-w-full [&_img]:h-auto [&_img]:align-middle
            [&_table]:border-collapse [&_td]:border-0 [&_th]:border-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="flex items-center justify-center h-[120px] text-slate-600">
            No preview available
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-[120px]">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function PreviewModal({ isOpen, onClose, template }) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    const finalizeHtml = async () => {
      if (!isOpen || !template) {
        setPreviewHtml("");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const raw = renderWithPlaceholders(
          template.html || "",
          template.placeholders || [],
          template.tokens || {}
        );
        const cleaned = cleanSignatureHtml(raw);
        const finalized = await emailizeHtml(cleaned);
        setPreviewHtml(finalized);
      } catch (error) {
        toast.error(
          "Failed to generate preview: " + (error.message || "Unknown error")
        );
        setPreviewHtml("");
      } finally {
        setIsLoading(false);
      }
    };

    finalizeHtml();
  }, [isOpen, template]);

  const downloadPreviewPng = async () => {
    if (!previewHtml) {
      toast.error("No preview available to export");
      return;
    }
    try {
      const offscreen = document.createElement("div");
      offscreen.style.cssText =
        "position:fixed;left:-99999px;top:-99999px;pointer-events:none;";
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
      link.download = `${(template?.name || "signature")
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

  const baseWidth =
    (template?.tokens?.sigWidth && Number(template.tokens.sigWidth)) || 520;
  const html =
    previewHtml ||
    cleanSignatureHtml(
      renderWithPlaceholders(
        template?.html || "",
        template?.placeholders || [],
        template?.tokens || {}
      )
    );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Full template preview"
    >
      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full mx-4 p-6 shadow-xl transform transition-transform duration-300"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-600 hover:bg-slate-100 rounded-full"
          aria-label="Close preview"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          {template?.name || "Preview"}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-[120px]">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <EmailPreviewBox html={html} baseWidth={baseWidth} isVisible={true} />
        )}
        <div className="flex flex-wrap gap-2 justify-end mt-4">
          <CopyHtmlButton
            html={previewHtml}
            label="Copy"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!previewHtml}
          />
          <button
            onClick={downloadPreviewPng}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            aria-label="Download as PNG"
            disabled={!previewHtml}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            PNG
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplates() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { templates, loading, error } = useSelector((s) => s.template);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category || "Uncategorized"));
    return ["All", ...Array.from(set).sort()];
  }, [templates]);
  const categoriesForForm = useMemo(() => {
    const set = new Set(
      templates
        .map((t) => (t.category || "").trim())
        .filter(Boolean)
        .filter((c) => c.toLowerCase() !== "all")
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const [visibility, setVisibility] = useState({});

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTemplateError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      200
    );
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (isPreviewOpen && previewTpl) {
      const fresh = templates.find((t) => t.id === previewTpl.id);
      if (fresh && fresh !== previewTpl) {
        setPreviewTpl(fresh);
      } else if (!fresh) {
        setIsPreviewOpen(false);
        toast.error("Template no longer exists");
      }
    }
  }, [templates, isPreviewOpen, previewTpl]);

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

  useEffect(() => {
    const observers = filtered.map((t) => {
      const el = document.getElementById(`template-card-${t.id}`);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibility((prev) => ({ ...prev, [t.id]: true }));
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

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };
  const openEdit = (tpl) => {
    setEditing(tpl);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const openPreview = (tpl) => {
    if (!tpl) {
      toast.error("Invalid template selected");
      return;
    }
    setPreviewTpl(tpl);
    setIsPreviewOpen(true);
  };
  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewTpl(null);
  };

  const openDeleteModal = (id, name) => {
    setPendingDelete({ id, name });
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPendingDelete(null);
  };

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
      toast.error(e.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await dispatch(deleteTemplateThunk(id)).unwrap();
      toast.success("Template deleted");
      closeDeleteModal();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  const onUse = (tpl) => {
    navigate(`/signatures/create?templateId=${tpl.id}`);
  };

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
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(59,130,246,0.08),transparent),radial-gradient(900px_500px_at_80%_-10%,rgba(147,51,234,0.08),transparent)]">
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4">
        <div className="flex items-start sm:items-center justify-between gap-6 flex-col sm:flex-row">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1">
              <SparklesIcon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">
                Admin Templates
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Manage Templates
            </h1>
            <p className="mt-1 text-slate-600">
              Click any card to use it, or manage your templates below.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {filtered.length} templates
                </span>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              aria-label="Create new template"
            >
              <SparklesIcon className="h-4 w-4" />
              New Template
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-y border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition group-focus-within:opacity-20" />
              <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <MagnifyingGlassIcon className="ml-3 h-5 w-5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, category, tokens..."
                  className="w-full min-w-[260px] sm:min-w-[360px] md:min-w-[420px] px-3 py-2.5 text-slate-900 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none"
                  aria-label="Search templates"
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
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-slate-600">
                <FunnelIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Category</span>
              </div>
              <div className="overflow-x-auto -mx-2 md:mx-0 px-2 md:px-0">
                <div className="flex gap-2 min-w-max">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition
                        ${
                          category === cat
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      aria-label={`Filter by ${cat} category`}
                    >
                      {cat}
                      {cat === "All" && (
                        <span className="ml-2 rounded-full bg-white/30 px-2 py-0.5 text-xs">
                          {templates.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm"
                  aria-label="Sort templates"
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
                  className="whitespace-nowrap rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  aria-label="Clear filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="
            relative rounded-2xl border border-slate-200 bg-white/60 backdrop-blur
            p-4 sm:p-5
            h-[70vh] sm:h-[75vh] lg:h-[78vh]
            overflow-y-auto
            scroll-smooth
            scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent
          "
          role="grid"
          aria-label="Template gallery"
        >
          {loading ? (
            <div className="grid h-full place-items-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-600 font-semibold">
                  Loading templates...
                </span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <MagnifyingGlassIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Nothing matches your filters
                </h3>
                <p className="mt-1 text-slate-600">
                  {debouncedSearch || category !== "All"
                    ? "No templates match your search or filters."
                    : "No templates yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((t) => {
                const html = cleanSignatureHtml(
                  renderWithPlaceholders(t.html || "", t.placeholders, t.tokens)
                );
                const baseWidth =
                  (t?.tokens?.sigWidth && Number(t.tokens.sigWidth)) || 520;

                return (
                  <div
                    key={t.id}
                    id={`template-card-${t.id}`}
                    role="gridcell"
                    tabIndex={0}
                    onClick={() => onUse(t)}
                    onKeyDown={(e) => onCardKeyDown(e, t)}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 animate-fade-in"
                    aria-label={`Use template: ${t.name || "Untitled"}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    <div className="p-5 bg-slate-50">
                      <EmailPreviewBox
                        html={html}
                        baseWidth={baseWidth}
                        isVisible={visibility[t.id]}
                      />
                    </div>
                    <div className="p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="flex-1 truncate text-base font-extrabold text-slate-900">
                          {t.name || "Untitled"}
                        </h3>
                        <div className="flex gap-2 pointer-events-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreview(t);
                            }}
                            className="rounded-lg bg-white/90 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                            aria-label={`Preview ${
                              t.name || "Untitled"
                            } template`}
                          >
                            <MagnifyingGlassIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(t);
                            }}
                            className="rounded-lg bg-blue-100 px-3 py-1.5 text-blue-700 hover:bg-blue-200"
                            aria-label={`Edit ${t.name || "Untitled"} template`}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(t.id, t.name || "Untitled");
                            }}
                            className="rounded-lg bg-white/90 px-3 py-1.5 text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${
                              t.name || "Untitled"
                            } template`}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          <SparklesIcon className="h-4 w-4" />
                          {t.category || "Uncategorized"}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {baseWidth}px
                        </span>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Click to use
                    </div>
                    <div className="sm:hidden px-5 py-3 border-t border-slate-200 mt-auto flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(t);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                        aria-label="Preview template"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(t);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                        aria-label="Edit template"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(t.id, t.name || "Untitled");
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                        aria-label="Delete template"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

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
          categoriesOptions={categoriesForForm}
        />
      </Modal>

      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        template={previewTpl}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={() => pendingDelete?.id && onDelete(pendingDelete.id)}
        message={`Delete ${
          pendingDelete?.name || "this template"
        }? This action cannot be undone.`}
      />
    </div>
  );
}
