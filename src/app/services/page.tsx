import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { isHiddenPublicService, sortServiceCategories } from "@/lib/service-rules";

function money(value?: number | null) {
  if (value == null) return "";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function serviceImage(service: { category: string; images_json?: unknown }) {
  const images = Array.isArray(service.images_json) ? service.images_json.map(String).filter(Boolean) : [];
  if (images.length > 0) return images[0];
  if (service.category === "Boarding") return "/service-boarding-premium.png";
  if (service.category === "Training") return "/service-training.png";
  if (service.category === "Swimming") return "/images/IMG_5600.PNG";
  return "/service-grooming-premium.png";
}

export const metadata = {
  title: "Services - Pupparazzi Club",
  description: "Explore premium pet boarding, grooming, swimming, training, and daycare services at Pupparazzi Club.",
};

export default async function ServicesPage() {
  const services = (await prisma.service.findMany({
    where: { is_active: true },
    orderBy: [{ category: "asc" }, { display_order: "asc" }, { name: "asc" }],
  })).filter((service) => !isHiddenPublicService(service));

  const categories = sortServiceCategories(Array.from(new Set(services.map((service) => service.category || "Other"))));

  return (
    <main className="bg-[var(--surface)]">
      <section className="relative overflow-hidden bg-foreground py-20 text-white sm:py-28">
        <Image src="/images/IMG_5623.JPG.jpeg" alt="Pupparazzi Club facility" fill priority className="object-cover opacity-45" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/75 to-foreground/25" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Services</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Premium care for every kind of pet day.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Explore backend-managed services across boarding, grooming, swimming, training, and more.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {categories.map((category) => {
          const categoryServices = services.filter((service) => (service.category || "Other") === category);
          return (
            <div key={category} className="mb-14">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{category}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">{categoryServices.length} active services</h2>
                </div>
                {categoryServices.some((service) => !service.is_coming_soon) ? (
                  <Button variant="outline" asChild><Link href={`/book?service=${category.toLowerCase()}`}>Book {category}</Link></Button>
                ) : (
                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Coming soon</span>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {categoryServices.map((service) => (
                  <article key={service.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-premium)]">
                    <div className="relative h-56 bg-muted">
                      <Image src={serviceImage(service)} alt={service.name} fill className="object-cover" sizes="(min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw" />
                    </div>
                    <div className="p-5">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-muted-foreground">
                        <PawPrint className="h-3.5 w-3.5 text-primary" />
                        {service.service_group || service.category}
                      </div>
                      {service.is_coming_soon && (
                        <span className="mb-3 ml-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          Coming soon
                        </span>
                      )}
                      <h3 className="text-xl font-semibold">{service.name}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{service.description_short || "Premium care service by Pupparazzi Club."}</p>
                      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-lg font-semibold">{service.discounted_price ? money(service.discounted_price) : money(service.price)}</p>
                        {service.is_coming_soon ? (
                          <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700">
                            Coming soon
                          </span>
                        ) : (
                          <Button asChild><Link href={`/book?service=${service.category.toLowerCase()}`}>Book <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
