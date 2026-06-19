import { Briefcase, Heart, Mail } from "lucide-react";

export default function CareersPage() {
  return (
    <main className="bg-white">
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Briefcase className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Careers at Pupparazzi</h1>
            <p className="mt-4 text-lg text-muted-foreground">Join our team and make a difference in pets&apos; lives every day.</p>
          </div>

          <div className="mt-12 space-y-6 text-base leading-7 text-muted-foreground">
            <p>
              We&apos;re always looking for passionate, pet-loving individuals to join the Pupparazzi family. Whether you&apos;re an experienced groomer, boarding caregiver, or someone who loves working with animals, we&apos;d love to hear from you.
            </p>

            <h2 className="text-xl font-bold text-foreground">Open Positions</h2>
            <div className="space-y-4">
              {[
                { title: "Pet Groomer", type: "Full-time", desc: "Experience with dog grooming, bathing, and styling. Gentle handling required." },
                { title: "Boarding Care Attendant", type: "Part-time / Full-time", desc: "Reliable, attentive, and comfortable caring for dogs during boarding stays." },
                { title: "Customer Support", type: "Full-time", desc: "Handle bookings, client queries, and scheduling. Pet knowledge is a plus." },
              ].map((job) => (
                <div key={job.title} className="rounded-xl border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-foreground">{job.title}</h3>
                      <p className="mt-1 text-sm">{job.desc}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{job.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border bg-muted/30 p-6 text-center">
              <Heart className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-3 font-bold text-foreground">Interested?</h3>
              <p className="mt-2 text-sm">Send your resume and a brief introduction to:</p>
              <a href="mailto:pupparazzipetstore@gmail.com" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                <Mail className="h-4 w-4" /> pupparazzipetstore@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
