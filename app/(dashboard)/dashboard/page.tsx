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
  BookingRequest,
  Booking,
} from "@/lib/api/bookings";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Derived counts
  const requestedCount = requests.filter(r => r.status.toLowerCase() === "pending").length;
  const activeCount = bookings.filter(b => ["started", "in_progress"].includes(b.status.toLowerCase())).length;
  const upcomingCount = bookings.filter(b => ["scheduled", "confirmed"].includes(b.status.toLowerCase())).length;
  const completedCount = stats?.completedConsultations ?? bookings.filter(b => b.status.toLowerCase() === "completed").length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
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

      {/* Top Row: Rating & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <Link href="/dashboard" className="block h-full">
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
              "h-full border-none shadow-sm transition-all cursor-pointer overflow-hidden",
              isOnline ? "bg-[#1C8AFF]/5 ring-1 ring-[#1C8AFF]/20" : "bg-background"
            )}
            onClick={() => setIsOnline(!isOnline)}
          >
            <CardContent className="p-5 flex items-center justify-between">
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
                    <Power className="h-6 w-6" />
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
          {/* Active */}
          <BookingCard 
            title="Active" 
            count={activeCount} 
            loading={loading}
            icon={<Video className="h-6 w-6 text-[#1C8AFF]" />} 
            iconBg="bg-blue-50"
            href="/bookings?tab=active"
          />
          {/* Requested */}
          <BookingCard 
            title="Requested" 
            count={requestedCount} 
            loading={loading}
            icon={<FileText className="h-6 w-6 text-yellow-500" />} 
            iconBg="bg-yellow-50"
            href="/bookings?tab=requested"
          />
          {/* Upcoming */}
          <BookingCard 
            title="Upcoming" 
            count={upcomingCount} 
            loading={loading}
            icon={<Calendar className="h-6 w-6 text-purple-600" />} 
            iconBg="bg-purple-50"
            href="/bookings?tab=upcoming"
          />
          {/* Completed */}
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
