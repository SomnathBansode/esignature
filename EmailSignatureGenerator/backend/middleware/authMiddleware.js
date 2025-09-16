import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

// Protect routes that require authentication
export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token" });
  }

  try {
    // Check if token is blacklisted
    const { rows: blacklist } = await query(
      "SELECT token FROM signature_app.token_blacklist WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    if (blacklist.length > 0) {
      return res
        .status(401)
        .json({ error: "Not authorized, token blacklisted" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT id, role, is_active FROM signature_app.users WHERE id = $1",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Not authorized, user not found" });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ error: "Account is suspended" });
    }

    req.user = { id: rows[0].id, role: rows[0].role };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Admin-only routes
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
};
