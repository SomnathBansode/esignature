import axios from "axios";
import { store } from "../redux/store";
import { logout } from "../redux/slices/userSlice";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // withCredentials: false  // enable if your API uses cookies
});

// Attach token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Throttle 401-triggered logouts to avoid loops
let throttled = false;
http.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 && !throttled) {
      throttled = true;
      store.dispatch(logout());
      setTimeout(() => (throttled = false), 300);
    }
    return Promise.reject(err);
  }
);
