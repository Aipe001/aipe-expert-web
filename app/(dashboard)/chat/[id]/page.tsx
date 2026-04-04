"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";

/**
 * Static-friendly dynamic page.
 * We provide an empty generateStaticParams to satisfy the 'output: export' build requirement,
 * while keeping the logic client-side ('use client').
 */
export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const joined = searchParams.get("joined");
  const callType = searchParams.get("callType");

  return (
    <ChatContainer
      bookingId={id}
      joined={joined === "1"}
      incomingCallType={callType as "audio" | "video" | null}
    />
  );
}

// Satisfies the 'output: export' requirement by defining which paths to pre-render.
// By returning an empty array, the build passes, but you'll need a fallback mechanism 
// (like a Netlify _redirects file) to handle refreshes on dynamic paths.
export function generateStaticParams() {
  return [];
}
