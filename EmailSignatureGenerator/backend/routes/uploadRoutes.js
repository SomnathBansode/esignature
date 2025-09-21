import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import cloudinary from "../utils/cloudinary.js";

const router = Router();

/**
 * POST /api/uploads/cloudinary-signature
 * Optional body: { folder: "signatures" }
 */
router.post("/cloudinary-signature", protect, (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = req.body?.folder || "signatures";

    // Sign EXACTLY the params you'll send to Cloudinary
    const paramsToSign = { folder, timestamp };
    console.log("Signing params:", paramsToSign);
    console.log(
      "API Secret (first 4 chars):",
      process.env.CLOUDINARY_API_SECRET?.slice(0, 4)
    );

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );
    console.log("Generated signature:", signature);

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      throw new Error("Cloudinary configuration missing");
    }

    res.json({
      timestamp,
      signature,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Signature generation error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate signature" });
  }
});

export default router;
