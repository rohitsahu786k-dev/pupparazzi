import { Handshake, Mail, CheckCircle2 } from "lucide-react";

export default function PartnerPage() {
  return (
    <main className="bg-white">
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Handshake className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Partner with Pupparazzi</h1>
            <p className="mt-4 text-lg text-muted-foreground">Grow your pet care business with us.</p>
          </div>

          <div className="mt-12 space-y-6 text-base leading-7 text-muted-foreground">
            <p>
              Are you a pet groomer, boarding facility, or pet care professional? Partner with Pupparazzi to reach more pet parents in Ahmedabad and beyond. We handle the bookings, payments, and customer communication so you can focus on care.
            </p>

            <h2 className="text-xl font-bold text-foreground">Why Partner with Us?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Steady stream of bookings",
                "Professional booking management",
                "Payment processing handled",
                "Customer support included",
                "Marketing and visibility",
                "Flexible scheduling",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-foreground">Who Can Partner?</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Independent pet groomers</li>
              <li>Pet boarding facilities</li>
              <li>Pet supply stores</li>
              <li>Pet photographers</li>
            </ul>

            <div className="mt-8 rounded-xl border bg-muted/30 p-6 text-center">
              <h3 className="font-bold text-foreground">Ready to Partner?</h3>
              <p className="mt-2 text-sm">Send us your details and we&apos;ll get back to you within 48 hours.</p>
              <a href="mailto:pupparazzipetstore@gmail.com?subject=Partnership Inquiry" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                <Mail className="h-4 w-4" /> pupparazzipetstore@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
