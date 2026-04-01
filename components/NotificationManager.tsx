"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { addNotification, setConnected, fetchUnreadCount } from "@/lib/store/slices/notificationSlice";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

export function NotificationManager() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const connectSSE = () => {
      // Basic SSE implementation. If the backend needs custom headers, we might need a fetch-based reader fallback.
      // But standard EventSource works with query params for auth sometimes, or standard cookies.
      // Since mobile app uses fetch based SSE, web might need standard EventSource.
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const sseUrl = `${baseUrl}/notifications/sse?token=${token}`;

      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log("[SSE] Connected");
        dispatch(setConnected(true));
        reconnectAttemptRef.current = 0;
        dispatch(fetchUnreadCount());
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "heartbeat" || data.type === "connected") return;

          dispatch(addNotification(data));
          
          // Show toast
          toast(data.title || "New Notification", {
            description: data.message,
            icon: <Bell className="h-4 w-4 text-[#1C8AFF]" />,
            action: {
              label: "View",
              onClick: () => {
                if (data.type === "booking_request") {
                  router.push("/bookings?tab=requested");
                } else if (data.type === "new_message") {
                  const bookingId = data.metadata?.bookingId || data.bookingId;
                  if (bookingId) router.push(`/chat/${bookingId}`);
                }
              },
            },
          });
        } catch (err) {
          console.warn("[SSE] Parse error:", err);
        }
      };

      es.onerror = (err) => {
        console.error("[SSE] Error:", err);
        es.close();
        dispatch(setConnected(false));
        
        // Exponential backoff reconnect
        const ms = Math.min(30000, Math.pow(2, reconnectAttemptRef.current) * 1000);
        reconnectAttemptRef.current += 1;
        setTimeout(connectSSE, ms);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, token, dispatch, router]);

  return null; // Side effect only component
}
