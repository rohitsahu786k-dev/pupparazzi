import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendBookingConfirmation, sendPaymentConfirmation, sendCancellationEmail } from "@/lib/mailer";
import { generateInvoicePdf } from "@/lib/invoice";

// GET /api/bookings?userId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  try {
    const bookings = await prisma.booking.findMany({
      where: userId ? { client_id: userId } : {},
      include: { pet: true, service: true, address: true },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("GET bookings error:", error);
    return NextResponse.json({ message: "Failed to fetch bookings", error: String(error) }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      client_id, pet_id, service_id, slot_date, slot_time,
      address_id, notes, addons_json,
    } = body;

    if (!client_id || !pet_id || !service_id || !slot_date || !slot_time) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({ where: { id: pet_id } });
    if (!pet || pet.owner_id !== client_id) {
      return NextResponse.json({ message: "Pet not found or unauthorized" }, { status: 404 });
    }

    const count = await prisma.booking.count();
    const booking_id = `BKG-${String(count + 1001).padStart(4, "0")}`;

    const booking = await prisma.booking.create({
      data: {
        booking_id,
        client_id,
        pet_id,
        service_id,
        address_id: address_id || null,
        slot_date: new Date(slot_date),
        slot_time,
        notes: notes || null,
        addons_json: addons_json || null,
        status: "Pending",
        payment_status: "Pending",
      },
      include: { pet: true, service: true, address: true, client: true },
    });

    // Create Google Calendar event (non-blocking)
    const calendarEventId = await createCalendarEvent({
      userId: client_id,
      serviceName: booking.service?.name || "Pet Service",
      petName: booking.pet?.name || "Pet",
      slotDate: slot_date,
      slotTime: slot_time,
      durationMins: booking.service?.slot_duration_mins || 60,
      address: notes || undefined,
    });

    if (calendarEventId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { google_event_id: calendarEventId },
      });
    }

    // Send booking confirmation email (non-blocking)
    const clientEmail = booking.client?.email;
    if (clientEmail) {
      sendBookingConfirmation(clientEmail, {
        userName: booking.client?.name || "Valued Customer",
        bookingId: booking_id,
        serviceName: booking.service?.name || "Pet Service",
        petName: booking.pet?.name || "Your Pet",
        slotDate: new Date(slot_date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        slotTime: slot_time,
        price: String(booking.service?.price || "0"),
        address: booking.address ? `${booking.address.line1}, ${booking.address.city}` : undefined,
      }).catch(console.error);
    }

    return NextResponse.json({ ...booking, google_event_id: calendarEventId }, { status: 201 });
  } catch (error) {
    console.error("POST booking error:", error);
    return NextResponse.json({ message: "Failed to create booking", error: String(error) }, { status: 500 });
  }
}

// PATCH /api/bookings – handles status updates, payment confirmation, and cancellation
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, payment_status, notes, transaction_id, payment_method } = body;

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(payment_status && { payment_status }),
        ...(notes && { notes }),
      },
      include: { pet: true, service: true, client: true },
    });

    const clientEmail = booking.client?.email;
    const slotDateStr = booking.slot_date
      ? new Date(booking.slot_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "";

    // Payment confirmed → generate and send GST invoice
    if (payment_status === "Paid" && clientEmail) {
      const invoiceNumber = `INV-${booking.booking_id}`;
      const unitPrice = Number(booking.service?.price || 0);
      const gstRate = 18;
      const gstAmount = parseFloat(((unitPrice * gstRate) / 100).toFixed(2));
      const totalAmount = parseFloat((unitPrice + gstAmount).toFixed(2));
      const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      const invoicePdf = generateInvoicePdf({
        invoiceNumber,
        invoiceDate: today,
        bookingId: booking.booking_id,
        customerName: booking.client?.name || "Customer",
        customerEmail: clientEmail,
        customerPhone: booking.client?.phone || undefined,
        serviceName: booking.service?.name || "Pet Service",
        petName: booking.pet?.name || "Pet",
        slotDate: slotDateStr,
        slotTime: booking.slot_time || "",
        quantity: 1,
        unitPrice,
        gstRate,
      });

      sendPaymentConfirmation(clientEmail, {
        userName: booking.client?.name || "Valued Customer",
        bookingId: booking.booking_id,
        invoiceNumber,
        serviceName: booking.service?.name || "Pet Service",
        petName: booking.pet?.name || "Pet",
        slotDate: slotDateStr,
        slotTime: booking.slot_time || "",
        subtotal: unitPrice.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: payment_method || "Online",
        transactionId: transaction_id,
      }, invoicePdf).catch(console.error);
    }

    // Booking cancelled → send cancellation email
    if (status === "Cancelled" && clientEmail) {
      sendCancellationEmail(clientEmail, {
        userName: booking.client?.name || "Valued Customer",
        bookingId: booking.booking_id,
        serviceName: booking.service?.name || "Pet Service",
        slotDate: slotDateStr,
      }).catch(console.error);
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("PATCH booking error:", error);
    return NextResponse.json({ message: "Failed to update booking", error: String(error) }, { status: 500 });
  }
}

// DELETE /api/bookings?id=xxx
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("DELETE booking error:", error);
    return NextResponse.json({ message: "Failed to delete booking", error: String(error) }, { status: 500 });
  }
}
