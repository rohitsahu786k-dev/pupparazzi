import { prisma } from "@/lib/prisma";

export type BusinessSettings = {
  name: string;
  shortName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
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
  name: "Pupparazzi Pet Store & Grooming Salon",
  shortName: "Pupparazzi",
  email: "pupparazzipetstore@gmail.com",
  phone: "+91 99999 99999",
  website: process.env.NEXTAUTH_URL || "https://pupparazzi.iprixmedia.com",
  address: "Shop No 11,12, Shaligram Lakeview, Wind Park, Sardar Patel Ring Rd, opp. Balaji, near Vaishnodevi Circle, Ahmedabad, Gujarat 382501",
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

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting ? ({ ...fallback, ...(setting.value as object) } as T) : fallback;
}

export async function setSetting<T>(key: string, value: T) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any },
  });
}
