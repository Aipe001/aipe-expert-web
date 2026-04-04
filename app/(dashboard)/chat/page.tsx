"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { getExpertBookings, Booking } from "@/lib/api/bookings";
import { agoraApi, ChatMessage } from "@/lib/api/agora";
import { motion } from "framer-motion";
import { User, ChevronRight, Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatContainer } from "@/components/chat/ChatContainer";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const joined = searchParams.get("joined") === "1";
  const callType = searchParams.get("callType") as "audio" | "video" | null;

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    const fetchChats = async () => {
      try {
        const allBookings = await getExpertBookings();
        const chatBookings = allBookings.filter(
          (b) => ["active", "confirmed", "upcoming", "completed"].includes(b.status)
        );
        setBookings(chatBookings);

        const msgPromises = chatBookings.map(async (b) => {
          try {
            const msgs = await agoraApi.getMessages(b.id);
            return { bookingId: b.id, lastMsg: msgs.length > 0 ? msgs[msgs.length - 1] : null };
          } catch {
            return { bookingId: b.id, lastMsg: null };
          }
        });

        const results = await Promise.allSettled(msgPromises);
        const msgMap: Record<string, ChatMessage | null> = {};
        results.forEach((r) => {
          if (r.status === "fulfilled") {
            msgMap[r.value.bookingId] = r.value.lastMsg;
          }
        });
        setLastMessages(msgMap);
      } catch (err) {
        console.error("Failed to load chats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isAuthenticated, router]);

  if (bookingId) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
          <div className="p-4 border-b bg-white flex items-center gap-4">
            <button 
              onClick={() => router.push('/chat')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h2 className="font-bold text-slate-800">Conversation</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatContainer
              bookingId={bookingId}
              joined={joined}
              incomingCallType={callType}
            />
          </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const getCustomerName = (booking: Booking) => {
    if (booking.user?.firstName) {
      return `${booking.user.firstName} ${booking.user.lastName || ""}`.trim();
    }
    return "Customer";
  };

  const getInitials = (booking: Booking) => {
    if (booking.user?.firstName) {
      return `${booking.user.firstName[0]}${booking.user.lastName?.[0] || ""}`;
    }
    return "C";
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-8 px-4 lg:px-0">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Customer Chat</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-5 border-b border-slate-100 last:border-0">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-8 px-4 lg:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Customer Chat</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-bold text-lg text-slate-700">No Active Chats</h3>
          <p className="text-slate-500 mt-1">Your chat conversations with customers will appear here.</p>
        </div>
      ) : (
        <motion.div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {bookings.map((booking, index) => {
            const lastMsg = lastMessages[booking.id];
            return (
              <motion.div key={booking.id} variants={itemVariants}>
                <Link
                  href={`/chat?id=${booking.id}`}
                  className={cn(
                    "flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors group",
                    index !== bookings.length - 1 && "border-b border-slate-100"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {getInitials(booking)}
                    </div>
                    <div className={cn(
                      "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white",
                      booking.status === "active" ? "bg-green-500" : "bg-slate-300"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 truncate group-hover:text-[#1C8AFF] transition-colors">
                        {getCustomerName(booking)}
                      </h3>
                      {lastMsg && (
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {lastMsg?.content || `${booking.service?.name || "Consultation"} · #${booking.bookingNumber}`}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
