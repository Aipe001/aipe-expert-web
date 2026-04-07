"use client";

import Image from "next/image";

/*
import { motion } from "framer-motion";
import {
  Landmark,
  TrendingUp,
  DollarSign,
  Coins,
  Briefcase,
  ShieldCheck,
  Wallet,
  PieChart,
  LineChart,
  CreditCard,
  LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

const IconTag = ({ Icon, label }: { Icon: LucideIcon; label: string }) => (
  <div className="flex items-center gap-3 px-6 py-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
    <Icon className="w-5 h-5 text-[#1C8AFF]" strokeWidth={2} />
    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
      {label}
    </span>
  </div>
);

const ROW_DATA = [
  { icon: Landmark, label: "Banking" },
  { icon: TrendingUp, label: "Growth" },
  { icon: DollarSign, label: "Currency" },
  { icon: Coins, label: "Finance" },
  { icon: Briefcase, label: "Investment" },
  { icon: ShieldCheck, label: "Security" },
  { icon: Wallet, label: "Portfolio" },
  { icon: PieChart, label: "Analysis" },
  { icon: LineChart, label: "Markets" },
  { icon: CreditCard, label: "Payments" },
];

const IconRow = ({
  direction,
  speed,
}: {
  direction: 1 | -1;
  speed: number;
}) => {
  const rowItems = useMemo(() => {
    // Quadruple the items to ensure the screen is ALWAYS filled from all angles
    return [...ROW_DATA, ...ROW_DATA, ...ROW_DATA, ...ROW_DATA].map(
      (item, i) => <IconTag key={i} Icon={item.icon} label={item.label} />,
    );
  }, []);

  // We start at -25% (the beginning of the 2nd set) and move to -50% (the beginning of the 3rd set)
  // This ensures there is always content to the left and right, even at the start/end of the loop.
  const startX = direction === -1 ? "-25%" : "-50%";
  const endX = direction === -1 ? "-50%" : "-25%";

  return (
    <div className="flex gap-8 py-4 whitespace-nowrap overflow-visible">
      <motion.div
        initial={{ x: startX }}
        animate={{ x: [startX, endX] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-8"
      >
        {rowItems}
      </motion.div>
    </div>
  );
};

export const LoginBackgroundOld = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#F8FAFC] pointer-events-none">
      <div className="absolute inset-0 bg-linear-to-br from-[#1C8AFF]/5 via-transparent to-transparent" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-35 scale-150">
        <div className="flex flex-col gap-6">
          <IconRow direction={-1} speed={60} />
          <IconRow direction={1} speed={55} />
          <IconRow direction={-1} speed={65} />
          <IconRow direction={1} speed={58} />
          <IconRow direction={-1} speed={62} />
          <IconRow direction={1} speed={54} />
          <IconRow direction={-1} speed={68} />
          <IconRow direction={1} speed={60} />
          <IconRow direction={-1} speed={56} />
          <IconRow direction={1} speed={63} />
        </div>
      </div>

      <div className="absolute inset-0 bg-linear-to-r from-[#F8FAFC] via-transparent to-[#F8FAFC] opacity-40" />
      <div className="absolute inset-0 bg-linear-to-b from-[#F8FAFC] via-transparent to-[#F8FAFC] opacity-40" />
    </div>
  );
};
*/

export const LoginBackground = () => {
  return (
    <div className="absolute inset-0 z-0 w-full h-full overflow-hidden">
      <Image
        src="/man-is-working-computer-with-graph-screen.jpg"
        alt="Login Background"
        fill
        priority
        className="object-cover scale-110 blur-[10px]"
      />
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
};
