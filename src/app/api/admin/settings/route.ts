import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_HOMEPAGE_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SMTP_SETTINGS,
  getSetting,
  setSetting,
} from "@/lib/settings";

const defaults: Record<string, unknown> = {
  business: DEFAULT_BUSINESS_SETTINGS,
  smtp: DEFAULT_SMTP_SETTINGS,
  payment: DEFAULT_PAYMENT_SETTINGS,
  homepage: DEFAULT_HOMEPAGE_SETTINGS,
  whatsapp: {
    bookingConfirmation: "Hello {{customerName}}, thank you for choosing us for your {{serviceName}} booking. Booking ID: {{bookingId}}. Pet Name: {{petName}}. Please complete your {{serviceName}} booking details here: {{detailedFormLink}}",
    paymentSuccess: "Hello {{customerName}}, your payment for booking #{{bookingId}} is completed. Invoice has been generated.",
    codAdvancePaid: "Hello {{customerName}}, advance payment of Rs. {{advanceAmount}} received. Remaining COD: Rs. {{remainingAmount}}.",
    codReminder: "Hello {{customerName}}, Rs. {{remainingAmount}} is pending for booking #{{bookingId}}. Please pay during service completion.",
    cancellation: "Hello {{customerName}}, your booking #{{bookingId}} has been cancelled.",
    enabled: true,
  },
};

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (key) {
    if (!defaults[key]) return NextResponse.json({ message: "Unknown setting key" }, { status: 400 });
    return NextResponse.json(await getSetting(key, defaults[key]));
  }

  const [business, smtp, payment, homepage, whatsapp] = await Promise.all([
    getSetting("business", DEFAULT_BUSINESS_SETTINGS),
    getSetting("smtp", DEFAULT_SMTP_SETTINGS),
    getSetting("payment", DEFAULT_PAYMENT_SETTINGS),
    getSetting("homepage", DEFAULT_HOMEPAGE_SETTINGS),
    getSetting("whatsapp", defaults.whatsapp),
  ]);
  return NextResponse.json({ business, smtp: { ...smtp, pass: smtp.pass ? "********" : "" }, payment: { ...payment, razorpayKeySecret: payment.razorpayKeySecret ? "********" : "" }, homepage, whatsapp });
}

export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { key, value } = await req.json();
  if (!key || !defaults[key]) return NextResponse.json({ message: "Unknown setting key" }, { status: 400 });

  const existing = await getSetting(key, defaults[key]);
  const merged = {
    ...(existing as object),
    ...(value as object),
  };

  if (key === "smtp" && value?.pass === "********") (merged as any).pass = (existing as any).pass;
  if (key === "payment" && value?.razorpayKeySecret === "********") (merged as any).razorpayKeySecret = (existing as any).razorpayKeySecret;

  await setSetting(key, merged);
  return NextResponse.json({ message: "Settings saved", value: merged });
}
