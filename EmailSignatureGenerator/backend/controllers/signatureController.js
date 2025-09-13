import { query } from "../config/db.js";

// backend/controllers/signatureController.js
// backend/controllers/signatureController.js
export const createSignature = async (req, res, next) => {
  try {
    const { template_id, form_data, html_code } = req.body;
    const idemKey = req.get("Idempotency-Key") || null;
    const userId = req.user.id;

    // Make sure form_data and html_code are correctly parsed and stored
    console.log("Form Data: ", form_data); // You can remove this after testing
    console.log("HTML Code: ", html_code); // You can remove this after testing

    // Inserting signature into the database
    const { rows } = await query(
      "SELECT * FROM signature_app.create_signature_idempotent($1, $2, $3, $4, $5)",
      [userId, template_id, form_data, html_code, idemKey]
    );

    res.json(rows[0]); // Return created signature data
  } catch (error) {
    next(error); // Handle any errors
  }
};

// backend/controllers/signatureController.js
export const mySignatures = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and 10 items per page
    const offset = (page - 1) * limit;

    const { rows } = await query(
      "SELECT * FROM signature_app.get_user_signatures($1) LIMIT $2 OFFSET $3",
      [req.user.id, limit, offset]
    );

    res.json(rows); // Send the paginated signatures back
  } catch (e) {
    next(e);
  }
};

// backend/controllers/signatureController.js
export const adminStats = async (_req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT signature_app.get_admin_stats() as stats"
    );
    res.json(rows[0].stats); // Sending stats to the frontend
  } catch (e) {
    next(e);
  }
};

export const updateSignature = async (req, res, next) => {
  try {
    const { id } = req.params; // Get the signature ID from the URL
    const { form_data, html_code } = req.body; // Get updated form data and HTML code from the request body

    // Update the signature with new form data and HTML code
    const { rows } = await query(
      "SELECT * FROM signature_app.update_signature($1, $2, $3, $4)", // Update query
      [id, req.user.id, form_data, html_code] // Pass signature ID, user ID, updated form data, and HTML code
    );

    res.json(rows[0]); // Send the updated signature back to the client
  } catch (e) {
    next(e); // Handle errors
  }
};

export const deleteSignature = async (req, res, next) => {
  try {
    const { id } = req.params; // Signature ID
    await query("SELECT signature_app.delete_signature($1)", [id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
export const getSignatureById = async (req, res, next) => {
  try {
    const { id } = req.params; // Signature ID
    const { rows } = await query(
      "SELECT * FROM signature_app.get_user_signatures($1) WHERE id = $2", // Filter by user ID
      [req.user.id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Signature not found" });
    }

    res.json(rows[0]); // Return the signature
  } catch (e) {
    next(e);
  }
};
