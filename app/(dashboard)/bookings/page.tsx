"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  getExpertBookingRequests,
  getExpertBookings,
  acceptBookingRequest,
  rejectBookingRequest,
  BookingRequest,
  Booking,
} from "@/lib/api/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarCheck,
  Clock,
  Check,
  X,
  Loader2,
  User,
  FileText,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "accepted":
    case "confirmed":
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "";
  }
}

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, bookRes] = await Promise.allSettled([
        getExpertBookingRequests(),
        getExpertBookings(),
      ]);

      if (reqRes.status === "fulfilled") setRequests(reqRes.value);
      if (bookRes.status === "fulfilled") setBookings(bookRes.value);
    } catch {
      // Silently fail
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

  const pendingRequests = requests.filter(
    (r) => r.status.toLowerCase() === "pending",
  );
  const pastRequests = requests.filter(
    (r) => r.status.toLowerCase() !== "pending",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">
          Manage incoming requests and your accepted bookings.
        </p>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="h-4 w-4" />
            Incoming Requests
            {pendingRequests.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px]">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            Accepted Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {req.customer?.firstName} {req.customer?.lastName}
                          </p>
                          <Badge
                            variant="secondary"
                            className={statusColor(req.status)}
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {req.service?.name || "Service"} &middot;{" "}
                          {req.serviceType.replace("_", " ")}
                        </p>
                        {req.customerNotes && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {req.customerNotes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Received{" "}
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
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium">No pending requests</p>
                <p className="text-sm">
                  New booking requests from customers will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {pastRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Past Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pastRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.customer?.firstName} {req.customer?.lastName}{" "}
                          &mdash; {req.service?.name || "Service"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={statusColor(req.status)}
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            #{booking.bookingNumber}
                          </p>
                          <Badge
                            variant="secondary"
                            className={statusColor(booking.status)}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.service?.name || "Service"} &middot;{" "}
                          {booking.user?.firstName} {booking.user?.lastName}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />₹
                            {booking.totalAmount?.toLocaleString()}
                          </span>
                          <span>
                            {new Date(booking.scheduledAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm">
                  Accept incoming requests to see your bookings here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
