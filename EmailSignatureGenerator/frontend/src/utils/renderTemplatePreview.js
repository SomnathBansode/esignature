// src/utils/renderTemplatePreview.js

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
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  company_logo:
    "https://images.unsplash.com/photo-1751170359998-36c22ed75d33?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  font: "Arial, Helvetica, sans-serif",
  accent: "#2563eb",
};

const API = import.meta.env.VITE_API_URL;
const ENABLE_PROXY =
  String(import.meta.env.VITE_ENABLE_IMG_PROXY || "").toLowerCase() === "true";

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

// --- NEW: strip Outlook-only mso-* props for on-screen preview to avoid console noise
function stripMsoPropsForPreview(html) {
  if (!import.meta.env.DEV) return html; // keep everything in prod build
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

/**
 * Replace {{placeholders}} and make images canvas-safe for previews:
 * - Replace placeholders with EXAMPLE_DATA or tokens
 * - Remove stray {{...}}
 * - Add crossorigin="anonymous"
 * - Proxy external http(s) images if enabled
 * - Strip mso-* props in preview to silence warnings (does NOT affect copied HTML)
 */
export function renderWithPlaceholders(html, placeholders = [], tokens = {}) {
  if (typeof html !== "string") return "";

  let out = html;

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

  keys.forEach((k) => {
    const val =
      (EXAMPLE_DATA[k] != null ? EXAMPLE_DATA[k] : null) ??
      (tokens[k] != null ? tokens[k] : "");
    const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "gi");
    out = out.replace(re, String(val));
  });

  out = out.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "");

  out = out.replace(/<img\b(?![^>]*\bcrossorigin=)[^>]*>/gi, (tag) =>
    tag.replace("<img", '<img crossorigin="anonymous"')
  );

  if (ENABLE_PROXY) {
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

  // preview-only: strip Outlook props to avoid console warnings
  out = stripMsoPropsForPreview(out);

  return out;
}
