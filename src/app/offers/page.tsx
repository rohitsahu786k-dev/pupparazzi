import Image from "next/image";
import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { defaultCoupons, type CouponRule } from "@/lib/pet-care-pricing";

async function getActiveOffers() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "coupons" } });
  const coupons = (Array.isArray(setting?.value) ? setting.value : defaultCoupons) as CouponRule[];
  const now = new Date();
  return coupons.filter((coupon) => coupon.is_active && (!coupon.expires_at || new Date(coupon.expires_at) >= now));
}

function offerValue(coupon: CouponRule) {
  return coupon.discount_type === "FLAT" ? `Rs ${coupon.discount_value} off` : `${coupon.discount_value}% off`;
}

export const metadata = {
  title: "Offers - Pupparazzi Club",
  description: "Active Pupparazzi Club offers and pet care coupons.",
};

export default async function OffersPage() {
  const offers = await getActiveOffers();

  return (
    <main className="bg-[var(--surface)]">
      <section className="relative overflow-hidden bg-foreground py-20 text-white sm:py-28">
        <Image src="/images/IMG_5600.PNG" alt="Pupparazzi Club offer" fill priority className="object-cover opacity-42" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/75 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Offers</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Premium pet care, sweeter with active offers.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Offers are managed from the admin coupon system and only active, valid offers appear here.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {offers.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
            <Gift className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">No active offers right now.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Check back soon or contact Pupparazzi Club for current packages.</p>
            <Button className="mt-6" asChild><Link href="/book">Book Appointment</Link></Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer, index) => (
              <article key={offer.code} className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-premium)]">
                <div className="relative h-48 bg-foreground">
                  <Image src={index % 2 === 0 ? "/images/IMG_5623.JPG.jpeg" : "/images/IMG_5600.PNG"} alt={offer.code} fill className="object-cover opacity-82" sizes="(min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
                    {offerValue(offer)}
                  </div>
                </div>
                <div className="p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Use code {offer.code}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold">{offer.description || `${offerValue(offer)} on Pupparazzi services`}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {offer.category ? `Valid for ${offer.category}. ` : "Valid across eligible services. "}
                    Minimum booking amount Rs {offer.minimum_order_amount || 0}.
                    {offer.expires_at ? ` Expires ${new Date(offer.expires_at).toLocaleDateString("en-IN")}.` : ""}
                  </p>
                  {offer.terms && <p className="mt-3 text-xs leading-5 text-muted-foreground">{offer.terms}</p>}
                  <Button className="mt-6 w-full" asChild><Link href="/book">Book with Offer</Link></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
