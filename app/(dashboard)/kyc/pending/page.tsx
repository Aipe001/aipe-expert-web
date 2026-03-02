"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import { setOnboardingStatus } from "@/lib/store/slices/authSlice";
import { expertApi } from "@/lib/api/expert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";

export default function KycPendingPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, onboardingStatus } = useSelector(
    (state: RootState) => state.auth,
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const status = await expertApi.getOnboardingStatus();
      dispatch(setOnboardingStatus(status));

      if (status.kyc?.status === "VERIFIED") {
        router.push("/dashboard");
      } else if (status.kyc?.status === "REJECTED") {
        router.push("/kyc");
      }
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  };

  const kycStatus = onboardingStatus?.kyc?.status || "SUBMITTED";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {kycStatus === "VERIFIED" ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <Clock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {kycStatus === "VERIFIED"
              ? "KYC Verified!"
              : "KYC Under Review"}
          </CardTitle>
          <CardDescription className="text-base">
            {kycStatus === "VERIFIED"
              ? "Your identity has been verified. You can now start accepting bookings."
              : "Your KYC documents have been submitted and are being reviewed by our team."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              variant={kycStatus === "VERIFIED" ? "default" : "secondary"}
              className={
                kycStatus === "VERIFIED"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : ""
              }
            >
              {kycStatus === "SUBMITTED"
                ? "Submitted"
                : kycStatus === "UNDER_REVIEW"
                  ? "Under Review"
                  : kycStatus === "VERIFIED"
                    ? "Verified"
                    : kycStatus}
            </Badge>
          </div>

          {kycStatus !== "VERIFIED" && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p>This process usually takes 24-48 hours.</p>
              <p className="mt-1">
                You will be notified once your documents have been reviewed.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Check Status
            </Button>
            {kycStatus === "VERIFIED" && (
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
