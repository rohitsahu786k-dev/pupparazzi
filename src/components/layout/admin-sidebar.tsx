"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Users, PawPrint,
  Settings, Scissors, Banknote, FileText, MapPin, TicketPercent, MessageSquareQuote, BellRing, MailCheck
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Bookings", href: "/admin/bookings", icon: Calendar },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Pets", href: "/admin/pets", icon: PawPrint },
  { name: "Reminders", href: "/admin/reminders", icon: BellRing },
  { name: "Email Templates", href: "/admin/email-templates", icon: MailCheck },
  { name: "Services", href: "/admin/services", icon: Scissors },
  { name: "Coupons", href: "/admin/coupons", icon: TicketPercent },
  { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { name: "Payments & Invoices", href: "/admin/payments", icon: Banknote },
  { name: "Client Documents", href: "/admin/assets", icon: FileText },
  { name: "Service Areas", href: "/admin/service-areas", icon: MapPin },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const staffNavNames = new Set(["Dashboard", "Bookings", "Clients", "Pets", "Services", "Client Documents"]);

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const visibleNavItems = session?.user?.role === "STAFF"
    ? navItems.filter((item) => staffNavNames.has(item.name))
    : navItems;

  return (
    <div className="flex h-full w-full flex-col border-r bg-white text-foreground shadow-sm lg:w-72">
      <div className="border-b p-5 lg:p-6">
        <Link href="/admin" className="flex items-center" aria-label="Pupparazzi admin">
          <NextImage src="/pupparazzi-logo.png" alt="Pupparazzi" width={190} height={38} className="h-10 w-auto" />
        </Link>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3 lg:px-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log out
        </button>
      </div>
    </div>
  );
}
