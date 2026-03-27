"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { expertApi, WalletInfo, Transaction } from "@/lib/api/expert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

export default function WalletPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [walletRes, txRes] = await Promise.allSettled([
          expertApi.getWallet(),
          expertApi.getTransactions(),
        ]);

        if (walletRes.status === "fulfilled") {
          setWallet(walletRes.value);
        }
        if (txRes.status === "fulfilled") {
          setTransactions(txRes.value);
        }
      } catch {
        // API may not be implemented yet
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
      toast.success("Withdrawal request submitted successfully!");
      setDialogOpen(false);
      setWithdrawAmount("");

      const [walletRes, txRes] = await Promise.allSettled([
        expertApi.getWallet(),
        expertApi.getTransactions(),
      ]);
      if (walletRes.status === "fulfilled") setWallet(walletRes.value);
      if (txRes.status === "fulfilled") setTransactions(txRes.value);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to request withdrawal",
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your balance and request withdrawals.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-32 bg-white/20" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  ₹{balance.toLocaleString()}
                </span>
                <span className="text-sm text-primary-foreground/70">INR</span>
              </div>
            )}
            <div className="mt-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Withdraw Funds
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Withdrawal</DialogTitle>
                    <DialogDescription>
                      Enter the amount you want to withdraw to your bank account.
                      Available balance: ₹{balance.toLocaleString()}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        min={1}
                        max={balance}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleWithdraw} disabled={withdrawing}>
                      {withdrawing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirm Withdrawal
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Stats
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Deposits
              </span>
              <span className="font-medium text-green-600">
                ₹
                {transactions
                  .filter((t) => t.type === "earning")
                  .reduce((sum, t) => sum + (t.amount ?? 0), 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Withdrawals
              </span>
              <span className="font-medium text-red-600">
                ₹
                {transactions
                  .filter((t) => t.type === "withdrawal")
                  .reduce((sum, t) => sum + (t.amount ?? 0), 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Pending Withdrawals
              </span>
              <span className="font-medium text-orange-600">
                ₹
                {transactions
                  .filter(
                    (t) => t.type === "withdrawal" && t.status === "pending",
                  )
                  .reduce((sum, t) => sum + (t.amount ?? 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>
            All your earnings and withdrawals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
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
            <div className="space-y-3">
              {transactions.map((tx) => (
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
                        hour: "2-digit",
                        minute: "2-digit",
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
                      {tx.amount?.toLocaleString() ?? "0"}
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
    </div>
  );
}
