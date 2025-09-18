import { query } from "../config/db.js";

/**
 * Permissive HTML validator:
 * - Allows creative HTML/CSS
 * - Blocks only obvious XSS vectors
 */
const DANGEROUS_RE =
  /<\s*script\b|<\s*iframe\b|<\s*object\b|<\s*embed\b|on\w+\s*=|javascript:|data:text\/html|<\s*meta[^>]*http-equiv\s*=\s*["']?\s*refresh/gi;

const UNSAFE_CSS_RE = /expression\s*\(|url\(\s*['"]?\s*javascript:/i;

function validateCreativeHtml(html) {
  if (typeof html !== "string" || !html.trim()) return "Empty HTML";
  if (DANGEROUS_RE.test(html)) {
    return "Contains disallowed scripts/handlers or dangerous protocols";
  }
  const styleAttrRe = /style\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = styleAttrRe.exec(html))) {
    const css = m[2] ?? m[3] ?? "";
    if (UNSAFE_CSS_RE.test(css)) return "Unsafe CSS in style attribute";
  }
  const styleTagRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let s;
  while ((s = styleTagRe.exec(html))) {
    if (UNSAFE_CSS_RE.test(s[1])) return "Unsafe CSS in <style> block";
  }
  return null;
}

function normalizeTokens(tokens) {
  try {
    if (!tokens) return {};
    if (typeof tokens === "string") return JSON.parse(tokens);
    if (typeof tokens === "object") return tokens;
    return {};
  } catch {
    return {};
  }
}

function normalizePlaceholders(placeholders) {
  try {
    let arr = placeholders;
    if (!arr) arr = [];
    if (typeof arr === "string") arr = JSON.parse(arr);
    if (!Array.isArray(arr)) arr = [];
    const out = arr
      .map((p) => (typeof p === "string" ? p : String(p)))
      .filter(Boolean);
    return out;
  } catch {
    return [];
  }
}

export const getTemplates = async (req, res, next) => {
  try {
    const { category } = req.query;
    let queryText = "SELECT * FROM signature_app.templates";
    const params = [];
    if (category) {
      queryText += " WHERE category = $1";
      params.push(category);
    }
    // ordering only; response shape unchanged
    queryText += " ORDER BY created_at DESC";
    const { rows } = await query(queryText, params);
    console.log(
      "getTemplates: Fetched templates:",
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        placeholders: r.placeholders,
      }))
    );
    res.json(rows);
  } catch (e) {
    console.error("getTemplates: Error:", e);
    if (e.code === "42P01") {
      return res.status(500).json({ error: "Templates table does not exist" });
    }
    next(e);
  }
};

export const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      "SELECT * FROM signature_app.templates WHERE id = $1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    console.log("getTemplateById: Fetched template:", {
      id: rows[0].id,
      name: rows[0].name,
      placeholders: rows[0].placeholders,
    });
    res.json(rows[0]);
  } catch (error) {
    console.error("getTemplateById: Error:", error);
    if (error.code === "42P01") {
      return res.status(500).json({ error: "Templates table does not exist" });
    }
    next(error);
  }
};

export const addTemplate = async (req, res, next) => {
  try {
    let { name, thumbnail, tokens, html, placeholders, category } = req.body;

    tokens = normalizeTokens(tokens);
    placeholders = normalizePlaceholders(placeholders);

    if (!name || !html) {
      return res.status(400).json({ error: "Name and HTML are required" });
    }
    if (
      !Array.isArray(placeholders) ||
      !placeholders.every((p) => typeof p === "string")
    ) {
      return res
        .status(400)
        .json({ error: "Placeholders must be an array of strings" });
    }

    const htmlError = validateCreativeHtml(html);
    if (htmlError) {
      return res
        .status(400)
        .json({ error: `Invalid HTML content: ${htmlError}` });
    }

    console.log("addTemplate: Received payload:", {
      name,
      thumbnail,
      tokens,
      html,
      placeholders,
      category,
      created_by: req.user.id,
    });

    const tokensJson = JSON.stringify(tokens || {});
    const placeholdersJson = JSON.stringify(placeholders || []);
    const auditJson = JSON.stringify({
      user_id: req.user.id,
      name,
    });

    const { rows } = await query(
      "SELECT * FROM signature_app.add_template($1, $2, $3::jsonb, $4, $5::jsonb, $6, $7)",
      [
        name,
        thumbnail || null,
        tokensJson,
        html,
        placeholdersJson,
        category || "creative",
        req.user.id,
      ]
    );

    await query(
      "INSERT INTO signature_app.audit_log(action, data) VALUES ($1, $2::jsonb)",
      ["TEMPLATE_ADD", auditJson]
    );

    console.log("addTemplate: Saved template:", {
      id: rows[0].id,
      name: rows[0].name,
      placeholders: rows[0].placeholders,
    });
    res.json(rows[0]);
  } catch (e) {
    console.error("addTemplate: Error:", e);
    if (e.code === "42P01") {
      return res.status(500).json({ error: "Templates table does not exist" });
    }
    next(e);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { name, thumbnail, tokens, html, placeholders, category } = req.body;

    tokens = normalizeTokens(tokens);
    placeholders = normalizePlaceholders(placeholders);

    if (!name || !html) {
      return res.status(400).json({ error: "Name and HTML are required" });
    }
    if (
      !Array.isArray(placeholders) ||
      !placeholders.every((p) => typeof p === "string")
    ) {
      return res
        .status(400)
        .json({ error: "Placeholders must be an array of strings" });
    }

    const htmlError = validateCreativeHtml(html);
    if (htmlError) {
      return res
        .status(400)
        .json({ error: `Invalid HTML content: ${htmlError}` });
    }

    console.log("updateTemplate: Received payload:", {
      id,
      name,
      thumbnail,
      tokens,
      html,
      placeholders,
      category,
    });

    const tokensJson = JSON.stringify(tokens || {});
    const placeholdersJson = JSON.stringify(placeholders || []);
    const auditJson = JSON.stringify({
      user_id: req.user.id,
      template_id: id,
      name,
    });

    const { rows } = await query(
      "SELECT * FROM signature_app.update_template($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)",
      [
        id,
        name,
        thumbnail || null,
        tokensJson,
        html,
        placeholdersJson,
        category || "creative",
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    await query(
      "INSERT INTO signature_app.audit_log(action, data) VALUES ($1, $2::jsonb)",
      ["TEMPLATE_UPDATE", auditJson]
    );

    console.log("updateTemplate: Updated template:", {
      id: rows[0].id,
      name: rows[0].name,
      placeholders: rows[0].placeholders,
    });
    res.json(rows[0]);
  } catch (e) {
    console.error("updateTemplate: Error:", e);
    if (e.code === "42P01") {
      return res.status(500).json({ error: "Templates table does not exist" });
    }
    next(e);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: templateRows } = await query(
      "SELECT name FROM signature_app.templates WHERE id = $1",
      [id]
    );
    if (templateRows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    await query("SELECT signature_app.delete_template($1)", [id]);

    const auditJson = JSON.stringify({
      user_id: req.user.id,
      template_id: id,
      name: templateRows[0].name,
    });

    await query(
      "INSERT INTO signature_app.audit_log(action, data) VALUES ($1, $2::jsonb)",
      ["TEMPLATE_DELETE", auditJson]
    );

    console.log("deleteTemplate: Template deleted:", id);
    res.json({ message: "Template deleted successfully" });
  } catch (e) {
    console.error("deleteTemplate: Error:", e);
    if (e.code === "42P01") {
      return res.status(500).json({ error: "Templates table does not exist" });
    }
    next(e);
  }
};
