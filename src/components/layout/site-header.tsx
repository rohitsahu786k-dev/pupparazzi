"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Search, Star, User } from "lucide-react";
import { LocationFetcher } from "@/components/ui/location-fetcher";

export function SiteHeader() {
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
          <Button variant="ghost" asChild>
            <Link href="/login" className="flex items-center gap-1.5">
              <User className="h-4 w-4" /> Sign In
            </Link>
          </Button>
          <Button asChild>
            <Link href="/book">Book Now</Link>
          </Button>
        </nav>

      </div>
    </header>
  );
}
