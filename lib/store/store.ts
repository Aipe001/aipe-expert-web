import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import notificationSlice from "./slices/notificationSlice";
import callReducer from "./slices/callSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationSlice,
    call: callReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
