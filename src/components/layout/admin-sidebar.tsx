"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Users, PawPrint,
  Settings, Scissors, Banknote, Image, MapPin, TicketPercent, ClipboardList, MessageSquareQuote, ShieldCheck
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Bookings", href: "/admin/bookings", icon: Calendar },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Client Records", href: "/admin/client-records", icon: ClipboardList },
  { name: "Pets", href: "/admin/pets", icon: PawPrint },
  { name: "Vaccination Certificates", href: "/admin/vaccination-certificates", icon: ShieldCheck },
  { name: "Services", href: "/admin/services", icon: Scissors },
  { name: "Coupons", href: "/admin/coupons", icon: TicketPercent },
  { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { name: "Payments & Invoices", href: "/admin/payments", icon: Banknote },
  { name: "Assets", href: "/admin/assets", icon: Image },
  { name: "Service Areas", href: "/admin/service-areas", icon: MapPin },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-white text-foreground border-r shadow-sm">
      <div className="p-6">
        <Link href="/admin" className="flex items-center" aria-label="Pupparazzi admin">
          <NextImage src="/pupparazzi-logo.png" alt="Pupparazzi" width={190} height={38} className="h-10 w-auto" />
        </Link>
      </div>
      <div className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
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
