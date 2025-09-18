// backend/middleware/relaxedHtmlGuard.js
export default function relaxedHtmlGuard(req, res, next) {
  const html = req.body?.html;

  // Keep this permissive: just ensure it’s a non-trivial string.
  if (typeof html !== "string" || html.trim().length < 10) {
    return res.status(400).json({ error: "Invalid HTML content" });
  }

  next();
}
