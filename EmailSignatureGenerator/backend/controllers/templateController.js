import { query } from "../config/db.js";

export const getTemplates = async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM signature_app.templates");
    res.json(rows);
  } catch (e) {
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
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const addTemplate = async (req, res, next) => {
  try {
    const { name, thumbnail, tokens, html, placeholders } = req.body;
    const { rows } = await query(
      "SELECT * FROM signature_app.add_template($1, $2, $3, $4, $5, $6)",
      [name, thumbnail, tokens || {}, html, placeholders || [], req.user.id]
    );
    await query(
      "INSERT INTO signature_app.audit_log(action, data) VALUES ($1, $2)",
      ["TEMPLATE_ADD", { user_id: req.user.id, template_id: rows[0].id, name }]
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, thumbnail, tokens, html, placeholders } = req.body;
    const { rows } = await query(
      "SELECT * FROM signature_app.update_template($1, $2, $3, $4, $5, $6)",
      [id, name, thumbnail, tokens || {}, html, placeholders || []]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    await query(
      "INSERT INTO signature_app.audit_log(action, data) VALUES ($1, $2)",
      ["TEMPLATE_UPDATE", { user_id: req.user.id, template_id: id, name }]
    );
    res.json(rows[0]);
  } catch (e) {
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
    await query(
      "INSERT INTO signature_app.audit_log(action, data) VALUES ($1, $2)",
      [
        "TEMPLATE_DELETE",
        { user_id: req.user.id, template_id: id, name: templateRows[0].name },
      ]
    );
    res.json({ message: "Template deleted successfully" });
  } catch (e) {
    next(e);
  }
};
