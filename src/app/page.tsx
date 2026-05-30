import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Footprints,
  GraduationCap,
  HeartPulse,
  Home,
  MapPin,
  PawPrint,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Waves,
  Quote,
} from "lucide-react";

const iconMap: Record<string, any> = {
  Grooming: Scissors,
  Boarding: Home,
  Walking: Footprints,
  Veterinary: Stethoscope,
  Training: GraduationCap,
  Swimming: Waves,
};

const imageMap: Record<string, string> = {
  Grooming: "/service-grooming.png",
  Boarding: "/service-boarding.png",
  Walking: "/service-walking.png",
  Veterinary: "/service-veterinary.png",
  Training: "/service-training.png",
  Swimming: "/service-swimming.png",
};

const proof = [
  { value: "4.9/5", label: "parent rating" },
  { value: "12k+", label: "bookings handled" },
  { value: "24/7", label: "boarding care" },
  { value: "500+", label: "pets profiled" },
];

const promises = [
  { icon: ShieldCheck, title: "Verified Professionals", copy: "Every groomer, walker, trainer, and care partner is screened before assignment." },
  { icon: HeartPulse, title: "Pet-First Handling", copy: "Temperament, allergies, vaccination status, and care notes travel with every booking." },
  { icon: CalendarCheck, title: "Managed From Admin", copy: "Bookings, payments, service areas, client notes, and updates stay organized in one backend." },
];

async function getServices() {
  const services = await prisma.service.findMany({
    where: { is_active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, description_short: true, price: true, discounted_price: true, images_json: true, is_bestseller: true },
  });
  // Deduplicate by category - show one card per category
  const seen = new Set<string>();
  const unique: typeof services = [];
  for (const s of services) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      unique.push(s);
    }
  }
  return unique;
}

async function getTestimonials() {
  return prisma.testimonial.findMany({
    where: { is_active: true },
    orderBy: [{ order: "asc" }, { created_at: "desc" }],
    take: 6,
  });
}

export default async function LandingPage() {
  const [services, testimonials] = await Promise.all([getServices(), getTestimonials()]);

  return (
    <main className="bg-white text-foreground">
      {/* Hero */}
      <section className="relative min-h-[88vh] overflow-hidden bg-foreground">
        <Image src="/hero-dog.png" alt="Premium pet care at home" fill priority className="object-cover opacity-70" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              Premium pet care across Ahmedabad
            </div>
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-7xl">
              Pupparazzi pet care, booked beautifully.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80 md:text-xl">
              Grooming, boarding, walking, training, swimming, and veterinary care with a polished booking experience and a backend built for daily operations.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/book">Book Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link href="#services">Explore Services <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="-mt-14 relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-1 rounded-2xl border border-border/50 bg-white p-2 shadow-2xl grid-cols-2 md:grid-cols-4">
          {proof.map((item, i) => (
            <div key={item.label} className={`rounded-xl px-4 py-6 text-center ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
              <p className="text-3xl font-black text-foreground">{item.value}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services - Dynamic from DB */}
      <section id="services" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Services</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Designed for pets with standards.</h2>
            </div>
            <Button variant="outline" asChild>
              <Link href="/book">See Availability <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = iconMap[service.category] || PawPrint;
              const img = (service.images_json as string[] | null)?.[0] || imageMap[service.category] || "/service-grooming.png";
              const displayPrice = service.discounted_price || service.price;
              return (
                <Link
                  key={service.id}
                  href={`/book?service=${service.category.toLowerCase()}`}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={img} alt={service.category} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/95 text-primary shadow-lg backdrop-blur-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    {service.is_bestseller && (
                      <div className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow">
                        Bestseller
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold">{service.category}</h3>
                      <span className="rounded-full bg-foreground/5 px-4 py-1.5 text-sm font-bold text-foreground">
                        ₹{displayPrice}+
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {service.description_short || `Professional ${service.category.toLowerCase()} services for your pet.`}
                    </p>
                    <div className="mt-5 flex items-center text-sm font-bold text-primary transition-colors group-hover:text-accent">
                      Book service <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Pupparazzi */}
      <section className="bg-muted/50 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative min-h-[520px] overflow-hidden rounded-2xl shadow-2xl">
            <Image src="/service-boarding.png" alt="Luxury boarding care" fill className="object-cover" sizes="(min-width:1024px) 45vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Why Pupparazzi</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">A premium front desk and a serious operating system.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Pet care businesses need more than a pretty booking form. Pupparazzi connects customer bookings, service areas, pet profiles, admin notes, payment status, invoices, and email updates.
            </p>
            <div className="mt-8 space-y-4">
              {promises.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Experience</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight">From booking to happy handoff.</h2>
            </div>
            {[
              { icon: CalendarCheck, title: "Choose", copy: "Select service, pet profile, address, date, and slot.", step: "01" },
              { icon: Award, title: "Assign", copy: "Admin confirms, tracks payment, records notes, and manages the job.", step: "02" },
              { icon: CheckCircle2, title: "Care", copy: "Customer gets updates while your team keeps operations clean.", step: "03" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="relative rounded-2xl border bg-white p-7 shadow-sm transition hover:shadow-lg">
                  <span className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-xs font-black text-white">{item.step}</span>
                  <Icon className="h-9 w-9 text-accent" />
                  <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials - Dynamic from DB */}
      <section className="relative overflow-hidden border-y bg-foreground py-24 text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Reviews</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Loved by pet parents.</h2>
            </div>
            <div className="flex items-center gap-1 text-accent">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}
              <span className="ml-2 text-sm font-medium text-white/60">4.9 average</span>
            </div>
          </div>

          {testimonials.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((review) => (
                <div key={review.id} className="group relative rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition hover:bg-white/10">
                  <Quote className="absolute right-5 top-5 h-8 w-8 text-white/10" />
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    {Array.from({ length: 5 - review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-white/20" />
                    ))}
                  </div>
                  <p className="text-sm leading-7 text-white/75">&ldquo;{review.text}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                    {review.image ? (
                      <Image src={review.image} alt={review.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-black text-white">
                        {review.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold">{review.name}</p>
                      <p className="text-xs text-white/50">
                        {[review.pet_name, review.pet_breed].filter(Boolean).join(", ") || "Pet Parent"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: "Priya Sharma", pet: "Bruno, Golden Retriever", text: "The grooming was polished, gentle, and on time. Bruno looked fresh without feeling stressed." },
                { name: "Rahul Mehta", pet: "Miso, Persian Cat", text: "Boarding updates gave us real peace of mind. Clean facility, calm staff, great follow-up." },
                { name: "Anita Patel", pet: "Coco, Beagle", text: "The vet visit at home saved us a stressful drive. Professional, patient, and thorough." },
              ].map((review) => (
                <div key={review.name} className="group relative rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
                  <Quote className="absolute right-5 top-5 h-8 w-8 text-white/10" />
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-sm leading-7 text-white/75">&ldquo;{review.text}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-black text-white">
                      {review.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold">{review.name}</p>
                      <p className="text-xs text-white/50">{review.pet}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-2xl border bg-white shadow-2xl lg:grid-cols-[1fr_0.85fr]">
            <div className="p-8 md:p-14">
              <PawPrint className="h-10 w-10 text-primary" />
              <h2 className="mt-6 max-w-2xl text-4xl font-extrabold tracking-tight">Ready to make pet care feel premium from the first click?</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">Book a service today or speak with Pupparazzi for custom care plans, boarding, and recurring schedules.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild><Link href="/book">Book a Service</Link></Button>
                <Button size="lg" variant="outline" asChild><Link href="tel:+919999999999"><Phone className="mr-2 h-4 w-4" /> Call Pupparazzi</Link></Button>
              </div>
              <p className="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Shop No 11,12, Shaligram Lakeview, Sardar Patel Ring Rd, Ahmedabad, Gujarat 382501
              </p>
            </div>
            <div className="relative min-h-[360px]">
              <Image src="/service-grooming.png" alt="Premium grooming finish" fill className="object-cover" sizes="(min-width:1024px) 42vw, 100vw" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
