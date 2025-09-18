// backend/utils/cleanSignatureHtml.js
// Cleans placeholder leftovers and invalid/empty CSS in inline styles and <style> blocks.

const PLACEHOLDER_RE = /\{\{\s*[^}]+\s*\}\}|\{\s*[^}]+\s*\}/g;

function needsUnit(prop) {
  // lengths that must have a unit (except "0")
  return /^(?:width|height|max-width|max-height|min-width|min-height|top|left|right|bottom|margin|margin-(?:top|right|bottom|left)|padding|padding-(?:top|right|bottom|left)|letter-spacing|word-spacing|text-indent|border(?:-.*)?-width)$/i.test(
    prop
  );
}

function unitlessOkay(prop) {
  // line-height may be unitless; z-index too (but we don't touch it)
  return /^(?:line-height|z-index|opacity|flex|flex-grow|flex-shrink)$/i.test(
    prop
  );
}

function isEmpty(val) {
  return !val || /^\s*$/.test(val);
}
function looksLikeEmptyUrl(val) {
  return /url\(\s*\)$/i.test(val || "");
}
function isNumberWithoutUnit(val) {
  // "12" or "12.5" (not 0) — no unit or %; permit "0"
  return /^\s*(?!0(?:\.0+)?\s*$)\d+(?:\.\d+)?\s*$/i.test(val || "");
}

function cleanDeclarations(styleText) {
  const parts = String(styleText || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const kept = [];

  for (const decl of parts) {
    const m = decl.match(/^([a-z-]+)\s*:\s*(.+)$/i);
    if (!m) continue;
    const prop = m[1].trim();
    let val = m[2].trim();

    // remove placeholders
    val = val.replace(PLACEHOLDER_RE, "").trim();

    // drop empties
    if (isEmpty(val)) continue;

    // background-image:url() => none
    if (/^background-image$/i.test(prop) && looksLikeEmptyUrl(val)) {
      kept.push("background-image:none");
      continue;
    }

    // background:url() => none
    if (/^background$/i.test(prop) && looksLikeEmptyUrl(val)) {
      kept.push("background:none");
      continue;
    }

    // "background:" with nothing meaningful
    if (/^background$/i.test(prop) && /^none\s*$/i.test(val)) {
      kept.push("background:none");
      continue;
    }

    // numeric-but-missing-unit for properties that need units (except 0)
    if (needsUnit(prop) && isNumberWithoutUnit(val)) {
      // invalid -> drop
      continue;
    }

    // line-height: empty already handled; numeric is fine (unitless allowed)
    if (/^line-height$/i.test(prop)) {
      // keep as-is if not empty (already checked)
    }

    // tidy whitespace inside values
    val = val.replace(/\s+/g, " ").trim();

    kept.push(`${prop}:${val}`);
  }

  if (!kept.length) return "";
  return kept.join("; ");
}

function cleanInlineStyles(html) {
  return html.replace(/style\s*=\s*"(.*?)"/gis, (_m, style) => {
    const cleaned = cleanDeclarations(style);
    return cleaned ? `style="${cleaned};"` : "";
  });
}

function cleanStyleBlocks(html) {
  return html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => {
    let out = css;

    // remove empty props we frequently see
    out = out.replace(
      /\b(background|background-color|color|font-family|line-height|max-width|max-height|width|height)\s*:\s*;\s*/gi,
      ""
    );

    // background-image:url() => none
    out = out.replace(
      /\bbackground-image\s*:\s*url\(\s*\)\s*;?/gi,
      "background-image:none;"
    );

    // background:url() => none
    out = out.replace(
      /\bbackground\s*:\s*url\(\s*\)\s*;?/gi,
      "background:none;"
    );

    // drop numeric-without-unit for unit-required props (except 0)
    out = out.replace(
      /\b(max-width|max-height|width|height|margin|padding|top|left|right|bottom)\s*:\s*(\d+(?:\.\d+)?)\s*;?/gi,
      (_all, prop, num) => (Number(num) === 0 ? `${prop}:0;` : "")
    );

    // tidy
    out = out
      .replace(/\s*;\s*;/g, ";")
      .replace(/\s+/g, " ")
      .trim();

    return `<style>${out}</style>`;
  });
}

export function cleanSignatureHtml(html = "") {
  if (!html || typeof html !== "string") return "";

  // remove any placeholder tokens first
  let out = html.replace(PLACEHOLDER_RE, "");

  // inline styles
  out = cleanInlineStyles(out);

  // style blocks
  out = cleanStyleBlocks(out);

  return out.trim();
}
