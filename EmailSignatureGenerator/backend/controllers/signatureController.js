import { query } from "../config/db.js";

export const createSignature = async (req, res, next) => {
  try {
    const { template_id, form_data, html_code } = req.body;
    const user_id = req.user.id;
    const { rows } = await query(
      "SELECT * FROM signature_app.create_signature($1, $2, $3, $4)",
      [user_id, template_id, form_data, html_code]
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
export const mySignatures = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await query(
      "SELECT * FROM signature_app.get_user_signatures($1) LIMIT $2 OFFSET $3",
      [req.user.id, limit, offset]
    );

    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const adminStats = async (req, res, next) => {
  try {
    const { rows } = await query("SELECT signature_app.get_admin_stats()");
    if (rows.length === 0) {
      return res.status(500).json({ error: "Failed to fetch admin stats" });
    }
    res.json(rows[0].get_admin_stats);
  } catch (e) {
    console.error("Admin stats error:", e);
    res.status(400).json({ error: e.message });
    next(e);
  }
};

export const updateSignature = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { form_data, html_code } = req.body;
    const user_id = req.user.id;
    const { rows } = await query(
      "SELECT * FROM signature_app.update_signature($1, $2, $3, $4)",
      [id, user_id, form_data, html_code]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Signature not found or not owned by user" });
    }
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
export const deleteSignature = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query("SELECT signature_app.delete_signature($1)", [id]);
    res.json({ message: "Signature deleted successfully" });
  } catch (e) {
    next(e);
  }
};
export const getSignatureById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      "SELECT * FROM signature_app.get_user_signatures($1) WHERE id = $2",
      [req.user.id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Signature not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
export const getUserSignatures = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { rows } = await query(
      "SELECT * FROM signature_app.get_user_signatures($1)",
      [user_id]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
};
