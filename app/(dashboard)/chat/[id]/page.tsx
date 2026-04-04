"use client";

import { useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { useRouter } from "next/router";

/**
 * Static-friendly dynamic page.
 * We provide an empty generateStaticParams to satisfy the 'output: export' build requirement,
 * while keeping the logic client-side ('use client').
 */
export default function ChatDetailPage() {
  const { id } = useRouter().query;
  const searchParams = useSearchParams();
  const joined = searchParams.get("joined");
  const callType = searchParams.get("callType");

  return (
    <ChatContainer
      bookingId={id as string}
      joined={joined === "1"}
      incomingCallType={callType as "audio" | "video" | null}
    />
  );
}

