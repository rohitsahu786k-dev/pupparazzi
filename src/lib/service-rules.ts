const CATEGORY_ORDER = ["Boarding", "Grooming"] as const;

const hiddenServicePatterns = [
  "dog walking",
  "walking",
  "hospital",
  "veterinary",
  "vet consultation",
];

export function isHiddenPublicService(service: { name?: string | null; category?: string | null }) {
  const text = `${service.category || ""} ${service.name || ""}`.toLowerCase();
  return hiddenServicePatterns.some((pattern) => text.includes(pattern));
}

export function serviceCategoryRank(category: string) {
  const index = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

export function sortServiceCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    const rankDiff = serviceCategoryRank(a) - serviceCategoryRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b);
  });
}

export function isTimeOptionalService(service?: { name?: string | null; category?: string | null } | null) {
  const text = `${service?.category || ""} ${service?.name || ""}`.toLowerCase();
  return text.includes("training") || text.includes("consultation") || text.includes("request");
}
