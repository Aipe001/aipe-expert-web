"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { clearActiveBooking } from "@/lib/store/slices/notificationSlice";
import { useRouter } from "next/navigation";
import { Clock, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function BookingActiveModal() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { activeBooking } = useSelector((state: RootState) => state.notifications);

  const dismiss = () => {
    dispatch(clearActiveBooking());
  };

  const handleJoin = () => {
    if (!activeBooking) return;
    const bookingId = activeBooking.bookingId || activeBooking.id;
    router.push(`/chat?id=${bookingId}`);
    dismiss();
  };

  if (!activeBooking) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 50, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 50, scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative"
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-[#1C8AFF] to-[#0A5EB0] p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent opacity-20 animate-pulse" />
            </div>

            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-xl relative z-10">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
            <h2 className="text-white text-2xl font-bold tracking-tight mb-1 relative z-10">Booking is Now Active!</h2>
            <p className="text-blue-100/80 font-medium text-sm relative z-10">Your scheduled consultation has started</p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="bg-[#1C8AFF]/5 p-4 rounded-2xl border border-[#1C8AFF]/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1C8AFF] flex items-center justify-center shrink-0 border border-blue-200">
                <Clock className="text-white w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Order Number</p>
                <h3 className="text-slate-800 font-bold text-[15px] truncate mb-1">
                  {activeBooking.bookingNumber || "AIPE-CONSULTATION"}
                </h3>
              </div>
            </div>

            <p className="text-slate-500 text-center text-sm px-4">
              The customer is waiting for you in the chat room. Please join now to avoid any delays.
            </p>
          </div>

          {/* Actions Footer */}
          <div className="p-6 pt-2 flex gap-4 border-t border-slate-100 bg-white">
            <Button
              onClick={dismiss}
              variant="outline"
              className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-12"
            >
              <X className="w-4 h-4" />
              Dismiss
            </Button>
            <Button
              onClick={handleJoin}
              className="flex-1 rounded-xl bg-[#1C8AFF] hover:bg-blue-700 text-white gap-2 h-12 border-blue-600 shadow-lg shadow-blue-500/20"
            >
              <Play className="w-4 h-4 fill-white" />
              View Bookings
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
