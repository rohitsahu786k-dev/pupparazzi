import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

const services = [
  { name: "Grooming", icon: Scissors, image: "/service-grooming.png", price: "999", copy: "Bath, haircut, coat care, nail trim, and spa finishing." },
  { name: "Boarding", icon: Home, image: "/service-boarding.png", price: "799", copy: "Supervised stays with clean suites and daily care updates." },
  { name: "Walking", icon: Footprints, image: "/service-walking.png", price: "299", copy: "Structured walks for fitness, routine, and outdoor stimulation." },
  { name: "Veterinary", icon: Stethoscope, image: "/service-veterinary.png", price: "1499", copy: "Home visits for routine consults and wellness checks." },
  { name: "Training", icon: GraduationCap, image: "/service-training.png", price: "1999", copy: "Positive reinforcement programs for calmer everyday behavior." },
  { name: "Swimming", icon: Waves, image: "/service-swimming.png", price: "499", copy: "Pet-safe pool sessions for fun, confidence, and conditioning." },
];

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

const reviews = [
  { name: "Priya Sharma", pet: "Bruno, Golden Retriever", text: "The grooming was polished, gentle, and on time. Bruno looked fresh without feeling stressed." },
  { name: "Rahul Mehta", pet: "Miso, Persian Cat", text: "Boarding updates gave us real peace of mind. Clean facility, calm staff, great follow-up." },
  { name: "Anita Patel", pet: "Coco, Beagle", text: "The vet visit at home saved us a stressful drive. Professional, patient, and thorough." },
];

export default function LandingPage() {
  return (
    <main className="bg-white text-foreground">
      <section className="relative min-h-[88vh] overflow-hidden bg-foreground">
        <Image
          src="/hero-dog.png"
          alt="Premium pet care at home"
          fill
          priority
          className="object-cover opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              <Sparkles className="h-4 w-4 text-accent" />
              Premium pet care across Ahmedabad
            </div>
            <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
              Pupparazzi pet care, booked beautifully.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 md:text-xl">
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

      <section className="-mt-12 relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 rounded-lg border border-border bg-white p-4 shadow-xl grid-cols-2 md:grid-cols-4">
          {proof.map((item) => (
            <div key={item.label} className="px-4 py-5 text-center">
              <p className="text-3xl font-extrabold text-foreground">{item.value}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Services</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Designed for pets with standards.</h2>
            </div>
            <Button variant="outline" asChild>
              <Link href="/book">See Availability <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link key={service.name} href={`/book?service=${service.name.toLowerCase()}`} className="group overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <Image src={service.image} alt={service.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw" />
                    <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/92 text-primary shadow">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold">{service.name}</h3>
                      <span className="rounded-lg bg-muted px-3 py-1 text-sm font-bold">Rs. {service.price}+</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{service.copy}</p>
                    <div className="mt-5 flex items-center text-sm font-bold text-primary">
                      Book service <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative min-h-[520px] overflow-hidden rounded-lg">
            <Image src="/service-boarding.png" alt="Luxury boarding care" fill className="object-cover" sizes="(min-width:1024px) 45vw, 100vw" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Why Pupparazzi</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">A premium front desk and a serious operating system.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Pet care businesses need more than a pretty booking form. Pupparazzi connects customer bookings, service areas, pet profiles, admin notes, payment status, invoices, and email updates.
            </p>
            <div className="mt-8 space-y-4">
              {promises.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4 rounded-lg border bg-white p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-foreground text-white">
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

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Experience</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight">From booking to happy handoff.</h2>
            </div>
            {[
              { icon: CalendarCheck, title: "Choose", copy: "Select service, pet profile, address, date, and slot." },
              { icon: Award, title: "Assign", copy: "Admin confirms, tracks payment, records notes, and manages the job." },
              { icon: CheckCircle2, title: "Care", copy: "Customer gets updates while your team keeps operations clean." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border bg-white p-6 shadow-sm">
                  <Icon className="h-8 w-8 text-accent" />
                  <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y bg-foreground py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Reviews</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Loved by pet parents.</h2>
            </div>
            <div className="flex items-center gap-1 text-accent">
              {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}
            </div>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.name} className="rounded-lg border border-white/12 bg-white/8 p-6">
                <p className="text-sm leading-7 text-white/78">&ldquo;{review.text}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-foreground">
                    {review.name.split(" ").map((part) => part[0]).join("")}
                  </div>
                  <div>
                    <p className="font-bold">{review.name}</p>
                    <p className="text-xs text-white/58">{review.pet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-lg border bg-white shadow-xl lg:grid-cols-[1fr_0.85fr]">
            <div className="p-8 md:p-12">
              <PawPrint className="h-10 w-10 text-primary" />
              <h2 className="mt-5 max-w-2xl text-4xl font-extrabold tracking-tight">Ready to make pet care feel premium from the first click?</h2>
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
