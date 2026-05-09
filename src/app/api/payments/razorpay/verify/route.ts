import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAYMENT_SETTINGS, getSetting } from "@/lib/settings";
import { serviceBookablePrice } from "@/lib/pet-care-pricing";

function bookingTotal(booking: any) {
  const data = booking?.addons_json && typeof booking.addons_json === "object" ? booking.addons_json : {};
  if (data.pricing?.total !== undefined) return Number(data.pricing.total || 0);
  const addonTotal = Array.isArray(data.addons) ? data.addons.reduce((sum: number, addon: any) => sum + Number(addon.price || 0), 0) : 0;
  const discount = Number(data.coupon?.discount || 0);
  return Math.max(0, serviceBookablePrice(booking.service) + addonTotal - discount);
}

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

  const existingBooking = bookingId
    ? await prisma.booking.findFirst({ where: { id: bookingId, client_id: session.user.id }, include: { service: true } })
    : null;
  if (bookingId && !existingBooking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }
  const booking = existingBooking
    ? await prisma.booking.update({
        where: { id: existingBooking.id },
        data: { payment_status: "Paid" },
        include: { service: true },
      })
    : null;

  await prisma.payment.create({
    data: {
      booking_id: booking?.id,
      client_id: session.user.id,
      amount: Number(amount || (booking ? bookingTotal(booking) : 0)),
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
