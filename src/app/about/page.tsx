import { PawPrint, Heart, Users, MapPin } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="bg-white">
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <PawPrint className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">About Pupparazzi</h1>
            <p className="mt-4 text-lg text-muted-foreground">Ahmedabad&apos;s most trusted premium pet care platform.</p>
          </div>

          <div className="mt-12 space-y-8 text-base leading-7 text-muted-foreground">
            <p>
              Pupparazzi was founded with a simple mission: to give every pet the care they deserve, delivered with professionalism and love. We believe pets are family, and their care should reflect that.
            </p>
            <p>
              From complete grooming sessions to comfortable dog boarding, we offer focused pet care services managed through a modern booking system that keeps pet parents informed at every step.
            </p>

            <div className="grid gap-6 sm:grid-cols-3 py-8">
              <div className="rounded-xl border p-6 text-center">
                <Heart className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-bold text-foreground">Pet-First</h3>
                <p className="mt-2 text-sm">Every decision starts with what&apos;s best for the pet.</p>
              </div>
              <div className="rounded-xl border p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-bold text-foreground">Verified Team</h3>
                <p className="mt-2 text-sm">Screened professionals with hands-on experience.</p>
              </div>
              <div className="rounded-xl border p-6 text-center">
                <MapPin className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-bold text-foreground">Ahmedabad Based</h3>
                <p className="mt-2 text-sm">Serving pet parents across the city and beyond.</p>
              </div>
            </div>

            <p>
              Our team includes experienced groomers and compassionate boarding caregivers who treat every pet like their own. We use a technology-driven approach to manage bookings, track pet health records, and ensure timely communication with pet parents.
            </p>

            <div className="rounded-xl border bg-muted/30 p-6">
              <h3 className="font-bold text-foreground">Our Address</h3>
              <p className="mt-2 text-sm">
                Shop No 11, 12, Shaligram Lakeview, Wind Park, Sardar Patel Ring Rd, opp. Balaji, near Vaishnodevi Circle, Ahmedabad, Gujarat 382501
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
