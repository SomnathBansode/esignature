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

const router = Router();

// User routes
router.get("/", protect, mySignatures); // Get all user signatures
router.get("/:id", protect, getSignatureById); // Get signature by ID
router.post("/", protect, createSignature); // Create signature
router.put("/:id", protect, updateSignature); // Update signature
router.delete("/:id", protect, deleteSignature); // Delete signature

export default router;
