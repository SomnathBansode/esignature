import axios from "axios";

// Get a signed payload from your backend
export async function getCloudinarySignature(token) {
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/uploads/cloudinary-signature`,
      { folder: "signatures" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Signature response:", data);
    return data;
  } catch (error) {
    console.error("Failed to get Cloudinary signature:", error);
    throw new Error(error.response?.data?.error || "Failed to get signature");
  }
}

/**
 * Upload using XHR to show progress and avoid global axios interceptors
 */
export async function uploadToCloudinary({ file, token, onProgress }) {
  if (!file) throw new Error("No file provided");

  const sig = await getCloudinarySignature(token);

  const cloudName = sig.cloudName || sig.cloud_name;
  if (!cloudName)
    throw new Error("Missing Cloudinary cloud name from signature");

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const form = new FormData();
  form.append("file", file);

  if (sig.signature && sig.timestamp && sig.apiKey) {
    // Signed flow
    if (sig.folder) form.append("folder", sig.folder);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", sig.timestamp);
    form.append("signature", sig.signature);
    console.log("Uploading with params:", {
      folder: sig.folder,
      timestamp: sig.timestamp,
      signature: sig.signature,
      apiKey: sig.apiKey,
    });
  } else if (sig.upload_preset) {
    // Unsigned flow (fallback, not used in this case)
    form.append("upload_preset", sig.upload_preset);
    if (sig.folder) form.append("folder", sig.folder);
  } else {
    throw new Error("Invalid Cloudinary signature response");
  }

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    // Progress
    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    // Done
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          console.error("Cloudinary upload error:", parsed);
          reject({ response: { data: parsed } });
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
