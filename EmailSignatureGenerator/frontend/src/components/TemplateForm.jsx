// frontend/src/components/TemplateForm.jsx
import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_TOKENS = {
  font: "Arial, Helvetica, sans-serif",
  accent: "#2563eb",
};

const DEFAULT_PLACEHOLDERS = [
  "{{user_image}}",
  "{{company_logo}}",
  "{{name}}",
  "{{title}}",
  "{{company}}",
  "{{phone}}",
  "{{email}}",
  "{{website}}",
  "{{linkedin_url}}",
  "{{github_url}}",
];

export default function TemplateForm({
  template, // optional when editing
  onSubmit, // (data) => void
  onCancel, // () => void
  submitting = false,
}) {
  const initial = useMemo(
    () =>
      template
        ? {
            name: template.name || "",
            category: template.category || "creative",
            thumbnail: template.thumbnail || "",
            html: template.html || "",
            tokens: JSON.stringify(template.tokens || DEFAULT_TOKENS, null, 2),
            placeholders: JSON.stringify(
              template.placeholders || DEFAULT_PLACEHOLDERS,
              null,
              2
            ),
          }
        : {
            name: "",
            category: "creative",
            thumbnail: "",
            html: "",
            tokens: JSON.stringify(DEFAULT_TOKENS, null, 2),
            placeholders: JSON.stringify(DEFAULT_PLACEHOLDERS, null, 2),
          },
    [template]
  );

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.html.trim() || form.html.trim().length < 10)
      e.html = "HTML is required (min 10 chars)";
    // tokens must parse to an object
    try {
      const t = JSON.parse(form.tokens || "{}");
      if (!t || typeof t !== "object") e.tokens = "Tokens must be an object";
    } catch {
      e.tokens = "Tokens must be valid JSON";
    }
    // placeholders must parse to array of strings
    try {
      const p = JSON.parse(form.placeholders || "[]");
      if (!Array.isArray(p) || !p.every((x) => typeof x === "string"))
        e.placeholders = "Placeholders must be an array of strings";
    } catch {
      e.placeholders = "Placeholders must be valid JSON array";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category || "creative",
      thumbnail: form.thumbnail || "",
      html: form.html,
      tokens: JSON.parse(form.tokens || "{}"),
      placeholders: JSON.parse(form.placeholders || "[]"),
    };
    onSubmit?.(payload);
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4">
      {/* Top fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Template Name *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full border rounded-lg p-3 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="e.g., Pro Gradient Card"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 border-gray-300"
          >
            <option value="creative">Creative</option>
            <option value="professional">Professional</option>
            <option value="minimal">Minimal</option>
            <option value="modern">Modern</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Thumbnail URL (optional)
          </label>
          <input
            name="thumbnail"
            value={form.thumbnail}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 border-gray-300"
            placeholder="https://cdn.example.com/thumb.jpg"
          />
        </div>
      </div>

      {/* HTML */}
      <div>
        <label className="block text-sm font-medium mb-1">HTML *</label>
        <textarea
          name="html"
          value={form.html}
          onChange={handleChange}
          rows={12}
          className={`w-full border rounded-lg p-3 font-mono text-sm ${
            errors.html ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Paste your email-safe HTML here…"
        />
        {errors.html && (
          <p className="text-sm text-red-600 mt-1">{errors.html}</p>
        )}
      </div>

      {/* Tokens + Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Tokens (JSON)
          </label>
          <textarea
            name="tokens"
            value={form.tokens}
            onChange={handleChange}
            rows={8}
            className={`w-full border rounded-lg p-3 font-mono text-sm ${
              errors.tokens ? "border-red-500" : "border-gray-300"
            }`}
            placeholder={`{ "font": "Arial, Helvetica, sans-serif", "accent": "#2563eb" }`}
          />
          {errors.tokens && (
            <p className="text-sm text-red-600 mt-1">{errors.tokens}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Placeholders (JSON array of strings)
          </label>
          <textarea
            name="placeholders"
            value={form.placeholders}
            onChange={handleChange}
            rows={8}
            className={`w-full border rounded-lg p-3 font-mono text-sm ${
              errors.placeholders ? "border-red-500" : "border-gray-300"
            }`}
            placeholder='[ "{{name}}", "{{email}}", "{{phone}}", "{{user_image}}", "{{website}}" ]'
          />
          {errors.placeholders && (
            <p className="text-sm text-red-600 mt-1">{errors.placeholders}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save Template"}
        </button>
      </div>
    </form>
  );
}
