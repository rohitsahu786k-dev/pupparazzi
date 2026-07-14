import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { canExtendBooking, quoteExtension } from "@/lib/booking-extension";
import { computeBookingPricing, pricingSnapshot } from "@/lib/booking-pricing";
import { formatBookingDate } from "@/lib/booking-lifecycle";
import {
  sendExtensionApprovedEmail,
  sendExtensionRejectedEmail,
  sendExtensionRequestedEmail,
} from "@/lib/mailer";

function canManageBookings(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

const bookingInclude = { service: true, pet: true, client: true, address: true };

function nullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

/**
 * Commit an extension: move the check-out, raise the subtotal by the extra, and
 * re-store the pricing snapshot through the shared engine so any discount on the
 * booking re-applies to the new subtotal.
 */
async function applyExtension(booking: any, checkOutDate: Date, checkOutTime: string, note: string | null) {
  const quote = quoteExtension(booking, checkOutDate, checkOutTime);
  if (!quote.ok) throw new Error(quote.error || "Extension is not valid");

  const nextPricing = computeBookingPricing({ ...booking, final_amount: quote.newSubtotal });
  const existingAddons = booking.addons_json && typeof booking.addons_json === "object" ? booking.addons_json : {};

  // The extension adds a charge, so a fully-paid booking now owes the difference.
  const nextPaymentStatus = booking.payment_status === "Paid" && quote.extraAmount > 0
    ? "Partially Paid"
    : booking.payment_status;

  return prisma.booking.update({
    where: { id: booking.id },
    data: {
      check_out_date: checkOutDate,
      check_out_time: checkOutTime,
      final_amount: quote.newSubtotal,
      addons_json: { ...existingAddons, pricing: pricingSnapshot(nextPricing) },
      payment_status: nextPaymentStatus,
      extension_status: "Approved",
      extension_check_out_date: checkOutDate,
      extension_check_out_time: checkOutTime,
      extension_extra_amount: quote.extraAmount,
      extension_note: note,
      extension_decided_at: new Date(),
    },
    include: bookingInclude,
  });
}

function notifyApproved(booking: any, quote: { extraAmount: number; newTotal: number }) {
  const email = booking.client?.email;
  if (!email) return;
  sendExtensionApprovedEmail(email, {
    userName: booking.client?.name || "Valued Customer",
    bookingId: booking.booking_id,
    serviceName: booking.service?.name || "Boarding",
    petName: booking.pet?.name || "Pet",
    newCheckOut: `${booking.check_out_date ? formatBookingDate(booking.check_out_date) : ""} ${booking.check_out_time || ""}`.trim(),
    extraAmount: quote.extraAmount.toLocaleString("en-IN"),
    newTotal: quote.newTotal.toLocaleString("en-IN"),
  }).catch(console.error);
}

/**
 * POST /api/bookings/extend
 *
 * Admin/staff: applies the extension immediately.
 * Client (owner): records an extension request for admin/staff to approve.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body.id || "");
    const checkOutTime = nullableString(body.check_out_time);
    const rawDate = body.check_out_date ? new Date(String(body.check_out_date)) : null;
    const note = nullableString(body.note);

    if (!id || !rawDate || Number.isNaN(rawDate.getTime()) || !checkOutTime) {
      return NextResponse.json({ message: "Booking, new check-out date, and check-out time are required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 });

    const operationsUser = canManageBookings(session.user.role);
    if (!operationsUser && booking.client_id !== session.user.id) {
      return NextResponse.json({ message: "You can only extend your own booking" }, { status: 403 });
    }
    if (!canExtendBooking(booking)) {
      return NextResponse.json({ message: "Only an active boarding booking can be extended" }, { status: 400 });
    }

    const quote = quoteExtension(booking, rawDate, checkOutTime);
    if (!quote.ok) {
      return NextResponse.json({ message: quote.error || "Extension is not valid" }, { status: 400 });
    }

    if (operationsUser) {
      const updated = await applyExtension(booking, rawDate, checkOutTime, note);
      notifyApproved(updated, quote);
      return NextResponse.json({ booking: updated, quote, applied: true });
    }

    // Client request — nothing about the booking changes until it is approved.
    if (booking.extension_status === "Requested") {
      return NextResponse.json({ message: "An extension request is already pending review" }, { status: 409 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        extension_status: "Requested",
        extension_check_out_date: rawDate,
        extension_check_out_time: checkOutTime,
        extension_extra_amount: quote.extraAmount,
        extension_note: note,
        extension_requested_by: session.user.id,
        extension_requested_at: new Date(),
        extension_decided_at: null,
      },
      include: bookingInclude,
    });

    if (updated.client?.email) {
      sendExtensionRequestedEmail(updated.client.email, {
        userName: updated.client?.name || "Valued Customer",
        bookingId: updated.booking_id,
        serviceName: updated.service?.name || "Boarding",
        petName: updated.pet?.name || "Pet",
        newCheckOut: `${formatBookingDate(rawDate)} ${checkOutTime}`,
        extraAmount: quote.extraAmount.toLocaleString("en-IN"),
      }).catch(console.error);
    }

    return NextResponse.json({ booking: updated, quote, applied: false });
  } catch (error) {
    console.error("POST booking extension error:", error);
    return NextResponse.json({ message: "Failed to extend booking", error: String(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/bookings/extend — admin/staff approve or reject a client's request.
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canManageBookings(session.user.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id || "");
    const action = String(body.action || "");
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Booking ID and a valid action are required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    if (booking.extension_status !== "Requested") {
      return NextResponse.json({ message: "This booking has no pending extension request" }, { status: 409 });
    }

    if (action === "reject") {
      const updated = await prisma.booking.update({
        where: { id },
        data: { extension_status: "Rejected", extension_decided_at: new Date() },
        include: bookingInclude,
      });
      if (updated.client?.email) {
        sendExtensionRejectedEmail(updated.client.email, {
          userName: updated.client?.name || "Valued Customer",
          bookingId: updated.booking_id,
          serviceName: updated.service?.name || "Boarding",
          petName: updated.pet?.name || "Pet",
        }).catch(console.error);
      }
      return NextResponse.json({ booking: updated, applied: false });
    }

    const checkOutDate = booking.extension_check_out_date;
    const checkOutTime = booking.extension_check_out_time;
    if (!checkOutDate || !checkOutTime) {
      return NextResponse.json({ message: "The pending request is missing a check-out date or time" }, { status: 400 });
    }

    // Re-quote at approval time rather than trusting the figure stored when the
    // client asked — the booking may have changed in between.
    const quote = quoteExtension(booking, checkOutDate, checkOutTime);
    if (!quote.ok) {
      return NextResponse.json({ message: quote.error || "Extension is no longer valid" }, { status: 400 });
    }

    const updated = await applyExtension(booking, checkOutDate, checkOutTime, booking.extension_note ?? null);
    notifyApproved(updated, quote);
    return NextResponse.json({ booking: updated, quote, applied: true });
  } catch (error) {
    console.error("PATCH booking extension error:", error);
    return NextResponse.json({ message: "Failed to update extension request", error: String(error) }, { status: 500 });
  }
}
