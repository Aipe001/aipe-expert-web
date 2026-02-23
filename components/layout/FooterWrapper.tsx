"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function FooterWrapper() {
  const pathname = usePathname();
  const isFiraPage = pathname === "/firachat";

  if (isFiraPage) {
    return null;
  }

  return <Footer />;
}
