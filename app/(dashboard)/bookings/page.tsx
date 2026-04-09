"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  getExpertBookings,
  acceptBookingRequest,
  rejectBookingRequest,
  updateBookingStatus,
  Booking,
} from "@/lib/api/bookings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  MessageCircle,
  Phone,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

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

function BookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const activeTab = searchParams.get("tab") || "active";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusBookingId, setStatusBookingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const bookRes = await getExpertBookings();
      setBookings(bookRes);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    fetchData();
  }, [isAuthenticated, router, fetchData]);

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`/bookings?${params.toString()}`);
  };

  // Categorize bookings
  const activeBookings = bookings.filter((b) => b.expertId && b.status === "active");
  const upcomingBookings = bookings.filter((b) => b.expertId && (b.status === "confirmed" || b.status === "upcoming"));
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const pendingRequests = bookings.filter((b) => !b.expertId);

  const getFilteredData = (): Booking[] => {
    switch (activeTab) {
      case "active": return activeBookings;
      case "upcoming": return upcomingBookings;
      case "completed": return completedBookings;
      case "requested": return pendingRequests;
      default: return activeBookings;
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await acceptBookingRequest(id);
      toast.success("Order accepted!");
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActionLoading(rejectingId);
    try {
      await rejectBookingRequest(rejectingId, rejectReason || undefined);
      toast.success("Order rejected");
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectReason("");
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!statusBookingId) return;
    try {
      await updateBookingStatus(statusBookingId, status);
      toast.success(`Status updated to "${status}"`);
      setIsStatusOpen(false);
      setStatusBookingId(null);
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const getStatusSteps = (status: string) => {
    return [
      { label: "Document Requested", completed: true },
      { label: "Document Received", completed: status !== "pending_payment" },
      { label: "Under Review", completed: status === "completed" || status === "active" },
      { label: "Completed", completed: status === "completed" },
    ];
  };

  const tabs = [
    { id: "active", label: "Active", count: activeBookings.length },
    { id: "upcoming", label: "Upcoming", count: upcomingBookings.length },
    { id: "completed", label: "Completed", count: completedBookings.length },
    { id: "requested", label: "Incoming Orders", count: pendingRequests.length },
  ];

  const filteredData = getFilteredData();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap",
              activeTab === tab.id ? "text-[#1C8AFF]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "ml-1.5 text-xs rounded-full px-1.5 py-0.5",
                activeTab === tab.id ? "bg-[#1C8AFF]/10 text-[#1C8AFF]" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C8AFF]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="border-none shadow-md">
                <CardContent className="p-5 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {filteredData.map((item) => {
                return (
                  <TicketCard
                    key={item.id}
                    booking={item}
                    type={activeTab}
                    actionLoading={actionLoading}
                    statusSteps={getStatusSteps(item.status)}
                    onUpdateStatus={() => {
                      setStatusBookingId(item.id);
                      setIsStatusOpen(true);
                    }}
                    onAccept={() => handleAccept(item.bookingRequestId!)}
                    onReject={() => {
                      setRejectingId(item.bookingRequestId!);
                      setRejectDialogOpen(true);
                    }}
                  />
                );
              })}
              {filteredData.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  No bookings in this category.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Select Status Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Select Status</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors border-b last:border-0"
              >
                <span className="text-sm font-medium">{status}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading === rejectingId}>
                {actionLoading === rejectingId && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketCard({ booking, type, statusSteps, actionLoading, onUpdateStatus, onAccept, onReject }: {
  booking: Booking;
  type: string;
  statusSteps: { label: string; completed: boolean }[];
  actionLoading?: string | null;
  onUpdateStatus: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const customerName = booking.user
    ? `${booking.user.firstName} ${booking.user.lastName}`
    : "Customer";

  return (
    <Card className="border-none shadow-md overflow-hidden bg-white">
      <CardContent className="p-0">
        <div className="p-5 space-y-4">
          {/* Top Line */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Service: {booking.service?.name || booking.bookAnExpert?.name || "Service"}</h3>
              <p className="text-sm text-muted-foreground font-medium">Order ID: {booking.bookingNumber}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Booked on: {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Amount */}
          <div className="text-xl font-bold text-[#1C8AFF]">₹ {booking.totalAmount} /-</div>

          {/* Active: Status Timeline */}
          {type === "active" && (
            <div className="bg-[#1C8AFF]/5 rounded-xl p-4 space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="relative flex justify-between items-center px-2">
                <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-muted-foreground/20 z-0" />
                {statusSteps.map((step, idx) => (
                  <div key={step.label} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 transition-colors duration-500",
                      step.completed ? "bg-[#1C8AFF] border-[#1C8AFF]" : "bg-white border-muted-foreground/30"
                    )} />
                    <span className={cn(
                      "text-[10px] whitespace-nowrap hidden sm:block",
                      step.completed ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={onUpdateStatus}
                  className="text-sm font-bold text-[#1C8AFF] flex items-center gap-1 hover:underline"
                >
                  Update New Status <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upcoming */}
          {type === "upcoming" && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-start gap-4">
                <div className="text-center p-2 bg-muted/30 rounded-lg min-w-20">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> {booking.durationMinutes} Min
                  </p>
                  <p className="text-xs font-bold">
                    {new Date(booking.scheduledAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Link href={`/chat?id=${booking.id}`}>
                <Button className="bg-[#1C8AFF] hover:bg-[#1C8AFF]/90 rounded-xl px-6 py-6 text-base font-bold flex gap-2">
                  Service time {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | Join call <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Completed */}
          {type === "completed" && (
            <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                Request Completed
              </div>
              <div className="text-sm text-green-700 font-medium">
                {booking.completedAt ? `On ${new Date(booking.completedAt).toLocaleDateString()}` : ""}
              </div>
            </div>
          )}

          {/* Requested / Pending Acceptance */}
          {type === "requested" && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10 rounded-xl py-6 font-bold"
                disabled={actionLoading === booking.bookingRequestId}
                onClick={onReject}
              >
                Reject Order
              </Button>
              <Button
                className="flex-1 bg-[#1C8AFF] hover:bg-[#1C8AFF]/90 rounded-xl py-6 font-bold"
                disabled={actionLoading === booking.bookingRequestId}
                onClick={onAccept}
              >
                {actionLoading === booking.bookingRequestId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept Order"}
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 flex justify-between items-center mt-4">
            <p className="text-sm font-semibold">Customer: <span className="font-normal">{customerName}</span></p>
            <div className="flex gap-3">
              <Link href={`/chat?id=${booking.id}`}>
                <button className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </button>
              </Link>
              <Link href={`/chat?id=${booking.id}`}>
                <button className="p-2 rounded-full bg-blue-50 text-[#1C8AFF] hover:bg-blue-100 transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <BookingsContent />
    </Suspense>
  );
}
