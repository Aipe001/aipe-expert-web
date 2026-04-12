"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store/store";
import { clearIncomingBookingRequest } from "@/lib/store/slices/notificationSlice";
import { getBookingRequestById, acceptBookingRequest, rejectBookingRequest, BookingRequest } from "@/lib/api/bookings";
import { useRouter } from "next/navigation";
import { Briefcase, Calendar, Clock, X, Check, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BookingRequestModal() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { incomingBookingRequest } = useSelector((state: RootState) => state.notifications);

  const [requestDetails, setRequestDetails] = useState<BookingRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (incomingBookingRequest?.bookingRequestId) {
      setLoading(true);
      setError(false);
      
      // Verify with backend if it's still available
      getBookingRequestById(incomingBookingRequest.bookingRequestId)
        .then((res) => {
          if (res && res.status === "pending") {
            setRequestDetails(res);
          } else {
            // Already processed or not pending
            dispatch(clearIncomingBookingRequest());
          }
        })
        .catch((err) => {
          console.error("Failed to verify booking request:", err);
          // If we fail to load, we can still show a basic error state or just close it
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setRequestDetails(null);
    }
  }, [incomingBookingRequest, dispatch]);

  const dismiss = () => {
    dispatch(clearIncomingBookingRequest());
    setRequestDetails(null);
  };

  const handleAccept = async () => {
    if (!requestDetails || loading) return;
    setLoading(true);
    try {
      await acceptBookingRequest(requestDetails.id);
      toast.success("Order accepted successfully!");
      dismiss();
      router.push("/bookings");
    } catch (err: any) {
      console.error("Failed to accept order:", err);
      toast.error(err?.response?.data?.message || "Failed to accept order. It may have been taken by someone else.");
      dismiss();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestDetails || loading) return;
    setLoading(true);
    try {
      await rejectBookingRequest(requestDetails.id);
      toast.success("Order rejected");
      dismiss();
    } catch (err) {
      dismiss();
    } finally {
      setLoading(false);
    }
  };

  if (!incomingBookingRequest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 50, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 50, scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative"
        >
          {loading && !requestDetails && !error && (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Verifying new order...</p>
            </div>
          )}

          {error && (
            <div className="p-8 flex flex-col items-center text-center">
              <XCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">Unavailable</h3>
              <p className="text-slate-500 mb-6 font-medium">This order is no longer available or has expired.</p>
              <Button onClick={dismiss} className="w-full rounded-xl bg-slate-900 border border-slate-900 text-white">
                Close
              </Button>
            </div>
          )}

          {requestDetails && !error && (
            <>
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  {/* Subtle pattern or grid could go here */}
                </div>
                
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-xl">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-white text-2xl font-bold tracking-tight mb-1">New Order Request</h2>
                <p className="text-blue-100/80 font-medium text-sm">Customer is waiting for an expert</p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                    <span className="text-blue-600 font-bold text-lg">
                      {requestDetails.customer?.firstName?.charAt(0) || "C"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Requested Service</p>
                    <h3 className="text-slate-800 font-bold text-[15px] truncate mb-1">
                      {requestDetails.service?.name || requestDetails.bookAnExpert?.name || "Service Consultation"}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                       <Clock className="w-4 h-4 text-slate-400" />
                       <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Duration</p>
                    </div>
                    <p className="font-bold text-slate-800">{requestDetails.durationMinutes} mins</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                       <Calendar className="w-4 h-4 text-blue-400" />
                       <p className="text-xs text-blue-500 font-semibold tracking-wide uppercase">Schedule</p>
                    </div>
                    <p className="font-bold text-blue-900 truncate">
                      {requestDetails.serviceType === "on_demand" ? "Instant (Now)" : 
                        requestDetails.scheduledStartTime ? new Date(requestDetails.scheduledStartTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "Scheduled"}
                    </p>
                  </div>
                </div>

                {requestDetails.customerNotes && (
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Customer Notes</p>
                     <p className="text-sm text-slate-600 italic">"{requestDetails.customerNotes}"</p>
                   </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-6 pt-2 flex gap-4 border-t border-slate-100 bg-white">
                <Button 
                  onClick={handleReject} 
                  disabled={loading}
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-600 gap-2 h-12"
                >
                  <X className="w-4 h-4" />
                  Decline
                </Button>
                <Button 
                  onClick={handleAccept} 
                  disabled={loading}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 border-blue-600"
                >
                  <Check className="w-4 h-4" />
                  {loading ? "Accepting..." : "Accept Order"}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
