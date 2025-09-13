// backend/controllers/templateController.js
import { query } from "../config/db.js";

// backend/controllers/templateController.js

export const getTemplates = async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM signature_app.templates");
    res.json(rows); // Send all templates
  } catch (e) {
    next(e);
  }
};

export const addTemplate = async (req, res, next) => {
  try {
    const { name, thumbnail, description } = req.body;
    const { rows } = await query(
      "INSERT INTO signature_app.templates (name, thumbnail, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, thumbnail, description, req.user.id]
    );
    res.json(rows[0]); // Return the created template
  } catch (e) {
    next(e);
  }
};

// backend/controllers/templateController.js

export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, thumbnail, description } = req.body;
    const { rows } = await query(
      "UPDATE signature_app.templates SET name = $1, thumbnail = $2, description = $3 WHERE id = $4 RETURNING *",
      [name, thumbnail, description, id]
    );
    res.json(rows[0]); // Return updated template
  } catch (e) {
    next(e);
  }
};
// backend/controllers/templateController.js

export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM signature_app.templates WHERE id = $1", [id]);
    res.json({ message: "Template deleted successfully" });
  } catch (e) {
    next(e);
  }
};

export const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params; // Fetch template by ID from params
    const { rows } = await query(
      "SELECT * FROM signature_app.templates WHERE id = $1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(rows[0]); // Send the template data back to the frontend
  } catch (error) {
    next(error);
  }
};
