"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Calendar, PawPrint, User, CreditCard, Bell, HelpCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "My Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "My Pets", href: "/dashboard/pets", icon: PawPrint },
  { name: "Profile & Settings", href: "/dashboard/settings", icon: User },
  { name: "Wallet & Payments", href: "/dashboard/wallet", icon: CreditCard },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Help & FAQs", href: "/dashboard/help", icon: HelpCircle },
];

export function ClientSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r shadow-sm">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">PetCare Pro</span>
        </Link>
      </div>
      <div className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
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
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </div>
  );
}
