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
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGZhY2V8ZW58MHx8MHx8fDA%3D",
  company_logo:
    "https://images.unsplash.com/photo-1751170359998-36c22ed75d33?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OTl8fGNvZGluZyUyMGh0bWwlMjBsb2dvfGVufDB8fDB8fHww",
  font: "Arial, Helvetica, sans-serif",
  accent: "#2563eb",
};

const API = import.meta.env.VITE_API_URL;
const ENABLE_PROXY =
  String(import.meta.env.VITE_ENABLE_IMG_PROXY || "").toLowerCase() === "true";

/** absolutize relative src against document.baseURI */
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

/** Use backend proxy for external images so html2canvas gets CORS headers */
function proxify(url) {
  if (!ENABLE_PROXY) return url; // disabled unless env flag is true
  if (!API) return url;
  return `${API}/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Replace {{placeholders}} and make images canvas-safe
 * - Replace placeholders with EXAMPLE_DATA or tokens
 * - Remove stray {{...}}
 * - Add crossorigin="anonymous"
 * - Proxy external http(s) images if enabled
 */
export function renderWithPlaceholders(html, placeholders = [], tokens = {}) {
  if (typeof html !== "string") return "";

  let out = html;

  // Build replacement keys
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

  // Replace placeholders with EXAMPLE_DATA -> tokens -> ""
  keys.forEach((k) => {
    const val =
      (EXAMPLE_DATA[k] != null ? EXAMPLE_DATA[k] : null) ??
      (tokens[k] != null ? tokens[k] : "");
    const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "gi");
    out = out.replace(re, String(val));
  });

  // Remove any stray {{...}}
  out = out.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "");

  // Always add crossorigin="anonymous" if missing
  out = out.replace(/<img\b(?![^>]*\bcrossorigin=)[^>]*>/gi, (tag) =>
    tag.replace("<img", '<img crossorigin="anonymous"')
  );

  // Proxy external http(s) images only when enabled
  if (ENABLE_PROXY) {
    out = out.replace(
      /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
      (tag, src) => {
        const abs = absolutize(src);
        if (isData(abs) || isBlob(abs)) return tag; // skip
        if (isHttp(abs)) return tag.replace(src, proxify(abs));
        return tag;
      }
    );
  }

  return out;
}
