"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState } from "react";
import { Provider } from "react-redux";
import { store } from "@/lib/store/store";
import { AuthInitializer } from "@/components/auth/AuthInitializer";
import { NotificationManager } from "@/components/NotificationManager";
import { CallManager } from "@/components/chat/CallManager";
import { GlobalCallOverlay } from "@/components/chat/GlobalCallOverlay";
import { IncomingCallModal } from "@/components/chat/IncomingCallModal";
import { BookingRequestModal } from "@/components/chat/BookingRequestModal";
import { BookingActiveModal } from "@/components/chat/BookingActiveModal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthInitializer />
        <TooltipProvider>
          <NotificationManager />
          <CallManager />
          <GlobalCallOverlay />
          <IncomingCallModal />
          <BookingRequestModal />
          <BookingActiveModal />
          {children}
          <Toaster />
          <Sonner position="top-center" expand={true} richColors />
        </TooltipProvider>
      </Provider>
    </QueryClientProvider>
  );
}
