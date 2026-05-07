import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SMTP_SETTINGS,
  getSetting,
  setSetting,
} from "@/lib/settings";

const defaults: Record<string, unknown> = {
  business: DEFAULT_BUSINESS_SETTINGS,
  smtp: DEFAULT_SMTP_SETTINGS,
  payment: DEFAULT_PAYMENT_SETTINGS,
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

  const [business, smtp, payment] = await Promise.all([
    getSetting("business", DEFAULT_BUSINESS_SETTINGS),
    getSetting("smtp", DEFAULT_SMTP_SETTINGS),
    getSetting("payment", DEFAULT_PAYMENT_SETTINGS),
  ]);
  return NextResponse.json({ business, smtp: { ...smtp, pass: smtp.pass ? "********" : "" }, payment: { ...payment, razorpayKeySecret: payment.razorpayKeySecret ? "********" : "" } });
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
