// backend/routes/authRoutes.js
import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const r = Router();
r.post("/register", register);
r.post("/login", login);
r.post("/forgot-password", forgotPassword); // Forgot password route
r.post("/reset-password", resetPassword); // Reset password route

export default r;
