"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ExpertSidebar } from "@/components/layout/ExpertSidebar";
import { Header } from "@/components/layout/Header";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatDetail = pathname.includes("/chat/") && pathname !== "/chat";

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
