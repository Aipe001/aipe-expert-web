"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { addNotification, setConnected, fetchUnreadCount } from "@/lib/store/slices/notificationSlice";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";

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
      const sseUrl = `${API_BASE_URL}/notifications/sse`;
      const abortController = new AbortController();

      console.log(`[SSE] Connecting to: ${sseUrl}...`);
      
      const connect = async () => {
        try {
          const response = await fetch(sseUrl, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "text/event-stream",
            },
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          if (!response.body) {
            throw new Error("No response body");
          }

          console.log("[SSE] Connected successfully");
          dispatch(setConnected(true));
          reconnectAttemptRef.current = 0;
          dispatch(fetchUnreadCount());

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

              try {
                const dataStr = trimmedLine.replace(/^data:\s*/, "");
                const data = JSON.parse(dataStr);
                
                if (data.type === "heartbeat" || data.type === "connected") continue;

                dispatch(addNotification(data));
                
                // Show toast for everything except incoming_call (which is handled by IncomingCallModal)
                if (data.type !== "incoming_call") {
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
                }
              } catch (parseErr) {
                console.warn("[SSE] Parse error:", parseErr, trimmedLine);
              }
            }
          }
        } catch (err: unknown) {
          const error = err as Error;
          if (error.name === "AbortError") return;

          console.error(`[SSE] Connection error!`, error);
          dispatch(setConnected(false));
          
          // Exponential backoff reconnect
          const ms = Math.min(30000, Math.pow(2, reconnectAttemptRef.current) * 1000);
          reconnectAttemptRef.current += 1;
          console.log(`[SSE] Reconnecting in ${ms}ms... (Attempt ${reconnectAttemptRef.current})`);
          setTimeout(connect, ms);
        }
      };

      connect();

      return () => {
        abortController.abort();
      };
    };

    const cleanup = connectSSE();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [isAuthenticated, token, dispatch, router]);

  return null; // Side effect only component
}
