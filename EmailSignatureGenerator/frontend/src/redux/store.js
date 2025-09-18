import { configureStore } from "@reduxjs/toolkit";
import user from "./slices/userSlice";
import signature from "./slices/signatureSlice";
import template from "./slices/templateSlice";

export const store = configureStore({
  reducer: { user, signature, template },
});
