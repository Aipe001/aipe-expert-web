"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import { setOnboardingStatus } from "@/lib/store/slices/authSlice";
import { expertApi } from "@/lib/api/expert";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ExpertSidebar } from "@/components/layout/ExpertSidebar";
import { Header } from "@/components/layout/Header";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatDetail = pathname?.startsWith("/chat/");

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
