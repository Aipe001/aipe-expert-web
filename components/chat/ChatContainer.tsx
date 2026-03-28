"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  User, 
  Phone, 
  Video, 
  Paperclip, 
  Camera, 
  Mic, 
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatContainerProps {
  id: string;
  chatName: string;
}

const dummyMessages = [
  { id: 1, text: "Hey Alok, what's the update on the requested docs?", sender: "user" },
  { id: 2, text: "I've just shared them with you. Please check and let me know if you need anything else.", sender: "expert" },
];

export function ChatContainer({ id, chatName }: ChatContainerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleBack = () => {
    router.push("/chat");
  };

  return (
    <div className="flex flex-col h-dvh lg:h-[calc(100vh-2px)] bg-[#F4F7F9] overflow-hidden">
      {/* Premium Blue Header */}
      <header className="bg-[#1C8AFF] text-white px-4 py-3 flex items-center gap-3 shrink-0 pt-6 md:pt-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="text-white hover:bg-white/10 -ml-2 h-10 w-10"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5px]" />
        </Button>
        
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <User className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{chatName}</h2>
          <p className="text-xs text-white/80">Consultation · #{id}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors">
            <Phone className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
            <Video className="h-5 w-5 fill-white text-white" />
          </div>
        </div>
      </header>

      {/* Service Info Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-900">
            <span className="text-slate-500 font-normal">Service : </span>
            Consultation
          </p>
          <p className="text-sm font-medium text-slate-900">
            <span className="text-slate-500 font-normal">Booked on : </span>
            N/A
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Status</p>
          <p className="text-sm font-bold text-green-600">Active</p>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 flex flex-col justify-end">
        {dummyMessages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm shadow-sm",
              msg.sender === "expert" 
                ? "bg-[#1C8AFF] text-white self-end rounded-tr-none" 
                : "bg-white text-slate-700 self-start rounded-tl-none border border-slate-100"
            )}
          >
            {msg.text}
          </motion.div>
        ))}
        
        {dummyMessages.length === 0 && (
          <div className="pt-4 flex flex-col items-center justify-center text-center opacity-40">
            <div className="h-10 w-10 rounded-full bg-slate-200/50 flex items-center justify-center mb-2">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Start the conversation</p>
          </div>
        )}
      </div>

      {/* Message Input Footer */}
      <footer className="p-4 bg-transparent shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 bg-white rounded-full border border-slate-200 shadow-sm flex items-center px-4 py-1 h-12 group focus-within:shadow-[0_0_20px_rgba(28,138,255,0.3)] focus-within:border-[#1C8AFF]/30 transition-all duration-300">
            <Input 
              placeholder="Message..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 bg-transparent text-slate-700 placeholder:text-slate-400 h-10 px-0"
            />
            <div className="flex items-center gap-3 text-slate-400 pl-2">
              <Paperclip className="h-5 w-5 cursor-pointer hover:text-[#1C8AFF] transition-colors" />
              <Camera className="h-5 w-5 cursor-pointer hover:text-[#1C8AFF] transition-colors" />
            </div>
          </div>
          
          <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors shrink-0">
            <Mic className="h-6 w-6 text-slate-600" />
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper function for class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
