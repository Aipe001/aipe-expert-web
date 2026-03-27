"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Clock,
  CircleDollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Dummy Data
const DUMMY_TRANSACTIONS = [
  {
    id: "t1",
    title: "GST Registration",
    date: "3/14/2026",
    amount: "1,500",
    status: "completed",
    type: "credit"
  },
  {
    id: "t2",
    title: "Company Filing",
    date: "3/15/2026",
    amount: "2,500",
    status: "completed",
    type: "credit"
  },
  {
    id: "t3",
    title: "Legal Advice",
    date: "3/16/2026",
    amount: "1,000",
    status: "completed",
    type: "credit"
  }
];

export default function EarningsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto no-scrollbar">
        {["dashboard", "statement"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap capitalize",
              activeTab === tab ? "text-[#1C8AFF]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabEarnings"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C8AFF]"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {activeTab === "dashboard" ? (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <p className="text-muted-foreground">Track your income & payouts</p>
              
              {/* Balance Card */}
              <motion.div variants={itemVariants}>
                <Card className="bg-[#1C8AFF] text-white overflow-hidden shadow-lg border-none relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Wallet className="h-40 w-40 rotate-12" />
                  </div>
                  <CardContent className="p-8 space-y-6 relative z-10">
                    <div className="space-y-2">
                      <p className="text-[#1C8AFF]/80 font-medium text-lg brightness-200">Available Balance</p>
                      <h2 className="text-6xl font-black tracking-tight">₹0</h2>
                    </div>
                    <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-none text-white font-bold h-12 px-6 backdrop-blur-md rounded-xl flex gap-2">
                       <Wallet className="h-5 w-5" /> Withdraw Funds
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Stats Grid */}
              <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
                <StatBox label="Total Earned" value="₹0" icon={<TrendingUp className="h-4 w-4 text-primary" />} />
                <StatBox label="This Month" value="₹0" icon={<CircleDollarSign className="h-4 w-4 text-green-600" />} />
                <StatBox label="Pending" value="₹0" icon={<Clock className="h-4 w-4 text-yellow-600" />} />
              </motion.div>

              {/* Transactions List */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-xl font-bold">Transactions</h3>
                <div className="divide-y border rounded-xl bg-white shadow-sm overflow-hidden">
                  {DUMMY_TRANSACTIONS.map((tx) => (
                    <TransactionItem key={tx.id} {...tx} />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
               <div className="divide-y border rounded-xl bg-white shadow-sm overflow-hidden">
                  {DUMMY_TRANSACTIONS.map((tx) => (
                    <TransactionItem key={tx.id} {...tx} />
                  ))}
                </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-white overflow-hidden">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
        <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
            {icon}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ title, date, amount, status }: { title: string, date: string, amount: string, status: string }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
          <ArrowDownCircle className="h-6 w-6" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-bold text-sm tracking-tight">{title}</h4>
          <p className="text-xs text-muted-foreground font-medium">{date}</p>
        </div>
      </div>
      <div className="text-right space-y-0.5">
        <p className="text-[#1C8AFF] font-bold text-base flex items-center justify-end gap-1">
          <span className="text-xs opacity-70">↓</span> ₹{amount}
        </p>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{status}</p>
      </div>
    </div>
  );
}
