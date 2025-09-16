import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import signatureReducer from "./slices/signatureSlice";
import templateReducer from "./slices/templateSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    signature: signatureReducer,
    template: templateReducer,
  },
});
