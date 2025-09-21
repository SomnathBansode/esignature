/**
 * Robust rich HTML copy helper with image + (safe) CSS inlining + circular avatar embed.
 * - Inlines <img> to data: URLs (caps + timeout + optional proxy)
 * - Inlines a WHITELIST of computed styles into style="" (email-safe)
 * - Makes images responsive (max-width:100%; height:auto; display:block)
 * - PRESERVES round avatars by converting <img data-avatar> into a circular PNG
 * - ClipboardItem -> execCommand -> writeText fallback
 *
 * USAGE:
 *   const ok = await copyHtml(htmlString);
 */

const MAX_INLINE_IMAGES = Number(import.meta.env.VITE_MAX_INLINE_IMAGES ?? 20);
const MAX_TOTAL_INLINE_SIZE = Number(
  import.meta.env.VITE_MAX_TOTAL_INLINE_SIZE ?? 1.5 * 1024 * 1024 // ~1.5MB
);

const INLINE_IMAGES_ENABLED =
  (import.meta.env.VITE_INLINE_IMAGES ?? "true") === "true";

const INLINE_CSS_ENABLED =
  (import.meta.env.VITE_INLINE_CSS ?? "true") === "true";

const ENABLE_PROXY =
  (import.meta.env.VITE_ENABLE_IMG_PROXY ?? "false") === "true";

const API = import.meta.env.VITE_API_URL;

/* ---------------- basic helpers ---------------- */
function isHttp(u) {
  return /^https?:\/\//i.test(u || "");
}
function isData(u) {
  return /^data:/i.test(u || "");
}
function isBlob(u) {
  return /^blob:/i.test(u || "");
}

function absolutize(url) {
  try {
    return new URL(url, document.baseURI).toString();
  } catch {
    return url;
  }
}

function proxify(url) {
  if (!ENABLE_PROXY || !API) return url;
  return `${String(API).replace(/\/+$/, "")}/api/proxy?url=${encodeURIComponent(
    url
  )}`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function toPlainText(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html ?? "");
  return div.innerText || div.textContent || "";
}

/* ---------------- fetch with timeout ---------------- */
async function fetchWithTimeout(url, { timeout = 5000 } = {}) {
  const ctrl =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
  try {
    const resp = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      signal: ctrl?.signal,
    });
    if (!resp.ok) return null;
    return await resp.blob();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ---------------- image inlining ---------------- */
async function inlineImagesInHtml(html) {
  if (!INLINE_IMAGES_ENABLED) return String(html ?? "");

  const tpl = document.createElement("template");
  tpl.innerHTML = String(html ?? "");

  const imgs = Array.from(tpl.content.querySelectorAll("img"));
  if (!imgs.length) return tpl.innerHTML;

  let totalBytes = 0;
  let inlinedCount = 0;

  const cache = new Map();

  for (const img of imgs) {
    if (inlinedCount >= MAX_INLINE_IMAGES) break;

    const rawSrc =
      img.currentSrc ||
      img.getAttribute("src") ||
      (typeof img.src === "string" ? img.src : "");

    if (!rawSrc || isData(rawSrc) || isBlob(rawSrc)) continue;

    const abs = absolutize(rawSrc);
    if (!isHttp(abs)) continue;

    const url = ENABLE_PROXY ? proxify(abs) : abs;

    if (!cache.has(url)) {
      cache.set(
        url,
        (async () => {
          const blob = await fetchWithTimeout(url, { timeout: 5000 });
          if (!blob) return null;
          const dataUrl = await blobToDataUrl(blob);
          return { dataUrl, size: blob.size };
        })()
      );
    }

    let result = null;
    try {
      result = await cache.get(url);
    } catch {
      result = null;
    }
    if (!result) continue;

    if (totalBytes + result.size > MAX_TOTAL_INLINE_SIZE) continue;

    img.setAttribute("src", result.dataUrl);
    totalBytes += result.size;
    inlinedCount++;
  }

  return tpl.innerHTML;
}

/* ---------------- CSS inlining (safe whitelist) ---------------- */

const ALLOWED_TAGS = new Set([
  "A",
  "SPAN",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "SMALL",
  "P",
  "DIV",
  "TABLE",
  "TBODY",
  "TR",
  "TD",
  "TH",
  "IMG",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);

const SAFE_PROPS = new Set([
  "color",
  "background",
  "background-image",
  "background-color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "line-height",
  "text-align",
  "vertical-align",
  "white-space",
  "text-transform",
  "letter-spacing",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-color",
  "border-style",
  "border-width",
  "border-radius",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "text-decoration",

  // layout that affects pasting fidelity
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "border-collapse",
  "table-layout",
  "border-spacing",

  // needed for round/cropped avatars
  "object-fit",
  "object-position",

  // responsive image rules
  "width",
  "height",
  "max-width",
  "display",
]);

function parseStyleAttr(str) {
  const out = new Map();
  if (!str) return out;
  for (const chunk of String(str).split(";")) {
    const i = chunk.indexOf(":");
    if (i === -1) continue;
    const prop = chunk.slice(0, i).trim().toLowerCase();
    const val = chunk.slice(i + 1).trim();
    if (prop) out.set(prop, val);
  }
  return out;
}

function serializeStyle(map) {
  let css = "";
  for (const [k, v] of map) {
    if (v != null && String(v).length) css += `${k}: ${v};`;
  }
  return css;
}

function addIfMissing(styleMap, prop, value) {
  if (!value) return;
  const p = prop.toLowerCase();
  if (!SAFE_PROPS.has(p)) return;
  if (!styleMap.has(p)) {
    const trimmed = String(value).trim();
    if (
      trimmed &&
      trimmed !== "initial" &&
      trimmed !== "unset" &&
      trimmed !== "inherit" &&
      trimmed !== "normal" &&
      trimmed !== "0" &&
      trimmed !== "none"
    ) {
      styleMap.set(p, trimmed);
    }
  }
}

function inlineCss(root) {
  const all = root.querySelectorAll("*");
  for (const el of all) {
    if (!ALLOWED_TAGS.has(el.tagName)) continue;

    const computed = window.getComputedStyle(el);
    const existing = parseStyleAttr(el.getAttribute("style"));

    addIfMissing(existing, "color", computed.getPropertyValue("color"));
    addIfMissing(
      existing,
      "background-color",
      computed.getPropertyValue("background-color")
    );
    addIfMissing(
      existing,
      "font-family",
      computed.getPropertyValue("font-family")
    );
    addIfMissing(existing, "font-size", computed.getPropertyValue("font-size"));
    addIfMissing(
      existing,
      "font-style",
      computed.getPropertyValue("font-style")
    );
    addIfMissing(
      existing,
      "font-weight",
      computed.getPropertyValue("font-weight")
    );
    addIfMissing(
      existing,
      "line-height",
      computed.getPropertyValue("line-height")
    );
    addIfMissing(
      existing,
      "text-align",
      computed.getPropertyValue("text-align")
    );
    addIfMissing(
      existing,
      "vertical-align",
      computed.getPropertyValue("vertical-align")
    );
    addIfMissing(
      existing,
      "white-space",
      computed.getPropertyValue("white-space")
    );
    addIfMissing(
      existing,
      "text-transform",
      computed.getPropertyValue("text-transform")
    );
    addIfMissing(
      existing,
      "letter-spacing",
      computed.getPropertyValue("letter-spacing")
    );

    const tdl = computed.getPropertyValue("text-decoration-line");
    if (tdl && tdl !== "none") addIfMissing(existing, "text-decoration", tdl);

    addIfMissing(existing, "padding", computed.getPropertyValue("padding"));
    addIfMissing(
      existing,
      "padding-top",
      computed.getPropertyValue("padding-top")
    );
    addIfMissing(
      existing,
      "padding-right",
      computed.getPropertyValue("padding-right")
    );
    addIfMissing(
      existing,
      "padding-bottom",
      computed.getPropertyValue("padding-bottom")
    );
    addIfMissing(
      existing,
      "padding-left",
      computed.getPropertyValue("padding-left")
    );

    const bw = computed.getPropertyValue("border-width");
    const bs = computed.getPropertyValue("border-style");
    const bc = computed.getPropertyValue("border-color");
    if (bw && bs && bc && bw !== "0px" && bs !== "none") {
      addIfMissing(existing, "border", `${bw} ${bs} ${bc}`);
    }
    addIfMissing(
      existing,
      "border-radius",
      computed.getPropertyValue("border-radius")
    );

    // Responsive/correct images (+ legacy width/height attrs)
    if (el.tagName === "IMG") {
      const w = computed.getPropertyValue("width");
      const h = computed.getPropertyValue("height");
      const br = computed.getPropertyValue("border-radius");

      const wPx = w.endsWith("px") ? Math.round(parseFloat(w)) : null;
      const hPx = h.endsWith("px") ? Math.round(parseFloat(h)) : null;

      if (wPx > 0) el.setAttribute("width", String(wPx));
      if (hPx > 0) el.setAttribute("height", String(hPx));

      const looksCircular = /\b50%\b/.test(br) || /\b(9999|10000)px\b/.test(br);

      if (looksCircular) {
        if (!el.getAttribute("height") && wPx > 0) {
          el.setAttribute("height", String(wPx));
        }
        addIfMissing(existing, "object-fit", "cover");
        addIfMissing(existing, "object-position", "center");
      } else {
        if (!el.getAttribute("height")) {
          addIfMissing(existing, "height", "auto");
        }
      }

      addIfMissing(existing, "max-width", "100%");
      addIfMissing(existing, "display", "block");
      addIfMissing(existing, "border", "0");
    }

    const merged = serializeStyle(existing);
    if (merged) el.setAttribute("style", merged);
  }
}

/* ---------------- circular avatar embed ---------------- */
/** Draw a circular, cover-cropped version of an image to a data URL. */
async function toCircleDataURL(url, size = 96) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  const s = size;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const ratio = Math.max(s / img.width, s / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  const dx = (s - dw) / 2;
  const dy = (s - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  return canvas.toDataURL("image/png");
}

/**
 * Convert any <img data-avatar="true"> to a circular PNG
 * so it stays round after paste in strict clients.
 */
async function embedCircularAvatars(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const avatars = Array.from(doc.querySelectorAll('img[data-avatar="true"]'));
  if (!avatars.length) return html;

  await Promise.all(
    avatars.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src) return;
      try {
        const w = parseInt(img.getAttribute("width") || "96", 10) || 96;
        const h = parseInt(img.getAttribute("height") || "96", 10) || 96;
        const size = Math.max(32, Math.min(256, Math.round((w + h) / 2)));
        const dataUrl = await toCircleDataURL(src, size);
        img.setAttribute("src", dataUrl);
        img.setAttribute("width", String(size));
        img.setAttribute("height", String(size));
      } catch {
        /* ignore and keep original src */
      }
    })
  );

  return doc.body.innerHTML;
}

/* ---------------- make a finalized, email-safe HTML string ---------------- */
export async function emailizeHtml(
  html,
  {
    inlineCss: DO_INLINE_CSS = INLINE_CSS_ENABLED,
    inlineImages: DO_INLINE_IMAGES = INLINE_IMAGES_ENABLED,
  } = {}
) {
  let processedHtml = String(html ?? "");

  if (DO_INLINE_CSS) {
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;";
    container.innerHTML = processedHtml;
    document.body.appendChild(container);
    try {
      inlineCss(container);
    } catch {
      /* ignore */
    }
    processedHtml = container.innerHTML;
    document.body.removeChild(container);
  }

  if (DO_INLINE_IMAGES) {
    try {
      processedHtml = await inlineImagesInHtml(processedHtml);
    } catch {
      /* ignore */
    }
  }

  // After width/height attrs + possible data: URLs, embed circular avatars.
  try {
    processedHtml = await embedCircularAvatars(processedHtml);
  } catch {
    /* ignore */
  }

  return processedHtml;
}

/* ---------------- main copy function ---------------- */
export async function copyHtml(html, plainText) {
  const processedHtml = await emailizeHtml(html);
  const plain = plainText ?? toPlainText(processedHtml);

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new window.ClipboardItem({
        "text/html": new Blob([processedHtml], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {}

  try {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    Object.assign(div.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
      whiteSpace: "pre-wrap",
    });
    div.innerHTML = processedHtml;
    document.body.appendChild(div);
    div.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand("copy");
    sel.removeAllRanges();
    document.body.removeChild(div);
    if (ok) return true;
  } catch {}

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      return true;
    }
  } catch {}

  return false;
}

export default copyHtml;
