// frontend/src/utils/canvasExport.js

const ENABLE_PROXY =
  String(import.meta.env.VITE_ENABLE_IMG_PROXY || "").toLowerCase() === "true";

const isData = (s) => /^data:image\//i.test(s || "");
const isBlob = (s) => /^blob:/i.test(s || "");

/** Safe URL parsing that also works in jsdom. */
function parseUrl(href) {
  try {
    const base =
      (typeof window !== "undefined" && window.location?.href) ||
      "http://localhost/";
    return new URL(String(href), base);
  } catch {
    return null;
  }
}

/** Same-origin check that is robust in tests/dev (treats any localhost:* as same). */
function isSameOrigin(u) {
  try {
    const loc = parseUrl(window.location?.href || "http://localhost/");
    const url = typeof u === "string" ? parseUrl(u) : u;
    if (!loc || !url) return false;

    // In tests we often run with different localhost ports; treat any localhost as same-origin.
    if (loc.hostname === "localhost" && url.hostname === "localhost") {
      return true;
    }

    return url.origin === loc.origin;
  } catch {
    return false;
  }
}

/**
 * Return true when html2canvas should ignore the element.
 * - Non-IMG => false
 * - Missing src / malformed => true
 * - data:, blob: => false
 * - http(s) same-origin => false; cross-origin => true
 */
export function shouldIgnoreElementForCanvas(el) {
  if (!el || el.tagName !== "IMG") return false;

  const raw = el.getAttribute("src");
  if (!raw) return true;

  const src = String(raw).trim();
  if (!src) return true;

  if (isData(src) || isBlob(src)) return false;

  const u = parseUrl(src);
  if (!u) return true;

  if (u.protocol === "http:" || u.protocol === "https:") {
    return !isSameOrigin(u);
  }

  // any other protocol (not data/blob/http/https): ignore
  return true;
}

/**
 * Prepare arbitrary HTML for html2canvas:
 * - Adds crossorigin="anonymous" on <img>
 * - Rewrites cross-origin image URLs through `${apiBase}/api/proxy?url=...`
 */
export function transformHtmlForCanvas(html, apiBase) {
  if (typeof html !== "string") return "";
  const base = String(apiBase || "").replace(/\/+$/, "");

  // Ensure crossorigin attr on every <img>
  let out = html.replace(/<img\b(?![^>]*\bcrossorigin=)[^>]*>/gi, (tag) =>
    tag.replace("<img", '<img crossorigin="anonymous"')
  );

  // Proxy cross-origin image src attributes
  out = out.replace(
    /<img\b([^>]*?)\s(src|data-src)\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))/gi,
    (m, before, attr, q, dqs, sqs, bare) => {
      const src = dqs || sqs || bare || "";
      if (!src) return m;
      if (isData(src) || isBlob(src)) return m;

      const u = parseUrl(src);
      if (!u) return m;

      if (
        (u.protocol === "http:" || u.protocol === "https:") &&
        !isSameOrigin(u) &&
        base
      ) {
        const proxied = `${base}/api/proxy?url=${encodeURIComponent(u.href)}`;
        return m.replace(src, proxied);
      }
      return m;
    }
  );

  return out;
}
