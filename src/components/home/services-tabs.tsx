"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap, Home, PawPrint, Scissors, Sparkles, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sortServiceCategories } from "@/lib/service-rules";

export type HomeService = {
  id: string;
  name: string;
  category: string;
  service_group?: string | null;
  description_short?: string | null;
  price: number;
  discounted_price?: number | null;
  is_coming_soon?: boolean;
  free_services_json?: unknown;
  images_json?: unknown;
};

function money(value?: number | null) {
  if (value == null) return "";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function serviceImage(service: HomeService) {
  const images = Array.isArray(service.images_json) ? service.images_json.map(String).filter(Boolean) : [];
  if (images.length > 0) return images[0];
  if (service.category === "Boarding") return "/service-boarding-premium.png";
  if (service.category === "Training") return "/service-training.png";
  if (service.category === "Swimming") return "/service-swimming.png";
  return "/service-grooming-premium.png";
}

function ServiceIcon({ category }: { category: string }) {
  if (category === "Boarding") return <Home className="h-4 w-4" />;
  if (category === "Grooming") return <Scissors className="h-4 w-4" />;
  if (category === "Training") return <GraduationCap className="h-4 w-4" />;
  if (category === "Swimming") return <Waves className="h-4 w-4" />;
  return <PawPrint className="h-4 w-4" />;
}

export function ServicesTabs({ services }: { services: HomeService[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, HomeService[]>();
    services.forEach((service) => {
      const category = service.category || "Other";
      map.set(category, [...(map.get(category) || []), service]);
    });
    return map;
  }, [services]);
  const categories = useMemo(() => sortServiceCategories(Array.from(grouped.keys())), [grouped]);
  const [activeCategory, setActiveCategory] = useState(categories[0] || "Boarding");
  const activeServices = grouped.get(activeCategory) || [];

  if (services.length === 0) {
    return (
      <div className="mt-12 rounded-lg border bg-muted/35 p-8 text-center text-sm font-medium text-muted-foreground">
        Services will appear here as soon as they are active.
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-lg border bg-muted/40 p-1.5">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${
                activeCategory === category ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
              }`}
            >
              <ServiceIcon category={category} />
              {category}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {grouped.get(category)?.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-1 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight">{activeCategory}</h3>
          <p className="text-sm text-muted-foreground">
            {activeServices.length} active {activeCategory.toLowerCase()} service{activeServices.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeServices.map((service) => {
          const included = Array.isArray(service.free_services_json) ? service.free_services_json.map(String) : [];
          return (
            <article key={service.id} className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-white shadow-sm">
              <div className="relative h-44 bg-muted">
                <Image src={serviceImage(service)} alt={service.name} fill className="object-cover" sizes="(min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-foreground shadow-sm">
                  <ServiceIcon category={service.category} />
                  {service.service_group || service.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-foreground text-white">
                    <ServiceIcon category={service.category} />
                  </span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{service.category}</p>
                    <h3 className="mt-1 text-lg font-extrabold tracking-tight">{service.name}</h3>
                    {service.description_short && <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description_short}</p>}
                  </div>
                </div>
                {included.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {included.slice(0, 5).map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                  <p className="text-xl font-black">
                    {service.discounted_price ? (
                      <>
                        <span className="mr-2 text-sm text-muted-foreground line-through">{money(service.price)}</span>
                        {money(service.discounted_price)}
                      </>
                    ) : (
                      money(service.price)
                    )}
                  </p>
                  {service.is_coming_soon ? (
                    <span className="inline-flex min-h-10 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700">
                      Coming soon
                    </span>
                  ) : (
                    <Button asChild>
                      <Link href={`/book?service=${service.category.toLowerCase()}`}>
                        Book Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
