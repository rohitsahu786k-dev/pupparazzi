"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, Search, Settings, Star, UserCircle2 } from "lucide-react";
import { LocationFetcher } from "@/components/ui/location-fetcher";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const userName = session?.user?.name || "My Account";
  const userEmail = session?.user?.email || "";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">

        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center transition-transform hover:scale-[1.02]" aria-label="Pupparazzi home">
            <Image src="/pupparazzi-logo.png" alt="Pupparazzi" width={180} height={36} priority className="h-10 w-auto" />
          </Link>
          <div className="hidden lg:block border-l border-border h-8 mx-2" />
          <div className="hidden md:flex items-center gap-2">
            <LocationFetcher />
          </div>
        </div>

        <nav className="flex items-center gap-4 md:gap-6 text-sm font-semibold text-secondary">
          <Link href="/#services" className="hidden md:flex items-center gap-1.5 hover:text-primary transition-colors">
            <Search className="h-4 w-4" /> Services
          </Link>
          <Link href="/#offers" className="hidden md:flex items-center gap-1.5 hover:text-primary transition-colors">
            <Star className="h-4 w-4" /> Offers
          </Link>

          {status === "authenticated" ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => !prev)}
                className="h-10 pl-2 pr-3 rounded-[10px] border border-border bg-white hover:bg-muted/40 transition-colors flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary to-accent text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
                <span className="hidden md:block text-sm font-semibold text-foreground max-w-[120px] truncate">
                  {userName}
                </span>
                <ChevronDown className={`h-4 w-4 text-secondary transition-transform ${openMenu ? "rotate-180" : ""}`} />
              </button>

              {openMenu && (
                <div className="absolute right-0 top-12 w-60 rounded-[10px] border border-border bg-white shadow-xl p-2 z-50">
                  <div className="px-2 py-2 border-b border-border mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                    <p className="text-xs text-secondary truncate">{userEmail}</p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setOpenMenu(false)}
                    className="w-full px-2 py-2 rounded-[10px] text-sm font-medium text-foreground hover:bg-muted/60 transition-colors flex items-center gap-2"
                  >
                    <UserCircle2 className="h-4 w-4 text-secondary" />
                    Profile
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setOpenMenu(false)}
                    className="w-full px-2 py-2 rounded-[10px] text-sm font-medium text-foreground hover:bg-muted/60 transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4 text-secondary" />
                    Settings
                  </Link>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full mt-1 px-2 py-2 rounded-[10px] text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/login" className="flex items-center gap-1.5">
                Sign In
              </Link>
            </Button>
          )}

          <Button asChild>
            <Link href="/book">Book Now</Link>
          </Button>
        </nav>

      </div>
    </header>
  );
}
