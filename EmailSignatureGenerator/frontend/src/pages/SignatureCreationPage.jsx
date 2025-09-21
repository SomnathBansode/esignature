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
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiUser,
  FiBriefcase,
  FiShare2,
  FiSettings,
  FiEye,
} from "react-icons/fi";
import cleanSignatureHtml from "../../test/cleanSignatureHtml";
import CopyHtmlButton from "../components/CopyHtmlButton";
import ImageUploader from "../components/ImageUploader";

// ---- Image safety helpers ----
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
    trigger,
  } = useForm();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [template, setTemplate] = useState(null);
  const [editableHtml, setEditableHtml] = useState("");
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [socialFields, setSocialFields] = useState({});
  const [showEditor, setShowEditor] = useState(false);
  const [imageInputMethods, setImageInputMethods] = useState({}); // New state for input method per image field

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

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

  // Define form steps with their fields
  const FORM_STEPS = useMemo(() => {
    if (!template?.placeholders) return [];

    const fields = template.placeholders.map((raw) =>
      String(raw)
        .replace(/^\s*\{\{\s*/, "")
        .replace(/\s*\}\}\s*$/, "")
    );

    const basicFields = fields.filter((f) =>
      ["name", "email", "phone", "user_image"].includes(f)
    );
    const professionalFields = fields.filter((f) =>
      [
        "role",
        "title",
        "company",
        "website",
        "address",
        "company_logo",
      ].includes(f)
    );
    const socialFields = fields.filter((f) => SOCIAL_FIELDS.includes(f));
    const customFields = fields.filter(
      (f) =>
        !basicFields.includes(f) &&
        !professionalFields.includes(f) &&
        !socialFields.includes(f)
    );

    const steps = [];
    if (basicFields.length > 0) {
      steps.push({
        id: "basic",
        title: "Basic Information",
        description: "Your personal details",
        icon: FiUser,
        fields: basicFields,
      });
    }
    if (professionalFields.length > 0) {
      steps.push({
        id: "professional",
        title: "Professional Details",
        description: "Work and company information",
        icon: FiBriefcase,
        fields: professionalFields,
      });
    }
    if (socialFields.length > 0) {
      steps.push({
        id: "social",
        title: "Social Media",
        description: "Connect your social profiles",
        icon: FiShare2,
        fields: socialFields,
      });
    }
    if (customFields.length > 0) {
      steps.push({
        id: "custom",
        title: "Additional Details",
        description: "Custom fields",
        icon: FiSettings,
        fields: customFields,
      });
    }
    steps.push({
      id: "preview",
      title: "Preview & Export",
      description: "Review and customize your signature",
      icon: FiEye,
      fields: [],
    });

    return steps;
  }, [template, SOCIAL_FIELDS]);

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
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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
            if (IMAGE_FIELDS.includes(key)) {
              setImageInputMethods((prev) => ({ ...prev, [key]: "upload" }));
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
  }, [
    user,
    navigate,
    templateId,
    token,
    setValue,
    SOCIAL_FIELDS,
    IMAGE_FIELDS,
  ]);

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

  const validateCurrentStep = async () => {
    if (currentStep >= FORM_STEPS.length) return true;
    const currentStepData = FORM_STEPS[currentStep];
    if (!currentStepData?.fields) return true;
    const fieldsToValidate = currentStepData.fields.filter((field) =>
      REQUIRED_FIELDS.includes(field)
    );
    if (fieldsToValidate.length === 0) return true;
    const result = await trigger(fieldsToValidate);
    return result;
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

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
              className={`w-full p-3 border rounded-lg transition-colors ${
                errors[field]
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
              } focus:ring-2 focus:outline-none`}
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
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={!!socialFields[field]}
              onChange={(e) =>
                setSocialFields((prev) => ({
                  ...prev,
                  [field]: e.target.checked,
                }))
              }
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Include {label.replace("_url", "")}
            </label>
          </div>
        ) : (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {REQUIRED_FIELDS.includes(field) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}

        {socialFields[field] || !isSocial ? (
          <input
            type={field.includes("url") ? "url" : "text"}
            className={`w-full p-3 border rounded-lg transition-colors ${
              errors[field]
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
            } focus:ring-2 focus:outline-none`}
            placeholder={EXAMPLES[field] || `Enter ${label.toLowerCase()}`}
            {...register(field, {
              required: REQUIRED_FIELDS.includes(field)
                ? `${label} is required`
                : false,
            })}
          />
        ) : null}

        {errors[field] && (
          <p className="text-red-500 text-sm mt-1">{errors[field].message}</p>
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

  if (!template || FORM_STEPS.length === 0) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <p className="text-gray-500">Loading form configuration...</p>
      </div>
    );
  }

  const currentStepData = FORM_STEPS[currentStep];
  const isLastStep = currentStep === FORM_STEPS.length - 1;
  const isPreviewStep = currentStepData?.id === "preview";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Email Signature
          </h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {FORM_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = completedSteps.has(index);

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isCompleted ? (
                        <FiCheck className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    {index < FORM_STEPS.length - 1 && (
                      <div
                        className={`w-12 h-1 mx-2 transition-all ${
                          isCompleted ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {FORM_STEPS.length}
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* Form Section */}
          <div className="xl:w-1/2">
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <currentStepData.icon className="w-6 h-6 text-blue-600" />
                  {currentStepData.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  {currentStepData.description}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                {!isPreviewStep ? (
                  <div className="space-y-4">
                    {currentStepData.fields.map((f) => renderField(f))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Final Step - Export Options */}
                    <div className="flex flex-wrap gap-3">
                      <CopyHtmlButton
                        html={preview}
                        label="Copy HTML"
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <FiDownload /> Download PNG
                      </button>
                    </div>

                    {/* HTML Editor Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowEditor(!showEditor)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <FiEdit3 />
                        {showEditor ? "Hide" : "Show"} HTML Editor
                      </button>

                      {showEditor && (
                        <div className="mt-4 space-y-3">
                          <textarea
                            value={editableHtml}
                            onChange={(e) => setEditableHtml(e.target.value)}
                            rows={8}
                            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Edit the template HTML here…"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditableHtml(template?.html || "")
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
                          >
                            <FiRotateCcw /> Reset to Original
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <ClipLoader size={18} color="#fff" />
                          Saving...
                        </>
                      ) : (
                        "Save Signature"
                      )}
                    </button>
                  </div>
                )}

                {/* Navigation Buttons */}
                {!isPreviewStep && (
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={currentStep === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiChevronLeft /> Previous
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {isLastStep ? "Review" : "Next"} <FiChevronRight />
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Enhanced Preview Section */}
          <div className="xl:w-1/2">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden sticky top-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <FiEye /> Live Preview
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  See how your signature will look in real-time
                </p>
              </div>

              <div className="p-6">
                <div
                  ref={previewRef}
                  className="border-2 border-dashed border-gray-200 p-6 rounded-lg bg-white min-h-[200px] transition-all hover:border-blue-300"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
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
                      <FiGithub /> GitHub
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 Your signature will automatically update as you fill out
                    the form. All links and images will be preserved when
                    copied.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureCreationPage;
