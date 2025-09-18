import express from "express";
import { query } from "../config/db.js";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/unsubscribe", async (req, res, next) => {
  const { email } = req.body;
  try {
    const { rows } = await query(
      "UPDATE signature_app.users SET email_notifications = FALSE WHERE lower(email) = lower($1) RETURNING email",
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Email not found" });
    }
    res.json({
      message: "You have been unsubscribed from email notifications",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
