"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import { logout } from "@/lib/store/slices/authSlice";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/bookings": "Bookings",
  "/wallet": "Wallet",
  "/kyc": "KYC Verification",
  "/kyc/pending": "KYC Status",
};

export function Header() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const {  } = useSidebar();
  const { user } = useSelector((state: RootState) => state.auth);

  const initials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") || "EX";

  const pageTitle =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path),
    )?.[1] ||
    "Expert Portal";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="hidden md:block mr-2 h-4" />
        <h2 className="hidden md:block text-sm font-semibold truncate md:text-base">
          {pageTitle}
        </h2>
      </div>

      {/* Centered Logo and Text */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0 pointer-events-none">
        <div className="relative h-16 w-16">
          <Image
            src="/aipe_logo3.png"
            alt="AIPE"
            fill
            className="object-contain"
          />
        </div>
        <span className="text-lg font-bold tracking-tight whitespace-nowrap">
          <span className="text-[#1C8AFF] italic">Expert Console</span>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#1C8AFF]/10 text-[#1C8AFF] text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || user?.mobile}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer flex items-center w-full">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => {
                dispatch(logout());
                if (typeof window !== "undefined") window.location.href = "/";
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
