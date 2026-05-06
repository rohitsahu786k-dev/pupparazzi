import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronRight, Star, Shield, Clock, Heart, Award,
  CheckCircle2, Sparkles, MapPin, Phone, ArrowRight,
} from "lucide-react";

const SERVICES = [
  { id: 1, name: "Grooming", desc: "Premium bath, haircut & spa styling by certified groomers", price: "999", duration: "45–60 min", img: "/service-grooming.png" },
  { id: 2, name: "Boarding", desc: "Luxury climate-controlled suites with 24/7 supervision", price: "799", duration: "Per night", img: "/service-boarding.png" },
  { id: 3, name: "Swimming", desc: "Hydrotherapy and fun sessions in our pet-safe pool", price: "499", duration: "30–45 min", img: "/service-swimming.png" },
  { id: 4, name: "Walking", desc: "Individual health walks with GPS tracking and live updates", price: "299", duration: "30–60 min", img: "/service-walking.png" },
  { id: 5, name: "Veterinary", desc: "Expert medical consultations and care at your doorstep", price: "1499", duration: "30–45 min", img: "/service-veterinary.png" },
  { id: 6, name: "Training", desc: "Positive reinforcement based behavior and obedience training", price: "1999", duration: "60 min", img: "/service-training.png" },
];

const OFFERS = [
  { id: 1, title: "50% OFF on First Grooming", code: "WELCOME50", desc: "For new customers only", color: "from-pink-50 to-rose-50 border-pink-100 text-pink-700" },
  { id: 2, title: "Flat ₹200 off Boarding", code: "STAY200", desc: "Min. 2 nights stay", color: "from-violet-50 to-purple-50 border-violet-100 text-violet-700" },
  { id: 3, title: "Free Vet with Training", code: "TRAINPLUS", desc: "Book any training package", color: "from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700" },
];

const STATS = [
  { value: "50,000+", label: "Happy Pets Served" },
  { value: "4.9★", label: "Average Rating" },
  { value: "500+", label: "Expert Professionals" },
  { value: "98%", label: "Satisfaction Rate" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Book Online", desc: "Choose your service, pick a date and time that works for you. Takes under 2 minutes." },
  { step: "02", title: "We Arrive", desc: "Our certified professional arrives at your location, fully equipped and on time." },
  { step: "03", title: "Happy Pet", desc: "Your pet gets premium care. You receive real-time updates and a detailed report." },
];

const TESTIMONIALS = [
  { name: "Priya Sharma", location: "Satellite, Ahmedabad", rating: 5, text: "Absolutely love Pupparazzi! Bruno gets so excited when the groomer arrives. The service is always on time and the team is so gentle with him. Highly recommend!", avatar: "PS", pet: "Golden Retriever - Bruno" },
  { name: "Rahul Mehta", location: "Bopal, Ahmedabad", rating: 5, text: "Booked their boarding service when we went for a vacation. Received daily photos of our cat Miso. Amazing peace of mind! The facility is spotlessly clean.", avatar: "RM", pet: "Persian Cat - Miso" },
  { name: "Anita Patel", location: "Vastrapur, Ahmedabad", rating: 5, text: "The vet visit was so convenient! No stressful car ride for my anxious dog. Dr. came home, was thorough and friendly. Will definitely use again.", avatar: "AP", pet: "Beagle - Coco" },
];

export default function LandingPage() {
  return (
    <div className="bg-[#F8FAFC] overflow-x-hidden">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative w-full bg-white pt-14 pb-24 md:pt-28 md:pb-36 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.07),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(249,115,22,0.05),transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 border border-pink-100 px-4 py-1.5 rounded-full text-sm font-bold">
              <Heart className="h-4 w-4 fill-current" /> Trusted by 50,000+ Pet Parents in Ahmedabad
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.08] tracking-tight">
              Premium Pet Care,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                Delivered at Home.
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
              Expert grooming, certified boarding, and professional vet services — because your furry friend deserves the absolute best.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-base px-10 h-14 rounded-full font-bold shadow-xl shadow-pink-200 transition-all hover:-translate-y-0.5" asChild>
                <Link href="/book">Book a Service</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-full font-bold border-2 border-slate-200 text-slate-700 hover:border-pink-200 hover:bg-pink-50" asChild>
                <Link href="#services" className="flex items-center gap-2">Explore Services <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex -space-x-3">
                {["PS", "RM", "AP", "VG"].map((initials, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />)}
                </div>
                <span className="text-slate-500 font-medium">4.9/5 from 12,000+ reviews</span>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 bg-gradient-to-br from-pink-100 to-orange-100 rounded-[3rem] rotate-3 opacity-60" />
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
              <Image src="/hero-dog.png" alt="Happy pampered pet" width={600} height={600} className="w-full h-auto object-cover" priority />
            </div>
            <div className="absolute -bottom-4 -left-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-20 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified</div>
                <div className="text-sm font-bold text-slate-900">Certified Groomers</div>
              </div>
            </div>
            <div className="absolute top-8 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-20 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">#1 Rated</div>
                <div className="text-sm font-bold text-slate-900">Pet Store Ahmedabad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section className="w-full bg-slate-900 py-10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-1">{s.value}</div>
                <div className="text-sm text-slate-400 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Offers ─────────────────────────────────────────────── */}
      <section className="w-full py-12 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex overflow-x-auto gap-5 pb-3 [&::-webkit-scrollbar]:hidden snap-x">
            {OFFERS.map((offer) => (
              <div key={offer.id} className={`min-w-[300px] bg-gradient-to-br ${offer.color} border rounded-2xl p-5 flex-shrink-0 flex items-center gap-5 hover:shadow-md transition-all cursor-pointer snap-start`}>
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-current opacity-70" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{offer.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{offer.desc}</p>
                  <p className="text-xs font-bold mt-1.5 opacity-90">Code: <span className="font-black uppercase tracking-wide">{offer.code}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────── */}
      <section id="services" className="w-full py-20 bg-[#F8FAFC]">
        <div className="container mx-auto px-4 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-pink-500 tracking-widest uppercase mb-2">What We Offer</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Our Premium Services</h2>
              <p className="text-slate-500 mt-2 max-w-md">Everything your pet needs, from a quick bath to a luxury boarding stay.</p>
            </div>
            <Button variant="ghost" className="text-pink-500 font-bold hover:bg-pink-50 self-start md:self-auto" asChild>
              <Link href="/book" className="flex items-center gap-1">View All <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="flex overflow-x-auto gap-6 pb-4 [&::-webkit-scrollbar]:hidden snap-x">
            {SERVICES.map((service) => (
              <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id} className="flex flex-col items-center gap-3 min-w-[120px] snap-start group cursor-pointer flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-white shadow border border-slate-100 overflow-hidden transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:border-pink-200">
                  <Image src={service.img} alt={service.name} width={96} height={96} className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-sm text-slate-800 group-hover:text-pink-500 transition-colors">{service.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Services Grid ───────────────────────────────── */}
      <section className="w-full py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8 space-y-10">
          <div>
            <p className="text-sm font-bold text-pink-500 tracking-widest uppercase mb-2">Most Booked</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Popular in Ahmedabad</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id}>
                <Card className="border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer h-full rounded-2xl">
                  <div className="h-52 w-full relative overflow-hidden">
                    <Image src={service.img} alt={service.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">Featured</span>
                    </div>
                    <div className="absolute bottom-4 left-5">
                      <h3 className="text-2xl font-bold text-white">{service.name}</h3>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {service.duration}
                      </span>
                      <span className="bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" /> 4.9
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{service.desc}</p>
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block mb-0.5">Starting from</span>
                        <span className="text-lg font-extrabold text-slate-900">₹{service.price}</span>
                      </div>
                      <Button size="sm" className="rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold text-xs px-4 hover:shadow-md hover:shadow-pink-200">
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section className="w-full py-24 bg-slate-900">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-pink-400 tracking-widest uppercase mb-3">Simple & Easy</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">How It Works</h2>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto">Book professional pet care in under 2 minutes. Here&apos;s how:</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-pink-500/30 via-pink-500/60 to-pink-500/30" />
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative text-center space-y-5">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-pink-900/30">
                    <span className="text-2xl font-black text-white">{step.step}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold px-10 h-14 rounded-full shadow-xl shadow-pink-900/30 hover:shadow-2xl transition-all hover:-translate-y-0.5" asChild>
              <Link href="/book">Get Started — It&apos;s Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section className="w-full py-24 bg-[#F8FAFC]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-pink-500 tracking-widest uppercase mb-3">Pet Parent Reviews</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">What Our Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="border border-slate-100 shadow-sm hover:shadow-xl transition-all rounded-2xl h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.pet}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {t.location}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Pupparazzi ─────────────────────────────────────── */}
      <section className="w-full py-20 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-pink-500 tracking-widest uppercase mb-3">Our Promise</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Why Choose Pupparazzi?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Clock className="h-7 w-7" />, color: "bg-pink-100 text-pink-600", title: "On-Time, Every Time", desc: "Punctuality is our promise. Our professionals arrive at the exact scheduled time — no waiting, no last-minute surprises." },
              { icon: <Shield className="h-7 w-7" />, color: "bg-orange-100 text-orange-600", title: "Vetted & Insured", desc: "Every groomer and vet undergoes a rigorous 5-step background check, skill certification, and is fully insured for your safety." },
              { icon: <Sparkles className="h-7 w-7" />, color: "bg-blue-100 text-blue-600", title: "Premium Products Only", desc: "We use certified, organic, and pet-safe products from globally trusted brands. No shortcuts — ever." },
            ].map((item, i) => (
              <div key={i} className="space-y-5 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-all">
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="w-full py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.15),transparent_70%)] pointer-events-none" />
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <div className="text-5xl mb-6">🐾</div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Your Pet Deserves the Best.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">Give It to Them.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Join 50,000+ happy pet parents in Ahmedabad. Book a service today and get 50% off your first grooming with code <strong className="text-white">WELCOME50</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold px-10 h-14 rounded-full shadow-xl shadow-pink-900/40 hover:-translate-y-0.5 transition-all" asChild>
              <Link href="/book">Book Your First Service</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white h-14 px-10 rounded-full font-bold hover:bg-white/10" asChild>
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
