"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface DashboardLayoutShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayoutShell({ sidebar, children }: DashboardLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-muted/20">
      <div className="hidden shrink-0 lg:block">
        {sidebar}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 z-10 h-full w-[min(88vw,20rem)] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 shadow-sm sm:px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard">
            <Image src="/pupparazzi-logo.png" alt="Pupparazzi" width={130} height={26} className="h-7 w-auto" />
          </Link>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 md:px-5 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
