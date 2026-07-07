import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const publicRoutes = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/book", priority: 0.9, changeFrequency: "weekly" },
  { path: "/offers", priority: 0.8, changeFrequency: "daily" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/partner", priority: 0.5, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms-of-service", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
