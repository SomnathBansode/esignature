// src/utils/renderTemplatePreview.js

// ---------------------------------------------------------------------------
// Demo data used to fill {{placeholders}} when previewing a template
// ---------------------------------------------------------------------------
export const EXAMPLE_DATA = {
  name: "John Doe",
  title: "Software Engineer",
  role: "Software Engineer",
  company: "Acme Corp",
  phone: "+1234567890",
  email: "john.doe@example.com",
  website: "https://www.acme.com",
  linkedin_url: "https://linkedin.com/in/johndoe",
  github_url: "https://github.com/johndoe",
  twitter_url: "https://twitter.com/johndoe",
  facebook_url: "https://facebook.com/johndoe",
  instagram_url: "https://instagram.com/johndoe",
  user_image:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=faces&q=70&auto=format",
  company_logo:
    "https://images.unsplash.com/photo-1751170359998-36c22ed75d33?w=240&h=80&fit=contain&q=70&auto=format&bg=fff",
  font: "Arial, Helvetica, sans-serif",
  accent: "#2563eb",
};

// Environment flags
const API = import.meta.env.VITE_API_URL;
const ENABLE_PROXY =
  String(import.meta.env.VITE_ENABLE_IMG_PROXY || "").toLowerCase() === "true";

// ---------------------------------------------------------------------------
// URL + image helpers
// ---------------------------------------------------------------------------
function absolutize(url) {
  try {
    return new URL(url, document.baseURI).toString();
  } catch {
    return url;
  }
}
function isHttp(u) {
  return /^https?:\/\//i.test(u || "");
}
function isData(u) {
  return /^data:/i.test(u || "");
}
function isBlob(u) {
  return /^blob:/i.test(u || "");
}
function proxify(url) {
  if (!ENABLE_PROXY || !API) return url;
  return `${API}/api/proxy?url=${encodeURIComponent(url)}`;
}

// Square placeholder so avatar stays perfectly circular in preview
export const BROKEN_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <g fill="#9ca3af" font-family="Arial, Helvetica, sans-serif" font-size="12">
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">image unavailable</text>
      </g>
    </svg>`
  );

// ---------------------------------------------------------------------------
// Dev-only: strip Outlook-only mso-* props from preview to reduce console noise
// (copy/export should use original HTML; this is preview-only hygiene)
// ---------------------------------------------------------------------------
function stripMsoPropsForPreview(html) {
  if (!import.meta.env.DEV) return html;
  let out = String(html ?? "");

  // inline style="... mso-foo:bar; ..."
  out = out.replace(/style=("|\')(.*?)\1/gi, (m, q, css) => {
    const cleaned = css
      .replace(/(?:^|;)\s*mso-[^:]+:[^;]*;?/gi, ";")
      .replace(/;;+/g, ";")
      .replace(/^;|;$/g, "");
    return `style=${q}${cleaned}${q}`;
  });

  // inside <style>...</style>
  out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (block) =>
    block.replace(/mso-[^:]+:[^;]+;?/gi, "")
  );

  return out;
}

// ---------------------------------------------------------------------------
// renderWithPlaceholders
// - Replaces {{placeholders}} with EXAMPLE_DATA or tokens
// - Removes stray {{...}}
// - Adds crossorigin="anonymous" to all <img> for canvas safety
// - Optionally proxies external images for CORS (ENABLE_PROXY/.env controlled)
// - Optionally strips mso-* for preview (dev only by default)
// ---------------------------------------------------------------------------
export function renderWithPlaceholders(
  html,
  placeholders = [],
  tokens = {},
  options = {}
) {
  if (typeof html !== "string") return "";
  const {
    stripMsoInDev = true,
    enableProxy = ENABLE_PROXY, // allow override in tests
  } = options;

  let out = html;

  // Collect keys to replace (from placeholders + tokens)
  const keys = new Set();
  (Array.isArray(placeholders) ? placeholders : []).forEach((p) => {
    const k = String(p)
      .replace(/^\s*\{\{\s*/, "")
      .replace(/\s*\}\}\s*$/, "");
    if (k) keys.add(k);
  });
  if (tokens && typeof tokens === "object") {
    Object.keys(tokens).forEach((k) => keys.add(k));
  }

  // Replace known keys
  keys.forEach((k) => {
    const val =
      (EXAMPLE_DATA[k] != null ? EXAMPLE_DATA[k] : null) ??
      (tokens[k] != null ? tokens[k] : "");
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(k)}\\s*\\}\\}`, "gi");
    out = out.replace(re, String(val));
  });

  // Remove any remaining {{unknown}} placeholders
  out = out.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "");

  // Ensure all <img> have crossorigin for html2canvas
  out = out.replace(/<img\b(?![^>]*\bcrossorigin=)[^>]*>/gi, (tag) =>
    tag.replace("<img", '<img crossorigin="anonymous"')
  );

  // Proxy external images if enabled (leave data: and blob: untouched)
  if (enableProxy) {
    out = out.replace(
      /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
      (tag, src) => {
        const abs = absolutize(src);
        if (isData(abs) || isBlob(abs)) return tag;
        if (isHttp(abs)) return tag.replace(src, proxify(abs));
        return tag;
      }
    );
  }

  // Dev preview cleanup
  if (stripMsoInDev) out = stripMsoPropsForPreview(out);

  return out;
}

// ---------------------------------------------------------------------------
// applyPreviewImageSafety
// - Call this after injecting preview HTML into the DOM
// - Adds crossorigin, swaps broken images to BROKEN_PLACEHOLDER
// - Normalizes avatar <img data-avatar="true"> to be perfect circles
// ---------------------------------------------------------------------------
export function applyPreviewImageSafety(host, options = {}) {
  if (!host) return;
  const {
    avatarSize = 96, // default square size for avatars in preview
  } = options;

  // CORS + fallback
  host.querySelectorAll("img").forEach((img) => {
    img.setAttribute("crossorigin", "anonymous");

    // Replace broken images with square placeholder
    const ensureFallback = () => {
      img.onerror = null;
      img.src = BROKEN_PLACEHOLDER;
    };

    // If img has no src or an obviously invalid src, set placeholder immediately
    const src = img.getAttribute("src") || "";
    if (!src || /\s/.test(src)) {
      ensureFallback();
    } else {
      img.onerror = ensureFallback;
    }
  });

  // Normalize avatars to perfect circle
  host.querySelectorAll('img[data-avatar="true"]').forEach((img) => {
    const sizeAttrW = parseInt(img.getAttribute("width") || "", 10);
    const sizeAttrH = parseInt(img.getAttribute("height") || "", 10);
    const size =
      Number.isFinite(sizeAttrW) && Number.isFinite(sizeAttrH)
        ? Math.min(sizeAttrW, sizeAttrH)
        : avatarSize;

    img.setAttribute("width", String(size));
    img.setAttribute("height", String(size));

    // Keep existing styles but enforce circle + cover + square dimensions first
    const enforced =
      `display:block;border-radius:50%;object-fit:cover;object-position:center;` +
      `width:${size}px;height:${size}px;`;
    const existing = img.getAttribute("style") || "";
    img.setAttribute("style", `${enforced}${existing}`);
  });
}

// ---------------------------------------------------------------------------
// Small util
// ---------------------------------------------------------------------------
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
