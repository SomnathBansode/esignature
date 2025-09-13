// backend/routes/uploadRoutes.js
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import cloudinary from "../utils/cloudinary.js";
import crypto from "crypto";
const r = Router();

r.get("/sign", protect, (_req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp },
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
});

export default r;
