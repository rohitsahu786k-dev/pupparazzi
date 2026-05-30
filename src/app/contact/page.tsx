import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <main className="bg-white">
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Contact Us</h1>
            <p className="mt-4 text-lg text-muted-foreground">We&apos;d love to hear from you. Reach out anytime.</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border p-6">
              <Phone className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-bold text-foreground">Phone</h3>
              <p className="mt-2 text-sm text-muted-foreground">Call us for bookings or queries</p>
              <a href="tel:+919999999999" className="mt-2 block text-sm font-bold text-primary hover:underline">+91 99999 99999</a>
            </div>
            <div className="rounded-xl border p-6">
              <Mail className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-bold text-foreground">Email</h3>
              <p className="mt-2 text-sm text-muted-foreground">For support and general inquiries</p>
              <a href="mailto:pupparazzipetstore@gmail.com" className="mt-2 block text-sm font-bold text-primary hover:underline">pupparazzipetstore@gmail.com</a>
            </div>
            <div className="rounded-xl border p-6">
              <MapPin className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-bold text-foreground">Address</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Shop No 11, 12, Shaligram Lakeview, Wind Park, Sardar Patel Ring Rd, opp. Balaji, near Vaishnodevi Circle, Ahmedabad, Gujarat 382501
              </p>
            </div>
            <div className="rounded-xl border p-6">
              <Clock className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-bold text-foreground">Working Hours</h3>
              <p className="mt-2 text-sm text-muted-foreground">Monday – Saturday: 9:00 AM – 8:00 PM</p>
              <p className="text-sm text-muted-foreground">Sunday: Closed</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/book">Book a Service</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
