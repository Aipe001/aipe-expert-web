"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  loginStart,
  otpSentSuccess,
  loginSuccess,
  loginFailure,
  setTempIdentifier,
  resetAuth,
} from "@/lib/store/slices/authSlice";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error, otpSent, tempIdentifier } =
    useSelector((state: RootState) => state.auth);

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      await authApi.sendOtp(identifier);
      dispatch(setTempIdentifier(identifier));
      dispatch(otpSentSuccess());
    } catch (err: unknown) {
      dispatch(
        loginFailure(err instanceof Error ? err.message : "Failed to send OTP"),
      );
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await authApi.verifyOtp({
        identifier: tempIdentifier || identifier,
        code: otp,
      });
      dispatch(
        loginSuccess({
          user: {
            id: response.user.id,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            mobile: response.user.phone,
            email: response.user.email,
            status: response.user.status,
            isExpert: response.user.isExpert,
          },
          token: response.accessToken,
        }),
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      dispatch(
        loginFailure(err instanceof Error ? err.message : "Invalid OTP"),
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C8AFF] text-primary-foreground font-bold">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              AIPE <span className="text-[#1C8AFF]">Expert</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sign in to your expert portal to manage bookings and earnings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {otpSent ? "Verify OTP" : "Sign In"}
            </CardTitle>
            <CardDescription>
              {otpSent
                ? `Enter the OTP sent to ${tempIdentifier}`
                : "Enter your registered mobile number"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Mobile Number</Label>
                  <Input
                    id="identifier"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Sign In
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    dispatch(resetAuth());
                    setOtp("");
                  }}
                >
                  Change Number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
