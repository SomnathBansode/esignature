import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice.js";
import templateReducer from "./slices/templateSlice.js";

export const store = configureStore({
  reducer: {
    user: userReducer,
    templates: templateReducer,
  },
});
