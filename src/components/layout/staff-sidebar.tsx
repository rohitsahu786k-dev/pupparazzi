"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { name: "Bookings", href: "/staff/bookings", icon: Calendar },
];

export function StaffSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col border-r bg-white text-foreground shadow-sm lg:w-72">
      <div className="border-b p-5 lg:p-6">
        <Link href="/staff" className="flex items-center" aria-label="Pupparazzi staff">
          <NextImage src="/pupparazzi-logo.png" alt="Pupparazzi" width={190} height={38} className="h-10 w-auto" />
        </Link>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3 lg:px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/staff");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="border-t p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-500/10"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </div>
  );
}
