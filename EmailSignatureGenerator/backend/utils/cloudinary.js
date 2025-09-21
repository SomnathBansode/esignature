import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  sign_algorithm: process.env.CLOUDINARY_SIGN_ALGORITHM || "sha1", // Default to SHA-1, override with SHA-256 if set
});

export default cloudinary;
