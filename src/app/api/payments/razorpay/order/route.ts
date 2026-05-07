import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_PAYMENT_SETTINGS, getSetting } from "@/lib/settings";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const payment = await getSetting("payment", DEFAULT_PAYMENT_SETTINGS);
  if (!payment.enabled || payment.provider !== "razorpay" || !payment.razorpayKeyId || !payment.razorpayKeySecret) {
    return NextResponse.json({ message: "Razorpay is not configured" }, { status: 400 });
  }

  const { amount, receipt, notes } = await req.json();
  const rupees = Number(amount);
  if (!rupees || rupees <= 0) {
    return NextResponse.json({ message: "Valid amount is required" }, { status: 400 });
  }

  const auth = Buffer.from(`${payment.razorpayKeyId}:${payment.razorpayKeySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(rupees * 100),
      currency: payment.currency || "INR",
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json({ ...data, key: payment.razorpayKeyId });
}
