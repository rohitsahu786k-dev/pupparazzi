import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAYMENT_SETTINGS, getSetting } from "@/lib/settings";
import { expectedPaymentAmount, recordSuccessfulOnlinePayment } from "@/lib/payment-invoices";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const paymentSettings = await getSetting("payment", DEFAULT_PAYMENT_SETTINGS);
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentType } = await req.json();
  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ message: "Payment details are required" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", paymentSettings.razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ message: "Invalid payment signature" }, { status: 400 });
  }

  const existingBooking = await prisma.booking.findFirst({ where: { id: bookingId, client_id: session.user.id }, include: { service: true } });
  if (!existingBooking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }
  const type = paymentType === "advance" ? "advance" : "full";
  const expectedAmount = expectedPaymentAmount(existingBooking, type);

  // Cross-check against Razorpay's own record of the order so a client can't
  // reuse a cheaper/unrelated paid order, or claim a different amount than was
  // actually authorized for this booking.
  const auth = Buffer.from(`${paymentSettings.razorpayKeyId}:${paymentSettings.razorpayKeySecret}`).toString("base64");
  const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const order = await orderRes.json().catch(() => null);
  if (!orderRes.ok || !order) {
    return NextResponse.json({ message: "Could not verify payment order" }, { status: 400 });
  }
  if (order.notes?.bookingId !== existingBooking.id || order.notes?.paymentType !== type) {
    return NextResponse.json({ message: "Payment order does not match this booking" }, { status: 400 });
  }
  if (order.amount !== Math.round(expectedAmount * 100)) {
    return NextResponse.json({ message: "Payment amount does not match this booking" }, { status: 400 });
  }
  if (order.status !== "paid" && order.amount_paid !== order.amount) {
    return NextResponse.json({ message: "Payment has not been completed" }, { status: 400 });
  }

  const result = await recordSuccessfulOnlinePayment({
    bookingId: existingBooking.id,
    clientId: session.user.id,
    amount: expectedAmount,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    transactionId: razorpay_payment_id,
    source: "Razorpay",
    mode: type === "advance" ? "Advance Online" : "Online",
    paymentType: type,
  });

  return NextResponse.json({ message: "Payment verified", ...result });
}
