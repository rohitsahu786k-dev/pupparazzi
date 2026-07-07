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
  Users,
  Award,
  Clock,
  Activity,
  Heart,
  Quote,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_ADDRESS, DEFAULT_HOMEPAGE_SETTINGS, type HomepageSettings } from "@/lib/homepage-content";
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
  business: {
    name?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
  };
  homepage: HomepageSettings;
};

const contact = {
  phone: "063588 48177",
  phoneHref: "tel:+916358848177",
  whatsappHref: "https://wa.me/916358848177",
  address: BUSINESS_ADDRESS,
};

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

function getStatIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("booking")) return <CalendarCheck className="h-5 w-5 text-primary" />;
  if (l.includes("parent") || l.includes("client")) return <Users className="h-5 w-5 text-accent" />;
  if (l.includes("profile") || l.includes("pet")) return <PawPrint className="h-5 w-5 text-emerald-500" />;
  return <Award className="h-5 w-5 text-amber-500" />;
}

function getFeatureIcon(index: number) {
  switch (index % 6) {
    case 0: return <HeartHandshake className="h-5 w-5 text-primary" />;
    case 1: return <Sparkles className="h-5 w-5 text-accent" />;
    case 2: return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
    case 3: return <Clock className="h-5 w-5 text-sky-500" />;
    case 4: return <Award className="h-5 w-5 text-amber-500" />;
    default: return <Activity className="h-5 w-5 text-rose-500" />;
  }
}

function scrollCarousel(id: string, direction: "left" | "right") {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" });
}

function makePhoneLinks(phone = contact.phone) {
  const rawDigits = phone.replace(/\D/g, "");
  const localDigits = rawDigits.length === 11 && rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits;
  const phoneDigits = localDigits.length === 10 ? `91${localDigits}` : localDigits || "916358848177";
  return {
    phone,
    phoneHref: `tel:+${phoneDigits}`,
    whatsappHref: `https://wa.me/${phoneDigits}`,
  };
}

export function PremiumHome({ services, testimonials, bookingCount, clientCount, petCount, business, homepage }: PremiumHomeProps) {
  const [slide, setSlide] = useState(0);
  const [bottomSlide, setBottomSlide] = useState(0);
  const [activeFaq, setActiveFaq] = useState(0);
  const homepageContent = useMemo(() => ({
    ...DEFAULT_HOMEPAGE_SETTINGS,
    ...homepage,
    heroSlides: homepage?.heroSlides?.length ? homepage.heroSlides
      .filter((item) => item.image && item.isActive !== false)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) : DEFAULT_HOMEPAGE_SETTINGS.heroSlides,
    features: homepage?.features?.length ? homepage.features.filter((item) => item.title) : DEFAULT_HOMEPAGE_SETTINGS.features,
    faqs: homepage?.faqs?.length ? homepage.faqs.filter((item) => item.question) : DEFAULT_HOMEPAGE_SETTINGS.faqs,
    bottomItems: homepage?.bottomItems?.length ? homepage.bottomItems
      .filter((item) => item.title && item.image && item.isActive !== false)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) : DEFAULT_HOMEPAGE_SETTINGS.bottomItems,
  }), [homepage]);
  const heroSlides = homepageContent.heroSlides.length ? homepageContent.heroSlides : DEFAULT_HOMEPAGE_SETTINGS.heroSlides;
  const featureItems = homepageContent.features.length ? homepageContent.features : DEFAULT_HOMEPAGE_SETTINGS.features;
  const faqItems = homepageContent.faqs.length ? homepageContent.faqs : DEFAULT_HOMEPAGE_SETTINGS.faqs;
  const bottomItems = homepageContent.bottomItems.length ? homepageContent.bottomItems : DEFAULT_HOMEPAGE_SETTINGS.bottomItems;
  const activeSlide = heroSlides[slide] || heroSlides[0];
  const activeBottomItem = bottomItems[bottomSlide] || bottomItems[0];
  const contactInfo = {
    ...makePhoneLinks(business?.phone),
    whatsappHref: makePhoneLinks(business?.whatsapp || business?.phone).whatsappHref,
    email: business?.email || "pupparazzipetstore@gmail.com",
    address: business?.address || BUSINESS_ADDRESS,
  };
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
  }, [heroSlides.length]);

  useEffect(() => {
    if (slide >= heroSlides.length) setSlide(0);
  }, [heroSlides.length, slide]);

  useEffect(() => {
    if (bottomSlide >= bottomItems.length) setBottomSlide(0);
  }, [bottomItems.length, bottomSlide]);

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
      {/* Hero Carousel Section */}
      <section className="relative w-full overflow-hidden bg-background">
        <div className="relative w-full aspect-[4/5] sm:aspect-[16/7] md:aspect-[21/9] lg:aspect-[16/6] xl:aspect-[16/6]">
          {heroSlides.map((item, index) => {
            const key = item.title || `slide-${index}`;

            return (
              <div
                key={key}
                className={`absolute inset-0 transition-all duration-500 ${
                  index === slide ? "opacity-100 z-10 pointer-events-auto visible" : "opacity-0 z-0 pointer-events-none invisible"
                }`}
              >
                <Image
                  src={item.image}
                  alt={item.title || "Banner"}
                  fill
                  priority={index === 0}
                  className="hidden object-cover md:block"
                  sizes="100vw"
                  unoptimized
                />
                <Image
                  src={item.mobileImage || item.image}
                  alt={item.title || "Banner"}
                  fill
                  priority={index === 0}
                  className="object-cover md:hidden"
                  sizes="100vw"
                  unoptimized
                />
                
                {/* Optional overlay */}
                {Number(item.overlayOpacity ?? 0) > 0 && (
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: Number(item.overlayOpacity) / 100 }}
                  />
                )}

                {/* Banner link overlay (covers full image, but sits behind text container card) */}
                {item.href && (
                  <Link
                    href={item.href}
                    className="absolute inset-0 z-0 cursor-pointer"
                    aria-label={item.title || "Banner link"}
                  />
                )}
                
                {/* Optional Premium Title Overlay */}
                {item.title && (
                  <div className="absolute inset-x-4 bottom-8 md:bottom-12 md:left-12 md:right-auto z-10 max-w-sm sm:max-w-md md:max-w-lg rounded-2xl border border-white/10 bg-black/35 p-4 md:p-6 text-white backdrop-blur-md shadow-2xl animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 rounded-2xl md:rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] md:text-xs font-semibold backdrop-blur mb-2 md:mb-3 whitespace-normal max-w-full">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      {homepageContent.heroEyebrow || "Pupparazzi"}
                    </div>
                    <h2 className="text-xl md:text-3xl font-extrabold tracking-tight leading-tight">
                      {item.title}
                    </h2>
                    {item.subtitle && (
                      <p className="mt-2 text-xs md:text-sm text-white/80 font-medium leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                    {(item.cta || item.secondary) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.cta && (
                          <Button size="sm" asChild>
                            <Link href={item.href || "/book"}>{item.cta}</Link>
                          </Button>
                        )}
                        {item.secondary && (
                          <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" asChild>
                            <Link href={item.secondaryHref || "/contact"}>{item.secondary}</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Carousel Controls */}
        {heroSlides.length > 1 && (
          <>
            <button
              aria-label="Previous slide"
              onClick={() => setSlide((slide + heroSlides.length - 1) % heroSlides.length)}
              className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition hover:bg-black/40 hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next slide"
              onClick={() => setSlide((slide + 1) % heroSlides.length)}
              className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition hover:bg-black/40 hover:scale-105 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-md">
              {heroSlides.map((item, index) => {
                const key = item.title || `dot-${index}`;
                return (
                  <button
                    key={key}
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => setSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === slide ? "w-6 bg-white" : "w-2 bg-white/50"
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="relative z-20 -mt-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {proof.map(([value, label], index) => {
            const cardStyles = [
              // Card 1: Warm ivory cream with dotted background and pink details
              "bg-[#fffdfa] border-2 border-[#eedecf] rounded-tr-[48px] rounded-bl-[48px] bg-[radial-gradient(#ec7497_1px,transparent_1px)] [background-size:16px_16px] bg-opacity-[0.04]",
              // Card 2: Soft pinkish beige with washi tape accent
              "bg-[#fdf0f4] border-2 border-[#f3cbd4] rounded-tl-[48px] rounded-br-[48px] relative pt-8",
              // Card 3: Minimalist clean ivory with double border styling
              "bg-[#eaf5f7] border-2 border-[#b8dfe6] rounded-bl-[48px] rounded-tr-[48px] before:absolute before:inset-1 before:border before:border-dashed before:border-[#b8dfe6] before:rounded-bl-[44px] before:rounded-tr-[44px]",
              // Card 4: Light clay beige with subtle background paw pattern and accent icon
              "bg-[#edf2fa] border-2 border-[#c5d2e8] rounded-br-[48px] rounded-tl-[48px]"
            ][index % 4];

            return (
              <div 
                key={label} 
                className={`relative overflow-hidden flex flex-col justify-between p-6 min-h-[140px] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_50px_rgba(30,24,20,0.08)] group ${cardStyles}`}
              >
                {/* Washi tape on the second card */}
                {index === 1 && (
                  <div className="washi-tape-pink absolute -top-2 left-12 w-20 h-5 rotate-[3deg] z-20" />
                )}

                <div className="flex items-center justify-between w-full">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                    {getStatIcon(label)}
                  </div>
                  {index === 3 && (
                    <span className="text-xs font-bold text-accent bg-white px-2 py-0.5 rounded-full border border-accent/20">Verified</span>
                  )}
                </div>

                <div className="text-left mt-4">
                  <p className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight">
                    {value}<span className="text-primary font-serif italic text-2xl ml-0.5">+</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 leading-relaxed">{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {homepageContent.eventActive !== false && (
        <section className="py-24 relative overflow-hidden bg-gradient-to-b from-transparent to-[#faf6f0]/50">
          {/* Decorative background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(238,222,207,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(238,222,207,0.25)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

          <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 items-center relative z-10">
            {/* Left Content Card */}
            <div className="overflow-hidden rounded-[40px] rounded-tl-[120px] rounded-br-[120px] bg-white border-2 border-[#eedecf] p-8 sm:p-12 shadow-[0_24px_60px_rgba(30,24,20,0.05)] relative text-left">
              {/* Paper tear or stamp graphic effect */}
              <div className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-primary/20 text-primary/40 rotate-12">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="absolute right-0 top-0 h-96 w-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-10 h-64 w-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fce7ec] px-4 py-1 text-xs font-bold text-primary uppercase tracking-widest mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  {homepageContent.eventEyebrow || "Featured Event"}
                </span>
                
                <h2 className="font-serif text-3xl sm:text-5xl font-normal text-slate-900 leading-tight">
                  {(homepageContent.eventTitle || "").split(" ").map((word, idx) => 
                    word.toLowerCase().includes("meet-up") || word.toLowerCase().includes("meetup") || word.toLowerCase().includes("weekend") ? (
                      <span key={idx} className="text-primary italic font-normal">{word} </span>
                    ) : (
                      <span key={idx}>{word} </span>
                    )
                  )}
                </h2>
                
                {homepageContent.eventDate ? (
                  <p className="mt-5 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-widest">
                    {homepageContent.eventDate}
                  </p>
                ) : null}
                
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base font-medium">
                  {homepageContent.eventCopy}
                </p>
                
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="bg-primary hover:bg-primary/95 text-white rounded-full font-bold shadow-lg shadow-primary/20 border-0 px-8" asChild>
                    <Link href={homepageContent.eventHref || "/contact"}>
                      {homepageContent.eventCta || "Plan a Visit"}
                    </Link>
                  </Button>
                  <Button variant="outline" className="border-[#eae0d5] bg-[#fffdfa] text-slate-700 hover:bg-[#faf6f0] rounded-full font-bold px-6" size="lg" asChild>
                    <Link href={contactInfo.whatsappHref}>
                      <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" /> WhatsApp Club
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Right overlapping scrapbook images */}
            <div className="relative w-full min-h-[380px] sm:min-h-[460px] lg:min-h-[480px] flex items-center justify-center group">
              {/* Back Image with Arch shape */}
              <div className="w-full h-[340px] sm:h-[400px] lg:h-[440px] arch-clip overflow-hidden border border-[#eae0d5] bg-slate-50 shadow-[0_24px_50px_rgba(30,24,20,0.06)] relative group-hover:scale-[1.01] transition-transform duration-500">
                <Image 
                  src={homepageContent.eventImage && !homepageContent.eventImage.includes("IMG_5623") ? homepageContent.eventImage : "/images/pinterest_dog_event.png"} 
                  alt="Pupparazzi Club evening facility" 
                  fill 
                  className="object-cover transition-transform duration-700 group-hover:scale-105" 
                  sizes="(min-width:1024px) 40vw, 100vw" 
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
              </div>

              {/* Overlapping Polaroid Image */}
              <div className="absolute bottom-[-10px] left-[-15px] sm:left-[-30px] w-[170px] sm:w-[210px] bg-white p-3 pb-5 border border-[#eae0d5] shadow-2xl rounded-2xl rotate-[-6deg] hover:rotate-[-2deg] transition-all duration-500 z-20 group-hover:scale-105">
                {/* Washi tape graphic */}
                <div className="washi-tape-pink absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 -rotate-2 z-30" />
                
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                  <Image
                    src="/images/IMG_5600.PNG"
                    alt="Dog splashing pool fun"
                    fill
                    className="object-cover"
                    sizes="180px"
                    unoptimized
                  />
                </div>
                <p className="font-serif text-xs text-center text-[#5c534e] mt-3 tracking-wide">Splashing Fun! 🐾</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="services" className="border-y border-[#eae0d5] bg-white py-24 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-1/4 h-[500px] w-[500px] bg-primary/3 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] bg-accent/3 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute left-10 top-20 text-[#eedecf]/35 font-serif text-[180px] leading-none select-none pointer-events-none hidden lg:block">Care</div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary uppercase tracking-widest mb-2">
                Services
              </span>
              <h2 className="font-serif text-3xl font-normal sm:text-5xl text-slate-900 leading-tight">
                Category-wise care, <span className="text-primary italic">easy to book</span>.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base font-medium">
                Services and categories are loaded from the backend, so active offerings stay synced with operations.
              </p>
            </div>
            <Button variant="outline" className="border-[#eae0d5] bg-[#fffdfa] hover:bg-[#faf6f0] text-slate-700 rounded-full font-bold px-6" asChild>
              <Link href="/services">
                View All Services <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="mt-10 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex min-w-full gap-2 rounded-full border-2 border-[#eedecf] bg-[#faf6f0] p-1.5">
              {categories.map((category) => (
                <button 
                  key={category} 
                  type="button" 
                  onClick={() => setActiveCategory(category)} 
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-xs font-bold transition-all duration-300 ${
                    activeCategory === category 
                      ? "bg-primary text-white shadow-md shadow-primary/15 scale-[1.02]" 
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <ServiceIcon category={category} />
                  <span>{category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeCategory === category ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"}`}>
                    {grouped.get(category)?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-14 flex items-center justify-between">
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 text-left">
              Our <span className="text-accent italic font-normal">{activeCategory}</span> Menu
            </h3>
            <div className="flex gap-2">
              <button 
                aria-label="Previous service" 
                onClick={() => scrollCarousel("service-carousel", "left")} 
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eae0d5] bg-white hover:bg-[#faf6f0] active:scale-95 transition-all text-slate-600 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                aria-label="Next service" 
                onClick={() => scrollCarousel("service-carousel", "right")} 
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eae0d5] bg-white hover:bg-[#faf6f0] active:scale-95 transition-all text-slate-600 shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Staggered Snap Scroll Carousel */}
          <div id="service-carousel" className="mt-8 flex snap-x gap-8 overflow-x-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeServices.map((service, index) => {
              const cardRotation = index % 2 === 0 ? "hover:rotate-[0.5deg]" : "hover:rotate-[-0.5deg]";
              const displayPrice = service.discounted_price ? service.discounted_price : service.price;

              return (
                <article 
                  key={service.id} 
                  className={`min-w-[85vw] snap-start flex flex-col overflow-hidden rounded-[36px] rounded-br-[80px] border-2 border-[#eedecf] bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_50px_rgba(30,24,20,0.08)] sm:min-w-[360px] lg:min-w-[370px] group relative ${cardRotation}`}
                >
                  {/* Floating Price Stamp Badge */}
                  <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-accent text-white flex flex-col items-center justify-center shadow-lg border-2 border-dashed border-white/40 rotate-[12deg] z-20 group-hover:scale-110 group-hover:rotate-0 transition-all duration-300">
                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none">Rate</span>
                    <span className="text-[12px] font-extrabold mt-0.5 leading-none">
                      {money(displayPrice).replace("Rs ", "₹")}
                    </span>
                  </div>

                  {/* Arched Image Container */}
                  <div className="relative h-60 bg-slate-50 overflow-hidden arch-clip border-b border-[#eedecf] p-1 bg-white mx-4 mt-4 shadow-sm">
                    <div className="relative w-full h-full arch-clip overflow-hidden">
                      <Image 
                        src={serviceImage(service)} 
                        alt={service.name} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                        sizes="390px" 
                        unoptimized
                      />
                    </div>
                    
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[9px] font-bold text-slate-800 shadow-sm backdrop-blur-sm uppercase tracking-wider">
                      <ServiceIcon category={service.category} />
                      {service.service_group || service.category}
                    </span>

                    {index === 0 && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-[9px] font-bold text-white uppercase tracking-widest shadow-md">
                        <Sparkles className="h-2.5 w-2.5" /> Popular
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-1 flex-col p-6 text-left">
                    <h4 className="font-serif text-xl font-normal text-slate-900 group-hover:text-primary transition-colors duration-300">
                      {service.name}
                    </h4>
                    <p className="mt-2 line-clamp-3 text-xs sm:text-sm leading-relaxed text-slate-500 font-medium">
                      {service.description_short || "Premium pet care experience with Pupparazzi's trained team."}
                    </p>
                    
                    <div className="mt-auto flex flex-col gap-4 pt-5 border-t border-slate-100/80 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-left">
                        {service.discounted_price ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 line-through font-normal">{money(service.price)}</span>
                            <span className="text-lg font-extrabold text-primary">{money(service.discounted_price)}</span>
                          </div>
                        ) : (
                          <span className="text-lg font-extrabold text-slate-800">{money(service.price)}</span>
                        )}
                      </div>
                      {service.is_coming_soon ? (
                        <span className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-5 text-xs font-bold text-amber-700 sm:w-auto">
                          Coming soon
                        </span>
                      ) : (
                        <Button className="w-full rounded-full bg-slate-950 px-5 text-white transition-all duration-300 hover:bg-primary hover:text-white sm:w-auto group/btn" asChild>
                          <Link href={`/book?service=${service.category.toLowerCase()}`}>
                            Book <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden bg-[#faf6f0]/90">
        {/* Scrapbook background details */}
        <div className="absolute top-10 right-10 text-[#eedecf]/25 font-serif text-[180px] leading-none select-none pointer-events-none hidden lg:block">Us</div>
        
        <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8 items-center relative z-10">
          {/* Asymmetric Arch & Polaroid Image Stack */}
          <div className="relative w-full min-h-[440px] sm:min-h-[520px] flex items-center justify-center group">
            {/* Arch-clipped main image */}
            <div className="w-5/6 h-[380px] sm:h-[460px] arch-clip overflow-hidden border-2 border-[#eedecf] bg-white shadow-xl relative group-hover:scale-[1.01] transition-transform duration-500">
              <Image 
                src={homepageContent.aboutImage && !homepageContent.aboutImage.includes("IMG_5627") ? homepageContent.aboutImage : "/images/pinterest_dog_about.png"} 
                alt="Pet parent training and care session" 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
                sizes="(min-width:1024px) 44vw, 100vw" 
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
            </div>

            {/* Overlapping Polaroid Image */}
            <div className="absolute bottom-[-15px] right-[-5px] sm:right-[5px] w-[160px] sm:w-[195px] bg-white p-3 pb-5 border border-[#eedecf] shadow-2xl rounded-2xl rotate-[5deg] hover:rotate-[1deg] transition-all duration-500 z-20 group-hover:scale-105">
              {/* Washi tape graphic */}
              <div className="washi-tape-teal absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 rotate-2 z-30" />
              
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src="/images/IMG_5627.JPG.jpeg"
                  alt="Happy dog client"
                  fill
                  className="object-cover"
                  sizes="170px"
                  unoptimized
                />
              </div>
              <p className="font-serif text-[10px] sm:text-xs text-center text-[#5c534e] mt-3 tracking-wider">Tail Wagging Approved! 🐕</p>
            </div>
          </div>
          
          <div className="flex flex-col justify-center text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent uppercase tracking-widest mb-2 w-fit">
              About Us
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal text-slate-900 leading-tight">
              {homepageContent.aboutTitle}
            </h2>
            <p className="mt-5 text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              {homepageContent.aboutCopy}
            </p>
            
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {["Experienced handlers", "Clean facility", "Backend-managed bookings", "Ahmedabad location"].map((item) => (
                <div 
                  key={item} 
                  className="relative overflow-hidden flex items-center gap-3.5 rounded-2xl border border-[#eedecf] bg-white/70 p-4 transition-all duration-350 hover:bg-white hover:shadow-md hover:border-accent/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-accent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                </div>
              ))}
            </div>
            
            <Button className="mt-10 w-fit rounded-full border-[#eae0d5] text-slate-700 bg-white hover:bg-[#faf6f0] font-bold px-6" variant="outline" asChild>
              <Link href="/about">
                Know More <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-[#374436] py-24 text-white relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-[10px] font-bold text-accent uppercase tracking-widest mb-3">
              Highlights
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal text-white leading-tight text-center">
              {homepageContent.featuresTitle}
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((item, index) => {
              const rotation = [
                "rotate-0",
                "rotate-1 sm:translate-y-2",
                "-rotate-1 sm:-translate-y-2"
              ][index % 3];
              return (
                <div 
                  key={item.title} 
                  className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-2 group shadow-xl text-left ${rotation}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#374436] group-hover:scale-110 transition-transform duration-300 shadow-md">
                    {getFeatureIcon(index)}
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-white tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70 font-medium">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden bg-[#faf6f0]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-widest mb-2">
                Reviews
              </span>
              <h2 className="font-serif text-3xl font-normal sm:text-5xl text-slate-900">
                Trusted by pet parents.
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-5 w-5 fill-current text-amber-400" />
              ))}
              <span className="ml-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Google ratings & stories</span>
            </div>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
            <div className="grid gap-8 sm:grid-cols-2">
              {testimonials.slice(0, 4).map((review, i) => {
                const rotation = ["rotate-1", "-rotate-1", "-rotate-2", "rotate-2"][i % 4];
                const washiColor = i % 3 === 0 ? "washi-tape-pink" : i % 3 === 1 ? "washi-tape-teal" : "washi-tape-beige";
                return (
                  <div 
                    key={review.id} 
                    className={`relative overflow-hidden rounded-[24px] border-2 border-[#eedecf] bg-white p-8 pt-10 pb-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-left ${rotation}`}
                  >
                    {/* Washi tape graphic */}
                    <div className={`${washiColor} absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 rotate-1 z-10`} />
                    
                    <Quote className="absolute top-6 right-6 h-12 w-12 text-slate-100/60 group-hover:text-accent/10 transition-colors duration-350 pointer-events-none" />
                    
                    <div>
                      <div className="mb-4 flex gap-0.5 text-amber-400">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-400" />
                        ))}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600 font-medium italic relative z-10">
                        &ldquo;{review.text}&rdquo;
                      </p>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <p className="font-bold text-slate-800 text-xs tracking-wide">{review.name}</p>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-0.5">
                        {[review.pet_name, review.pet_breed].filter(Boolean).join(", ") || "Pet Parent"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="rounded-[32px] border-2 border-[#eedecf] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="review-widget_net w-full h-full" data-uuid="178fae9e-b9d7-4cf9-834a-222fab300d73" data-template="10" data-lang="en" data-theme="light" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#eae0d5] bg-white py-24 relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 items-start">
          <div className="text-left lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent uppercase tracking-widest mb-2">
              FAQs
            </span>
            <h2 className="font-serif text-3xl font-normal sm:text-5xl text-slate-900 leading-tight">
              Before you book.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 font-medium">
              Quick answers for boarding, grooming, visits, and training requests.
            </p>
          </div>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <button 
                  key={item.question} 
                  onClick={() => setActiveFaq(index)} 
                  className={`w-full rounded-[24px] border p-6 text-left transition-all duration-350 flex flex-col ${
                    isOpen 
                      ? "border-accent/30 bg-[#faf6f0] shadow-md shadow-accent/5" 
                      : "border-[#eae0d5] bg-white hover:bg-[#faf6f0]/40 hover:border-[#eae0d5]"
                  }`}
                >
                  <div className="flex items-center gap-4 w-full justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-lg text-primary font-normal">0{index + 1}</span>
                      <span className="font-bold text-slate-800 text-sm sm:text-base">{item.question}</span>
                    </div>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#eae0d5] text-xs font-bold transition-all duration-300 ${
                      isOpen ? "bg-primary text-white border-primary rotate-180" : "bg-white text-slate-500"
                    }`}>
                      {isOpen ? "-" : "+"}
                    </span>
                  </div>
                  {isOpen && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-500 border-t border-[#eae0d5] pt-4 font-medium animate-fade-in pl-7">
                      {item.answer}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden bg-[#faf6f0]/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 items-stretch">
          <div className="rounded-[32px] border border-[#eae0d5] bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary uppercase tracking-widest mb-2 w-fit">
              Instagram
            </span>
            <h2 className="font-serif text-3xl font-normal text-slate-900 leading-tight">
              Follow the club moments.
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#eae0d5] bg-[#faf6f0]/30 p-2 flex-1 flex items-center justify-center">
              <blockquote className="instagram-media" data-instgrm-permalink="https://www.instagram.com/pupparazziclub/?utm_source=ig_embed&utm_campaign=loading" data-instgrm-version="14" style={{ background: "#fff", border: 0, margin: "1px", maxWidth: 658, minWidth: 280, padding: 0, width: "100%" }}>
                <a href="https://www.instagram.com/pupparazziclub/" target="_blank" rel="noreferrer" className="block p-8 text-center text-sm font-semibold text-primary">View Pupparazzi Club on Instagram</a>
              </blockquote>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-[32px] bg-slate-950 text-white shadow-2xl flex flex-col justify-end min-h-[480px] sm:min-h-[500px] relative border border-slate-800 group">
            <div className="absolute inset-0 z-0">
              <Image 
                src={activeBottomItem.image} 
                alt={activeBottomItem.title} 
                fill 
                className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" 
                sizes="(min-width:1024px) 50vw, 100vw" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
            </div>
            
            <div className="p-8 sm:p-10 relative z-10 text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent/30 px-3 py-1 text-xs font-bold text-accent uppercase tracking-widest mb-3">
                Highlights
              </span>
              <h3 className="font-serif text-3xl font-normal text-white tracking-tight leading-tight">{activeBottomItem.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 font-medium">{activeBottomItem.text}</p>
              
              <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-white/10">
                <Button size="lg" className="bg-primary hover:bg-primary/95 text-white border-0 rounded-full font-bold shadow-lg shadow-primary/10" asChild>
                  <Link href={activeBottomItem.href}>
                    {activeBottomItem.cta}
                  </Link>
                </Button>
                <div className="flex gap-2">
                  {bottomItems.map((item, index) => (
                    <button 
                      key={item.title} 
                      aria-label={`Go to highlight ${index + 1}`} 
                      onClick={() => setBottomSlide(index)} 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === bottomSlide ? "w-8 bg-white" : "w-2 bg-white/40"
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[48px] rounded-t-[140px] bg-gradient-to-br from-[#3b3430] via-[#211d1b] to-[#3b3430] p-8 sm:p-16 text-white shadow-2xl relative border border-white/10">
            <div className="absolute -right-20 -bottom-20 h-96 w-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute -left-20 -top-20 h-96 w-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center relative z-10 text-left">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-accent uppercase tracking-widest mb-3">
                  {homepageContent.ctaEyebrow || "Get in Touch"}
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl font-normal text-white leading-tight">
                  {homepageContent.ctaTitle}
                </h2>
                <p className="mt-5 flex items-start gap-2.5 text-sm leading-relaxed text-slate-300 font-medium">
                  <MapPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
                  {contactInfo.address}
                </p>
              </div>
              
              <div className="flex flex-col gap-3.5 sm:flex-row lg:flex-col w-full sm:w-auto">
                <Button className="bg-primary hover:bg-primary/95 border-0 text-white rounded-full font-bold shadow-lg shadow-primary/10" size="lg" asChild>
                  <Link href="/book">Book Appointment</Link>
                </Button>
                <Button className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 rounded-full font-bold" variant="outline" size="lg" asChild>
                  <Link href={contactInfo.phoneHref}>
                    <Phone className="mr-2 h-4 w-4" /> Call Now
                  </Link>
                </Button>
                <Button className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 rounded-full font-bold" variant="outline" size="lg" asChild>
                  <Link href={contactInfo.whatsappHref}>
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us
                  </Link>
                </Button>
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
