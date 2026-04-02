"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { addNotification, setConnected, fetchUnreadCount, dismissNewNotification } from "@/lib/store/slices/notificationSlice";
import { setIncomingCall, clearIncomingCall, setCallStatus, resetCall } from "@/lib/store/slices/callSlice";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";

export function NotificationManager() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const { currentCall } = useSelector((state: RootState) => state.call);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const currentCallRef = useRef(currentCall);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

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

          // Check for any active call sessions to resume
          const resumeCalls = async () => {
            try {
              // We'll need to know which bookings to check, or a global active check
              // For now, let's assume if there's no global "getActiveSessions" endpoint, 
              // we might not proactively check until the user navigates to a relevant page.
              // But if the server sends an 'incoming_call' when the expert reloads if it's still waiting, 
              // that's one way.
            } catch { }
          };
          resumeCalls();

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
                const metadata = data.data || {};
                const actorId = data.actorId || data.senderId || metadata.actorId || metadata.senderId || metadata.callerUserId || metadata.callerId || metadata.caller_user_id || metadata.caller_id || metadata.actor_id;

                // Ignore ANY notification triggered by ourselves
                if (actorId && user?.id && String(actorId) === String(user.id)) {
                  // Special case: if we see our own call being accepted, update state
                  const bookingId = metadata.bookingId || metadata.booking?.id || data.bookingId;
                  if (data.type === "incoming_call" && metadata.action === "accepted" && currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
                    dispatch(setCallStatus("active"));
                  }
                  return;
                }

                if (data.type === "incoming_call") {
                  const action = metadata.action;
                  const bookingId = metadata.bookingId || metadata.booking?.id || data.bookingId || "";
                  const callerUserId = metadata.callerUserId || metadata.callerId || metadata.caller_user_id || metadata.caller_id || data.senderId || data.actorId;

                  // 1. Ignore if we initiated this call
                  if (callerUserId && user?.id && String(callerUserId) === String(user.id)) {
                    // But if it's accepted, update the call state
                    if (action === "accepted" && currentCallRef.current && String(currentCallRef.current.bookingId) === String(bookingId)) {
                      dispatch(setCallStatus("active"));
                    }
                    return;
                  }

                  if (action === "ended" || action === "cancelled" || action === "rejected" || action === "missed") {
                    // Always clear incoming call for this booking
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
                    // Only show incoming call if we're not already in this specific call
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

                // Show toast for everything except incoming_call
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
