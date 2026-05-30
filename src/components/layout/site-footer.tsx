"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  // Hide footer on dashboard and admin pages (they have their own layouts)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="w-full bg-white py-16 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">

          <div className="space-y-5">
            <Image src="/pupparazzi-logo.png" alt="Pupparazzi" width={180} height={36} className="h-10 w-auto" />
            <p className="text-secondary text-sm leading-relaxed">
              Ahmedabad&apos;s most trusted pet care platform. Providing premium grooming and medical care since 2026.
            </p>
          </div>

          <div className="space-y-5">
            <h4 className="font-bold text-foreground uppercase tracking-widest text-xs">Company</h4>
            <ul className="space-y-3 text-sm font-medium text-secondary">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="/partner" className="hover:text-primary transition-colors">Partner with Us</Link></li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="font-bold text-foreground uppercase tracking-widest text-xs">Support</h4>
            <ul className="space-y-3 text-sm font-medium text-secondary">
              <li><Link href="/contact" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="font-bold text-foreground uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-3 text-sm font-medium text-secondary">
              <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

        </div>

        <div className="mt-14 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">
            &copy; 2026 Pupparazzi India Pvt Ltd. All rights reserved.
          </p>
          <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">
            Crafted for pets
          </p>
        </div>
      </div>
    </footer>
  );
}
