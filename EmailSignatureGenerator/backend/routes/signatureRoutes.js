// backend/routes/signatureRoutes.js
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createSignature,
  mySignatures,
  updateSignature,
  deleteSignature,
  getSignatureById,
} from "../controllers/signatureController.js";
import { sanitizeSignatureHtml } from "../middleware/sanitizeSignatureHtml.js";
import { cleanSignatureResponse } from "../middleware/cleanSignatureResponse.js";

const router = Router();

// READ (clean on the way out so legacy rows stop causing console CSS errors)
router.get("/", protect, cleanSignatureResponse, mySignatures);
router.get("/:id", protect, cleanSignatureResponse, getSignatureById);

// WRITE (clean on the way in so DB always stays clean)
router.post("/", protect, sanitizeSignatureHtml, createSignature);
router.put("/:id", protect, sanitizeSignatureHtml, updateSignature);
router.delete("/:id", protect, deleteSignature);

export default router;
