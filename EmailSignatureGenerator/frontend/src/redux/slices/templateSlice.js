import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Async thunk to fetch templates
export const fetchTemplates = createAsyncThunk(
  "templates/fetchTemplates",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get("http://localhost:5000/api/templates"); // backend endpoint
      return response.data; // assume backend returns array of templates
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const templateSlice = createSlice({
  name: "templates",
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch templates";
      });
  },
});

export default templateSlice.reducer;
