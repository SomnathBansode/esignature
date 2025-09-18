import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import {
  FiPhone,
  FiMail,
  FiGlobe,
  FiLink,
  FiGithub,
  FiEdit3,
  FiRotateCcw,
  FiCopy,
  FiDownload,
} from "react-icons/fi";
import cleanSignatureHtml from "../../test/cleanSignatureHtml";

// ---- image safety helpers ----
const isHttpImage = (u) => /^https?:\/\/.+/i.test(u || "");
const isDataImage = (u) =>
  /^data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+$/i.test(u || "");
const sanitizeImgSrc = (u) => {
  try {
    if (isHttpImage(u) || isDataImage(u)) return u;
  } catch {}
  return null;
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

const SignatureCreationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useSelector((state) => state.user);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [template, setTemplate] = useState(null);

  const [editableHtml, setEditableHtml] = useState("");
  const [preview, setPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [socialFields, setSocialFields] = useState({});
  const [showEditor, setShowEditor] = useState(false);

  const previewRef = useRef(null);

  const templateId = new URLSearchParams(location.search).get("templateId");

  const REQUIRED_FIELDS = useMemo(() => ["name", "email"], []);
  const SOCIAL_FIELDS = useMemo(
    () => [
      "linkedin_url",
      "twitter_url",
      "facebook_url",
      "instagram_url",
      "github_url",
    ],
    []
  );

  const EXAMPLES = useMemo(
    () => ({
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      role: "Software Engineer",
      title: "Software Engineer",
      company: "Acme Corp",
      website: "https://www.acme.com",
      address: "500 Market St, San Francisco, CA",
      user_image:
        "https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_fill,g_face,q_auto,f_auto/sample.jpg",
      company_logo:
        "https://res.cloudinary.com/demo/image/upload/w_120,c_fit,q_auto,f_auto/cloudinary_logo.png",
      linkedin_url: "https://linkedin.com/in/johndoe",
      twitter_url: "https://twitter.com/johndoe",
      facebook_url: "https://facebook.com/johndoe",
      instagram_url: "https://instagram.com/johndoe",
      github_url: "https://github.com/johndoe",
      font: "Arial, sans-serif",
      accent: "#2563eb",
    }),
    []
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchTemplate = async () => {
      if (!templateId) return;
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/templates/${templateId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTemplate(data);
        setEditableHtml(data.html || "");

        if (Array.isArray(data.placeholders)) {
          data.placeholders.forEach((raw) => {
            const key = String(raw)
              .replace(/^\s*\{\{\s*/, "")
              .replace(/\s*\}\}\s*$/, "");
            setValue(key, "");
            if (SOCIAL_FIELDS.includes(key)) {
              setSocialFields((prev) => ({ ...prev, [key]: false }));
            }
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch template");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [user, navigate, templateId, token, setValue, SOCIAL_FIELDS]);

  const replaceAllPlaceholderVariants = useCallback((raw, key, val) => {
    let out = raw;
    const pats = [
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi"),
      new RegExp(`\\{\\s*${key}\\s*\\}`, "gi"),
    ];
    pats.forEach((p) => (out = out.replace(p, val)));
    return out;
  }, []);

  const updatePreview = useCallback(() => {
    if (!template || !editableHtml) return;
    let html = editableHtml;
    const formData = watch();

    SOCIAL_FIELDS.forEach((sf) => {
      if (!socialFields[sf]) {
        const anchorWithPlaceholder = new RegExp(
          `<a[^>]*href=["'][^"']*\\{\\{\\s*${sf}\\s*\\}\\}[^"']*["'][^>]*>.*?<\\/a>`,
          "gis"
        );
        html = html.replace(anchorWithPlaceholder, "");
        html = replaceAllPlaceholderVariants(html, sf, "");
      }
    });

    if (Array.isArray(template.placeholders)) {
      template.placeholders.forEach((raw) => {
        const key = String(raw)
          .replace(/^\s*\{\{\s*/, "")
          .replace(/\s*\}\}\s*$/, "");
        const val = (formData?.[key] ?? "").trim() || EXAMPLES[key] || "";
        html = replaceAllPlaceholderVariants(html, key, val);
      });
    }

    // ⬇️ sanitize before preview to kill any empty background / url()
    setPreview(cleanSignatureHtml(html));
  }, [
    template,
    editableHtml,
    watch,
    EXAMPLES,
    replaceAllPlaceholderVariants,
    SOCIAL_FIELDS,
    socialFields,
  ]);

  useEffect(() => {
    const subscription = watch(() => updatePreview());
    return () => subscription.unsubscribe();
  }, [watch, updatePreview]);

  useEffect(() => {
    updatePreview();
  }, [editableHtml, socialFields, updatePreview]);

  const onSubmit = async (data) => {
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      let html = editableHtml;

      SOCIAL_FIELDS.forEach((sf) => {
        if (!socialFields[sf]) {
          const anchorWithPlaceholder = new RegExp(
            `<a[^>]*href=["'][^"']*\\{\\{\\s*${sf}\\s*\\}\\}[^"']*["'][^>]*>.*?<\\/a>`,
            "gis"
          );
          html = html.replace(anchorWithPlaceholder, "");
          html = replaceAllPlaceholderVariants(html, sf, "");
        }
      });

      const formData = {};
      if (Array.isArray(template.placeholders)) {
        template.placeholders.forEach((raw) => {
          const key = String(raw)
            .replace(/^\s*\{\{\s*/, "")
            .replace(/\s*\}\}\s*$/, "");
          const val = (data?.[key] ?? "").trim();
          formData[key] = val;
          html = replaceAllPlaceholderVariants(html, key, val || "");
        });
      }

      // ⬇️ save cleaned HTML
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/signatures`,
        {
          template_id: templateId,
          form_data: formData,
          html_code: cleanSignatureHtml(html),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": crypto.randomUUID(),
          },
        }
      );

      toast.success("Signature created successfully");
      navigate("/signatures");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create signature");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyHtml = async () => {
    if (!preview) return;
    try {
      const cleaned = cleanSignatureHtml(preview);
      if (window.ClipboardItem) {
        const blobHtml = new Blob([cleaned], { type: "text/html" });
        const blobText = new Blob([cleaned], { type: "text/plain" });
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(cleaned);
      }
      toast.success("Signature (HTML) copied!");
    } catch {
      toast.error("Failed to copy HTML");
    }
  };

  const handleDownloadPng = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        ignoreElements: (el) =>
          el.tagName === "IMG" && !sanitizeImgSrc(el.getAttribute("src")),
      });
      const link = document.createElement("a");
      link.download = "signature.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error("Failed to export PNG");
    }
  };

  // keep preview <img> safe and with fallbacks
  useEffect(() => {
    const host = previewRef.current;
    if (!host) return;
    host.querySelectorAll("img").forEach((img) => {
      img.setAttribute("crossorigin", "anonymous");
      const safe = sanitizeImgSrc(img.getAttribute("src"));
      if (!safe) img.src = BROKEN_PLACEHOLDER;
      img.onerror = () => {
        img.onerror = null;
        img.src = BROKEN_PLACEHOLDER;
      };
    });
  }, [preview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ClipLoader size={40} color="#2563eb" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate("/templates")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2">
        <h1 className="text-2xl font-bold mb-4">Create Signature</h1>
        {template && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {Array.isArray(template.placeholders) &&
              template.placeholders.map((raw) => {
                const field = String(raw)
                  .replace(/^\s*\{\{\s*/, "")
                  .replace(/\s*\}\}\s*$/, "");
                const label =
                  field
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (m) => m.toUpperCase()) || "Field";
                const isSocial = SOCIAL_FIELDS.includes(field);

                return (
                  <div key={field}>
                    {isSocial ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={!!socialFields[field]}
                          onChange={(e) =>
                            setSocialFields((prev) => ({
                              ...prev,
                              [field]: e.target.checked,
                            }))
                          }
                          className="h-5 w-5"
                        />
                        <label className="block text-sm font-medium text-gray-700">
                          {label.replace("_url", "")}
                        </label>
                      </div>
                    ) : (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                    )}

                    {socialFields[field] || !isSocial ? (
                      <input
                        type={
                          field.includes("url") || field.includes("image")
                            ? "url"
                            : "text"
                        }
                        className={`w-full p-3 border rounded-lg ${
                          errors[field] ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder={EXAMPLES[field] || ""}
                        {...register(field, {
                          required: REQUIRED_FIELDS.includes(field)
                            ? `${label} is required`
                            : false,
                        })}
                      />
                    ) : null}

                    {errors[field] && (
                      <p className="text-red-500 text-sm">
                        {errors[field].message}
                      </p>
                    )}
                  </div>
                );
              })}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? (
                  <ClipLoader size={18} color="#fff" />
                ) : (
                  "Save Signature"
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyHtml}
                className="inline-flex items-center gap-2 bg-green-600 text-white p-3 rounded-lg hover:bg-green-700"
              >
                <FiCopy /> Copy (HTML)
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700"
              >
                <FiDownload /> Download PNG
              </button>
            </div>

            {/* Toggle editor */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowEditor((s) => !s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
              >
                <FiEdit3 />
                {showEditor ? "Hide" : "Customize"} Layout (optional)
              </button>
              {showEditor && (
                <div className="mt-3">
                  <textarea
                    value={editableHtml}
                    onChange={(e) => setEditableHtml(e.target.value)}
                    rows={10}
                    className="w-full p-3 border rounded-lg font-mono text-sm"
                    placeholder="Edit the template HTML here…"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditableHtml(template?.html || "")}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                      title="Reset to original template HTML"
                    >
                      <FiRotateCcw /> Reset to Default
                    </button>
                    <span className="text-xs text-gray-500 self-center">
                      Tip: Placeholders like <code>{`{{name}}`}</code>,{" "}
                      <code>{`{{email}}`}</code>, <code>{`{{phone}}`}</code>{" "}
                      will be replaced in the preview.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Right: Live Preview */}
      <div className="w-full lg:w-1/2">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Live Preview
        </h2>
        <div
          ref={previewRef}
          className="border p-4 rounded-lg bg-gray-50"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1">
            <FiPhone aria-hidden /> Phone
          </span>
          <span className="inline-flex items-center gap-1">
            <FiMail aria-hidden /> Email
          </span>
          <span className="inline-flex items-center gap-1">
            <FiGlobe aria-hidden /> Website
          </span>
          <span className="inline-flex items-center gap-1">
            <FiLink aria-hidden /> Social Link
          </span>
          <span className="inline-flex items-center gap-1">
            <FiGithub aria-hidden /> GitHub
          </span>
          <span className="text-gray-400">•</span>
          <span>Copy keeps links & images intact (rich HTML).</span>
        </div>
      </div>
    </div>
  );
};

export default SignatureCreationPage;
