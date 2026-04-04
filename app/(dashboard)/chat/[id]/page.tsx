"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { useRouter } from "next/router";

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = router.query;
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
