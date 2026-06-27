"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, Menu, MessageCircle, Phone, Search, Settings, Star, UserCircle2, X } from "lucide-react";
import { LocationFetcher } from "@/components/ui/location-fetcher";

const publicLinks = [
  { label: "Services", href: "/#services", icon: Search },
  { label: "Offers", href: "/offers", icon: Star },
  { label: "Contact", href: "/contact", icon: Phone },
];

type SiteHeaderProps = {
  business?: {
    phone?: string;
    whatsapp?: string;
  };
};

function makeContactLinks(phone = "063588 48177") {
  const rawDigits = phone.replace(/\D/g, "");
  const localDigits = rawDigits.length === 11 && rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits;
  const phoneDigits = localDigits.length === 10 ? `91${localDigits}` : localDigits || "916358848177";
  return {
    phone,
    phoneHref: `tel:+${phoneDigits}`,
    whatsappHref: `https://wa.me/${phoneDigits}`,
  };
}

export function SiteHeader({ business }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const [openMenu, setOpenMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  const contact = {
    ...makeContactLinks(business?.phone),
    whatsappHref: makeContactLinks(business?.whatsapp || business?.phone).whatsappHref,
  };

  const userName = session?.user?.name || "My Account";
  const userEmail = session?.user?.email || "";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/88 shadow-sm backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center transition-transform hover:scale-[1.02]" aria-label="Pupparazzi home">
            <Image src="/pupparazzi-logo.png" alt="Pupparazzi" width={180} height={36} priority className="h-10 w-auto" />
          </Link>
          <div className="hidden h-8 border-l border-border lg:block" />
          <div className="hidden items-center gap-2 md:flex">
            <LocationFetcher />
          </div>
        </div>

        <nav className="hidden items-center gap-4 text-sm font-semibold text-secondary lg:flex">
          {publicLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link href={contact.phoneHref} className="hidden items-center gap-1.5 transition-colors hover:text-primary xl:flex">
            <Phone className="h-4 w-4" />
            {contact.phone}
          </Link>
          <Link href={contact.whatsappHref} className="hidden items-center gap-1.5 transition-colors hover:text-primary xl:flex">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Link>

          {status === "authenticated" ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => !prev)}
                className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white pl-2 pr-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-semibold text-white">
                  {initials}
                </div>
                <span className="max-w-[120px] truncate text-sm font-semibold text-foreground">{userName}</span>
                <ChevronDown className={`h-4 w-4 text-secondary transition-transform ${openMenu ? "rotate-180" : ""}`} />
              </button>

              {openMenu && (
                <div className="absolute right-0 top-12 z-50 w-60 rounded-lg border border-border bg-white p-2 shadow-xl">
                  <div className="mb-1 border-b border-border px-2 py-2">
                    <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                    <p className="truncate text-xs text-secondary">{userEmail}</p>
                  </div>
                  <Link href="/profile" onClick={() => setOpenMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted/60">
                    <UserCircle2 className="h-4 w-4 text-secondary" />
                    Profile
                  </Link>
                  <Link href="/settings" onClick={() => setOpenMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted/60">
                    <Settings className="h-4 w-4 text-secondary" />
                    Settings
                  </Link>
                  <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          <Button asChild>
            <Link href="/book">Book Now</Link>
          </Button>
        </nav>

        <button type="button" onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-foreground lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/45 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="ml-auto flex h-full w-[min(88vw,22rem)] flex-col bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Image src="/pupparazzi-logo.png" alt="Pupparazzi" width={160} height={32} className="h-9 w-auto" />
              <button type="button" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 grid gap-2 text-sm font-semibold">
              {[...publicLinks, { label: "About", href: "/about", icon: Star }, { label: "Sign In", href: "/login", icon: UserCircle2 }].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg border bg-[var(--surface)] px-4 py-3 text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto grid gap-3">
              <Button asChild>
                <Link href="/book" onClick={() => setMobileOpen(false)}>Book Appointment</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={contact.whatsappHref}>WhatsApp Us</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
