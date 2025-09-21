import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import {
  FiCopy,
  FiDownload,
  FiEdit3,
  FiRotateCcw,
  FiPhone,
  FiMail,
  FiGlobe,
  FiLink,
  FiInfo,
} from "react-icons/fi";
import { FaGithub } from "react-icons/fa";
import cleanSignatureHtml from "../../test/cleanSignatureHtml";
import { emailizeHtml } from "../utils/copyHtml";
import CopyHtmlButton from "../components/CopyHtmlButton";
import ImageUploader from "../components/ImageUploader";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(
  /\/$/,
  ""
);

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

const SignatureEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isAdminMode } = useSelector((s) => s.user);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signature, setSignature] = useState(null);
  const [template, setTemplate] = useState(null);
  const [editableHtml, setEditableHtml] = useState("");
  const [preview, setPreview] = useState("");
  const [socialFields, setSocialFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageInputMethods, setImageInputMethods] = useState({}); // New state for input method per image field

  const previewRef = useRef(null);

  const canCustomizeLayout = user?.role === "admin" && isAdminMode;

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
  const IMAGE_FIELDS = useMemo(
    () => ["user_image", "company_logo", "image", "avatar", "logo"],
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
      navigate("/login", { replace: true });
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const sigRes = await axios.get(`${API}/api/signatures/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSignature(sigRes.data);

        if (sigRes.data.template_id) {
          const tplRes = await axios.get(
            `${API}/api/templates/${sigRes.data.template_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setTemplate(tplRes.data);
          setEditableHtml(tplRes.data.html || "");

          const initKeys = Array.isArray(tplRes.data.placeholders)
            ? tplRes.data.placeholders
            : Object.keys(sigRes.data.form_data || {});
          initKeys.forEach((raw) => {
            const key = String(raw)
              .replace(/^\s*\{\{\s*/, "")
              .replace(/\s*\}\}\s*$/, "");
            const savedVal = sigRes.data.form_data?.[key] ?? "";
            setValue(key, savedVal);
            if (SOCIAL_FIELDS.includes(key)) {
              setSocialFields((prev) => ({
                ...prev,
                [key]: !!(savedVal && String(savedVal).trim()),
              }));
            }
            if (IMAGE_FIELDS.includes(key)) {
              setImageInputMethods((prev) => ({
                ...prev,
                [key]: savedVal && isHttpImage(savedVal) ? "url" : "upload",
              }));
            }
          });
        } else {
          setEditableHtml(sigRes.data.html_code || "");
          Object.keys(sigRes.data.form_data || {}).forEach((k) => {
            setValue(k, sigRes.data.form_data[k] ?? "");
            if (SOCIAL_FIELDS.includes(k)) {
              setSocialFields((p) => ({
                ...p,
                [k]: !!(
                  sigRes.data.form_data[k] &&
                  String(sigRes.data.form_data[k]).trim()
                ),
              }));
            }
            if (IMAGE_FIELDS.includes(k)) {
              setImageInputMethods((prev) => ({
                ...prev,
                [k]:
                  sigRes.data.form_data[k] &&
                  isHttpImage(sigRes.data.form_data[k])
                    ? "url"
                    : "upload",
              }));
            }
          });
        }
      } catch (e) {
        setError(e.response?.data?.error || "Failed to load signature");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, token, id, navigate, setValue, SOCIAL_FIELDS, IMAGE_FIELDS]);

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
    if (!editableHtml) return;
    let html = editableHtml;
    const formData = watch();

    Object.keys(socialFields).forEach((sf) => {
      if (!socialFields[sf]) {
        const anchorWithPlaceholder = new RegExp(
          `<a[^>]*href=["'][^"']*\\{\\{\\s*${sf}\\s*\\}\\}[^"']*["'][^>]*>.*?<\\/a>`,
          "gis"
        );
        html = html.replace(anchorWithPlaceholder, "");
        html = replaceAllPlaceholderVariants(html, sf, "");
      }
    });

    const placeholders =
      (template && Array.isArray(template.placeholders)
        ? template.placeholders
        : signature?.form_data
        ? Object.keys(signature.form_data)
        : []) || [];

    placeholders.forEach((raw) => {
      const key = String(raw)
        .replace(/^\s*\{\{\s*/, "")
        .replace(/\s*\}\}\s*$/, "");
      const val = (formData?.[key] ?? "").trim() || EXAMPLES[key] || "";
      html = replaceAllPlaceholderVariants(html, key, val);
    });

    (async () => {
      const cleaned = cleanSignatureHtml(html);
      const finalized = await emailizeHtml(cleaned);
      setPreview(finalized);
    })();
  }, [
    editableHtml,
    watch,
    socialFields,
    template,
    signature,
    EXAMPLES,
    replaceAllPlaceholderVariants,
  ]);

  useEffect(() => {
    const sub = watch(() => updatePreview());
    return () => sub.unsubscribe();
  }, [watch, updatePreview]);

  useEffect(() => {
    updatePreview();
  }, [editableHtml, socialFields, updatePreview]);

  const onSubmit = async (data) => {
    if (!signature) return;
    setSaving(true);
    try {
      let html = editableHtml;
      Object.keys(socialFields).forEach((sf) => {
        if (!socialFields[sf]) {
          const anchorWithPlaceholder = new RegExp(
            `<a[^>]*href=["'][^"']*\\{\\{\\s*${sf}\\s*\\}\\}[^"']*["'][^>]*>.*?<\\/a>`,
            "gis"
          );
          html = html.replace(anchorWithPlaceholder, "");
          html = replaceAllPlaceholderVariants(html, sf, "");
        }
      });

      const outForm = {};
      const keys =
        (template && Array.isArray(template.placeholders)
          ? template.placeholders
          : Object.keys(data)) || [];
      keys.forEach((raw) => {
        const key = String(raw)
          .replace(/^\s*\{\{\s*/, "")
          .replace(/\s*\}\}\s*$/, "");
        const val = (data?.[key] ?? "").trim();
        outForm[key] = val;
        html = replaceAllPlaceholderVariants(html, key, val || "");
      });

      await axios.put(
        `${API}/api/signatures/${signature.id}`,
        { form_data: outForm, html_code: cleanSignatureHtml(html) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Signature updated");
      navigate("/signatures");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update signature");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!preview) return;
    try {
      const offscreen = document.createElement("div");
      offscreen.style.cssText =
        "position:fixed;left:-99999px;top:-99999px;pointer-events:none;";
      offscreen.innerHTML = preview;
      document.body.appendChild(offscreen);

      const canvas = await html2canvas(offscreen, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
      });

      document.body.removeChild(offscreen);

      const link = document.createElement("a");
      link.download = "signature.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error("PNG export failed");
    }
  };

  const imgUrl = (() => {
    const w = watch();
    return w?.user_image || w?.image || w?.company_logo || EXAMPLES.user_image;
  })();

  // ---------- Updated renderField with ImageUploader and URL Input ----------
  const renderField = (field) => {
    const label =
      field.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) ||
      "Field";
    const isSocial = SOCIAL_FIELDS.includes(field);
    const isImageField = IMAGE_FIELDS.includes(field);
    const inputMethod = imageInputMethods[field] || "upload";

    if (!isSocial && isImageField) {
      const val = watch(field) || "";
      return (
        <div key={field} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {REQUIRED_FIELDS.includes(field) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>

          {/* Input Method Toggle */}
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${field}_input_method`}
                value="upload"
                checked={inputMethod === "upload"}
                onChange={() =>
                  setImageInputMethods((prev) => ({
                    ...prev,
                    [field]: "upload",
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              Upload Image
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${field}_input_method`}
                value="url"
                checked={inputMethod === "url"}
                onChange={() =>
                  setImageInputMethods((prev) => ({ ...prev, [field]: "url" }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              Enter URL
            </label>
          </div>

          {/* Hidden input keeps RHF in control */}
          <input
            type="hidden"
            {...register(field, {
              validate: (value) =>
                REQUIRED_FIELDS.includes(field) && !value
                  ? `${label} is required`
                  : value && !sanitizeImgSrc(value)
                  ? "Invalid image URL"
                  : true,
            })}
          />

          {inputMethod === "upload" ? (
            <ImageUploader
              label={`Upload ${label.toLowerCase()}`}
              value={val}
              onChange={(url) =>
                setValue(field, url, { shouldDirty: true, shouldTouch: true })
              }
              className="mt-1"
            />
          ) : (
            <input
              type="url"
              className={`w-full p-3 border rounded-lg ${
                errors[field] ? "border-red-500" : "border-gray-300"
              }`}
              placeholder={`Enter ${label.toLowerCase()} URL`}
              value={val}
              onChange={(e) =>
                setValue(field, e.target.value, {
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
            />
          )}

          {errors[field] && (
            <p className="text-red-500 text-sm mt-1">{errors[field].message}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field} className="mb-6">
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
            {REQUIRED_FIELDS.includes(field) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}

        {socialFields[field] || !isSocial ? (
          <input
            type={field.includes("url") ? "url" : "text"}
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
          <p className="text-red-500 text-sm">{errors[field].message}</p>
        )}
      </div>
    );
  };
  // ----------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ClipLoader size={40} color="#2563eb" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate("/signatures")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Back to Signatures
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/2">
        <h1 className="text-2xl font-bold mb-4">Edit Signature</h1>

        <div className="flex items-center gap-4 mb-4">
          <img
            src={imgUrl || BROKEN_PLACEHOLDER}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = BROKEN_PLACEHOLDER;
            }}
          />
          <div className="text-sm text-gray-600">
            Profile/Logo image is taken from fields like <code>user_image</code>
            , <code>image</code>, or <code>company_logo</code>, depending on the
            template.
          </div>
        </div>

        {template && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {(Array.isArray(template.placeholders)
              ? template.placeholders
              : Object.keys(signature?.form_data || {})
            ).map((raw) => {
              const field = String(raw)
                .replace(/^\s*\{\{\s*/, "")
                .replace(/\s*\}\}\s*$/, "");
              return renderField(field);
            })}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <ClipLoader size={18} color="#fff" />
                ) : (
                  "Save Changes"
                )}
              </button>

              <CopyHtmlButton
                html={preview}
                label="Copy"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700"
              />

              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700"
                title="Download as PNG"
              >
                <FiDownload /> PNG
              </button>
            </div>

            <div className="mt-3 text-sm text-gray-600 flex items-start gap-2">
              <FiInfo className="mt-0.5 shrink-0" />
              <span className="inline-flex flex-wrap items-center gap-1">
                Copy keeps links, images, and icons (
                <FiPhone
                  className="inline-block align-[-2px]"
                  aria-label="Phone"
                />
                <FiMail
                  className="inline-block align-[-2px]"
                  aria-label="Email"
                />
                <FiGlobe
                  className="inline-block align-[-2px]"
                  aria-label="Website"
                />
                <FiLink
                  className="inline-block align-[-2px]"
                  aria-label="Link"
                />
                <FaGithub
                  className="inline-block align-[-2px]"
                  aria-label="GitHub"
                />
                ) intact in email clients.
              </span>
            </div>

            {canCustomizeLayout && (
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                  onClick={() =>
                    document
                      .getElementById("layout-editor")
                      ?.classList.toggle("hidden")
                  }
                >
                  <FiEdit3 /> Customize Layout (admin)
                </button>

                <div id="layout-editor" className="hidden mt-3">
                  <textarea
                    value={editableHtml}
                    onChange={(e) => setEditableHtml(e.target.value)}
                    rows={10}
                    className="w-full p-3 border rounded-lg font-mono text-sm"
                    placeholder="Edit the template HTML…"
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
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

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
            <FiPhone /> Phone
          </span>
          <span className="inline-flex items-center gap-1">
            <FiMail /> Email
          </span>
          <span className="inline-flex items-center gap-1">
            <FiGlobe /> Website
          </span>
          <span className="inline-flex items-center gap-1">
            <FiLink /> Social
          </span>
          <span className="inline-flex items-center gap-1">
            <FaGithub /> GitHub
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignatureEditPage;
