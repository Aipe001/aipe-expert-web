"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  LogOut,
  Star,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { logout } from "@/lib/store/slices/authSlice";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Bookings", href: "/bookings", icon: CalendarCheck },
  { title: "Earnings", href: "/earnings", icon: Wallet },
  { title: "Ratings", href: "/ratings", icon: Star },
  { title: "Chat", href: "/chat", icon: MessageSquare },
  { title: "KYC", href: "/kyc", icon: ShieldCheck },
];

function CollapseToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (isMobile) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-7 w-7 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {state === "expanded" ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
      </TooltipContent>
    </Tooltip>
  );
}

export function ExpertSidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, onboardingStatus } = useSelector((state: RootState) => state.auth);
  const { state, isMobile } = useSidebar();

  type UserType = typeof user & { role?: { name?: string }, roleName?: string };
  const typedUser = user as UserType;

  const isAuthorized =
    user?.isExpert ||
    typedUser?.role?.name === "expert" ||
    typedUser?.role?.name === "admin" ||
    typedUser?.role?.name === "super_admin" ||
    typedUser?.roleName === "expert" ||
    typedUser?.roleName === "admin" ||
    typedUser?.roleName === "super_admin" ||
    ["VERIFIED", "APPROVED", "verified", "approved"].includes(onboardingStatus?.kyc?.status || "") ||
    ["kyc_verified", "bank_submitted", "bank_verified", "completed"].includes(onboardingStatus?.onboardingStatus || "");

  const initials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") || "EX";

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 h-14 flex items-center justify-between overflow-hidden">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 min-w-0 relative h-8 w-full hover:opacity-80 transition-opacity cursor-pointer z-10"
        >
          <AnimatePresence mode="wait">
            {state === "expanded" || isMobile ? (
              <motion.div
                key="expanded-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <div className="relative h-8 w-32 shrink-0">
                  <Image
                    src="/aipe_logo1.png"
                    alt="AIPE Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center w-8 h-8"
              >
                <Image
                  src="/aipe_logo2.png"
                  alt="AIPE Icon"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        <div className="group-data-[collapsible=icon]:opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
          <CollapseToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                
                const isDisabled = item.href !== "/kyc" && !isAuthorized;

                return (
                  <SidebarMenuItem key={item.href}>
                    {isDisabled ? (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        disabled={true}
                        className="opacity-50 cursor-not-allowed"
                      >
                        <item.icon className="text-muted-foreground mr-1" />
                        <span className="group-data-[collapsible=icon]:opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={isActive ? "text-primary" : ""}
                          />
                          <span className="group-data-[collapsible=icon]:opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pb-1">
        <SidebarMenu>
          <SidebarMenuItem className="-ml-1.5">
            <SidebarMenuButton tooltip={user?.firstName || "Expert"} size="lg">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-[#1C8AFF]/10 text-[#1C8AFF]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex flex-col text-left text-xs leading-tight min-w-0 group-data-[collapsible=icon]:opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <span className="font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  {user?.email || user?.mobile}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="px-0.5">
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={() => {
                dispatch(logout());
                if (typeof window !== "undefined") window.location.href = "/";
              }}
            >
              <LogOut className="shrink-0" />
              <span className="group-data-[collapsible=icon]:opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                Sign Out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
