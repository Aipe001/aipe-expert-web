"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  MessageCircle,
  Phone,
  Clock,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  service: string;
  orderId: string;
  amount: number;
  customer: string;
  bookedOn: string;
  status: string;
  steps?: string[];
  currentStep?: number;
  serviceTime?: string;
  serviceDate?: string;
  duration?: string;
  completedOn?: string;
}

// Dummy Data
const DUMMY_BOOKINGS: Record<string, Booking[]> = {
  active: [
    {
      id: "a1",
      service: "Company Registration",
      orderId: "123456789",
      amount: 1500,
      customer: "Vikash Chauhan",
      bookedOn: "3/14/2026",
      status: "Document Received",
      steps: ["Document Requested", "Document Received", "Under Review", "Completed"],
      currentStep: 1,
    },
    {
      id: "a2",
      service: "GST Filing",
      orderId: "987654321",
      amount: 800,
      customer: "Rahul Sharma",
      bookedOn: "3/15/2026",
      status: "Document Requested",
      steps: ["Document Requested", "Document Received", "Under Review", "Completed"],
      currentStep: 0,
    }
  ],
  upcoming: [
    {
      id: "u1",
      service: "GST Expert Booking",
      orderId: "123456789",
      amount: 500,
      customer: "Vikash Chauhan",
      bookedOn: "3/14/2026",
      serviceTime: "4:30 PM",
      serviceDate: "3/20/2026",
      duration: "60 Min",
      status: "Upcoming"
    }
  ],
  completed: [
    {
      id: "c1",
      service: "Trademark Registration",
      orderId: "556677889",
      amount: 2500,
      customer: "Amit Patel",
      bookedOn: "3/10/2026",
      completedOn: "3/18/2026",
      status: "Completed"
    }
  ],
  requested: [
    {
      id: "r1",
      service: "Legal Consultation",
      orderId: "112233445",
      amount: 1000,
      customer: "Sanjay Gupta",
      bookedOn: "3/26/2026",
      status: "Requested"
    }
  ]
};

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
  "Service Completed"
];

function BookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "active";
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`/bookings?${params.toString()}`);
  };

  const tabs = [
    { id: "active", label: "Active" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "requested", label: "Requested" },
  ];

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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {DUMMY_BOOKINGS[activeTab]?.map((booking: Booking) => (
              <TicketCard 
                key={booking.id} 
                booking={booking} 
                type={activeTab} 
                onUpdateStatus={() => {
                  setIsStatusOpen(true);
                }}
              />
            ))}
            {!DUMMY_BOOKINGS[activeTab]?.length && (
              <div className="py-20 text-center text-muted-foreground">
                No bookings in this category.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
                onClick={() => setIsStatusOpen(false)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors border-b last:border-0"
              >
                <span className="text-sm font-medium">{status}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketCard({ booking, type, onUpdateStatus }: { booking: Booking, type: string, onUpdateStatus: () => void }) {
  return (
    <Card className="border-none shadow-md overflow-hidden bg-white">
      <CardContent className="p-0">
        <div className="p-5 space-y-4">
          {/* Top Line */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Service: {booking.service}</h3>
              <p className="text-sm text-muted-foreground font-medium">Order ID: {booking.orderId}</p>
            </div>
            <p className="text-xs text-muted-foreground">Booked on: {booking.bookedOn}</p>
          </div>

          {/* Amount */}
          <div className="text-xl font-bold text-[#1C8AFF]">₹ {booking.amount} /-</div>

          {/* Mode Specific Content */}
          {type === "active" && booking.steps && (
            <div className="bg-[#1C8AFF]/5 rounded-xl p-4 space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</p>
              
              {/* Stepper */}
              <div className="relative flex justify-between items-center px-2">
                {/* Connector Line */}
                <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-muted-foreground/20 z-0" />
                <div 
                  className="absolute top-1.5 left-0 h-0.5 bg-[#1C8AFF] transition-all duration-500 z-0" 
                  style={{ width: `${((booking.currentStep || 0) / (booking.steps.length - 1)) * 100}%` }}
                />
                
                {booking.steps.map((step: string, idx: number) => (
                  <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 transition-colors duration-500",
                      idx <= (booking.currentStep || 0) ? "bg-[#1C8AFF] border-[#1C8AFF]" : "bg-white border-muted-foreground/30"
                    )} />
                    <span className={cn(
                      "text-[10px] whitespace-nowrap hidden sm:block",
                      idx <= (booking.currentStep || 0) ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status Update Link */}
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

          {type === "upcoming" && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-start gap-4">
                <div className="text-center p-2 bg-muted/30 rounded-lg min-w-20">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> {booking.duration}</p>
                  <p className="text-xs font-bold">{booking.serviceDate}</p>
                </div>
                <div className="h-10 w-px bg-muted" />
              </div>
              <Button className="bg-[#1C8AFF] hover:bg-[#1C8AFF]/90 rounded-xl px-6 py-6 text-base font-bold flex gap-2">
                Service time {booking.serviceTime} | Join call <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {type === "completed" && (
            <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                Request Completed
              </div>
              <div className="text-sm text-green-700 font-medium">On {booking.completedOn}</div>
            </div>
          )}

          {type === "requested" && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-[#1C8AFF] hover:bg-[#1C8AFF]/90 rounded-xl">Accept</Button>
              <Button variant="outline" className="flex-1 rounded-xl border-destructive text-destructive hover:bg-destructive/10">Reject</Button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 flex justify-between items-center mt-4">
            <p className="text-sm font-semibold">Customer: <span className="font-normal">{booking.customer}</span></p>
            <div className="flex gap-3">
              <button className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                <MessageCircle className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full bg-blue-50 text-[#1C8AFF] hover:bg-blue-50 transition-colors">
                <Phone className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <BookingsContent />
    </Suspense>
  );
}

function Loader2({ className }: { className: string }) {
  return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className={className} />;
}

