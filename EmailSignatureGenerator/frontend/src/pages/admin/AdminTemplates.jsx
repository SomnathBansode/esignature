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

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTemplateError());
    }
  }, [error, dispatch]);

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

  const previewHtml = useMemo(() => {
    if (!previewTpl) return "";
    return renderWithPlaceholders(
      previewTpl.html || "",
      previewTpl.placeholders || [],
      previewTpl.tokens || {}
    );
  }, [previewTpl]);

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
      if (!previewHtml) return;
      if (window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/html": new Blob([previewHtml], { type: "text/html" }),
            "text/plain": new Blob([previewHtml], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(previewHtml);
      }
      toast.success("Copied rich HTML (links, emojis, images intact).");
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
      toast.error(
        "PNG export failed (use CORS-enabled images e.g. Cloudinary)."
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Templates</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <FiPlus /> New Template
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="text-gray-500">No templates yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const cardHtml = renderWithPlaceholders(
              t.html || "",
              t.placeholders || [],
              t.tokens || {}
            );
            return (
              <div
                key={t.id}
                className="border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col"
              >
                <div className="p-4 border-b">
                  <div className="font-semibold truncate">{t.name}</div>
                  <div className="text-sm text-gray-500">
                    {t.category || "—"}
                  </div>
                </div>

                <div className="p-3">
                  <div
                    className="border rounded-lg bg-gray-50 p-2 max-h-64 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: cardHtml }}
                  />
                </div>

                <div className="px-4 py-3 mt-auto border-t flex flex-wrap gap-2">
                  <button
                    onClick={() => onUse(t)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => openPreview(t)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    <FiEye /> Preview
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            );
          })}
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
            Copy uses rich HTML so links, emojis (📞 ✉️ 🌐 🔗 🐙) and images
            stay intact. PNG export requires CORS-enabled images (Cloudinary
            works by default).
          </p>
        </div>
      </Modal>
    </div>
  );
}
