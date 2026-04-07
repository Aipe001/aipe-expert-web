"use client";

  import { useEffect, useState } from "react";
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
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import { LoginBackground } from "@/components/auth/LoginBackground";

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
    
    // Client-side validation: must be exactly 10 digits
    if (!/^\d{10}$/.test(identifier)) {
      dispatch(loginFailure("Invalid phone number. Must be exactly 10 digits."));
      return;
    }

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
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* Left Side: Animated Background (Desktop/Tablet) */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-[75%] items-center justify-center overflow-hidden border-r border-border/50">
        <LoginBackground />
        <div className="relative z-10 text-center space-y-6 px-12 py-16 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.02)] max-w-2xl mx-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl mb-4">
             <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1C8AFF] text-white font-bold text-2xl">
              A
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            AIPE <span className="text-[#1C8AFF]">Expert</span> Portal
          </h2>
          <p className="text-xl text-slate-600 max-w-md mx-auto leading-relaxed">
            Empowering financial experts with seamless management and growth tools.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="relative w-full md:w-1/2 lg:w-[25%] flex flex-col items-center justify-center bg-white z-10 p-6 sm:p-12">
        {/* Mobile Background Overlay */}
        <div className="md:hidden absolute inset-0 z-0">
          <LoginBackground />
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
        </div>

        <div className="w-full max-w-sm space-y-8 z-10">
          <div className="text-center space-y-3">
             <div className="md:hidden flex items-center justify-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C8AFF] text-white font-bold">
                A
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                AIPE <span className="text-[#1C8AFF]">Expert</span>
              </h1>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {otpSent ? "Verification Required" : "Welcome Back"}
            </h2>
            <p className="text-slate-500">
              {otpSent
                ? `Please enter the code sent to ${tempIdentifier}`
                : "Sign in to manage your appointments"}
            </p>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-medium text-slate-700">Mobile Number</Label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium border-r pr-2">+91</span>
                      <Input
                        id="identifier"
                        type="tel"
                        placeholder="00000 00000"
                        className="pl-14 h-12 border-slate-200 focus:ring-[#1C8AFF] focus:border-[#1C8AFF]"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-50 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                      <div className="w-1 h-1 bg-destructive rounded-full" />
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-12 bg-[#1C8AFF] hover:bg-[#1C8AFF]/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Get Started
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-sm font-medium text-slate-700">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      className="h-12 border-slate-200 text-center tracking-[0.5em] text-lg font-bold focus:ring-[#1C8AFF] focus:border-[#1C8AFF]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                      <div className="w-1 h-1 bg-destructive rounded-full" />
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-12 bg-[#1C8AFF] hover:bg-[#1C8AFF]/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-500 hover:text-[#1C8AFF] hover:bg-blue-50"
                    onClick={() => {
                      dispatch(resetAuth());
                      setOtp("");
                    }}
                  >
                    Change Mobile Number
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-auto pt-8 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              By continuing, you agree to our <br/>
              <a href="#" className="underline hover:text-[#1C8AFF]">Terms of Service</a> and <a href="#" className="underline hover:text-[#1C8AFF]">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
