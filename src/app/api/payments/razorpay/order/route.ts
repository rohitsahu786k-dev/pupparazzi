import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAYMENT_SETTINGS, getSetting } from "@/lib/settings";
import { expectedPaymentAmount } from "@/lib/payment-invoices";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const payment = await getSetting("payment", DEFAULT_PAYMENT_SETTINGS);
  if (!payment.enabled || payment.provider !== "razorpay" || !payment.razorpayKeyId || !payment.razorpayKeySecret) {
    return NextResponse.json({ message: "Razorpay is not configured" }, { status: 400 });
  }

  const { bookingId, paymentType, receipt } = await req.json();
  if (!bookingId) {
    return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
  }
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, client_id: session.user.id }, include: { service: true } });
  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  const type = paymentType === "advance" ? "advance" : "full";
  const rupees = expectedPaymentAmount(booking, type);
  if (!rupees || rupees <= 0) {
    return NextResponse.json({ message: "Nothing due for this booking" }, { status: 400 });
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
      notes: { bookingId: booking.id, paymentType: type },
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json({ ...data, key: payment.razorpayKeyId });
}
