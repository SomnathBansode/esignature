import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "../../api/http";

export const fetchTemplates = createAsyncThunk(
  "templates/fetchTemplates",
  async (_, { rejectWithValue }) => {
    try {
      const response = await http.get(`/api/templates`);

      const defaultPlaceholders = [
        "{{user_image}}",
        "{{name}}",
        "{{role}}",
        "{{title}}",
        "{{phone}}",
        "{{website}}",
        "{{linkedin_url}}",
        "{{github_url}}",
      ];

      const validated = response.data.map((t) => {
        try {
          if (
            !Array.isArray(t.placeholders) ||
            !t.placeholders.every((p) => typeof p === "string")
          ) {
            console.warn(
              "fetchTemplates: Invalid placeholders in template",
              t.id,
              t.placeholders
            );
            return { ...t, placeholders: defaultPlaceholders };
          }
          return t;
        } catch (err) {
          console.error("fetchTemplates: Error processing template", t.id, err);
          return { ...t, placeholders: defaultPlaceholders };
        }
      });

      return validated;
    } catch (error) {
      console.error("fetchTemplates: Error:", error);
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch templates"
      );
    }
  }
);

export const addTemplate = createAsyncThunk(
  "template/addTemplate",
  async (templateData, { rejectWithValue }) => {
    try {
      const response = await http.post(`/api/templates`, {
        name: templateData.name,
        thumbnail: templateData.thumbnail || "",
        tokens: templateData.tokens || {},
        html: templateData.html,
        placeholders: templateData.placeholders,
        category: templateData.category || "creative",
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to add template"
      );
    }
  }
);

export const updateTemplate = createAsyncThunk(
  "templates/updateTemplate",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const response = await http.put(`/api/templates/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("updateTemplate: Error:", error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  "templates/deleteTemplate",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`/api/templates/${id}`);
      return id;
    } catch (error) {
      console.error("deleteTemplate: Error:", error);
      return rejectWithValue(error.response?.data?.error || error.message);
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
    clearTemplateError(state) {
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
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.templates.push(action.payload);
      })
      .addCase(addTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.loading = false;
        const i = state.templates.findIndex((t) => t.id === action.payload.id);
        if (i !== -1) state.templates[i] = action.payload;
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = state.templates.filter(
          (t) => t.id !== action.payload
        );
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearTemplateError } = templateSlice.actions;
export default templateSlice.reducer;
