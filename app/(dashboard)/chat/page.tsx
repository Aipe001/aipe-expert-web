"use client";

import { motion } from "framer-motion";
import { User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const chats = [
  {
    id: "1",
    name: "Alok Kumar",
    lastMessage: "Hey Alok, what's the update",
    initials: "AK",
  },
  {
    id: "2",
    name: "Sahil",
    lastMessage: "Hey Sahil, what's the update",
    initials: "S",
  },
  {
    id: "3",
    name: "Vikash",
    lastMessage: "Pls share the requested docs",
    initials: "V",
  },
];

export default function ChatPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-8 px-4 lg:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Customer Chat
        </h1>
      </div>

      <motion.div
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {chats.map((chat, index) => (
          <motion.div key={chat.id} variants={itemVariants}>
            <Link
              href={`/chat/${chat.id}`}
              className={cn(
                "flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors group",
                index !== chats.length - 1 && "border-b border-slate-100"
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <User className="h-7 w-7" />
                </div>
                {/* Status Dot */}
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white" />
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-[#1C8AFF] transition-colors">
                    {chat.name}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                  {chat.lastMessage}
                </p>
              </div>

              {/* Action */}
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State / Hint */}
      <p className="text-center text-slate-400 text-sm italic">
        Select a chat to view messages
      </p>
    </div>
  );
}
