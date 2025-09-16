import { Router } from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateById,
} from "../controllers/templateController.js";
import { adminStats } from "../controllers/signatureController.js";
import {
  getUsers,
  updateUser,
  deleteUser,
  logAdminModeSwitch,
} from "../controllers/userController.js";

const router = Router();

// Admin routes
router.get("/stats", protect, adminOnly, adminStats);
router.get("/templates", protect, adminOnly, getTemplates);
router.get("/templates/:id", protect, adminOnly, getTemplateById);
router.post("/templates", protect, adminOnly, addTemplate);
router.put("/templates/:id", protect, adminOnly, updateTemplate);
router.delete("/templates/:id", protect, adminOnly, deleteTemplate);
router.get("/users", protect, adminOnly, getUsers);
router.put("/users/:id", protect, adminOnly, updateUser);
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.post("/log-admin-mode", protect, adminOnly, logAdminModeSwitch);

export default router;
