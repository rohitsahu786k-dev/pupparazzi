import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAYMENT_SETTINGS, getSetting } from "@/lib/settings";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const paymentSettings = await getSetting("payment", DEFAULT_PAYMENT_SETTINGS);
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = await req.json();
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

  const booking = bookingId
    ? await prisma.booking.update({
        where: { id: bookingId },
        data: { payment_status: "Paid" },
        include: { service: true },
      })
    : null;

  await prisma.payment.create({
    data: {
      booking_id: booking?.id,
      client_id: session.user.id,
      amount: Number(amount || booking?.service?.price || 0),
      mode: "Online",
      source: "Razorpay",
      razorpay_order_id,
      razorpay_payment_id,
      transaction_id: razorpay_payment_id,
      status: "Success",
    },
  });

  return NextResponse.json({ message: "Payment verified" });
}
