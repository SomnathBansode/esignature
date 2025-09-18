// ---- helpers ----
function stripPlaceholders(input) {
  return String(input)
    .replace(/\{\{\s*[\w.-]+\s*\}\}/gi, "") // {{ key }}
    .replace(/\{\s*[\w.-]+\s*\}/gi, ""); // { key }
}

function cleanStyleValue(styleValue) {
  if (!styleValue) return "";

  const parts = styleValue
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const kept = [];
  const dropIfEmptyProps = new Set([
    "background",
    "background-image",
    "background-color",
    "color",
    "font-family",
  ]);

  for (const part of parts) {
    const i = part.indexOf(":");
    if (i === -1) continue;

    const prop = part.slice(0, i).trim().toLowerCase();
    let val = part.slice(i + 1).trim();

    if (/[{}]/.test(val)) continue; // any placeholder remnants

    const isEffectivelyEmpty =
      val === "" ||
      /^["']\s*["']$/.test(val) || // "", ''
      /^url\(\s*\)$/i.test(val) || // url()
      /^var\(\s*\)$/i.test(val); // var()

    // Inline special case: background-image:url() -> drop the declaration
    if (prop === "background-image" && /^url\(\s*\)$/i.test(val)) {
      continue;
    }

    if (dropIfEmptyProps.has(prop) && isEffectivelyEmpty) {
      continue;
    }

    kept.push(`${prop}: ${val}`);
  }

  return kept.join("; ");
}

function cleanInlineStyles(html) {
  // Swallow any leading whitespace before style= to avoid leaving "<div >"
  return html.replace(
    /\s*style\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_match, _q, dbl, sgl) => {
      const original = dbl ?? sgl ?? "";
      const cleaned = cleanStyleValue(original);
      if (!cleaned) return ""; // remove attribute + preceding space entirely

      // Ensure trailing semicolon
      const withSemi = cleaned.endsWith(";") ? cleaned : cleaned + ";";
      // Re-introduce a single leading space before style=
      return ` style="${withSemi}"`;
    }
  );
}

function cleanStyleBlocks(html) {
  return html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => {
    let c = css;

    // In CSS blocks: background-image:url() => background-image:none;
    c = c.replace(
      /background-image\s*:\s*url\(\s*\)\s*;?/gi,
      "background-image:none;"
    );

    // Remove only truly empty declarations
    const props = ["background", "background-color", "color", "font-family"];
    for (const p of props) {
      const re = new RegExp(
        `\\b${p}\\s*:\\s*(?:;|(?:"\\s*"|'\\s*')\\s*;|(?=\\}))`,
        "gi"
      );
      c = c.replace(re, "");
    }

    c = c.replace(/;\s*;/g, ";").replace(/\s{2,}/g, " ");
    return `<style>${c}</style>`;
  });
}

export function cleanSignatureHtml(html) {
  if (!html) return "";

  let out = stripPlaceholders(html);
  out = cleanInlineStyles(out);
  out = cleanStyleBlocks(out);
  // Remove any leftover empty style=""
  out = out.replace(/\sstyle=["']\s*["']/gi, "");

  return out;
}

// Provide default export too (so both import styles work)
export default cleanSignatureHtml;
