"use client";

import { use } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <ChatContainer bookingId={id} />;
}
