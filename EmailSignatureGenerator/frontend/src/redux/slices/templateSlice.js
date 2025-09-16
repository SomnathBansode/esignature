import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Fetch all templates
export const fetchTemplates = createAsyncThunk(
  "template/fetchTemplates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const {
        user: { token },
      } = getState();
      const response = await axios.get(`${API_URL}/api/admin/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch templates"
      );
    }
  }
);

// Add a template
export const addTemplate = createAsyncThunk(
  "template/addTemplate",
  async (templateData, { getState, rejectWithValue }) => {
    try {
      const {
        user: { token },
      } = getState();
      const response = await axios.post(
        `${API_URL}/api/admin/templates`,
        templateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to add template"
      );
    }
  }
);

// Update a template
export const updateTemplate = createAsyncThunk(
  "template/updateTemplate",
  async ({ id, ...templateData }, { getState, rejectWithValue }) => {
    try {
      const {
        user: { token },
      } = getState();
      const response = await axios.put(
        `${API_URL}/api/admin/templates/${id}`,
        templateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to update template"
      );
    }
  }
);

// Delete a template
export const deleteTemplate = createAsyncThunk(
  "template/deleteTemplate",
  async (id, { getState, rejectWithValue }) => {
    try {
      const {
        user: { token },
      } = getState();
      await axios.delete(`${API_URL}/api/admin/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to delete template"
      );
    }
  }
);

const templateSlice = createSlice({
  name: "template",
  initialState: {
    templates: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearTemplateError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
        state.loading = false;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
        state.loading = false;
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.map((t) =>
          t.id === action.payload.id ? action.payload : t
        );
        state.loading = false;
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(deleteTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter(
          (t) => t.id !== action.payload
        );
        state.loading = false;
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const { clearTemplateError } = templateSlice.actions;
export default templateSlice.reducer;
