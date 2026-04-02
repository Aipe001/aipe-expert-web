"use client";

import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { dismissNewNotification } from "@/lib/store/slices/notificationSlice";
import { agoraApi } from "@/lib/api/agora";
import { useRouter } from "next/navigation";
import { Phone, Video, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface IncomingCallData {
  bookingId: string;
  sessionId: string;
  callerName: string;
  callerUserId: string;
  callType: "audio" | "video";
}

export function IncomingCallModal() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { newNotification } = useSelector((state: RootState) => state.notifications);
  
  const [callData, setCallData] = useState<IncomingCallData | null>(null);
  const [accepting, setAccepting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (newNotification && newNotification.type === "incoming_call") {
      const action = newNotification.metadata?.action;
      if (action === "ended" || action === "cancelled" || action === "rejected") {
        dismiss();
      } else if (action !== "accepted") {
        setCallData({
          bookingId: newNotification.metadata?.bookingId || newNotification.metadata?.booking?.id || "",
          sessionId: newNotification.metadata?.sessionId || "",
          callerName: newNotification.metadata?.callerName || "Customer",
          callerUserId: newNotification.metadata?.callerUserId || "",
          callType: (newNotification.metadata?.callType as "audio" | "video") || "audio",
        });
      }
      // Consume the notification so it isn't processed multiple times
      dispatch(dismissNewNotification());
    }
  }, [newNotification, dispatch]);

  // Handle ringing sound
  useEffect(() => {
    if (callData) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const playRing = () => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
      };

      // Play initially and set interval
      playRing();
      intervalRef.current = setInterval(playRing, 2000);

      // Auto reject/dismiss after 30 seconds
      const timeout = setTimeout(() => {
        handleReject();
      }, 30000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimeout(timeout);
      };
    }
  }, [callData]);

  const stopRinging = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current?.state === "running") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const dismiss = () => {
    stopRinging();
    setCallData(null);
    setAccepting(false);
  };

  const handleAccept = async () => {
    if (!callData || accepting) return;
    setAccepting(true);
    stopRinging();

    try {
      if (callData.bookingId) {
        await agoraApi.acceptCall(callData.bookingId);
      }
      dismiss();
      router.push(`/chat/${callData.bookingId}?joined=1&callType=${callData.callType}`);
    } catch (err: any) {
      console.error("Failed to accept call:", err);
      setAccepting(false);
      toast.error("Failed to accept call. The caller may have ended it.");
      dismiss();
    }
  };

  const handleReject = async () => {
    if (!callData) return;
    stopRinging();
    
    try {
      if (callData.bookingId) {
        await agoraApi.rejectCall(callData.bookingId);
      }
    } catch {
      // Ignore if already ended
    }
    dismiss();
  };

  if (!callData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 100, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 100, scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-[#1A202C] rounded-3xl w-full max-w-sm p-8 flex flex-col items-center shadow-2xl relative overflow-hidden"
        >
          {/* Animated pulse rings */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-48 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.5, 2], opacity: [0.6, 0.2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-[#48BB78]/30"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1.8], opacity: [0.8, 0.4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.4 }}
              className="absolute inset-0 rounded-full bg-[#48BB78]/40"
            />
          </div>

          <div className="w-20 h-20 bg-[#48BB78] rounded-full flex items-center justify-center z-10 mb-6 shadow-[0_0_30px_rgba(72,187,120,0.5)]">
            <motion.div
               animate={{ rotate: [-10, 10, -10, 10, 0] }}
               transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 1 }}
            >
              <Phone className="w-10 h-10 text-white fill-white" />
            </motion.div>
          </div>

          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-[#48BB78] font-black text-xs tracking-[0.2em] mb-2"
          >
            INCOMING CALL
          </motion.p>
          <h2 className="text-white text-3xl font-bold mb-1 text-center">{callData.callerName}</h2>
          <p className="text-white/50 text-sm mb-10 flex items-center gap-2">
            {callData.callType === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {callData.callType === "video" ? "Video Call" : "Audio Call"}
          </p>

          <div className="flex items-center gap-12 w-full justify-center">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleReject}
                className="w-16 h-16 rounded-full bg-[#E53E3E] hover:bg-[#C53030] flex items-center justify-center transition-colors shadow-lg shadow-[#E53E3E]/40"
              >
                <PhoneOff className="w-7 h-7 text-white fill-white" />
              </button>
              <span className="text-[#E53E3E] text-sm font-semibold">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-16 h-16 rounded-full bg-[#48BB78] hover:bg-[#38A169] flex items-center justify-center transition-colors shadow-lg shadow-[#48BB78]/40 disabled:opacity-50"
              >
                <Phone className="w-7 h-7 text-white fill-white animate-pulse" />
              </button>
              <span className="text-[#48BB78] text-sm font-semibold">
                {accepting ? "Connecting..." : "Accept"}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
