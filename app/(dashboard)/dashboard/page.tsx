"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, EarningsStats, Transaction } from "@/lib/api/expert";
import {
  getExpertBookingRequests,
  acceptBookingRequest,
  rejectBookingRequest,
  BookingRequest,
} from "@/lib/api/bookings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IndianRupee,
  TrendingUp,
  Star,
  CalendarCheck,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Clock,
  Check,
  X,
  Loader2,
  User,
  FileText,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await getExpertBookingRequests();
      setRequests(res);
    } catch {
      // API may not be ready
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, txRes] = await Promise.allSettled([
          expertApi.getEarningsStats(),
          expertApi.getTransactions(),
        ]);

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (txRes.status === "fulfilled") setTransactions(txRes.value);
      } catch {
        // Stats may not be implemented yet
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchRequests();
  }, [isAuthenticated, router, fetchRequests]);

  const pendingRequests = requests.filter(
    (r) => r.status.toLowerCase() === "pending",
  );

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await acceptBookingRequest(id);
      toast.success("Booking request accepted!");
      await fetchRequests();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept request",
      );
    } finally {
      setActionLoading(null);
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
      await fetchRequests();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject request",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = [
    {
      title: "Total Earnings",
      value: stats?.totalEarnings !== undefined ? `₹${stats.totalEarnings.toLocaleString()}` : "₹0",
      description: "Lifetime earnings",
      icon: IndianRupee,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "This Month",
      value: stats?.monthlyEarnings !== undefined ? `₹${stats.monthlyEarnings.toLocaleString()}` : "₹0",
      description: "Current month",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Pending Payout",
      value: stats?.pendingPayout !== undefined ? `₹${stats.pendingPayout.toLocaleString()}` : "₹0",
      description: "Awaiting transfer",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Consultations",
      value: stats?.completedConsultations?.toString() || "0",
      description: "Completed",
      icon: CalendarCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Rating",
      value: stats?.rating ? `${stats.rating.toFixed(1)}/5` : "N/A",
      description: `${stats?.totalReviews || 0} reviews`,
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.firstName || "Expert"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your earnings and activity.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incoming Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Incoming Requests
              {pendingRequests.length > 0 && (
                <Badge className="ml-1">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              New booking requests awaiting your response.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link href="/bookings">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate">
                      {req.customer?.firstName} {req.customer?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.service?.name || "Service"}{" "}
                      <span className="text-muted-foreground/60">&middot;</span>{" "}
                      {req.serviceType.replace("_", " ")}
                    </p>
                    {req.customerNotes && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <FileText className="h-3 w-3 shrink-0" />
                        {req.customerNotes}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70">
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.id)}
                      disabled={actionLoading === req.id}
                    >
                      {actionLoading === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setRejectingId(req.id);
                        setRejectDialogOpen(true);
                      }}
                      disabled={actionLoading === req.id}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              {pendingRequests.length > 5 && (
                <div className="pt-2 text-center">
                  <Button variant="link" asChild>
                    <Link href="/bookings">
                      +{pendingRequests.length - 5} more requests
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Inbox className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No pending requests</p>
              <p className="text-xs">
                New booking requests from customers will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <CardDescription>
            Your latest earnings and withdrawal activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.type === "earning"
                        ? "bg-green-50 text-green-600"
                        : tx.type === "withdrawal"
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {tx.type === "earning" ? (
                      <ArrowDownRight className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "earning"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.type === "earning" ? "+" : "-"}₹
                      {tx.amount.toLocaleString()}
                    </p>
                    <Badge
                      variant={
                        tx.status === "completed"
                          ? "default"
                          : tx.status === "pending"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <IndianRupee className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm">
                Your earnings and withdrawals will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingId(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === rejectingId}
            >
              {actionLoading === rejectingId && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
