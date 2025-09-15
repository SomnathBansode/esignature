import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const tokenFromStorage = localStorage.getItem("token") || null;

// Fetch user profile
export const fetchProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return res.data;
    } catch (err) {
      console.error("fetchProfile error:", err);
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch profile"
      );
    }
  }
);

// Register user
export const register = createAsyncThunk(
  "user/register",
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      return user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Registration failed"
      );
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  "user/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      return user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Invalid credentials"
      );
    }
  }
);

// Forgot password
export const forgotPassword = createAsyncThunk(
  "user/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email,
      });
      return res.data.message || "Password reset link sent to your email!";
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to send reset link"
      );
    }
  }
);

// Reset password
export const resetPassword = createAsyncThunk(
  "user/resetPassword",
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword,
      });
      return res.data.message || "Password reset successfully!";
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to reset password"
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    token: tokenFromStorage,
    user: null,
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.error = null;
      state.successMessage = null;
      localStorage.removeItem("token");
    },
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        console.error("fetchProfile rejected:", action.payload);
        state.user = null;
        state.token = null;
        state.loading = false;
        localStorage.removeItem("token");
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.token = localStorage.getItem("token");
        state.loading = false;
        state.successMessage = "Registration successful! Welcome!";
      })
      .addCase(register.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.token = localStorage.getItem("token");
        state.loading = false;
        state.successMessage = "Login successful! Welcome back!";
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
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

export const { logout, clearMessages } = userSlice.actions;
export default userSlice.reducer;
