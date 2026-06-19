import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { groomingIncludes, serviceCatalog } from "@/lib/pet-care-pricing";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  Home,
  MapPin,
  PawPrint,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Quote,
} from "lucide-react";

const proof = [
  { value: "4.9/5", label: "parent rating" },
  { value: "12k+", label: "bookings handled" },
  { value: "24/7", label: "boarding care" },
  { value: "500+", label: "pets profiled" },
];

const promises = [
  { icon: ShieldCheck, title: "Verified Professionals", copy: "Every groomer and boarding care partner is screened before assignment." },
  { icon: HeartPulse, title: "Pet-First Handling", copy: "Temperament, allergies, vaccination status, and care notes travel with every booking." },
  { icon: CalendarCheck, title: "Managed From Admin", copy: "Bookings, payments, service areas, client notes, and updates stay organized in one backend." },
];

async function getTestimonials() {
  return prisma.testimonial.findMany({
    where: { is_active: true },
    orderBy: [{ order: "asc" }, { created_at: "desc" }],
    take: 6,
  });
}

function money(value?: number) {
  if (value === undefined) return "";
  return `₹${value.toLocaleString("en-IN")}`;
}

export default async function LandingPage() {
  const testimonials = await getTestimonials();

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
              Premium dog boarding and grooming services with transparent pricing, clean booking flows, and a backend built for daily operations.
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

      {/* Services */}
      <section id="services" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Services</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Clear care, clear pricing.</h2>
            </div>
            <Button variant="outline" asChild>
              <Link href="/book">See Availability <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="mt-12 space-y-6">
            {serviceCatalog.map((service) => {
              const Icon = service.section.includes("Boarding") ? Home : Scissors;
              return (
                <article key={service.section} className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{service.category}</p>
                        <h3 className="mt-1 text-2xl font-extrabold tracking-tight">{service.section}</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    {service.section !== "Boarding Policies" && (
                      <Button asChild>
                        <Link href={`/book?service=${service.section.includes("Boarding") ? "boarding" : "grooming"}`}>Book Now</Link>
                      </Button>
                    )}
                  </div>

                  {service.section === "Complete Grooming Services" && (
                    <div className="mt-5 rounded-lg border bg-muted/35 p-4">
                      <p className="text-sm font-bold">Complete grooming includes</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {groomingIncludes.map((item) => (
                          <span key={item} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {service.subCategories.map((subCategory) => (
                      <div key={subCategory.title} className="rounded-lg border bg-white p-4">
                        <h4 className="font-bold">{subCategory.title}</h4>
                        <div className="mt-3 divide-y">
                          {subCategory.items.map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-4 py-3 text-sm">
                              <span className="leading-6 text-muted-foreground">{item.label}</span>
                              {"price" in item && item.price !== undefined ? (
                                <span className="text-right font-extrabold text-foreground">
                                  {"originalPrice" in item && item.originalPrice ? <span className="mr-2 text-xs font-bold text-muted-foreground line-through">{money(item.originalPrice)}</span> : null}
                                  {money(item.price)}
                                  {"note" in item && item.note ? <span className="mt-1 block text-xs font-bold text-primary">{item.note}</span> : null}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {"notes" in service && service.notes?.length ? (
                    <div className="mt-5 rounded-lg border bg-muted/35 p-4">
                      <p className="text-sm font-bold">Notes</p>
                      <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2">
                        {service.notes.map((note) => <li key={note} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" /> {note}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </article>
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
                { name: "Anita Patel", pet: "Coco, Beagle", text: "The boarding care was clean, calm, and well managed. We came back to a happy pet." },
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
