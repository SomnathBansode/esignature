// src/utils/api.js
import axios from "axios";

const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5050/api";

export const api = async (path, options = {}) => {
  const { method = "GET", body, headers = {}, token } = options;

  const authToken = token || localStorage.getItem("authToken");
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await axios(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      data: body,
    });

    return response.data;
  } catch (error) {
    console.error("API request error", error);
    throw new Error(
      error?.response?.data?.error || error.message || "Request failed"
    );
  }
};
