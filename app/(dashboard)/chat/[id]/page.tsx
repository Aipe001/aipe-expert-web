import { ChatContainer } from "@/components/chat/ChatContainer";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Server-side Page for Chat Detail.
 * Using Server Components for true Server Side behavior as requested.
 */
export default async function ChatDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sParams = await searchParams;
  const joined = sParams?.joined;
  const callType = sParams?.callType;

  return (
    <ChatContainer
      bookingId={id}
      joined={joined === "1"}
      incomingCallType={callType as "audio" | "video" | null}
    />
  );
}
