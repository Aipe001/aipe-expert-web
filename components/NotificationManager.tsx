"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { addNotification, setConnected, fetchUnreadCount, dismissNewNotification, setIncomingBookingRequest, setActiveBooking, triggerRefetch } from "@/lib/store/slices/notificationSlice";
import { setIncomingCall, clearIncomingCall, setCallStatus, resetCall } from "@/lib/store/slices/callSlice";
import { toast } from "sonner";
import { Bell, MessageSquare } from "lucide-react";
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
          console.warn("[NotificationManager] Firebase messaging is not supported. This is likely because the site is not running on localhost or via HTTPS (Secure Context required).");
          return;
        }

        console.log("[NotificationManager] Firebase messaging supported, requesting permission...");
        const permission = await Notification.requestPermission();
        console.log("[NotificationManager] Notification permission status:", permission);

        if (permission === 'granted') {
          const fcmToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BOytKcvfv4dQb3jHJUkwjn0gw9IH888lGLI3Xzda1s9U86qqmyG4DJ77QVkFnC-tQE5VImxzXDeE4jzmOpUpmdg",
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

        const playNotificationSound = () => {
          try {
            const audio = new Audio("/message.mp3");
            audio.play().catch(err => {
              // Browser might block audio if user hasn't interacted with the page
              console.warn("[NotificationManager] Could not play notification sound:", err.message);
            });
          } catch (err) {
            console.error("[NotificationManager] Error playing notification sound:", err);
          }
        };

        const handleMessage = (payload: any) => {
          const metadata = payload.data || {};
          let type = metadata.type || "general";
          if (type === "general" && payload.notification?.title?.includes("Incoming")) {
            type = "incoming_call";
          }

          const data = {
            ...metadata,
            type,
            title: payload.notification?.title || (metadata as any).title,
            message: payload.notification?.body || (metadata as any).body || (metadata as any).message,
            data: metadata
          };

          // Play sound for all notifications except calls
          const isCallRelated = data.type === "incoming_call" ||
            data.type === "call_ended" ||
            data.type === "call_cancelled" ||
            data.type === "call_rejected" ||
            data.type === "call_missed";

          if (!isCallRelated) {
            playNotificationSound();
          }

          // Use metadata directly for dynamic property searching to avoid TS errors
          const m = metadata as any;
          const actorId = m.actorId || m.senderId || m.callerUserId || m.callerId;

          if (actorId && user?.id && String(actorId) === String(user?.id)) {
            const bookingId = m.bookingId || (m.booking && m.booking.id) || m.booking_id;
            if (data.type === "incoming_call" && m.action === "accepted" && currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
              dispatch(setCallStatus("active"));
            }
            return;
          }

          if (data.type === "incoming_call") {
            const action = m.action;
            const bookingId = m.bookingId || (m.booking && m.booking.id) || m.booking_id || "";
            const callerUserId = m.callerUserId || m.callerId || m.senderId || m.actorId;

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
                  sessionId: m.sessionId || "",
                  callerName: m.callerName || "Customer",
                  callType: (m.callType as any) || "audio",
                }));
              }
            }
          } else if (data.type === "call_ended" || data.type === "call_cancelled" || data.type === "call_rejected") {
            const bookingId = m.bookingId || (m.booking && m.booking.id) || m.booking_id || "";

            // Always clear incoming call
            dispatch(clearIncomingCall());

            if (currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
              dispatch(setCallStatus("ended"));
              setTimeout(() => dispatch(resetCall()), 2000);
            }
          }

          dispatch(addNotification({
            id: m.notificationId || Math.random().toString(36).substr(2, 9),
            type: data.type as any,
            title: data.title || "New Notification",
            message: data.message || "",
            data: metadata,
            isRead: false,
            createdAt: new Date().toISOString()
          } as any));

          // Trigger refetch for any booking-related events
          if (data.type === "booking_request" || data.type === "booking_active" || data.type === "booking_accepted" || data.type === "booking_completed") {
            dispatch(triggerRefetch());
          }

          if (data.type !== "incoming_call" && data.type !== "booking_request" && data.type !== "booking_active") {
            toast(data.title || "New Notification", {
              description: data.message,
              icon: data.type === "new_message" ? <MessageSquare className="h-4 w-4 text-[#1C8AFF]" /> : <Bell className="h-4 w-4 text-[#1C8AFF]" />,
              action: data.type === "new_message" ? {
                label: "View Chat",
                onClick: () => {
                  const bookingId = m.bookingId || data.bookingId;
                  if (bookingId) router.push(`/chat/${bookingId}`);
                },
              } : undefined,
            });
          } else if (data.type === "booking_request") {
            // Show toast for new booking update
            toast.info("New Booking Update", {
              description: data.message || "A new order is available in your area.",
              icon: <Bell className="h-4 w-4 text-[#1C8AFF]" />,
            });

            dispatch(setIncomingBookingRequest({
              bookingRequestId: m.bookingRequestId || data.bookingRequestId || data.id,
              serviceName: m.productName || m.serviceName || data.serviceName || "Service Request",
              durationMinutes: m.durationMinutes || data.durationMinutes || 30,
              isOnDemand: m.isOnDemand || data.isOnDemand || false,
              scheduledStartTime: m.scheduledStartTime || data.scheduledStartTime || null
            }));
          } else if (data.type === "booking_active") {
            dispatch(setActiveBooking({
              bookingId: m.bookingId || data.bookingId,
              bookingNumber: m.bookingNumber || data.bookingNumber,
              title: data.title,
              message: data.message
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
