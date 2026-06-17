export const SITE_URL = (
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "https://pupparazzi.iprixmedia.com"
).replace(/\/$/, "");

type ServiceSummary = {
  category?: string | null;
  name?: string | null;
};

export type DetailFormService = "Boarding" | "Grooming";

function normalizedServiceText(service?: ServiceSummary | null) {
  return `${service?.category || ""} ${service?.name || ""}`.toLowerCase();
}

export function detailFormService(service?: ServiceSummary | null): DetailFormService | null {
  const serviceText = normalizedServiceText(service);
  if (serviceText.includes("boarding")) return "Boarding";
  if (serviceText.includes("grooming")) return "Grooming";
  return null;
}

export function bookingDetailFormUrl(
  bookingDatabaseId: string,
  service?: ServiceSummary | null,
) {
  const formService = detailFormService(service);
  if (!formService) return null;
  return `${SITE_URL}/dashboard/bookings/${bookingDatabaseId}/details?service=${formService.toLowerCase()}`;
}
