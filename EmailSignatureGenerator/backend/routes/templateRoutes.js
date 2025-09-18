import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import relaxedHtmlGuard from "../middleware/relaxedHtmlGuard.js";
import {
  getTemplates,
  getTemplateById,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController.js";

const router = Router();

// Public reads
router.get("/", getTemplates);
router.get("/:id", getTemplateById);

// Admin writes
router.post("/", protect, adminOnly, relaxedHtmlGuard, addTemplate);
router.put("/:id", protect, adminOnly, relaxedHtmlGuard, updateTemplate);
router.delete("/:id", protect, adminOnly, deleteTemplate);

export default router;
