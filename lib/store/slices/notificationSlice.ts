import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "@/lib/api/client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  unreadCountExpert: number;
  unreadCountUser: number;
  newNotification: Notification | null;
  incomingBookingRequest: Record<string, any> | null;
  activeBooking: Record<string, any> | null;
  needsRefetch: boolean;
  connected: boolean;
  loading: boolean;
}


const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  unreadCountExpert: 0,
  unreadCountUser: 0,
  newNotification: null,
  incomingBookingRequest: null,
  activeBooking: null,
  needsRefetch: false,
  connected: false,
  loading: false,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async () => {
    return apiClient<Notification[]>("/notifications");
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async () => {
    return apiClient<{ count: number }>("/notifications/unread/count");
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
      state.newNotification = action.payload;
    },
    dismissNewNotification: (state) => {
      state.newNotification = null;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find((n) => n.id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    setIncomingBookingRequest: (state, action: PayloadAction<Record<string, any> | null>) => {
      state.incomingBookingRequest = action.payload;
    },
    clearIncomingBookingRequest: (state) => {
      state.incomingBookingRequest = null;
    },
    setActiveBooking: (state, action: PayloadAction<Record<string, any> | null>) => {
      state.activeBooking = action.payload;
    },
    clearActiveBooking: (state) => {
      state.activeBooking = null;
    },
    triggerRefetch: (state) => {
      state.needsRefetch = !state.needsRefetch; // Toggle to trigger useEffect
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.isRead).length;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      });
  },
});

export const {
  setConnected,
  addNotification,
  dismissNewNotification,
  markAsRead,
  setIncomingBookingRequest,
  clearIncomingBookingRequest,
  setActiveBooking,
  clearActiveBooking,
  triggerRefetch,
} = notificationSlice.actions;

export default notificationSlice.reducer;
