// backend/middleware/sanitizeSignatureHtml.js
import { cleanSignatureHtml } from "../utils/cleanSignatureHtml.js";

export function sanitizeSignatureHtml(req, _res, next) {
  if (req.body && typeof req.body.html_code === "string") {
    req.body.html_code = cleanSignatureHtml(req.body.html_code);
  }
  next();
}
