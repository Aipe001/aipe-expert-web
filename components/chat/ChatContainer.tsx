"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { getBookingById, Booking } from "@/lib/api/bookings";
import { agoraApi, ChatMessage } from "@/lib/api/agora";
import {
  initiateCall,
  setIncomingCall,
  setCallStatus,
  updateCallDetails,
  toggleMute,
  toggleVideo,
  toggleSpeaker,
  endCall,
  resetCall,
  CallType,
  CallState,
} from "@/lib/store/slices/callSlice";
import { getGlobalTracks } from "./CallManager";
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
  VolumeX,
  Send,
  Loader2,
  RefreshCcw,
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

export function ChatContainer({ bookingId, joined, incomingCallType }: ChatContainerProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentCall, incomingCall } = useSelector((state: RootState) => state.call);

  // Chat state
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Local tracks/duration
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load booking and messages
  useEffect(() => {
    if (bookingId) {
      loadBookingAndMessages();
      startPolling();
      // Check for an existing/incoming call session from server
      checkExistingCall();
    }
    return () => {
      stopPolling();
      stopCallTimer();
      stopCallPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  // Handle Call Timer
  useEffect(() => {
    if (currentCall?.status === "active" && currentCall?.startTime) {
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - currentCall.startTime!) / 1000));
        }, 1000);
      }
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [currentCall?.status, currentCall?.startTime]);

  // Handle Video Rendering
  useEffect(() => {
    if (currentCall?.status === "active") {
      const { audioTrack, videoTrack, client } = getGlobalTracks();

      if (currentCall.callType === "video") {
        if (currentCall.isVideoEnabled && videoTrack && localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        // Handle remote video
        if (client) {
          const remoteUsers = client.remoteUsers;
          const remoteUser = remoteUsers.find((u: any) => u.uid === currentCall.remoteUid);
          if (remoteUser && remoteUser.videoTrack && remoteVideoRef.current) {
            remoteUser.videoTrack.play(remoteVideoRef.current);
          }
        }
      }
    }
  }, [currentCall?.status, currentCall?.isVideoEnabled, currentCall?.remoteUid, currentCall?.isLocalStreamActive]);

  const checkExistingCall = async () => {
    try {
      const result = await agoraApi.getCallStatus(bookingId);
      if (result.status === "active" && result.session) {
        // If we are already in this call in Redux, ignore
        if (currentCall?.bookingId === bookingId && currentCall.status === "active") return;

        dispatch(updateCallDetails({
          bookingId,
          callType: (result.session.sessionType === "video" ? "video" : "audio") as CallType,
          status: "active",
          agoraAppId: result.appId || undefined,
          agoraToken: result.token || undefined,
          agoraChannel: result.channelName || undefined,
          agoraUid: result.uid || undefined,
          callerName: getParticipantName(),
          startTime: Date.now(), // Estimate or sync from server if available
        }));
      } else if (result.status === "waiting" && result.session && result.session.callerUserId !== user?.id) {
        // There is an incoming call waiting for us
        dispatch(setIncomingCall({
          bookingId,
          callerName: getParticipantName(),
          callType: (result.session.sessionType === "video" ? "video" : "audio") as CallType,
          sessionId: result.session.id,
        }));
      }
    } catch (err) {
      console.error("Check existing call error:", err);
    }
  };

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

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCall = async (type: CallType) => {
    if (!bookingId || (currentCall && currentCall.status !== "idle")) return;

    try {
      // Check if there's an incoming call for this booking that we should accept instead
      const statusCheck = await agoraApi.getCallStatus(bookingId);

      if (statusCheck.status === "waiting" && statusCheck.session && statusCheck.session.callerUserId !== user?.id) {
        toast.info("Answering incoming call...");
        const result = await agoraApi.acceptCall(bookingId);
        if (result) {
          dispatch(updateCallDetails({
            bookingId,
            callType: (result.sessionType === "video" ? "video" : "audio") as CallType,
            status: "active",
            agoraAppId: result.appId,
            agoraToken: result.token,
            agoraChannel: result.channelName,
            agoraUid: result.uid,
            callerName: getParticipantName(),
            startTime: Date.now(),
          }));
          return;
        }
      }

      dispatch(initiateCall({ bookingId, callType: type, callerName: getParticipantName() }));

      const result = await agoraApi.initiateCall(bookingId, type);
      if (!result?.id) throw new Error("Failed to create call session");

      dispatch(updateCallDetails({
        agoraAppId: result.appId,
        agoraToken: result.token,
        agoraChannel: result.channelName,
        agoraUid: result.uid,
        status: "ringing"
      }));

      // Poll for call acceptance
      callPollRef.current = setInterval(async () => {
        try {
          const pollResult = await agoraApi.getCallStatus(bookingId);
          if (pollResult.status === "active") {
            stopCallPoll();
            dispatch(setCallStatus("active"));
          } else if (pollResult.status === "ended" || pollResult.status === "none") {
            stopCallPoll();
            dispatch(setCallStatus("ended"));
            setTimeout(() => dispatch(resetCall()), 1500);
          }
        } catch {
          // ignore
        }
      }, 2000);

      // Timeout after 30s
      setTimeout(() => {
        if (callPollRef.current) {
          stopCallPoll();
          agoraApi.rejectCall(bookingId).catch(() => { });
          dispatch(setCallStatus("ended"));
          setTimeout(() => dispatch(resetCall()), 1500);
        }
      }, 30000);
    } catch (err) {
      console.error("Failed to start call:", err);
      dispatch(resetCall());
      toast.error("Failed to start call");
    }
  };

  const handleEndCall = async () => {
    stopCallTimer();
    stopCallPoll();
    dispatch(setCallStatus("ended"));

    try {
      await agoraApi.rejectCall(bookingId);
    } catch { }

    setTimeout(() => dispatch(resetCall()), 1500);
  };

  const flipCamera = async () => {
    const { videoTrack } = getGlobalTracks();
    if (!videoTrack) return;

    try {
      const devices = await (window as any).AgoraRTC.getCameras();
      if (devices.length > 1) {
        // Find current device and switch to next
        const currentId = videoTrack.getTrackLabel();
        const nextDevice = devices.find((d: any) => d.label !== currentId) || devices[0];
        await videoTrack.setDevice(nextDevice.deviceId);
        toast.success("Switched camera");
      } else {
        toast.info("Only one camera found");
      }
    } catch (err) {
      console.error("Camera flip error:", err);
    }
  };

  const toggleSpeakerMute = () => {
    setIsSpeakerMuted((prev) => {
      const newState = !prev;
      const { client } = getGlobalTracks();
      if (client) {
        client.remoteUsers.forEach((user: any) => {
          if (user.audioTrack) {
            if (newState) user.audioTrack.stop();
            else user.audioTrack.play();
          }
        });
      }
      return newState;
    });
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

  const isInCall = !!(currentCall && currentCall.bookingId === bookingId && currentCall.status !== "idle");
  const isVideoCall = currentCall?.callType === "video";
  const isCallActive = currentCall?.status === "active";

  const handleBack = () => {
    router.push("/chat");
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#F4F7F9] overflow-hidden">
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
    <div className="flex flex-col h-full bg-[#F4F7F9] overflow-hidden">
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
                    currentCall?.status === "connecting" || currentCall?.status === "ringing"
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
                    {currentCall?.status === "connecting" && `Connecting${isVideoCall ? " video" : ""}...`}
                    {currentCall?.status === "ringing" && `Ringing${isVideoCall ? " (Video)" : ""}...`}
                    {currentCall?.status === "active" && `${isVideoCall ? "📹 " : ""}${formatCallDuration(callDuration)}`}
                    {currentCall?.status === "ended" && "Call ended"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCallActive && (
                  <>
                    {isVideoCall && (
                      <>
                        <button
                          onClick={flipCamera}
                          className="h-9 w-9 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors"
                          title="Flip Camera"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => dispatch(toggleVideo())}
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                            !currentCall?.isVideoEnabled ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
                          )}
                        >
                          {currentCall?.isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </button>
                      </>
                    )}
                    <button
                      onClick={toggleSpeakerMute}
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                        isSpeakerMuted ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
                      )}
                    >
                      {isSpeakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => dispatch(toggleMute())}
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                        currentCall?.isMuted ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
                      )}
                    >
                      {currentCall?.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
                  {currentCall?.remoteUid === null && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                      <Video className="h-12 w-12 mb-2" />
                      <p className="text-sm">Waiting for video...</p>
                    </div>
                  )}
                </div>
                {/* Local video (PIP) */}
                {currentCall?.isVideoEnabled && (
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
