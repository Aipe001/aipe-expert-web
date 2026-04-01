"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, EarningsStats } from "@/lib/api/expert";
import {
  getExpertBookingRequests,
  getExpertBookings,
  acceptBookingRequest,
  rejectBookingRequest,
  BookingRequest,
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
  Star,
  Power,
  Video,
  FileText,
  Calendar,
  CheckCircle2,
  Users,
  Wallet,
  ChevronRight,
  IndianRupee,
  TrendingUp,
  Clock,
  CalendarCheck,
  Bell,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, reqRes, bookRes] = await Promise.allSettled([
        expertApi.getEarningsStats(),
        getExpertBookingRequests(),
        getExpertBookings(),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (reqRes.status === "fulfilled") setRequests(reqRes.value);
      if (bookRes.status === "fulfilled") setBookings(bookRes.value);
    } catch (err) {
      console.error("Dashboard data fetch failed", err);
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

  const pendingRequests = requests.filter(
    (r) => r.status.toLowerCase() === "pending",
  );

  // Compute counts from real data
  const activeCount = bookings.filter((b) => b.status === "active").length;
  const requestedCount = pendingRequests.length;
  const upcomingCount = bookings.filter((b) => b.status === "confirmed" || b.status === "upcoming").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await acceptBookingRequest(id);
      toast.success("Booking request accepted!");
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAvailability = async () => {
    setIsToggleLoading(true);
    try {
      const res = await expertApi.toggleAvailability();
      setIsOnline(res.isAvailable);
    } catch (err: unknown) {
      // Keep error console for debugging, but remove user toast as requested
      console.error("Toggle availability failed", err);
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActionLoading(rejectingId);
    try {
      await rejectBookingRequest(rejectingId, rejectReason || undefined);
      toast.success("Booking request rejected");
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectReason("");
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto space-y-8 pb-10"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome <span className="text-[#1C8AFF]">&quot;{user?.firstName || "Expert"}&quot;</span>
        </h1>
      </motion.div>

      {/* Notification Banner */}
      {pendingRequests.length > 0 && (
        <motion.div variants={itemVariants}>
          <Link href="/bookings?tab=requested">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-2 rounded-full bg-amber-100">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  You have {pendingRequests.length} pending booking request{pendingRequests.length > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-amber-700">Tap to review and respond</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Top Row: Rating & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <Link href="/ratings" className="block h-full">
            <Card className="h-full border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                    <span className="text-2xl font-bold">
                      {loading ? <Skeleton className="h-8 w-12" /> : (stats?.rating?.toFixed(1) || "0.0")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card
            className={cn(
              "h-full border-none shadow-sm transition-all cursor-pointer overflow-hidden relative",
              isOnline ? "bg-[#1C8AFF]/5 ring-1 ring-[#1C8AFF]/20" : "bg-background",
              isToggleLoading && "opacity-80 pointer-events-none"
            )}
            onClick={handleToggleAvailability}
          >
            {/* Pulsing Backdrop Glow */}
            {isOnline && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.4, 0.7, 0.4],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-linear-to-br from-[#1C8AFF]/30 via-[#1C8AFF]/5 to-transparent pointer-events-none blur-xl"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-[#1C8AFF]/10 pointer-events-none"
                />
              </>
            )}

            <CardContent className="p-5 flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: isOnline ? [1, 1.1, 1] : 1,
                      opacity: isOnline ? 1 : 0.6
                    }}
                    transition={{ repeat: isOnline ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                    className={cn(
                      "p-1 rounded-full",
                      isOnline ? "text-[#1C8AFF] drop-shadow-[0_0_12px_rgba(28,138,255,0.7)]" : "text-muted-foreground"
                    )}
                  >
                    {isToggleLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-[#1C8AFF]" />
                    ) : (
                      <Power className="h-6 w-6" />
                    )}
                  </motion.div>
                  <span className="text-lg font-bold tracking-tight uppercase">
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? "Visible to customers" : "Not visible"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bookings Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Bookings</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BookingCard
            title="Active"
            count={activeCount}
            loading={loading}
            icon={<Video className="h-6 w-6 text-[#1C8AFF]" />}
            iconBg="bg-blue-50"
            href="/bookings?tab=active"
          />
          <BookingCard
            title="Requested"
            count={requestedCount}
            loading={loading}
            icon={<FileText className="h-6 w-6 text-yellow-500" />}
            iconBg="bg-yellow-50"
            href="/bookings?tab=requested"
          />
          <BookingCard
            title="Upcoming"
            count={upcomingCount}
            loading={loading}
            icon={<Calendar className="h-6 w-6 text-purple-600" />}
            iconBg="bg-purple-50"
            href="/bookings?tab=upcoming"
          />
          <BookingCard
            title="Completed"
            count={completedCount}
            loading={loading}
            icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
            iconBg="bg-green-50"
            href="/bookings?tab=completed"
          />
        </div>
      </motion.div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Pending Requests</h2>
          <div className="space-y-3">
            {pendingRequests.slice(0, 3).map((req) => (
              <Card key={req.id} className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{req.service?.name || "Service Request"}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Customer: {req.customer ? `${req.customer.firstName} ${req.customer.lastName}` : "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                      {req.customerNotes && (
                        <p className="text-sm text-muted-foreground mt-1.5 italic">&quot;{req.customerNotes}&quot;</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        disabled={actionLoading === req.id}
                        onClick={() => {
                          setRejectingId(req.id);
                          setRejectDialogOpen(true);
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#1C8AFF] hover:bg-[#1C8AFF]/90"
                        disabled={actionLoading === req.id}
                        onClick={() => handleAccept(req.id)}
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Accept"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pendingRequests.length > 3 && (
              <Link href="/bookings?tab=requested">
                <Button variant="ghost" className="w-full text-[#1C8AFF]">
                  View all {pendingRequests.length} requests <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <SummaryCard
            title="Total Service Completed"
            value={completedCount.toString()}
            loading={loading}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-50"
            href="/bookings?tab=completed"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <SummaryCard
            title="Total Earning"
            value={`₹${stats?.totalEarnings?.toLocaleString() || "0"}`}
            loading={loading}
            icon={<Wallet className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-50"
            href="/earnings"
          />
        </motion.div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Booking Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading === rejectingId}
              >
                {actionLoading === rejectingId ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function BookingCard({ title, count, loading, icon, iconBg, href }: { title: string, count: number, loading: boolean, icon: React.ReactNode, iconBg: string, href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className={cn("p-2 rounded-lg", iconBg)}>
              {icon}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-10 w-16" /> : count.toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SummaryCard({ title, value, loading, icon, iconBg, href }: { title: string, value: string, loading: boolean, icon: React.ReactNode, iconBg: string, href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="border-none shadow-sm hover:shadow-md transition-shadow group">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("p-2.5 rounded-full", iconBg)}>
              {icon}
            </div>
            <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">
              {loading ? <Skeleton className="h-7 w-12" /> : value}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
