// backend/routes/adminRoutes.js
import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController.js";
import { adminStats } from "../controllers/signatureController.js";
import { getUsers } from "../controllers/userController.js";

const router = Router();

// Admin routes
router.get("/stats", protect, adminOnly, adminStats); // Admin: Get stats
router.get("/templates", protect, adminOnly, getTemplates); // Admin: Get templates
router.post("/templates", protect, adminOnly, addTemplate); // Admin: Add template
router.put("/templates/:id", protect, adminOnly, updateTemplate); // Admin: Update template
router.delete("/templates/:id", protect, adminOnly, deleteTemplate); // Admin: Delete template

router.get("/users", protect, adminOnly, getUsers); // Admin: Get all users

export default router;
