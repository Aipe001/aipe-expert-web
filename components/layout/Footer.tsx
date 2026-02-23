"use client";

import Link from "next/link";
import { StoreButtons } from "@/components/ui/store-buttons";

const policyLinks = [
  { name: "Terms of Use", path: "/terms" },
  { name: "Privacy Policy", path: "/privacy" },
  { name: "Equal Opportunity Policy", path: "/equal-opportunity" },
  { name: "Refund & Cancellation Policy", path: "/refund" },
  { name: "Vulnerability Disclosure", path: "/vulnerability" },
  { name: "Annual Return", path: "/annual-return" },
];

// Star decoration component
function StarDecoration({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* Main Footer Section with AIPE blue gradient */}
      <div
        className="relative pt-16 pb-4 md:pt-24 md:pb-8"
        style={{
          background:
            "linear-gradient(180deg, #0a1929 0%, #0d2847 30%, #0a1929 100%)",
        }}
      >
        {/* Decorative Stars - using AIPE blue */}
        <StarDecoration
          className="absolute top-12 left-[15%] text-[#1C8AFF] opacity-80"
          size="md"
        />
        <StarDecoration
          className="absolute top-24 right-[12%] text-[#1C8AFF] opacity-90"
          size="lg"
        />
        <StarDecoration
          className="absolute top-1/2 left-[5%] text-[#1C8AFF] opacity-60"
          size="sm"
        />
        <StarDecoration
          className="absolute bottom-32 right-[8%] text-[#1C8AFF] opacity-70"
          size="md"
        />

        {/* Main Content */}
        <div className="page-container text-center">
          {/* Main Headline */}
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-wide">
            India&apos;s First
          </h2>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-wide">
            <span
              className="font-extrabold"
              style={{
                background: "linear-gradient(90deg, #1C8AFF 0%, #60B3FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Quick Finance Service
            </span>
            <span className="text-white"> APP</span>
          </h2>

          {/* Tagline */}
          <p className="text-white/70 text-base md:text-lg max-w-3xl mx-auto mb-10 flex flex-col gap-2">
            <span>
              Enabling people to get expert help for their finance in 10
              minutes.
            </span>
            <span>
              Personalized hand-holding/high-quality & affordable services.
            </span>
          </p>

          {/* App Store Buttons */}
          <div className="justify-center">
            <StoreButtons className="mb-8" />
          </div>
          <p>Made with ❤️ in India</p>
        </div>
      </div>

      {/* Bottom Bar with links - dark blue to match AIPE theme */}
      <div
        className="py-4 px-4"
        style={{
          background: "#051221",
        }}
      >
        <div className="page-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-white/60 text-xs md:text-sm">
              <span className="text-lg">©</span>
              <span>2025 aipe. All rights reserved.</span>
            </div>

            {/* Policy Links */}
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {policyLinks.map((link, index) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="text-white/60 text-xs hover:text-white transition-colors"
                >
                  {link.name}
                  {index < policyLinks.length - 1 && (
                    <span className="ml-4 text-white/30 hidden md:inline">
                      |
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
