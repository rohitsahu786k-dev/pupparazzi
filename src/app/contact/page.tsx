import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_ADDRESS } from "@/lib/homepage-content";
import { DEFAULT_BUSINESS_SETTINGS, getSetting } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";

const contact = {
  phone: "063588 48177",
  phoneHref: "tel:+916358848177",
  whatsappHref: "https://wa.me/916358848177",
  email: "pupparazzipetstore@gmail.com",
  address: BUSINESS_ADDRESS,
};

export const metadata = pageMetadata({
  title: "Contact",
  description: "Contact Pupparazzi Club in Ahmedabad for pet boarding, grooming, swimming, training, daycare, and booking support.",
  path: "/contact",
});

function makeContactLinks(phone = contact.phone) {
  const rawDigits = phone.replace(/\D/g, "");
  const localDigits = rawDigits.length === 11 && rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits;
  const phoneDigits = localDigits.length === 10 ? `91${localDigits}` : localDigits || "916358848177";
  return {
    phone,
    phoneHref: `tel:+${phoneDigits}`,
    whatsappHref: `https://wa.me/${phoneDigits}`,
  };
}

export default async function ContactPage() {
  const business = await getSetting("business", DEFAULT_BUSINESS_SETTINGS);
  const contactInfo = {
    ...makeContactLinks(business.phone),
    whatsappHref: makeContactLinks(business.whatsapp || business.phone).whatsappHref,
    email: business.email || contact.email,
    address: business.address || contact.address,
    workingHours: business.workingHours || "Monday to Sunday, 9:00 AM to 8:00 PM",
  };
  const cards = [
    { icon: Phone, title: "Call", copy: "Speak with the Pupparazzi team", value: contactInfo.phone, href: contactInfo.phoneHref },
    { icon: MessageCircle, title: "WhatsApp", copy: "Fast booking and visit support", value: "Message us", href: contactInfo.whatsappHref },
    { icon: Mail, title: "Email", copy: "Support and general enquiries", value: contactInfo.email, href: `mailto:${contactInfo.email}` },
    { icon: Clock, title: "Working Hours", copy: "Visit timing", value: contactInfo.workingHours, href: "/book" },
  ];
  const mapSrc = business.mapEmbedUrl || `https://www.google.com/maps?q=${encodeURIComponent(contactInfo.address)}&output=embed`;

  return (
    <main className="bg-[var(--surface)]">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Contact</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Visit, call, or book the Pupparazzi experience.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              We are in Ahmedabad, ready for premium boarding, grooming, swimming, training, and daycare conversations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild><Link href="/book">Book Appointment</Link></Button>
              <Button size="lg" variant="outline" asChild><Link href={contactInfo.whatsappHref}>WhatsApp Us</Link></Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" />
              {contactInfo.address}
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-premium)]">
                <Icon className="h-8 w-8 text-primary" />
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.value}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-premium)]">
          <iframe
            title="Pupparazzi Club map"
            src={mapSrc}
            className="h-[420px] w-full"
            loading="lazy"
          />
        </div>
      </section>
    </main>
  );
}
