import { PremiumHome } from "@/components/home/premium-home";
import { prisma } from "@/lib/prisma";
import { isHiddenPublicService, serviceCategoryRank } from "@/lib/service-rules";
import type { HomeService } from "@/components/home/services-tabs";

async function getHomepageData() {
  const [testimonials, services, bookingCount, clientCount, petCount] = await Promise.all([
    prisma.testimonial.findMany({ where: { is_active: true }, orderBy: [{ order: "asc" }, { created_at: "desc" }], take: 6 }),
    prisma.service.findMany({ where: { is_active: true, is_coming_soon: false }, orderBy: [{ category: "asc" }, { display_order: "asc" }, { name: "asc" }] }),
    prisma.booking.count(),
    prisma.user.count({ where: { role: "CLIENT", is_active: true } }),
    prisma.pet.count(),
  ]);

  const publicServices = services
    .filter((service) => !isHiddenPublicService(service))
    .sort((a, b) => {
      const rankDiff = serviceCategoryRank(a.category || "") - serviceCategoryRank(b.category || "");
      if (rankDiff !== 0) return rankDiff;
      return (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name);
    })
    .map((service): HomeService => ({
      id: service.id,
      name: service.name,
      category: service.category,
      service_group: service.service_group,
      description_short: service.description_short,
      price: service.price,
      discounted_price: service.discounted_price,
      free_services_json: service.free_services_json,
      images_json: service.images_json,
    }));

  return { testimonials, services: publicServices, bookingCount, clientCount, petCount };
}

export default async function LandingPage() {
  const data = await getHomepageData();
  return <PremiumHome {...data} />;
}
