"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";

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
