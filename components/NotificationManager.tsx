"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { addNotification, setConnected, fetchUnreadCount, dismissNewNotification, setIncomingBookingRequest } from "@/lib/store/slices/notificationSlice";
import { setIncomingCall, clearIncomingCall, setCallStatus, resetCall } from "@/lib/store/slices/callSlice";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { app, getFirebaseMessaging } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";

export function NotificationManager() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const { currentCall } = useSelector((state: RootState) => state.call);

  const currentCallRef = useRef(currentCall);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      dispatch(setConnected(false));
      return;
    }

    const setupFirebase = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.log("[NotificationManager] Firebase messaging is not supported");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const fcmToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          if (fcmToken) {
            console.log("[NotificationManager] FCM Token acquired, registering with backend");
            await fetch(`${API_BASE_URL}/notifications/device-token`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: fcmToken, platform: "web" }),
            });
            dispatch(setConnected(true));
          }
        }

        dispatch(fetchUnreadCount());

        const handleMessage = (payload: any) => {
          const metadata = payload.data || {};
          let type = metadata.type || "general";
          if (type === "general" && payload.notification?.title?.includes("Incoming")) {
             type = "incoming_call";
          }
          
          const data = {
            ...metadata,
            type,
            title: payload.notification?.title || metadata.title,
            message: payload.notification?.body || metadata.body || metadata.message,
            data: metadata
          };

          const actorId = data.actorId || data.senderId || metadata.actorId || metadata.senderId || metadata.callerUserId || metadata.callerId;

          if (actorId && user?.id && String(actorId) === String(user?.id)) {
            const bookingId = metadata.bookingId || metadata.booking?.id || data.bookingId;
            if (data.type === "incoming_call" && metadata.action === "accepted" && currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
              dispatch(setCallStatus("active"));
            }
            return;
          }

          if (data.type === "incoming_call") {
            const action = metadata.action;
            const bookingId = metadata.bookingId || metadata.booking?.id || data.bookingId || "";
            const callerUserId = metadata.callerUserId || metadata.callerId || data.senderId || data.actorId;

            if (callerUserId && user?.id && String(callerUserId) === String(user?.id)) {
              if (action === "accepted" && currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
                dispatch(setCallStatus("active"));
              }
              return;
            }

            if (action === "ended" || action === "cancelled" || action === "rejected" || action === "missed") {
              dispatch(clearIncomingCall());

              if (currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
                dispatch(setCallStatus("ended"));
                setTimeout(() => dispatch(resetCall()), 2000);
              }
            } else if (action === "accepted") {
              if (currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
                dispatch(setCallStatus("active"));
              }
              dispatch(clearIncomingCall());
            } else {
              const isIdle = !currentCallRef.current || currentCallRef.current.status === "idle";
              const isSameBooking = currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId);

              if (!isSameBooking || isIdle) {
                dispatch(setIncomingCall({
                  bookingId: String(bookingId),
                  sessionId: metadata.sessionId || "",
                  callerName: metadata.callerName || "Customer",
                  callType: (metadata.callType as any) || "audio",
                }));
              }
            }
          }

          dispatch(addNotification(data));

          if (data.type !== "incoming_call" && data.type !== "booking_request") {
            toast(data.title || "New Notification", {
              description: data.message,
              icon: <Bell className="h-4 w-4 text-[#1C8AFF]" />,
              action: {
                label: "View",
                onClick: () => {
                  if (data.type === "new_message") {
                    const bookingId = data.metadata?.bookingId || data.bookingId;
                    if (bookingId) router.push(`/chat/${bookingId}`);
                  }
                },
              },
            });
          } else if (data.type === "booking_request") {
            dispatch(setIncomingBookingRequest({
              bookingRequestId: metadata.bookingRequestId || data.bookingRequestId || data.id,
              serviceName: metadata.serviceName || data.serviceName || "Service Request",
              durationMinutes: metadata.durationMinutes || data.durationMinutes || 30,
              isOnDemand: metadata.isOnDemand || data.isOnDemand || false,
              scheduledStartTime: metadata.scheduledStartTime || data.scheduledStartTime || null
            }));
          }
        };

        const unsubscribe = onMessage(messaging, (payload) => {
          console.log("[NotificationManager] Received FCM message:", payload);
          handleMessage(payload);
        });
        
        const handleSWMessage = (event: MessageEvent) => {
          if (event.data && event.data.type === 'firebase-messaging-sw-message') {
            console.log("[NotificationManager] Received SW message:", event.data.payload);
            handleMessage(event.data.payload);
          }
        };
        
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', handleSWMessage);
        }

        return () => {
           unsubscribe();
           if ('serviceWorker' in navigator) {
             navigator.serviceWorker.removeEventListener('message', handleSWMessage);
           }
        };
      } catch (err) {
        console.error("[NotificationManager] Setup failed:", err);
      }
    };

    let unsubscribePromise = setupFirebase();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      dispatch(setConnected(false));
    };
  }, [isAuthenticated, token, dispatch, user?.id, router]);

  return null;
}
