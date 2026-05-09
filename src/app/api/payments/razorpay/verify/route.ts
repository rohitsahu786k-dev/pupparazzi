import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAYMENT_SETTINGS, getSetting } from "@/lib/settings";
import { COD_ADVANCE_AMOUNT, bookingTotal, recordSuccessfulOnlinePayment } from "@/lib/payment-invoices";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const paymentSettings = await getSetting("payment", DEFAULT_PAYMENT_SETTINGS);
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, paymentType } = await req.json();
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ message: "Payment details are required" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", paymentSettings.razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ message: "Invalid payment signature" }, { status: 400 });
  }

  const existingBooking = bookingId
    ? await prisma.booking.findFirst({ where: { id: bookingId, client_id: session.user.id }, include: { service: true } })
    : null;
  if (bookingId && !existingBooking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }
  if (!existingBooking) {
    return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
  }
  const type = paymentType === "advance" ? "advance" : "full";
  const expectedAmount = existingBooking ? (type === "advance" ? COD_ADVANCE_AMOUNT : bookingTotal(existingBooking)) : Number(amount || 0);
  const result = await recordSuccessfulOnlinePayment({
    bookingId: existingBooking.id,
    clientId: session.user.id,
    amount: Number(amount || expectedAmount),
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    transactionId: razorpay_payment_id,
    source: "Razorpay",
    mode: type === "advance" ? "Advance Online" : "Online",
    paymentType: type,
  });

  return NextResponse.json({ message: "Payment verified", ...result });
}
