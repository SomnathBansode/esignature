// backend/routes/templateRoutes.js
import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getTemplates,
  getTemplateById,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController.js";

const router = Router();

router.get("/", getTemplates); // Fetch all templates
router.post("/", protect, adminOnly, addTemplate); // Admin: Add new template
router.put("/:id", protect, adminOnly, updateTemplate); // Admin: Update a template
router.delete("/:id", protect, adminOnly, deleteTemplate); // Admin: Delete a template
router.get("/:id", getTemplateById);
export default router;
