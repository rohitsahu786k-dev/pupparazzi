import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronRight, Star, Shield, Clock, Award, CheckCircle2,
  Sparkles, MapPin, Phone, ArrowRight, PawPrint,
  Scissors, Home, Footprints, Stethoscope, GraduationCap, Waves,
  Heart, Users, ThumbsUp,
} from "lucide-react";

const SERVICES = [
  { id: 1, name: "Grooming",   icon: Scissors,      desc: "Premium bath, haircut & spa styling by certified groomers",       price: "999",  duration: "45–60 min", img: "/service-grooming.png" },
  { id: 2, name: "Boarding",   icon: Home,           desc: "Luxury climate-controlled suites with 24/7 supervision",          price: "799",  duration: "Per night",  img: "/service-boarding.png" },
  { id: 3, name: "Swimming",   icon: Waves,          desc: "Hydrotherapy and fun sessions in our pet-safe pool",              price: "499",  duration: "30–45 min", img: "/service-swimming.png" },
  { id: 4, name: "Walking",    icon: Footprints,     desc: "Individual health walks with GPS tracking and live updates",      price: "299",  duration: "30–60 min", img: "/service-walking.png" },
  { id: 5, name: "Veterinary", icon: Stethoscope,    desc: "Expert medical consultations and care at your doorstep",         price: "1499", duration: "30–45 min", img: "/service-veterinary.png" },
  { id: 6, name: "Training",   icon: GraduationCap,  desc: "Positive reinforcement based behavior and obedience training",   price: "1999", duration: "60 min",    img: "/service-training.png" },
];

const OFFERS = [
  { id: 1, title: "50% OFF on First Grooming", code: "WELCOME50", desc: "For new customers only",   color: "border-primary/20 bg-primary/5 text-primary" },
  { id: 2, title: "Flat Rs.200 off Boarding",  code: "STAY200",   desc: "Min. 2 nights stay",       color: "border-accent/20 bg-accent/5 text-accent" },
  { id: 3, title: "Free Vet with Training",    code: "TRAINPLUS", desc: "Book any training package", color: "border-secondary/20 bg-secondary/5 text-secondary" },
];

const STATS = [
  { value: "50,000+", label: "Happy Pets Served",    icon: PawPrint },
  { value: "4.9 / 5", label: "Average Rating",       icon: Star },
  { value: "500+",    label: "Expert Professionals", icon: Users },
  { value: "98%",     label: "Satisfaction Rate",    icon: ThumbsUp },
];

const HOW_IT_WORKS = [
  { step: "01", icon: Scissors,     title: "Book Online",  desc: "Choose your service, pick a date and time that works for you. Takes under 2 minutes." },
  { step: "02", icon: MapPin,       title: "We Arrive",    desc: "Our certified professional arrives at your location, fully equipped and on time." },
  { step: "03", icon: PawPrint,     title: "Happy Pet",    desc: "Your pet gets premium care. You receive real-time updates and a detailed care report." },
];

const TESTIMONIALS = [
  { name: "Priya Sharma",  location: "Satellite, Ahmedabad",  rating: 5, text: "Absolutely love Pupparazzi! Bruno gets so excited when the groomer arrives. The service is always on time and the team is so gentle with him. Highly recommend!", avatar: "PS", pet: "Golden Retriever — Bruno" },
  { name: "Rahul Mehta",   location: "Bopal, Ahmedabad",      rating: 5, text: "Booked their boarding service when we went for vacation. Received daily photos of our cat Miso. Amazing peace of mind! The facility is spotlessly clean.",              avatar: "RM", pet: "Persian Cat — Miso" },
  { name: "Anita Patel",   location: "Vastrapur, Ahmedabad",  rating: 5, text: "The vet visit was so convenient! No stressful car ride for my anxious dog. Dr. came home, was thorough and friendly. Will definitely use again.",                        avatar: "AP", pet: "Beagle — Coco" },
];

export default function LandingPage() {
  return (
    <div className="bg-background overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative w-full bg-white pt-14 pb-24 md:pt-28 md:pb-36 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(240,128,160,0.07),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(32,192,208,0.06),transparent_55%)] pointer-events-none" />
        <div className="container mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-[10px] text-sm font-bold">
              <Heart className="h-4 w-4 fill-current" /> Trusted by 50,000+ Pet Parents in Ahmedabad
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-[64px] font-extrabold text-foreground leading-[1.08] tracking-tight">
              Premium Pet Care,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Delivered at Home.
              </span>
            </h1>
            <p className="text-xl text-secondary max-w-lg leading-relaxed">
              Expert grooming, certified boarding, and professional vet services — because your furry friend deserves the absolute best.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/book">Book a Service</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#services" className="flex items-center gap-2">
                  Explore Services <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex -space-x-3">
                {["PS", "RM", "AP", "VG"].map((initials, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-0.5 mb-0.5">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />)}
                </div>
                <span className="text-secondary font-medium">4.9 / 5 from 12,000+ reviews</span>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-[10px] rotate-2 opacity-70" />
            <div className="relative z-10 rounded-[10px] overflow-hidden shadow-2xl border-8 border-white">
              <Image src="/hero-dog.png" alt="Happy pampered pet" width={600} height={600} className="w-full h-auto object-cover" priority />
            </div>
            <div className="absolute -bottom-4 -left-8 bg-white p-4 rounded-[10px] shadow-xl border border-border z-20 flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-[10px] flex items-center justify-center text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-secondary font-bold uppercase tracking-wider">Verified</div>
                <div className="text-sm font-bold text-foreground">Certified Groomers</div>
              </div>
            </div>
            <div className="absolute top-8 -right-6 bg-white p-4 rounded-[10px] shadow-xl border border-border z-20 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-[10px] flex items-center justify-center text-white">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-secondary font-bold uppercase tracking-wider">#1 Rated</div>
                <div className="text-sm font-bold text-foreground">Pet Store Ahmedabad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────── */}
      <section className="w-full bg-foreground py-10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center gap-2">
                  <Icon className="h-5 w-5 text-accent" />
                  <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{s.value}</div>
                  <div className="text-xs text-slate-400 font-medium">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Offers ────────────────────────────────────────── */}
      <section className="w-full py-12 bg-white border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex overflow-x-auto gap-5 pb-3 hide-scrollbar snap-x">
            {OFFERS.map((offer) => (
              <div key={offer.id} className={`min-w-[300px] ${offer.color} border rounded-[10px] p-5 flex-shrink-0 flex items-center gap-5 hover:shadow-md transition-all cursor-pointer snap-start`}>
                <div className="w-11 h-11 bg-white rounded-[10px] flex items-center justify-center shadow-sm flex-shrink-0 border border-border">
                  <Sparkles className="h-5 w-5 text-current opacity-60" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">{offer.title}</h4>
                  <p className="text-xs text-secondary mt-0.5">{offer.desc}</p>
                  <p className="text-xs font-bold mt-1.5 opacity-80">Code: <span className="font-black uppercase tracking-wide">{offer.code}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────── */}
      <section id="services" className="w-full py-20 bg-muted">
        <div className="container mx-auto px-4 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">What We Offer</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Our Premium Services</h2>
              <p className="text-secondary mt-2 max-w-md text-sm">Everything your pet needs, from a quick bath to a luxury boarding stay.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/book" className="flex items-center gap-1">View All <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar snap-x">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id} className="flex flex-col items-center gap-3 min-w-[110px] snap-start group cursor-pointer flex-shrink-0">
                  <div className="w-22 h-22 rounded-full bg-white shadow border border-border overflow-hidden transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:border-primary/30">
                    <Image src={service.img} alt={service.name} width={88} height={88} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{service.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Popular Services Grid ─────────────────────────── */}
      <section className="w-full py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8 space-y-10">
          <div>
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">Most Booked</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Popular in Ahmedabad</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id}>
                  <Card className="border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer h-full rounded-[10px]">
                    <div className="h-52 w-full relative overflow-hidden">
                      <Image src={service.img} alt={service.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-gradient-to-r from-primary to-accent text-white text-[9px] font-black px-2.5 py-1 rounded-[10px] uppercase tracking-widest">Featured</span>
                      </div>
                      <div className="absolute bottom-4 left-5 flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-[10px] flex items-center justify-center">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{service.name}</h3>
                      </div>
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary text-xs font-medium flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {service.duration}
                        </span>
                        <span className="bg-accent/10 text-accent text-xs font-bold px-2.5 py-1 rounded-[10px] flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" /> 4.9
                        </span>
                      </div>
                      <p className="text-secondary text-sm leading-relaxed line-clamp-2">{service.desc}</p>
                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <span className="text-xs text-secondary block mb-0.5">Starting from</span>
                          <span className="text-lg font-extrabold text-foreground">Rs. {service.price}</span>
                        </div>
                        <Button size="sm">Book Now</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="w-full py-24 bg-foreground">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-accent tracking-widest uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">How It Works</h2>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm">Professional pet care in under 2 minutes. Here is how:</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-primary/40 via-accent/60 to-primary/40" />
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="text-center space-y-5">
                  <div className="relative inline-flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[10px] bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-foreground text-[10px] font-black rounded-[10px] flex items-center justify-center shadow">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm max-w-xs mx-auto">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-14">
            <Button size="lg" variant="accent" asChild>
              <Link href="/book">Get Started — It is Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="w-full py-24 bg-muted">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-3">Reviews</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">What Our Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="border border-border shadow-sm hover:shadow-xl transition-all rounded-[10px] h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-secondary text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{t.name}</p>
                      <p className="text-xs text-secondary">{t.pet}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-secondary">
                      <MapPin className="h-3 w-3" /> {t.location}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Pupparazzi ────────────────────────────────── */}
      <section className="w-full py-20 bg-white border-t border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-3">Our Promise</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Why Choose Pupparazzi?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Clock className="h-7 w-7" />,    color: "bg-primary/10 text-primary", title: "On-Time, Every Time",   desc: "Punctuality is our promise. Our professionals arrive at the exact scheduled time — no waiting, no last-minute surprises." },
              { icon: <Shield className="h-7 w-7" />,   color: "bg-accent/10 text-accent",   title: "Vetted and Insured",    desc: "Every groomer and vet undergoes a rigorous 5-step background check, skill certification, and is fully insured for your safety." },
              { icon: <Sparkles className="h-7 w-7" />, color: "bg-primary/10 text-primary", title: "Premium Products Only", desc: "We use certified, organic, and pet-safe products from globally trusted brands. No shortcuts — ever." },
            ].map((item, i) => (
              <div key={i} className="space-y-5 p-7 rounded-[10px] border border-border hover:shadow-lg transition-all">
                <div className={`w-14 h-14 rounded-[10px] ${item.color} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                <p className="text-secondary leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="w-full py-20 bg-gradient-to-br from-foreground via-foreground to-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(240,128,160,0.12),transparent_65%)] pointer-events-none" />
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-[10px] bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Your Pet Deserves the Best.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Give It to Them.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Join 50,000+ happy pet parents in Ahmedabad. Book a service today and get 50% off your first grooming with code{" "}
            <strong className="text-white font-bold">WELCOME50</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/book">Book Your First Service</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
              <Link href="/contact" className="flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Us</Link>
            </Button>
          </div>
          <p className="text-slate-500 text-sm mt-8 flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            Shop No 11,12, Shaligram Lakeview, Sardar Patel Ring Rd, Ahmedabad, Gujarat 382501
          </p>
        </div>
      </section>

    </div>
  );
}
