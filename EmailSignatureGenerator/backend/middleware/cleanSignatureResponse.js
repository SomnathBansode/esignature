// backend/middleware/cleanSignatureResponse.js
import { cleanSignatureHtml } from "../utils/cleanSignatureHtml.js";

function cleanPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map(cleanPayload);
  }
  if (payload && typeof payload === "object") {
    const out = { ...payload };
    if (typeof out.html_code === "string") {
      out.html_code = cleanSignatureHtml(out.html_code);
    }
    return out;
  }
  return payload;
}

/**
 * Wraps res.json so anything we send back has html_code sanitized.
 * Non-invasive: you don't have to change your controllers.
 */
export function cleanSignatureResponse(_req, res, next) {
  const original = res.json.bind(res);
  res.json = (data) => original(cleanPayload(data));
  next();
}
