import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronRight, User, Star, Shield, Clock } from "lucide-react";

const SERVICES = [
  { id: 1, name: "Grooming", desc: "Bath, haircut & styling", price: "999" },
  { id: 2, name: "Boarding", desc: "Home away from home", price: "799" },
  { id: 3, name: "Swimming", desc: "Fun and exercise pool", price: "499" },
  { id: 4, name: "Walking", desc: "Daily health walks", price: "299" },
  { id: 5, name: "Veterinary", desc: "Medical care at home", price: "1499" },
  { id: 6, name: "Training", desc: "Basic obedience", price: "1999" },
];

const OFFERS = [
  { id: 1, title: "50% OFF on First Grooming", code: "WELCOME50" },
  { id: 2, title: "Flat Rs. 200 off on Boarding", code: "STAY200" },
  { id: 3, title: "Free Vet Consult with Training", code: "TRAINPLUS" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Swiggy Style Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-xl font-bold tracking-tight hidden sm:block text-foreground">PetCare Pro</span>
            </Link>
            <div className="hidden md:flex items-center gap-2 text-sm text-secondary hover:text-primary cursor-pointer transition-colors">
              <span className="font-bold text-foreground border-b-2 border-foreground">Home</span>
              <span className="truncate max-w-[200px]">Mumbai, Maharashtra</span>
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="#search" className="hidden md:flex items-center gap-2 hover:text-primary transition-colors text-foreground">
              <Search className="h-4 w-4" /> Search
            </Link>
            <Link href="#offers" className="hidden md:flex items-center gap-2 hover:text-primary transition-colors text-foreground">
              <Star className="h-4 w-4" /> Offers
            </Link>
            <Link href="/login" className="flex items-center gap-2 hover:text-primary transition-colors text-foreground">
              <User className="h-4 w-4" /> Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Banner Section */}
        <section className="w-full bg-[#171a29] text-white py-12 md:py-20 relative overflow-hidden">
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Unexpected guests? <br />
                <span className="text-gray-400">Pet needs a bath?</span>
              </h1>
              <p className="text-lg text-gray-300">
                Book premium grooming, boarding, and vet services instantly.
              </p>
              <div className="flex gap-4">
                <Button size="lg" className="bg-primary text-white hover:bg-primary/90 text-lg px-8 rounded-none font-bold" asChild>
                  <Link href="/book">Book Now</Link>
                </Button>
              </div>
            </div>
            {/* Minimalist graphic placeholder */}
            <div className="hidden md:flex justify-end">
              <div className="w-64 h-64 border-4 border-dashed border-gray-600 rounded-full flex items-center justify-center opacity-50">
                <span className="text-gray-500 font-medium tracking-widest uppercase">Pet Image</span>
              </div>
            </div>
          </div>
        </section>

        {/* Offers Carousel */}
        <section className="w-full py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
              {OFFERS.map((offer) => (
                <div key={offer.id} className="min-w-[280px] bg-white border border-border p-4 rounded-2xl flex-shrink-0 flex items-center gap-4 hover:shadow-warm transition-shadow cursor-pointer">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-primary">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{offer.title}</h4>
                    <p className="text-xs text-secondary mt-1">Use code {offer.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Horizontal Scroll (Swiggy "What's on your mind?" style) */}
        <section id="services" className="w-full py-12 bg-white">
          <div className="container mx-auto px-4 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">What does your pet need?</h2>
            
            <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar snap-x">
              {SERVICES.map((service) => (
                <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id} className="flex flex-col items-center gap-3 min-w-[100px] snap-start group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 border border-border">
                    {/* Placeholder for service image */}
                    <span className="text-xs text-secondary font-medium uppercase tracking-wider">{service.name}</span>
                  </div>
                  <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{service.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Top Services Grid (Swiggy "Top restaurant chains" style) */}
        <section className="w-full py-12 bg-white border-t border-border">
          <div className="container mx-auto px-4 space-y-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Top services in Mumbai</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map((service) => (
                <Link href={`/book?service=${service.name.toLowerCase()}`} key={service.id}>
                  <Card className="border-none shadow-none hover:shadow-warm transition-all duration-300 overflow-hidden group cursor-pointer">
                    {/* Image Area */}
                    <div className="h-48 bg-muted w-full relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <h3 className="text-xl font-bold text-white tracking-wide uppercase">{service.name}</h3>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-foreground text-lg">{service.name} Package</h4>
                        <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" /> 4.8
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        <span className="truncate">{service.desc}</span>
                        <span>•</span>
                        <span>Rs. {service.price}</span>
                      </div>
                      <div className="pt-2 border-t border-dashed mt-2 text-sm text-secondary flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" /> Verified Professionals
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="w-full py-16 bg-muted/50 border-t border-border">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border border-border">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">On-Time Arrival</h3>
              <p className="text-secondary text-sm max-w-[250px]">Our professionals value your time and arrive right at the scheduled slot.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border border-border">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Verified Experts</h3>
              <p className="text-secondary text-sm max-w-[250px]">Every groomer and vet goes through strict background and skill checks.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border border-border">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">Premium Quality</h3>
              <p className="text-secondary text-sm max-w-[250px]">We only use vet-approved, premium products for your furry friends.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#02060c] text-gray-400 py-16">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="text-xl font-bold text-white">PetCare Pro</span>
            </div>
            <p className="text-sm">Delivering premium pet care across India since 2026.</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white text-lg">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Team</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white text-lg">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Help & Support</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Partner with us</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white text-lg">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
