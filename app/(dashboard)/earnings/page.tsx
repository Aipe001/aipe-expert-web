"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, EarningsStats, WalletInfo, Transaction } from "@/lib/api/expert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Clock,
  CircleDollarSign,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EarningsPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, walletRes, txRes] = await Promise.allSettled([
          expertApi.getEarningsStats(),
          expertApi.getWallet(),
          expertApi.getTransactions(),
        ]);

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (walletRes.status === "fulfilled") setWallet(walletRes.value);
        if (txRes.status === "fulfilled") setTransactions(txRes.value);
      } catch (err) {
        console.error("Failed to fetch earnings data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (wallet && amount > wallet.balance) {
      toast.error("Insufficient balance");
      return;
    }

    setWithdrawing(true);
    try {
      await expertApi.requestWithdrawal({ amount });
      toast.success("Withdrawal request submitted!");
      setWithdrawOpen(false);
      setWithdrawAmount("");
      // Refresh wallet
      const updated = await expertApi.getWallet();
      setWallet(updated);
      const txs = await expertApi.getTransactions();
      setTransactions(txs);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
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

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
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
                        <h2 className="text-6xl font-black tracking-tight">
                          ₹{wallet?.balance?.toLocaleString() || "0"}
                        </h2>
                      </div>
                      <Button
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 border-none text-white font-bold h-12 px-6 backdrop-blur-md rounded-xl flex gap-2"
                        onClick={() => setWithdrawOpen(true)}
                      >
                        <Wallet className="h-5 w-5" /> Withdraw Funds
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Stats Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
                  <StatBox
                    label="Total Earned"
                    value={`₹${stats?.totalEarnings?.toLocaleString() || "0"}`}
                    icon={<TrendingUp className="h-4 w-4 text-primary" />}
                  />
                  <StatBox
                    label="This Month"
                    value={`₹${stats?.monthlyEarnings?.toLocaleString() || "0"}`}
                    icon={<CircleDollarSign className="h-4 w-4 text-green-600" />}
                  />
                  <StatBox
                    label="Pending"
                    value={`₹${stats?.pendingPayout?.toLocaleString() || "0"}`}
                    icon={<Clock className="h-4 w-4 text-yellow-600" />}
                  />
                </motion.div>

                {/* Transactions List */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-xl font-bold">Transactions</h3>
                  {transactions.length === 0 ? (
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No transactions yet
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="divide-y border rounded-xl bg-white shadow-sm overflow-hidden">
                      {transactions.map((tx) => (
                        <TransactionItem key={tx.id} transaction={tx} />
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                {transactions.length === 0 ? (
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No transactions to show
                    </CardContent>
                  </Card>
                ) : (
                  <div className="divide-y border rounded-xl bg-white shadow-sm overflow-hidden">
                    {transactions.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Available balance: <span className="font-bold text-foreground">₹{wallet?.balance?.toLocaleString() || "0"}</span>
              </p>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
              <Button
                className="bg-[#1C8AFF]"
                onClick={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Withdraw
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
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

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.type === "earning";

  return (
    <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center",
          isCredit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        )}>
          {isCredit ? <ArrowDownCircle className="h-6 w-6" /> : <ArrowUpCircle className="h-6 w-6" />}
        </div>
        <div className="space-y-0.5">
          <h4 className="font-bold text-sm tracking-tight">{transaction.description}</h4>
          <p className="text-xs text-muted-foreground font-medium">
            {new Date(transaction.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right space-y-0.5">
        <p className={cn(
          "font-bold text-base flex items-center justify-end gap-1",
          isCredit ? "text-green-600" : "text-red-600"
        )}>
          <span className="text-xs opacity-70">{isCredit ? "↓" : "↑"}</span> ₹{transaction.amount.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
          {transaction.status}
        </p>
      </div>
    </div>
  );
}
