import { ChatContainer } from "@/components/chat/ChatContainer";

const chats = [
  { id: "1", name: "Alok Kumar" },
  { id: "2", name: "Sahil" },
  { id: "3", name: "Vikash" },
];

export async function generateStaticParams() {
  return chats.map((chat) => ({
    id: chat.id,
  }));
}

export default async function ChatDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const chat = chats.find((c) => c.id === id) || { name: "Customer" };

  return <ChatContainer id={id} chatName={chat.name} />;
}
