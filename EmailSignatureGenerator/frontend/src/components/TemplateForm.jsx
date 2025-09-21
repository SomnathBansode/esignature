// frontend/src/components/TemplateForm.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ---------- defaults (unchanged) ---------- */
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

/* Built-in categories to show in the select / chips */
const BUILTIN_CATEGORIES = ["creative", "professional", "minimal", "modern"];

/* Helpers */
function uniqSorted(list) {
  const seen = new Set();
  const out = [];
  for (const v of list || []) {
    const s = String(v || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export default function TemplateForm({
  template, // optional when editing
  onSubmit, // (data) => void
  onCancel, // () => void
  submitting = false,
  categoriesOptions = [], // <-- we'll pass this from AdminTemplates
}) {
  /* ---------- initial state ---------- */
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

  /* ---------- quick add category UI ---------- */
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState("");

  // Build options for the <select> (without injecting the current value)
  const selectOptions = useMemo(
    () =>
      uniqSorted(
        [...BUILTIN_CATEGORIES, ...categoriesOptions].filter(
          (c) => c.toLowerCase() !== "all"
        )
      ),
    [categoriesOptions]
  );

  // Chips = built-ins + incoming + current value; de-duped, sorted
  const allCategoryChips = useMemo(() => {
    const extra = (categoriesOptions || []).filter(
      (c) => c.toLowerCase() !== "all"
    );
    return uniqSorted([...BUILTIN_CATEGORIES, ...extra, form.category]);
  }, [categoriesOptions, form.category]);

  useEffect(() => {
    setForm(initial);
    setErrors({});
    setShowNewCat(false);
    setNewCat("");
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onAddCategory = () => {
    const c = (newCat || "").trim();
    if (!c) return;
    setForm((f) => ({ ...f, category: c }));
    setShowNewCat(false);
    setNewCat("");
  };

  /* ---------- validation ---------- */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";

    if (!form.html.trim() || form.html.trim().length < 10) {
      e.html = "HTML is required (min 10 chars)";
    }

    try {
      const t = JSON.parse(form.tokens || "{}");
      if (!t || typeof t !== "object" || Array.isArray(t)) {
        e.tokens = "Tokens must be an object";
      }
    } catch {
      e.tokens = "Tokens must be valid JSON";
    }

    try {
      const p = JSON.parse(form.placeholders || "[]");
      if (!Array.isArray(p) || !p.every((x) => typeof x === "string")) {
        e.placeholders = "Placeholders must be an array of strings";
      }
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
      category: (form.category || "").trim() || "creative",
      thumbnail: form.thumbnail || "",
      html: form.html,
      tokens: JSON.parse(form.tokens || "{}"),
      placeholders: JSON.parse(form.placeholders || "[]"),
    };
    onSubmit?.(payload);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {template ? "Edit Template" : "Create New Template"}
        </h2>
        <p className="text-gray-600">
          {template
            ? "Make changes to your template configuration"
            : "Build a new email signature template with custom styling and placeholders"}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Template Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full border-2 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.name
                    ? "border-red-300 bg-red-50 focus:border-red-500"
                    : "border-gray-200 bg-white hover:border-gray-300 focus:border-blue-500"
                }`}
                placeholder="e.g., Pro Gradient Card"
              />
              {errors.name && (
                <div className="flex items-center text-sm text-red-600 mt-2">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.name}
                </div>
              )}
            </div>

            {/* Category + Quick Add */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14-7H5m14 14H5"
                  />
                </svg>
                Category
              </label>

              <div className="flex items-center gap-3">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                >
                  {selectOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {!selectOptions.includes(form.category) && form.category && (
                    <option value={form.category}>{form.category}</option>
                  )}
                </select>

                {!showNewCat ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCat(true)}
                    className="shrink-0 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-gray-700 font-medium"
                    title="Add a new category"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>

              {showNewCat && (
                <div className="mt-3 p-4 bg-white rounded-xl border-2 border-blue-100">
                  <div className="flex items-center gap-3">
                    <input
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      placeholder="New category name"
                      className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={onAddCategory}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCat(false);
                        setNewCat("");
                      }}
                      className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {allCategoryChips.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {allCategoryChips.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        form.category === c
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-105"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                      }`}
                      aria-label={`Use category ${c}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail */}
            <div className="lg:col-span-2 space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Thumbnail URL (optional)
              </label>
              <input
                name="thumbnail"
                value={form.thumbnail}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                placeholder="https://cdn.example.com/thumb.jpg"
              />
            </div>
          </div>
        </div>

        {/* HTML Content Section */}
        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              HTML Template
            </h3>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <span className="mr-2">Template HTML Content *</span>
              <span className="px-2 py-1 bg-gray-100 text-xs font-mono rounded text-gray-600">
                HTML
              </span>
            </label>
            <textarea
              name="html"
              value={form.html}
              onChange={handleChange}
              rows={14}
              className={`w-full border-2 rounded-xl px-4 py-4 font-mono text-sm leading-relaxed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                errors.html
                  ? "border-red-300 bg-red-50 focus:border-red-500"
                  : "border-gray-200 bg-white hover:border-gray-300 focus:border-green-500"
              }`}
              placeholder="Paste your email-safe HTML here…"
            />
            {errors.html && (
              <div className="flex items-center text-sm text-red-600 mt-2">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.html}
              </div>
            )}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Tokens */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                  />
                </svg>
                Style Tokens
                <span className="px-2 py-1 bg-blue-100 text-xs font-mono rounded text-blue-700 ml-2">
                  JSON
                </span>
              </label>
              <textarea
                name="tokens"
                value={form.tokens}
                onChange={handleChange}
                rows={10}
                className={`w-full border-2 rounded-xl px-4 py-4 font-mono text-sm leading-relaxed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                  errors.tokens
                    ? "border-red-300 bg-red-50 focus:border-red-500"
                    : "border-gray-200 bg-white hover:border-gray-300 focus:border-purple-500"
                }`}
                placeholder={`{ "font": "Arial, Helvetica, sans-serif", "accent": "#2563eb" }`}
              />
              {errors.tokens && (
                <div className="flex items-center text-sm text-red-600 mt-2">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.tokens}
                </div>
              )}
            </div>

            {/* Placeholders */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Placeholders
                <span className="px-2 py-1 bg-green-100 text-xs font-mono rounded text-green-700 ml-2">
                  Array
                </span>
              </label>
              <textarea
                name="placeholders"
                value={form.placeholders}
                onChange={handleChange}
                rows={10}
                className={`w-full border-2 rounded-xl px-4 py-4 font-mono text-sm leading-relaxed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                  errors.placeholders
                    ? "border-red-300 bg-red-50 focus:border-red-500"
                    : "border-gray-200 bg-white hover:border-gray-300 focus:border-purple-500"
                }`}
                placeholder='[ "{{name}}", "{{email}}", "{{phone}}", "{{user_image}}", "{{website}}" ]'
              />
              {errors.placeholders && (
                <div className="flex items-center text-sm text-red-600 mt-2">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.placeholders}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Template
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
