import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronRight, User, Star, Shield, Clock, Heart, Award, CheckCircle2 } from "lucide-react";
import { LocationFetcher } from "@/components/ui/location-fetcher";

const SERVICES = [
  { id: 1, name: "Grooming", desc: "Premium bath, haircut & styling by certified groomers", price: "999", img: "/service-grooming.png" },
  { id: 2, name: "Boarding", desc: "Luxury climate-controlled suites with 24/7 supervision", price: "799", img: "/service-boarding.png" },
  { id: 3, name: "Swimming", desc: "Hydrotherapy and fun sessions in our pet-safe pool", price: "499", img: "/service-swimming.png" },
  { id: 4, name: "Walking", desc: "Individual health walks with GPS tracking and updates", price: "299", img: "/service-walking.png" },
  { id: 5, name: "Veterinary", desc: "Expert medical consultations and care at your home", price: "1499", img: "/service-veterinary.png" },
  { id: 6, name: "Training", desc: "Positive reinforcement based behavior and obedience training", price: "1999", img: "/service-training.png" },
];

const OFFERS = [
  { id: 1, title: "50% OFF on First Grooming", code: "WELCOME50", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { id: 2, title: "Flat Rs. 200 off on Boarding", code: "STAY200", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { id: 3, title: "Free Vet Consult with Training", code: "TRAINPLUS", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center transition-transform hover:scale-[1.02]" aria-label="Pupparazzi home">
              <Image
                src="/pupparazzi-logo.png"
                alt="Pupparazzi"
                width={180}
                height={36}
                priority
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden lg:block border-l border-slate-200 h-8 mx-2" />
            <div className="hidden md:flex items-center gap-2">
              <LocationFetcher />
            </div>
          </div>

          <nav className="flex items-center gap-4 md:gap-8 text-sm font-semibold text-slate-600">
            <Link href="#search" className="hidden md:flex items-center gap-2 hover:text-primary transition-colors">
              <Search className="h-4 w-4" /> Search
            </Link>
            <Link href="#offers" className="hidden md:flex items-center gap-2 hover:text-primary transition-colors">
              <Star className="h-4 w-4" /> Offers
            </Link>
            <Button variant="ghost" className="text-slate-600 font-semibold" asChild>
              <Link href="/login" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Sign In
              </Link>
            </Button>
            <Button className="hidden sm:flex rounded-full shadow-lg shadow-primary/20" asChild>
              <Link href="/book">Book Now</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-white pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 rounded-l-[100px] -z-10 hidden lg:block" />
          <div className="container mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase">
                <Heart className="h-4 w-4 fill-current" /> Trusted by 50,000+ Pet Parents
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                Premium Pet Care, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">Delivered at Home.</span>
              </h1>
              <p className="text-xl text-slate-600 max-w-xl leading-relaxed">
                Expert grooming, certified boarding, and professional vet services. Because your furry friend deserves the absolute best.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary text-white hover:bg-primary/90 text-lg px-10 h-14 rounded-full font-bold shadow-xl shadow-primary/25 transition-all hover:translate-y-[-2px]" asChild>
                  <Link href="/book">Schedule a Visit</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-10 rounded-full font-bold border-2 text-slate-700" asChild>
                  <Link href="#services">View Services</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" width={40} height={40} />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  <span className="text-slate-900 font-bold block">Excellent 4.9/5</span>
                  based on 12k+ reviews
                </div>
              </div>
            </div>
            <div className="relative animate-in fade-in slide-in-from-right duration-700">
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 border-8 border-white">
                <Image
                  src="/hero-dog.png"
                  alt="Happy pampered dog"
                  width={600}
                  height={600}
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-20 hidden sm:flex items-center gap-3 animate-bounce-slow">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Certified</div>
                  <div className="text-sm font-bold text-slate-900">Pet Grooming</div>
                </div>
              </div>
              <div className="absolute top-10 -right-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-20 hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Award Winning</div>
                  <div className="text-sm font-bold text-slate-900">Vet Services</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Offers Carousel */}
        <section id="offers" className="w-full py-12 bg-white border-y border-slate-100">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar snap-x">
              {OFFERS.map((offer) => (
                <div key={offer.id} className={`min-w-[320px] ${offer.color} border p-6 rounded-3xl flex-shrink-0 flex items-center gap-6 hover:shadow-md transition-all cursor-pointer snap-start`}>
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Star className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{offer.title}</h4>
                    <p className="text-sm font-medium opacity-80 mt-1">Use code <span className="font-bold uppercase">{offer.code}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Horizontal Scroll */}
        <section id="services" className="w-full py-20 bg-[#F8FAFC]">
          <div className="container mx-auto px-4 lg:px-8 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Our Premium Services</h2>
                <p className="text-slate-500 max-w-xl">Everything your pet needs, from a simple wash to a luxury vacation.</p>
              </div>
              <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5" asChild>
                <Link href="/book" className="flex items-center gap-1">View All Services <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            
            <div className="flex overflow-x-auto gap-8 pb-8 hide-scrollbar snap-x">
              {SERVICES.map((service) => (
                <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id} className="flex flex-col items-center gap-4 min-w-[140px] snap-start group cursor-pointer">
                  <div className="w-28 h-28 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center overflow-hidden transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:border-primary/30">
                    <Image src={service.img} alt={service.name} width={112} height={112} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{service.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Top Services Grid */}
        <section className="w-full py-24 bg-white">
          <div className="container mx-auto px-4 lg:px-8 space-y-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Popular in Your Neighborhood</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SERVICES.map((service) => (
                <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id}>
                  <Card className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group cursor-pointer h-full rounded-3xl">
                    <div className="h-56 w-full relative overflow-hidden">
                      <Image 
                        src={service.img} 
                        alt={service.name} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                      <div className="absolute bottom-4 left-6">
                        <div className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mb-1 w-fit">Featured</div>
                        <h3 className="text-2xl font-bold text-white">{service.name}</h3>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-sm font-medium flex items-center gap-1">
                          <Clock className="h-4 w-4" /> 45-60 mins
                        </span>
                        <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" /> 4.9 (2k+)
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                        {service.desc}
                      </p>
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="text-slate-900 font-bold">
                          <span className="text-xs text-slate-400 font-medium block">Starting from</span>
                          Rs. {service.price}
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-full group/btn font-bold text-primary">
                          Book Now <ChevronRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Why Pupparazzi */}
        <section className="w-full py-24 bg-slate-900 text-white">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">On-Time, Every Time</h3>
                <p className="text-slate-400 leading-relaxed">Punctuality is our priority. Our professionals arrive exactly when they say they will, guaranteed.</p>
              </div>
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">Vetted & Insured</h3>
                <p className="text-slate-400 leading-relaxed">Every groomer and vet undergoes a rigorous 5-step background check and skill assessment.</p>
              </div>
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Star className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">Premium Experience</h3>
                <p className="text-slate-400 leading-relaxed">We use only high-end, organic products and the latest professional equipment for your pets.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white py-20 border-t border-slate-100">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            <div className="space-y-6">
              <Image
                src="/pupparazzi-logo.png"
                alt="Pupparazzi"
                width={180}
                height={36}
                className="h-10 w-auto"
              />
              <p className="text-slate-500 text-sm leading-relaxed">
                India's most loved pet care platform. Providing luxury grooming and medical care since 2026.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders */}
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer border border-slate-100">
                  <Heart className="h-4 w-4" />
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer border border-slate-100">
                  <Star className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500">
                <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Partner with Us</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Support</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500">
                <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Refund Policy</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Legal</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500">
                <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              © 2026 Pupparazzi India Pvt Ltd. All rights reserved.
            </p>
            <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span>Made with ❤️ for Pets</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

