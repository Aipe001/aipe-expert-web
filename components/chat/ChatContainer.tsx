"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { getBookingById, updateBookingStatus, addBookingTimeline, Booking } from "@/lib/api/bookings";
import { agoraApi, ChatMessage, ParticipantStatus } from "@/lib/api/agora";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  initiateCall,
  setIncomingCall,
  setCallStatus,
  updateCallDetails,
  toggleMute,
  toggleVideo,
  toggleSpeaker,
  toggleScreenSharing,
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
  Loader2,
  RefreshCcw,
  Check,
  CheckCheck,
  Send,
  Download,
  FileText,
  Monitor,
  MonitorOff,
  ChevronRight,
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

const STATUS_OPTIONS = [
  "Document Requested",
  "Document Received",
  "Document Under Review",
  "Resubmit Documents",
  "Submitted to Gov. Dept",
  "Waiting From Gov. Department",
  "Approved",
  "Accepted",
  "Rejected",
  "Service Completed",
];

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
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { audioTrack, videoTrack, screenTrack, client } = getGlobalTracks();

      if (currentCall.callType === "video") {
        // Local rendering: Screen track takes priority if sharing
        if (currentCall.isScreenSharing && screenTrack && localVideoRef.current) {
          screenTrack.play(localVideoRef.current);
        } else if (currentCall.isVideoEnabled && videoTrack && localVideoRef.current) {
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
  }, [currentCall?.status, currentCall?.isVideoEnabled, currentCall?.isScreenSharing, currentCall?.remoteUid, currentCall?.remoteVideoVersion, currentCall?.isLocalStreamActive]);

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
      const [bookingData, messagesData, pStatus] = await Promise.allSettled([
        getBookingById(bookingId),
        agoraApi.getMessages(bookingId),
        agoraApi.getParticipantStatus(bookingId),
      ]);

      if (bookingData.status === "fulfilled") setBooking(bookingData.value);
      if (messagesData.status === "fulfilled") {
        setMessages(messagesData.value);
      }
      if (pStatus.status === "fulfilled") {
        setParticipantStatus(pStatus.value);
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
        
        agoraApi.getParticipantStatus(bookingId).then(setParticipantStatus).catch(() => {});
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

  const handleStatusUpdate = async (status: string) => {
    if (!bookingId || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      // Differentiate between status update and timeline tracking
      const coreStatuses = ["active", "completed", "cancelled"];
      const isCoreStatus = coreStatuses.includes(status.toLowerCase().replace(/ /g, "_"));

      if (isCoreStatus) {
        await updateBookingStatus(bookingId, status.toLowerCase().replace(/ /g, "_"));
        toast.success(`Status updated to "${status}"`);
      } else {
        // Timeline tracking update
        await addBookingTimeline(bookingId, status);
        toast.success(`Tracking updated: "${status}"`);
      }

      setIsStatusOpen(false);
      // Refresh booking data
      const updatedBooking = await getBookingById(bookingId);
      setBooking(updatedBooking);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update tracking");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const normalizeStatus = (value?: string) => (value || "").toLowerCase().replace(/_/g, " ").trim();

  const getStatusSteps = (status: string, timelineTitles: string[] = []) => {
    const normalizedStatus = normalizeStatus(status);
    const timelineSet = new Set(timelineTitles.map((title) => normalizeStatus(title)));
    const hasTimelineStatus = (title: string) => timelineSet.has(normalizeStatus(title));

    const isDocumentRequested = hasTimelineStatus("Document Requested") || normalizedStatus !== "pending payment";
    const isDocumentReceived =
      hasTimelineStatus("Document Received") ||
      hasTimelineStatus("Document Under Review") ||
      normalizedStatus === "active" ||
      normalizedStatus === "completed";
    const isUnderReview =
      hasTimelineStatus("Document Under Review") ||
      normalizedStatus === "active" ||
      normalizedStatus === "completed";
    const isCompleted = normalizedStatus === "completed" || hasTimelineStatus("Service Completed");

    return [
      { label: "Document Requested", completed: isDocumentRequested },
      { label: "Document Received", completed: isDocumentReceived },
      { label: "Under Review", completed: isUnderReview },
      { label: "Completed", completed: isCompleted },
    ];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    setIsUploading(true);
    const tempId = `temp_attach_${Date.now()}`;
    const isImage = file.type.startsWith('image/');
    const optimisticMsg: ChatMessage = {
      id: tempId,
      bookingId,
      senderId: user?.id || '',
      content: file.name,
      messageType: isImage ? 'image' : 'document',
      createdAt: new Date().toISOString(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const saved = await agoraApi.uploadAttachment(bookingId, file);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  const statusSteps = getStatusSteps(
    booking?.status || "",
    (booking?.timeline || []).map((entry: any) => entry.title)
  );

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
    <div className="flex h-full bg-[#F8FAFC]">
      {/* Left Chat Main Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors lg:hidden"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div className="h-10 w-10 rounded-full bg-[#1C8AFF]/10 flex items-center justify-center text-[#1C8AFF] font-bold">
              {getParticipantName() ? getParticipantName()[0] : "C"}
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 line-clamp-1">{getParticipantName()}</h1>
              <p className="text-[10px] text-slate-500 font-medium">#{booking?.bookingNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Current Status</span>
              <span className={cn(
                "text-xs font-bold capitalize",
                booking?.status === "active" ? "text-green-600" :
                booking?.status === "completed" ? "text-blue-600" : "text-amber-600"
              )}>
                {booking?.status || "Active"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => !isInCall && handleStartCall("audio")}
                disabled={isInCall}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300",
                  "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm"
                )}
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                onClick={() => !isInCall && handleStartCall("video")}
                disabled={isInCall}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300",
                  "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm"
                )}
              >
                <Video className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      {/* Booking Progress */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-800">Booking Timeline</h2>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Expert is Active
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {statusSteps.map((step, index) => (
            <div
              key={step.label}
              className={cn(
                "rounded-xl border px-3 py-3 transition-colors",
                step.completed
                  ? "border-blue-200 bg-blue-50/70"
                  : "border-slate-200 bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
                    step.completed
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-300 bg-white text-slate-500"
                  )}
                >
                  {step.completed ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-[11px] font-semibold",
                    step.completed ? "text-blue-700" : "text-slate-600"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
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
                        <button
                          onClick={() => dispatch(toggleScreenSharing())}
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                            currentCall?.isScreenSharing ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]" : "bg-white/20 hover:bg-white/30"
                          )}
                          title={currentCall?.isScreenSharing ? "Stop Sharing" : "Share Screen"}
                        >
                          {currentCall?.isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
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
                {(currentCall?.isVideoEnabled || currentCall?.isScreenSharing) && (
                  <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-slate-800">
                    {currentCall?.isScreenSharing && (
                      <div className="absolute inset-0 z-10 bg-blue-600/20 flex items-center justify-center">
                        <Monitor className="h-4 w-4 text-white animate-pulse" />
                      </div>
                    )}
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
              {/* Image attachment */}
              {msg.messageType === 'image' && msg.fileUrl ? (
                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName || 'Image'}
                    className="max-w-[240px] max-h-[180px] rounded-lg object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <p className={cn(
                    "text-xs truncate mt-1",
                    isMyMessage(msg) ? "text-blue-100" : "text-slate-400"
                  )}>{msg.fileName || 'Image'}</p>
                </a>
              ) : msg.messageType === 'document' && msg.fileUrl ? (
                /* Document attachment card */
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl transition-colors",
                    isMyMessage(msg)
                      ? "bg-white/15 hover:bg-white/25"
                      : "bg-slate-50 hover:bg-slate-100 border border-slate-100"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    isMyMessage(msg) ? "bg-white/20" : "bg-indigo-50"
                  )}>
                    <FileText className={cn(
                      "h-5 w-5",
                      isMyMessage(msg) ? "text-white" : "text-indigo-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isMyMessage(msg) ? "text-white" : "text-slate-800"
                    )}>{msg.fileName || 'File'}</p>
                    {msg.fileSize && (
                      <p className={cn(
                        "text-[10px]",
                        isMyMessage(msg) ? "text-blue-200" : "text-slate-400"
                      )}>{formatFileSize(msg.fileSize)}</p>
                    )}
                  </div>
                  <Download className={cn(
                    "h-4 w-4 shrink-0",
                    isMyMessage(msg) ? "text-white/70" : "text-indigo-400"
                  )} />
                </a>
              ) : (
                /* Normal text message */
                <>{msg.content}</>
              )}
              <div className={cn(
                "flex flex-row items-center justify-end gap-1 mt-1 -mb-1",
                isMyMessage(msg) ? "text-blue-100" : "text-slate-400"
              )}>
                <div className="text-[10px] font-medium text-right">
                  {formatTime(msg.createdAt)}
                </div>
                {isMyMessage(msg) && (
                  msg.isRead ? 
                    <CheckCheck className="w-3.5 h-3.5 text-blue-200" /> : 
                    <Check className="w-3.5 h-3.5 text-blue-200/70" />
                )}
              </div>
            </div>
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
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#1C8AFF]" />
              ) : (
                <Paperclip
                  className="h-5 w-5 cursor-pointer hover:text-[#1C8AFF] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                />
              )}
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
      </div>

      {/* Right Sidebar - Status Timeline Tracking */}
      <div className="w-80 hidden xl:flex flex-col border-l border-slate-200 bg-white/80 backdrop-blur-sm overflow-hidden shrink-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#1C8AFF]/10 to-white p-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tracking</h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">Live service updates</p>
          </div>
          <button
            onClick={() => setIsStatusOpen(true)}
            className="mt-4 w-full rounded-xl bg-[#1C8AFF] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1675de]"
          >
            Post New Update
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-200" />
            
            <div className="space-y-4">
              {/* Core Status: Created */}
              <div className="relative rounded-xl border border-slate-200 bg-white p-3 pl-10 shadow-sm">
                <div className="absolute left-3 top-4 h-6 w-6 rounded-full bg-emerald-100 border-4 border-white flex items-center justify-center z-10 shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Booking Started</h3>
                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                    {booking ? new Date(booking.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              </div>

              {/* Dynamic Timeline Entries */}
              {(booking?.timeline || []).slice().reverse().map((entry: any, idx: number) => (
                <div key={entry.id} className="group relative rounded-xl border border-slate-200 bg-white p-3 pl-10 shadow-sm transition-all hover:border-blue-200 hover:shadow">
                  <div className={cn(
                    "absolute left-3 top-4 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110",
                    idx === 0 ? "bg-[#1C8AFF]" : "bg-slate-200"
                  )}>
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      idx === 0 ? "bg-white animate-pulse" : "bg-white"
                    )} />
                  </div>
                  <div>
                    <h3 className={cn(
                      "text-xs font-semibold",
                      idx === 0 ? "text-[#1C8AFF]" : "text-slate-700"
                    )}>{entry.title}</h3>
                    {entry.description && (
                      <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{entry.description}</p>
                    )}
                    <p className="mt-2 text-[9px] font-medium text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {/* Core Status: If Completed */}
              {booking?.status === "completed" && (
                <div className="relative rounded-xl border border-blue-100 bg-blue-50 p-3 pl-10 shadow-sm">
                  <div className="absolute left-3 top-4 h-6 w-6 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center z-10 shadow-sm">
                    <Check className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-blue-700">Service Completed</h3>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {booking.completedAt ? new Date(booking.completedAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info Section */}
        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Service Details</h3>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                <Monitor className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-[11px] font-semibold text-slate-700">{booking?.service?.name || booking?.bookAnExpert?.name}</p>
                <p className="text-[9px] text-slate-500">Service Module</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[9px] uppercase tracking-wide text-slate-400">Date</p>
                <p className="text-[11px] font-semibold text-slate-700">
                  {booking ? new Date(booking.scheduledAt).toLocaleDateString("en-IN") : "-"}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wide text-slate-400">Time</p>
                <p className="text-[11px] font-semibold text-slate-700">
                  {booking ? new Date(booking.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Select Status Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Select Status</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                disabled={updatingStatus}
                onClick={() => handleStatusUpdate(status)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b last:border-0 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-sm font-medium",
                    booking?.status === status ? "text-[#1C8AFF]" : "text-slate-700"
                  )}>{status}</span>
                  {booking?.status === status && <Check className="h-3.5 w-3.5 text-[#1C8AFF]" />}
                </div>
                {updatingStatus && booking?.status !== status ? null : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                {updatingStatus && booking?.status === status && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1C8AFF]" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
