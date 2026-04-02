"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { toggleMute, toggleVideo, endCall, resetCall } from "@/lib/store/slices/callSlice";
import { agoraApi } from "@/lib/api/agora";

export function GlobalCallOverlay() {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { currentCall } = useSelector((state: RootState) => state.call);

    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval: any;
        if (currentCall?.status === "active" && currentCall?.startTime) {
            interval = setInterval(() => {
                setDuration(Math.floor((Date.now() - currentCall.startTime!) / 1000));
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [currentCall?.status, currentCall?.startTime]);

    if (!currentCall || currentCall.status === "idle") return null;

    // Don't show if we are already on the chat page for this booking
    const isMsgPage = pathname === `/chat/${currentCall.bookingId}`;
    if (isMsgPage) return null;

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const rs = s % 60;
        return `${m}:${rs.toString().padStart(2, "0")}`;
    };

    const handleEndCall = async () => {
        // Basic end call logic
        try {
            await agoraApi.rejectCall(currentCall.bookingId);
        } catch { }
        dispatch(endCall());
        setTimeout(() => dispatch(resetCall()), 1500);
    };

    const goToChat = () => {
        router.push(`/chat/${currentCall.bookingId}`);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-4 right-4 z-[90] flex flex-col items-end gap-2"
            >
                <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 p-3 flex items-center gap-4 min-w-[240px]">
                    <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={goToChat}
                    >
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            currentCall.status === "active" ? "bg-green-500" : "bg-amber-500 animate-pulse"
                        )}>
                            {currentCall.callType === "video" ? <Video className="h-5 w-5 text-white" /> : <Phone className="h-5 w-5 text-white" />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white/90 truncate max-w-[120px]">
                                {currentCall.callerName || "Customer"}
                            </p>
                            <p className="text-[10px] text-white/60 font-mono">
                                {currentCall.status === "active" ? formatDuration(duration) : currentCall.status}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => dispatch(toggleMute())}
                            className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                                currentCall.isMuted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
                            )}
                        >
                            {currentCall.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={handleEndCall}
                            className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                        >
                            <PhoneOff className="h-4 w-4" />
                        </button>
                        <button
                            onClick={goToChat}
                            className="h-8 w-8 rounded-full bg-[#1C8AFF] hover:bg-[#1C8AFF]/80 flex items-center justify-center transition-colors ml-1"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
