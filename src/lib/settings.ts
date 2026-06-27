import { prisma } from "@/lib/prisma";
import { BUSINESS_ADDRESS, DEFAULT_HOMEPAGE_SETTINGS, OUTDATED_ADDRESS_MARKERS } from "@/lib/homepage-content";

export type BusinessSettings = {
  name: string;
  shortName: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  workingHours: string;
  mapEmbedUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  copyrightText: string;
  gst: string;
  logoUrl: string;
};

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
};

export type PaymentSettings = {
  provider: "manual" | "razorpay";
  razorpayKeyId: string;
  razorpayKeySecret: string;
  currency: string;
  enabled: boolean;
};

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  name: "Pupparazzi Club",
  shortName: "Pupparazzi Club",
  email: "pupparazzipetstore@gmail.com",
  phone: "063588 48177",
  whatsapp: "063588 48177",
  website: process.env.NEXTAUTH_URL || "https://pupparazziclub.in",
  address: BUSINESS_ADDRESS,
  workingHours: "Monday to Sunday, 9:00 AM to 8:00 PM",
  mapEmbedUrl: "",
  instagramUrl: "https://www.instagram.com/pupparazziclub/",
  facebookUrl: "",
  copyrightText: "© 2026 Pupparazzi Club. All rights reserved.",
  gst: "24AAXFP9081F1ZN",
  logoUrl: "/pupparazzi-logo.png",
};

export const DEFAULT_SMTP_SETTINGS: SmtpSettings = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || process.env.GMAIL_USER || "",
  pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "",
  fromName: process.env.SMTP_FROM_NAME || DEFAULT_BUSINESS_SETTINGS.name,
  fromEmail: process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || DEFAULT_BUSINESS_SETTINGS.email,
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  provider: "razorpay",
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  currency: "INR",
  enabled: Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
};

function normalizeSetting<T>(key: string, value: T): T {
  if (key !== "business" || !value || typeof value !== "object") return value;
  const business = value as unknown as BusinessSettings;
  if (!OUTDATED_ADDRESS_MARKERS.some((marker) => business.address?.includes(marker))) return value;
  return { ...business, address: BUSINESS_ADDRESS } as T;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  const value = setting ? ({ ...fallback, ...(setting.value as object) } as T) : fallback;
  return normalizeSetting(key, value);
}

export async function setSetting<T>(key: string, value: T) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}

export { DEFAULT_HOMEPAGE_SETTINGS };
