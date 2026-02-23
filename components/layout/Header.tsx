"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  User,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
// import { LocationSelector } from "@/components/layout/LocationSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { logout } from "@/lib/store/slices/authSlice";
import { AuthModal } from "@/components/auth/AuthModal";
import { OTPModal } from "@/components/auth/OTPModal";
import { formatDistanceToNow } from "date-fns";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  AppNotification,
} from "@/lib/api/notifications";

const navLinks = [
  { name: "Services", path: "/services" },
  { name: "Bookings", path: "/bookings" },
  { name: "Fira", path: "/firachat" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /*
  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isAuthenticated) {
      fetchNotifications();
      // Poll every 30 seconds for MVP
      interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated]);
  */

  const handleNotificationClick = async (
    id: string,
    data?: AppNotification["data"],
  ) => {
    try {
      // Mark as read
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Navigate if bookingId exists
      if (data?.bookingId) {
        router.push(`/consultation/${data.bookingId}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    try {
      for (const n of notifications) {
        await deleteNotification(n.id);
      }
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="page-container">
        <div className="flex h-16 items-center justify-between gap-2 md:gap-4 relative">
          {/* Mobile Left: Hamburger + Logo2 */}
          <div className="flex lg:hidden items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Image
                      src="/assets/aipe_logo1.png"
                      alt="Aipe Logo"
                      width={100}
                      height={32}
                      className="object-contain"
                      priority
                      unoptimized
                    />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 mt-8">
                  {/* Location in Hamburger */}
                  {/* <LocationSelector className="w-full justify-between py-2 rounded-md" /> */}

                  <div className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <SheetClose key={link.path} asChild>
                        <Link
                          href={link.path}
                          className={`text-base font-medium px-2 py-2 transition-colors hover:text-primary hover:bg-muted/50 rounded-md ${
                            pathname === link.path
                              ? "text-primary bg-primary/5"
                              : "text-muted-foreground"
                          }`}
                        >
                          {link.name}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center">
              <Image
                src="/assets/aipe_logo2.png"
                alt="Aipe Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
                unoptimized
              />
            </Link>
          </div>

          {/* Desktop Left: Logo1 + Location */}
          <div className="hidden lg:flex items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/aipe_logo1.png"
                alt="Aipe Logo"
                width={120}
                height={40}
                className="object-contain"
                priority
                unoptimized
              />
            </Link>

            {/* <LocationSelector /> */}
          </div>

          {/* Center: Desktop Nav OR Mobile Search */}
          <div className="flex-1 flex justify-center px-2 md:px-0">
            {/* Desktop Nav - Absolute Centered */}
            <nav className="hidden lg:flex items-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === link.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Mobile Search */}
            <div className="flex lg:hidden relative w-full max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#1C8AFF]" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full pl-8 h-8 text-xs bg-muted/50 hover:bg-gray-200 transition-colors duration-300 border-0 focus-visible:ring-1 focus-visible:ring-[#1C8AFF]"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4 md:ml-auto">
            {/* Desktop Search */}
            <div className="hidden lg:block relative w-48 lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1C8AFF]" />
              <Input
                type="search"
                placeholder="Search for services..."
                className="w-full pl-10 h-10 bg-muted/50 hover:bg-gray-200 transition-colors duration-300 border-0 focus-visible:ring-1 focus-visible:ring-[#1C8AFF]"
              />
            </div>

            {!isAuthenticated ? (
              <Button
                className="bg-[#1C8AFF]"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Sign Up / Log In
              </Button>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative text-muted-foreground hover:text-primary"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background animate-pulse" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <span className="font-semibold text-sm">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {unreadCount} New
                        </span>
                      )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`px-4 py-3 focus:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0 relative block ${!notification.isRead ? "bg-primary/5" : ""}`}
                            onSelect={() =>
                              handleNotificationClick(
                                notification.id,
                                notification.data,
                              )
                            }
                          >
                            <div className="flex justify-between items-start gap-3 w-full">
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                  <p
                                    className={`text-sm leading-none ${!notification.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                                  >
                                    {notification.title}
                                  </p>
                                  {notification.data?.bookingNumber && (
                                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-2 shrink-0">
                                      {notification.data.bookingNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {notification.body}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 pt-1">
                                  {formatDistanceToNow(
                                    new Date(notification.createdAt),
                                    { addSuffix: true },
                                  )}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No notifications
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-border grid grid-cols-2 gap-2 bg-muted/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-muted-foreground hover:text-primary w-full justify-center"
                          onClick={markAllRead}
                        >
                          <Check className="w-3 h-3 mr-1.5" />
                          Mark all read
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-center"
                          onClick={clearAll}
                        >
                          <Trash2 className="w-3 h-3 mr-1.5" />
                          Clear all
                        </Button>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/experts")}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Experts</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => dispatch(logout())}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
          <OTPModal />
        </div>
      </div>
    </header>
  );
}
