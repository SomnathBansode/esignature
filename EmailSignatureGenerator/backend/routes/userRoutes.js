import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { query } from "../config/db.js";

const router = Router();

router.get("/profile", protect, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, email, role FROM signature_app.users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
