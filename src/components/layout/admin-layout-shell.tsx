"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface AdminLayoutShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  avatarLabel?: string;
}

export function AdminLayoutShell({ sidebar, children, title = "Admin Portal", avatarLabel = "A" }: AdminLayoutShellProps) {
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
    <div className="min-h-dvh w-full bg-[var(--surface)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-72">
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
              className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b bg-white/90 px-3 shadow-sm backdrop-blur sm:px-4 lg:h-16 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-sm font-semibold text-primary">
            {avatarLabel}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 md:px-5 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
