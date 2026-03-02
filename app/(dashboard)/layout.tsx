"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ExpertSidebar } from "@/components/layout/ExpertSidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ExpertSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-6 max-w-full">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
