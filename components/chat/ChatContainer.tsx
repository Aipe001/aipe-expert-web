"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { getBookingById, Booking } from "@/lib/api/bookings";
import { agoraApi, ChatMessage, AgoraSession } from "@/lib/api/agora";
import {
  ChevronLeft,
  User,
  Phone,
  Video,
  Paperclip,
  Camera,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Volume2,
  Send,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ChatContainerProps {
  bookingId: string;
  joined?: boolean;
  incomingCallType?: "audio" | "video" | null;
}

type CallState = "idle" | "connecting" | "ringing" | "active" | "ended";
type CallType = "audio" | "video";

export function ChatContainer({ bookingId, joined, incomingCallType }: ChatContainerProps) {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  // Chat state
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>((incomingCallType as CallType) || "audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [agoraSession, setAgoraSession] = useState<AgoraSession | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCallPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Agora Web SDK refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agoraClientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localAudioTrackRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localVideoTrackRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load booking and messages
  useEffect(() => {
    if (bookingId) {
      loadBookingAndMessages();
      startPolling();
      // Check for an existing/incoming call (e.g. after accepting from IncomingCallModal)
      checkExistingCall(joined ? 1 : 0);
    }
    return () => {
      stopPolling();
      stopCallTimer();
      stopCallPoll();
      leaveAgoraChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, joined]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Active call status polling — detect if remote side ended the call
  useEffect(() => {
    if (callState === "active" && bookingId) {
      activeCallPollRef.current = setInterval(async () => {
        try {
          const { status } = await agoraApi.getCallStatus(bookingId);
          if (status === "ended" || status === "none") {
            stopCallTimer();
            leaveAgoraChannel();
            setCallState("ended");
            setTimeout(() => resetCallState(), 1500);
          }
        } catch {
          // ignore
        }
      }, 3000);

      // Safety: if no remote user joins within 15s, end call
      const noRemoteTimeout = setTimeout(() => {
        setRemoteUid((current) => {
          if (current === null && callState === "active") {
            console.log("[Call] No remote user after 15s — ending call");
            stopCallTimer();
            leaveAgoraChannel();
            setCallState("ended");
            setTimeout(() => resetCallState(), 1500);
          }
          return current;
        });
      }, 15000);

      return () => {
        if (activeCallPollRef.current) {
          clearInterval(activeCallPollRef.current);
          activeCallPollRef.current = null;
        }
        clearTimeout(noRemoteTimeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, bookingId]);

  // ── Check for existing / just-accepted call ───────────
  const checkExistingCall = async (retries = 0) => {
    try {
      const result = await agoraApi.getCallStatus(bookingId);
      if (result.status === "active" && result.session) {
        setAgoraSession(result.session);
        const type = (result.session.sessionType === "video" ? "video" : "audio") as CallType;
        setCallType(type);
        setIsVideoEnabled(type === "video");
        setCallState("active");
        startCallTimer();
        if (result.token && result.channelName && result.appId != null) {
          try {
            await joinAgoraChannel(result.appId, result.channelName, result.token, result.uid ?? 0, type === "video");
          } catch (joinErr) {
            console.error("Auto-join failed:", joinErr);
            handleEndCall();
          }
        }
        return;
      }
      if (result.status === "waiting" && result.session && retries < 5) {
        setTimeout(() => checkExistingCall(retries + 1), 1500);
        return;
      }
    } catch {
      // ignore
    }
    if (retries > 0 && retries < 5) {
      setTimeout(() => checkExistingCall(retries + 1), 1500);
    }
  };

  // ── Chat Functions ──────────────────────────────────

  const loadBookingAndMessages = async () => {
    try {
      setLoading(true);
      const [bookingData, messagesData] = await Promise.allSettled([
        getBookingById(bookingId),
        agoraApi.getMessages(bookingId),
      ]);

      if (bookingData.status === "fulfilled") setBooking(bookingData.value);
      if (messagesData.status === "fulfilled") {
        setMessages(messagesData.value);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const current = messagesRef.current;
        const lastMsg = current.length > 0 ? current[current.length - 1] : null;
        const newMessages = await agoraApi.getMessages(bookingId, lastMsg?.createdAt);
        if (newMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const unique = newMessages.filter((m) => !existingIds.has(m.id));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
        }
      } catch {
        // Silently handle
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending || !bookingId) return;

    setSending(true);
    setInputText("");

    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      bookingId,
      senderId: user?.id || "",
      content: text,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const saved = await agoraApi.sendMessage(bookingId, text);
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? saved : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, bookingId, user]);

  // ── Agora Functions ─────────────────────────────

  const joinAgoraChannel = async (appId: string, channel: string, token: string, uid: number, isVideo: boolean) => {
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      client.on("user-published", async (remoteUser: any, mediaType: "audio" | "video") => {
        await client.subscribe(remoteUser, mediaType);
        setRemoteUid(remoteUser.uid);

        if (mediaType === "video" && remoteVideoRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (remoteUser as any).videoTrack?.play(remoteVideoRef.current);
        }
        if (mediaType === "audio") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (remoteUser as any).audioTrack?.play();
        }
      });

      client.on("user-unpublished", () => {
        // Remote user stopped publishing
      });

      client.on("user-left", () => {
        handleEndCall();
      });

      await client.join(appId, channel, token, uid);

      // Create local tracks
      let audioTrack;
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      } catch (e: any) {
        if (e.message?.includes("getUserMedia") || e.code === "NOT_SUPPORTED") {
          toast.error("Browser doesn't support microphone access. Please ensure you're on a secure origin (HTTPS or localhost).");
        } else {
          toast.error(`Microphone error: ${e.message || "Could not access device"}`);
        }
        throw e;
      }
      localAudioTrackRef.current = audioTrack;

      if (isVideo) {
        let videoTrack;
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack();
        } catch (e: any) {
          toast.error(`Camera error: ${e.message || "Could not access camera"}`);
          throw e;
        }
        localVideoTrackRef.current = videoTrack;
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }
        await client.publish([audioTrack, videoTrack]);
      } else {
        await client.publish([audioTrack]);
      }

      console.log("[Agora Web] Joined channel:", channel);
    } catch (err) {
      console.error("[Agora Web] Failed to join:", err);
    }
  };

  const leaveAgoraChannel = async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
      }
    } catch (err) {
      console.error("[Agora Web] Failed to leave:", err);
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const stopCallPoll = () => {
    if (callPollRef.current) {
      clearInterval(callPollRef.current);
      callPollRef.current = null;
    }
  };

  const resetCallState = () => {
    setCallState("idle");
    setIsMuted(false);
    setIsSpeaker(false);
    setIsVideoEnabled(true);
    setCallDuration(0);
    setRemoteUid(null);
    setAgoraSession(null);
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCall = async (type: CallType) => {
    if (!bookingId || callState !== "idle") return;

    try {
      setCallType(type);
      setIsVideoEnabled(type === "video");
      setCallState("connecting");

      const result = await agoraApi.initiateCall(bookingId, type);
      if (!result?.id) throw new Error("Failed to create call session");

      setAgoraSession(result);
      setCallState("ringing");

      const { token, channelName, appId, uid } = result;

      // Poll for call acceptance
      callPollRef.current = setInterval(async () => {
        try {
          const pollResult = await agoraApi.getCallStatus(bookingId);
          if (pollResult.status === "active") {
            stopCallPoll();
            setCallState("active");
            startCallTimer();
            if (token && channelName && appId) {
              try {
                await joinAgoraChannel(appId, channelName, token, uid ?? 0, type === "video");
              } catch (joinErr) {
                console.error("Start call join failed:", joinErr);
                handleEndCall();
              }
            }
          } else if (pollResult.status === "ended" || pollResult.status === "none") {
            stopCallPoll();
            setCallState("ended");
            setTimeout(() => resetCallState(), 1500);
          }
        } catch {
          // ignore
        }
      }, 2000);

      // Timeout after 30s
      setTimeout(() => {
        if (callPollRef.current) {
          stopCallPoll();
          setCallState((prev) => {
            if (prev === "ringing") {
              agoraApi.rejectCall(bookingId).catch(() => {});
              setTimeout(() => resetCallState(), 1500);
              return "ended";
            }
            return prev;
          });
        }
      }, 30000);
    } catch (err) {
      console.error("Failed to start call:", err);
      setCallState("idle");
    }
  };

  const handleEndCall = async () => {
    stopCallTimer();
    stopCallPoll();
    setCallState("ended");
    await leaveAgoraChannel();

    if (agoraSession) {
      try {
        await agoraApi.endSession(agoraSession.id);
      } catch {
        // Silent
      }
    }

    setTimeout(() => resetCallState(), 1500);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.setEnabled(prev);
      }
      return !prev;
    });
  };

  const toggleVideo = () => {
    if (localVideoTrackRef.current) {
      const newState = !isVideoEnabled;
      localVideoTrackRef.current.setEnabled(newState);
      setIsVideoEnabled(newState);
    }
  };

  // ── Helpers ─────────────────────────────────────────

  const getParticipantName = () => {
    if (!booking) return "Customer";
    const customer = booking.user;
    if (customer?.firstName) {
      return `${customer.firstName} ${customer.lastName || ""}`.trim();
    }
    return "Customer";
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === user?.id;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isInCall = callState !== "idle";
  const isVideoCall = callType === "video";
  const isCallActive = callState === "active";

  const handleBack = () => {
    router.push("/chat");
  };

  if (loading) {
    return (
      <div className="flex flex-col h-dvh lg:h-[calc(100vh-2px)] bg-[#F4F7F9] overflow-hidden">
        <header className="bg-[#1C8AFF] text-white px-4 py-3 flex items-center gap-3 shrink-0 pt-6 md:pt-4">
          <Skeleton className="h-10 w-10 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-10 rounded-full bg-white/20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32 bg-white/20" />
            <Skeleton className="h-3 w-24 bg-white/20" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh lg:h-[calc(100vh-2px)] bg-[#F4F7F9] overflow-hidden">
      {/* Header */}
      <header className="bg-[#1C8AFF] text-white px-4 py-3 flex items-center gap-3 shrink-0 pt-6 md:pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-white hover:bg-white/10 -ml-2 h-10 w-10"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5px]" />
        </Button>

        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <User className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{getParticipantName()}</h2>
          <p className="text-xs text-white/80">
            {booking?.service?.name || "Consultation"} · #{booking?.bookingNumber}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => !isInCall && handleStartCall("audio")}
            disabled={isInCall}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-colors",
              isInCall ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
            )}
          >
            <Phone className="h-5 w-5 fill-white text-white" />
          </button>
          <button
            onClick={() => !isInCall && handleStartCall("video")}
            disabled={isInCall}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-colors",
              isInCall ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/20 hover:bg-white/30"
            )}
          >
            <Video className="h-5 w-5 fill-white text-white" />
          </button>
        </div>
      </header>

      {/* Service Info Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-900">
            <span className="text-slate-500 font-normal">Service : </span>
            {booking?.service?.name || "Consultation"}
          </p>
          <p className="text-sm font-medium text-slate-900">
            <span className="text-slate-500 font-normal">Booked on : </span>
            {booking?.scheduledAt ? new Date(booking.scheduledAt).toLocaleDateString() : "N/A"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Status</p>
          <p className={cn(
            "text-sm font-bold capitalize",
            booking?.status === "active" ? "text-green-600" :
            booking?.status === "completed" ? "text-blue-600" : "text-amber-600"
          )}>
            {booking?.status || "Active"}
          </p>
        </div>
      </div>

      {/* Call Banner */}
      <AnimatePresence>
        {isInCall && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900 text-white shrink-0 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={
                    callState === "connecting" || callState === "ringing"
                      ? { scale: [1, 1.15, 1] }
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    isCallActive ? "bg-green-500" : "bg-amber-500"
                  )}
                >
                  {isVideoCall ? (
                    <Video className="h-5 w-5 text-white" />
                  ) : (
                    <Phone className="h-5 w-5 text-white" />
                  )}
                </motion.div>
                <div>
                  <p className="font-bold text-sm">{getParticipantName()}</p>
                  <p className="text-xs text-white/60">
                    {callState === "connecting" && `Connecting${isVideoCall ? " video" : ""}...`}
                    {callState === "ringing" && `Ringing${isVideoCall ? " (Video)" : ""}...`}
                    {callState === "active" && `${isVideoCall ? "📹 " : ""}${formatCallDuration(callDuration)}`}
                    {callState === "ended" && "Call ended"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCallActive && (
                  <>
                    {isVideoCall && (
                      <button
                        onClick={toggleVideo}
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                          !isVideoEnabled ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
                        )}
                      >
                        {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={toggleMute}
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                        isMuted ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
                      )}
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </>
                )}
                <button
                  onClick={handleEndCall}
                  className="h-9 w-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Video area during active video call */}
            {isVideoCall && isCallActive && (
              <div className="relative w-full aspect-video bg-black max-h-[40vh]">
                {/* Remote video */}
                <div ref={remoteVideoRef} className="w-full h-full">
                  {remoteUid === null && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                      <Video className="h-12 w-12 mb-2" />
                      <p className="text-sm">Waiting for video...</p>
                    </div>
                  )}
                </div>
                {/* Local video (PIP) */}
                {isVideoEnabled && (
                  <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-slate-800">
                    <div ref={localVideoRef} className="w-full h-full" />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "max-w-[85%] md:max-w-[70%]",
              isMyMessage(msg) ? "ml-auto" : "mr-auto"
            )}
          >
            <div
              className={cn(
                "p-3 rounded-2xl text-sm shadow-sm",
                isMyMessage(msg)
                  ? "bg-[#1C8AFF] text-white rounded-tr-none"
                  : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
              )}
            >
              {msg.content}
            </div>
            <p className={cn(
              "text-[10px] mt-1 px-1",
              isMyMessage(msg) ? "text-right text-slate-400" : "text-slate-400"
            )}>
              {formatTime(msg.createdAt)}
            </p>
          </motion.div>
        ))}

        {messages.length === 0 && (
          <div className="pt-4 flex flex-col items-center justify-center text-center opacity-40 h-full">
            <div className="h-10 w-10 rounded-full bg-slate-200/50 flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Start the conversation</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <footer className="p-4 bg-transparent shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 bg-white rounded-full border border-slate-200 shadow-sm flex items-center px-4 py-1 h-12 group focus-within:shadow-[0_0_20px_rgba(28,138,255,0.3)] focus-within:border-[#1C8AFF]/30 transition-all duration-300">
            <Input
              placeholder="Message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="border-none shadow-none focus-visible:ring-0 bg-transparent text-slate-700 placeholder:text-slate-400 h-10 px-0"
            />
            <div className="flex items-center gap-3 text-slate-400 pl-2">
              <Paperclip className="h-5 w-5 cursor-pointer hover:text-[#1C8AFF] transition-colors" />
              <Camera className="h-5 w-5 cursor-pointer hover:text-[#1C8AFF] transition-colors" />
            </div>
          </div>

          {inputText.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending}
              className="h-12 w-12 rounded-full bg-[#1C8AFF] flex items-center justify-center cursor-pointer hover:bg-[#1C8AFF]/90 transition-colors shrink-0"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </button>
          ) : (
            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors shrink-0">
              <Mic className="h-6 w-6 text-slate-600" />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
