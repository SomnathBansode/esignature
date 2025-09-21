import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "../../api/http";

/* ------------------------- helpers: safe LS parsing ------------------------ */
const readJSON = (key, fallback = null) => {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const readBool = (key, fallback = true) => {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/* ------------------------------ fast hydrate ------------------------------ */
const tokenFromStorage = localStorage.getItem("token") || null;
const userFromStorage = readJSON("user", null);

const initialIsAdminMode = (() => {
  // default true for admins, false for non-admins, fallback true if unknown
  if (userFromStorage?.role === "admin") {
    return readBool("isAdminMode", true);
  }
  if (userFromStorage) return false;
  return readBool("isAdminMode", true);
})();

/* --------------------------------- thunks --------------------------------- */
export const fetchProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue({ message: "No token", status: 0 });
      const res = await http.get(`/api/users/profile`);
      return res.data;
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        "Failed to fetch profile. Please check your connection.";
      const status = err?.response?.status ?? 0;
      // if server says 401, also purge the token proactively
      if (status === 401 || status === 403) localStorage.removeItem("token");
      return rejectWithValue({ message, status });
    }
  }
);

export const register = createAsyncThunk(
  "user/register",
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await http.post(`/api/auth/register`, {
        name,
        email,
        password,
      });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "admin") {
        const savedMode = localStorage.getItem("isAdminMode");
        localStorage.setItem(
          "isAdminMode",
          savedMode !== null ? savedMode : "true"
        );
      } else {
        localStorage.setItem("isAdminMode", "false");
      }
      return user;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.error ||
          "Registration failed. Please check your connection."
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  "user/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await http.post(`/api/auth/login`, { email, password });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "admin") {
        const savedMode = localStorage.getItem("isAdminMode");
        localStorage.setItem(
          "isAdminMode",
          savedMode !== null ? savedMode : "true"
        );
      } else {
        localStorage.setItem("isAdminMode", "false");
      }
      return user;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.error ||
          "Invalid credentials or server unreachable."
      );
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "user/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const res = await http.post(`/api/auth/forgot-password`, { email });
      return res.data.message || "Password reset link sent to your email!";
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to send reset link."
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  "user/resetPassword",
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const res = await http.post(`/api/auth/reset-password`, {
        token,
        newPassword,
      });
      return res.data.message || "Password reset successfully!";
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.error || "Failed to reset password."
      );
    }
  }
);

/* ---------------------------------- slice --------------------------------- */
const userSlice = createSlice({
  name: "user",
  initialState: {
    token: tokenFromStorage,
    user: userFromStorage,
    loading: false,
    error: null,
    successMessage: null,
    isAdminMode: initialIsAdminMode,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.error = null;
      state.successMessage = null;
      state.isAdminMode = true;
      state.loading = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAdminMode");
    },
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    toggleAdminMode: (state) => {
      if (state.user?.role === "admin") {
        state.isAdminMode = !state.isAdminMode;
        localStorage.setItem("isAdminMode", JSON.stringify(state.isAdminMode));
      }
    },
    setAdminMode: (state, action) => {
      if (state.user?.role === "admin") {
        state.isAdminMode = action.payload;
        localStorage.setItem("isAdminMode", JSON.stringify(action.payload));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProfile
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        localStorage.setItem("user", JSON.stringify(action.payload));
        // keep token as-is; isAdminMode only meaningful for admins
        if (action.payload?.role !== "admin") {
          state.isAdminMode = false;
          localStorage.setItem("isAdminMode", "false");
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        const status = action.payload?.status;
        const msg = action.payload?.message;
        if (status === 401 || status === 403) {
          // hard auth failure → clean
          state.user = null;
          state.token = null;
          state.isAdminMode = true;
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("isAdminMode");
        } else if (msg !== "No token") {
          state.error = msg || "Failed to fetch profile";
        }
      })

      // register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.token = localStorage.getItem("token");
        state.isAdminMode =
          action.payload.role === "admin"
            ? readBool("isAdminMode", true)
            : false;
        state.loading = false;
        state.successMessage = "Registration successful! Welcome!";
      })
      .addCase(register.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.token = localStorage.getItem("token");
        state.isAdminMode =
          action.payload.role === "admin"
            ? readBool("isAdminMode", true)
            : false;
        state.loading = false;
        state.successMessage = "Login successful! Welcome back!";
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // forgot / reset
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const { logout, clearMessages, toggleAdminMode, setAdminMode } =
  userSlice.actions;
export default userSlice.reducer;
