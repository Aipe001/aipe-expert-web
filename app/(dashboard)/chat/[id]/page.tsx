"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";



export default function ChatDetailPage() {
  const { id } = useParams();
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

