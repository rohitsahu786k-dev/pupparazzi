"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

const contact = {
  address: "Next Crossroad to Bharat Petroleum, VIP Rd, opp. Stanza, South Bopal, Ahmedabad, Gujarat 380057",
  phone: "063588 48177",
  phoneHref: "tel:+916358848177",
  whatsappHref: "https://wa.me/916358848177",
  email: "pupparazzipetstore@gmail.com",
};

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  return (
    <footer className="w-full border-t border-border bg-foreground text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]">
          <div>
            <div className="inline-flex rounded-xl bg-white p-3">
              <Image src="/pupparazzi-logo.png" alt="Pupparazzi Club" width={180} height={36} className="h-10 w-auto" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/68">
              Premium boarding, grooming, swimming, training, and daycare for pets in South Bopal, Ahmedabad.
            </p>
            <div className="mt-5 flex gap-2">
              <Link href={contact.phoneHref} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white hover:bg-white/14" aria-label="Call Pupparazzi">
                <Phone className="h-4 w-4" />
              </Link>
              <Link href={contact.whatsappHref} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white hover:bg-white/14" aria-label="WhatsApp Pupparazzi">
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link href={`mailto:${contact.email}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white hover:bg-white/14" aria-label="Email Pupparazzi">
                <Mail className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Company</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/72">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/services" className="hover:text-white">Services</Link></li>
              <li><Link href="/offers" className="hover:text-white">Offers</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Support</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/72">
              <li><Link href="/book" className="hover:text-white">Book Appointment</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white">Refund Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white">Terms & Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Visit The Club</h4>
            <p className="mt-5 flex items-start gap-2 text-sm leading-7 text-white/72">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-accent" />
              {contact.address}
            </p>
            <p className="mt-4 text-sm text-white/72">
              <Link href={contact.phoneHref} className="hover:text-white">{contact.phone}</Link>
            </p>
            <p className="mt-2 text-sm text-white/72">
              <Link href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</Link>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 Pupparazzi Club. All rights reserved.</p>
          <p>Premium pet care, crafted with calm precision.</p>
        </div>
      </div>
    </footer>
  );
}
