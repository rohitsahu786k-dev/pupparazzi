"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Home,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sortServiceCategories } from "@/lib/service-rules";
import type { HomeService } from "@/components/home/services-tabs";

type Testimonial = {
  id: string;
  name: string;
  pet_name?: string | null;
  pet_breed?: string | null;
  rating: number;
  text: string;
  image?: string | null;
};

type PremiumHomeProps = {
  services: HomeService[];
  testimonials: Testimonial[];
  bookingCount: number;
  clientCount: number;
  petCount: number;
};

const contact = {
  phone: "063588 48177",
  phoneHref: "tel:+916358848177",
  whatsappHref: "https://wa.me/916358848177",
  address: "Next Crossroad to Bharat Petroleum, VIP Rd, opp. Stanza, South Bopal, Ahmedabad, Gujarat 380057",
};

const heroSlides = [
  {
    title: "Luxury pet care in South Bopal.",
    subtitle: "Boarding, grooming, swimming, training, and daycare under one premium, hygienic roof.",
    image: "/images/IMG_5623.JPG.jpeg",
    mobileImage: "/images/IMG_5600.PNG",
    cta: "Book Appointment",
    href: "/book",
    secondary: "Explore Services",
    secondaryHref: "#services",
  },
  {
    title: "Happy pets. Calm parents.",
    subtitle: "A pet-first club experience with trained handlers, clean spaces, and regular updates.",
    image: "/images/IMG_5627.JPG.jpeg",
    mobileImage: "/images/IMG_5601.PNG",
    cta: "Call Now",
    href: contact.phoneHref,
    secondary: "WhatsApp Us",
    secondaryHref: contact.whatsappHref,
  },
  {
    title: "Pool days, spa days, better days.",
    subtitle: "Premium enrichment and care experiences designed around your pet's comfort.",
    image: "/images/IMG_5600.PNG",
    mobileImage: "/images/IMG_5606.PNG",
    cta: "Book Swimming",
    href: "/book?service=swimming",
    secondary: "Visit Club",
    secondaryHref: "/contact",
  },
];

const whyItems = [
  ["Passionate Pet Care Experts", "A trained team that understands body language, comfort, and daily care routines."],
  ["Safe & Comfortable Environment", "Thoughtful spaces designed for calm stays, play, grooming, and supervised enrichment."],
  ["Hygienic Facilities", "Clean handling, sanitized areas, and vaccination-aware workflows for safer care."],
  ["Personalised Attention", "Care notes, food preferences, allergies, temperament, and special requests stay visible."],
  ["Premium Services Under One Roof", "Boarding, grooming, swimming, training, walking, and daycare in one club ecosystem."],
  ["Regular Updates", "Booking details, documents, invoices, and communication stay organized for every pet parent."],
];

const faqs = [
  ["How do I book a service?", "Choose your service, date, pet details, address, and submit the booking. Our team confirms availability and next steps."],
  ["What vaccinations are required for boarding?", "Rabies and core vaccinations are recommended. Boarding bookings can include vaccination certificate uploads for review."],
  ["Can I visit before booking?", "Yes. You can call or WhatsApp us to schedule a visit to the club before confirming boarding or daycare."],
  ["What should I bring with my pet?", "Food, medication if any, vaccination records, leash/collar, and comfort items your pet already knows."],
  ["How long does grooming take?", "It depends on pet size, coat type, temperament, and selected package. Most sessions are confirmed by the team during booking."],
  ["Do you offer training for puppies?", "Yes. Puppy training and behaviour guidance can be requested through the booking flow or by calling the club."],
];

function money(value?: number | null) {
  if (value == null) return "";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function serviceImage(service: HomeService) {
  const images = Array.isArray(service.images_json) ? service.images_json.map(String).filter(Boolean) : [];
  if (images.length > 0) return images[0];
  const category = service.category?.toLowerCase() || "";
  if (category.includes("boarding")) return "/service-boarding-premium.png";
  if (category.includes("training")) return "/service-training.png";
  if (category.includes("swimming")) return "/images/IMG_5600.PNG";
  if (category.includes("walk")) return "/service-walking.png";
  return "/service-grooming-premium.png";
}

function ServiceIcon({ category }: { category: string }) {
  const key = category.toLowerCase();
  if (key.includes("boarding") || key.includes("daycare")) return <Home className="h-4 w-4" />;
  if (key.includes("swimming")) return <Waves className="h-4 w-4" />;
  if (key.includes("vet")) return <Stethoscope className="h-4 w-4" />;
  return <PawPrint className="h-4 w-4" />;
}

function scrollCarousel(id: string, direction: "left" | "right") {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" });
}

export function PremiumHome({ services, testimonials, bookingCount, clientCount, petCount }: PremiumHomeProps) {
  const [slide, setSlide] = useState(0);
  const [activeFaq, setActiveFaq] = useState(0);
  const grouped = useMemo(() => {
    const map = new Map<string, HomeService[]>();
    services.forEach((service) => {
      const category = service.category || "Other";
      map.set(category, [...(map.get(category) || []), service]);
    });
    return map;
  }, [services]);
  const categories = useMemo(() => sortServiceCategories(Array.from(grouped.keys())), [grouped]);
  const [activeCategory, setActiveCategory] = useState(categories[0] || "Boarding");

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!categories.includes(activeCategory) && categories[0]) setActiveCategory(categories[0]);
  }, [activeCategory, categories]);

  const activeServices = grouped.get(activeCategory) || [];
  const proof = [
    [bookingCount.toLocaleString("en-IN"), "bookings managed"],
    [clientCount.toLocaleString("en-IN"), "active pet parents"],
    [petCount.toLocaleString("en-IN"), "pet profiles"],
    [services.length.toLocaleString("en-IN"), "premium services"],
  ];

  return (
    <main className="bg-[var(--surface)] text-foreground">
      <section className="relative min-h-[calc(100svh-80px)] overflow-hidden bg-foreground">
        {heroSlides.map((item, index) => (
          <div key={item.title} className={`absolute inset-0 transition-opacity duration-700 ${index === slide ? "opacity-100" : "opacity-0"}`}>
            <Image src={item.image} alt={item.title} fill priority={index === 0} className="hidden object-cover md:block" sizes="100vw" />
            <Image src={item.mobileImage} alt={item.title} fill priority={index === 0} className="object-cover md:hidden" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09121f]/85 via-[#09121f]/45 to-[#09121f]/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09121f]/70 via-transparent to-transparent" />
          </div>
        ))}

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] max-w-7xl items-end px-4 pb-10 pt-24 sm:px-6 lg:px-8 lg:pb-16">
          <div className="max-w-3xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles className="h-4 w-4 text-accent" />
              Premium pet care club in Ahmedabad
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {heroSlides[slide].title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/82 sm:text-lg">
              {heroSlides[slide].subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={heroSlides[slide].href}>{heroSlides[slide].cta}</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link href={heroSlides[slide].secondaryHref}>{heroSlides[slide].secondary}</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-4 z-20 flex items-center gap-2 sm:right-8">
          <button aria-label="Previous slide" onClick={() => setSlide((slide + heroSlides.length - 1) % heroSlides.length)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {heroSlides.map((item, index) => (
              <button key={item.title} aria-label={`Go to slide ${index + 1}`} onClick={() => setSlide(index)} className={`h-2 rounded-full transition-all ${index === slide ? "w-8 bg-white" : "w-2 bg-white/45"}`} />
            ))}
          </div>
          <button aria-label="Next slide" onClick={() => setSlide((slide + 1) % heroSlides.length)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="relative z-20 -mt-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-2 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-[var(--shadow-premium)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {proof.map(([value, label]) => (
            <div key={label} className="rounded-xl bg-[var(--surface)] px-5 py-6 text-center">
              <p className="text-3xl font-semibold text-foreground">{value}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-foreground p-8 text-white shadow-[var(--shadow-premium)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Featured Event</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Club visit and temperament meet-up weekend.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Visit Pupparazzi Club, meet the team, explore boarding spaces, and discuss the right care plan for your pet.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild><Link href="/contact">Plan a Visit</Link></Button>
              <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20" asChild><Link href={contact.whatsappHref}>WhatsApp Club</Link></Button>
            </div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-2xl shadow-[var(--shadow-premium)]">
            <Image src="/images/IMG_5623.JPG.jpeg" alt="Pupparazzi Club evening facility" fill className="object-cover" sizes="(min-width:1024px) 40vw, 100vw" />
          </div>
        </div>
      </section>

      <section id="services" className="border-y border-border/70 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Services</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Category-wise care, easy to book.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Services and categories are loaded from the backend, so active offerings stay synced with operations.
              </p>
            </div>
            <Button variant="outline" asChild><Link href="/services">View All Services <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>

          <div className="mt-10 overflow-x-auto pb-2">
            <div className="inline-flex min-w-full gap-2 rounded-xl border bg-[var(--surface)] p-1.5">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${activeCategory === category ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/70"}`}>
                  <ServiceIcon category={category} />
                  {category}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{grouped.get(category)?.length || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-2xl font-semibold">{activeCategory}</h3>
            <div className="flex gap-2">
              <button aria-label="Previous service" onClick={() => scrollCarousel("service-carousel", "left")} className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white"><ChevronLeft className="h-4 w-4" /></button>
              <button aria-label="Next service" onClick={() => scrollCarousel("service-carousel", "right")} className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div id="service-carousel" className="mt-5 flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeServices.map((service) => (
              <article key={service.id} className="min-w-[82vw] snap-start overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-premium)] sm:min-w-[360px] lg:min-w-[390px]">
                <div className="relative h-56 bg-muted">
                  <Image src={serviceImage(service)} alt={service.name} fill className="object-cover" sizes="390px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold">
                    <ServiceIcon category={service.category} />
                    {service.service_group || service.category}
                  </span>
                </div>
                <div className="flex min-h-64 flex-col p-5">
                  <h4 className="text-xl font-semibold tracking-tight">{service.name}</h4>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{service.description_short || "Premium pet care experience with Pupparazzi's trained team."}</p>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                    <p className="text-lg font-semibold">{service.discounted_price ? money(service.discounted_price) : money(service.price)}</p>
                    <Button asChild><Link href={`/book?service=${service.category.toLowerCase()}`}>Book <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative min-h-[520px] overflow-hidden rounded-2xl shadow-[var(--shadow-premium)]">
            <Image src="/images/IMG_5627.JPG.jpeg" alt="Pet parent training and care session" fill className="object-cover" sizes="(min-width:1024px) 44vw, 100vw" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">About Pupparazzi Club</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">A warm club experience, operated with serious care systems.</h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Pupparazzi Club brings premium grooming, boarding, swimming, training, and daycare into a single pet-first environment. The team focuses on hygiene, calm handling, personalised attention, and a transparent booking experience for every parent.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Experienced handlers", "Clean facility", "Backend-managed bookings", "South Bopal location"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border bg-white p-4">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                  <span className="text-sm font-semibold">{item}</span>
                </div>
              ))}
            </div>
            <Button className="mt-8 w-fit" variant="outline" asChild><Link href="/about">Know More <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="bg-foreground py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Why Choose Us</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Every detail is designed for trust, comfort, and repeat care.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyItems.map(([title, copy], index) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition hover:bg-white/[0.1]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-foreground">
                  {index % 2 === 0 ? <HeartHandshake className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Reviews</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Trusted by pet parents.</h2>
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}
              <span className="ml-2 text-sm text-muted-foreground">Google reviews + client stories</span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {(testimonials.length ? testimonials.slice(0, 4) : [
                { id: "1", name: "Pupparazzi Parent", rating: 5, text: "Clean, warm, and very professional care. The team made the whole experience smooth." },
                { id: "2", name: "Happy Pet Parent", rating: 5, text: "Loved the updates and the calm handling. Great grooming and boarding experience." },
              ]).map((review) => (
                <div key={review.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                  <div className="mb-4 flex gap-1 text-yellow-400">{Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                  <p className="text-sm leading-7 text-muted-foreground">&ldquo;{review.text}&rdquo;</p>
                  <p className="mt-5 font-semibold">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{[review.pet_name, review.pet_breed].filter(Boolean).join(", ") || "Pet Parent"}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="review-widget_net" data-uuid="178fae9e-b9d7-4cf9-834a-222fab300d73" data-template="10" data-lang="en" data-theme="light" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">FAQs</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Before you book.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">Quick answers for boarding, grooming, visits, and training requests.</p>
          </div>
          <div className="space-y-3">
            {faqs.map(([question, answer], index) => (
              <button key={question} onClick={() => setActiveFaq(index)} className="w-full rounded-xl border bg-[var(--surface)] p-5 text-left transition hover:bg-white">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">{question}</span>
                  <span className="text-primary">{activeFaq === index ? "-" : "+"}</span>
                </div>
                {activeFaq === index && <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Instagram</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Follow the club moments.</h2>
            <div className="mt-6 overflow-hidden rounded-xl border bg-[var(--surface)] p-2">
              <blockquote className="instagram-media" data-instgrm-permalink="https://www.instagram.com/pupparazziclub/?utm_source=ig_embed&utm_campaign=loading" data-instgrm-version="14" style={{ background: "#fff", border: 0, margin: "1px", maxWidth: 658, minWidth: 280, padding: 0, width: "100%" }}>
                <a href="https://www.instagram.com/pupparazziclub/" target="_blank" rel="noreferrer" className="block p-8 text-center text-sm font-semibold text-primary">View Pupparazzi Club on Instagram</a>
              </blockquote>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-foreground text-white shadow-[var(--shadow-premium)]">
            <div className="relative min-h-72">
              <Image src="/images/IMG_5600.PNG" alt="Dog swimming at Pupparazzi Club" fill className="object-cover opacity-80" sizes="(min-width:1024px) 50vw, 100vw" />
            </div>
            <div className="p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Bottom Highlight</p>
              <h3 className="mt-3 text-3xl font-semibold">Swimming, boarding, grooming, and more in one premium club.</h3>
              <Button className="mt-6" asChild><Link href="/book">Book Appointment</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#ee7fa1] to-accent p-8 text-white shadow-[var(--shadow-premium)] sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Ready to Give Your Pet the Best Care?</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Book an appointment today and let your pet enjoy the Pupparazzi experience.</h2>
                <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-white/80">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {contact.address}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button className="bg-white text-foreground hover:bg-white/90" size="lg" asChild><Link href="/book">Book Appointment</Link></Button>
                <Button className="border-white/30 bg-white/10 text-white hover:bg-white/20" variant="outline" size="lg" asChild><Link href={contact.phoneHref}><Phone className="mr-2 h-4 w-4" /> Call Now</Link></Button>
                <Button className="border-white/30 bg-white/10 text-white hover:bg-white/20" variant="outline" size="lg" asChild><Link href={contact.whatsappHref}><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us</Link></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Script src="https://grwapi.net/widget.min.js" strategy="lazyOnload" />
      <Script src="//platform.instagram.com/en_US/embeds.js" strategy="lazyOnload" />
    </main>
  );
}
