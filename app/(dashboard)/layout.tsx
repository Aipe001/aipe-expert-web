"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import { setOnboardingStatus } from "@/lib/store/slices/authSlice";
import { expertApi } from "@/lib/api/expert";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ExpertSidebar } from "@/components/layout/ExpertSidebar";
import { Header } from "@/components/layout/Header";
import { IncomingCallModal } from "@/components/chat/IncomingCallModal";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isChatDetail = pathname === "/chat" && searchParams.get("id");
  const { user, isAuthenticated, onboardingStatus } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user && pathname && !pathname.startsWith("/kyc")) {
      const roleName = user.role?.name?.toLowerCase();
      const isOkStatus = ["kyc_verified", "bank_submitted", "bank_verified", "completed"].includes(onboardingStatus?.onboardingStatus || "");
      const hasPermission = roleName === "expert" || roleName === "admin" || user.isExpert || isOkStatus;

      if (!hasPermission) {
        toast.error("Not enough permission");
        router.replace("/kyc");
      }
    }
  }, [user, isAuthenticated, onboardingStatus, router, pathname]);

  return (
    <SidebarProvider>
      <ExpertSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-x-hidden">
          <div className={cn("max-w-full", isChatDetail ? "p-0" : "p-4 md:p-6")}>
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
