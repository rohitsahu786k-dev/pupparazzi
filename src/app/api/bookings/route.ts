import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendBookingConfirmation, sendPaymentConfirmation, sendCancellationEmail, sendBookingStatusEmail } from "@/lib/mailer";
import { generateInvoicePdf } from "@/lib/invoice";

const BOOKING_STATUSES = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

function isAdmin(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

// GET /api/bookings?userId=xxx&status=Pending&paymentStatus=Paid&dateFrom=2026-05-01&dateTo=2026-05-31
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requestedUserId = searchParams.get("userId");
    const userId = isAdmin(session.user.role) ? requestedUserId : session.user.id;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const bookings = await prisma.booking.findMany({
      where: {
        ...(userId ? { client_id: userId } : {}),
        ...(status && status !== "All" ? { status } : {}),
        ...(paymentStatus && paymentStatus !== "All" ? { payment_status: paymentStatus } : {}),
        ...((dateFrom || dateTo)
          ? {
              slot_date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      include: { pet: true, service: true, address: true, client: true, staff: true, payments: true, invoices: true },
      orderBy: [{ slot_date: "desc" }, { created_at: "desc" }],
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      client_id, pet_id, service_id, slot_date, slot_time,
      address_id, address, notes, addons_json,
    } = body;
    const clientId = isAdmin(session.user.role) && client_id ? client_id : session.user.id;

    if (!clientId || !pet_id || !service_id || !slot_date || !slot_time) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({ where: { id: pet_id } });
    if (!pet || pet.owner_id !== clientId) {
      return NextResponse.json({ message: "Pet not found or unauthorized" }, { status: 404 });
    }

    const service = await prisma.service.findUnique({ where: { id: service_id } });
    if (!service || !service.is_active) {
      return NextResponse.json({ message: "Service is not available" }, { status: 404 });
    }

    const existingSlotCount = await prisma.booking.count({
      where: {
        service_id,
        slot_date: new Date(slot_date),
        slot_time,
        status: { not: "Cancelled" },
      },
    });
    if (service.max_slots_per_day && existingSlotCount >= service.max_slots_per_day) {
      return NextResponse.json({ message: "This slot is no longer available" }, { status: 409 });
    }

    let bookingAddressId = address_id || null;
    if (!bookingAddressId && address?.line1 && address?.city && address?.state && address?.pincode) {
      const createdAddress = await prisma.address.create({
        data: {
          user_id: clientId,
          label: address.label || "Service Address",
          line1: address.line1,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone || undefined,
        },
      });
      bookingAddressId = createdAddress.id;
    }

    const count = await prisma.booking.count();
    const booking_id = `BKG-${String(count + 1001).padStart(4, "0")}`;

    const booking = await prisma.booking.create({
      data: {
        booking_id,
        client_id: clientId,
        pet_id,
        service_id,
        address_id: bookingAddressId,
        slot_date: new Date(slot_date),
        slot_time,
        notes: notes || null,
        addons_json: addons_json || null,
        status: "Pending",
        payment_status: "Pending",
      },
      include: { pet: true, service: true, address: true, client: true },
    });

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

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("POST booking error:", error);
    return NextResponse.json({ message: "Failed to create booking", error: String(error) }, { status: 500 });
  }
}

// PATCH /api/bookings – handles status updates, payment confirmation, and cancellation
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id, status, payment_status, notes, internal_notes, transaction_id,
      payment_method, staff_id, slot_date, slot_time, after_photos_json,
    } = body;

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    if (status && !BOOKING_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid booking status" }, { status: 400 });
    }
    if (payment_status && !PAYMENT_STATUSES.includes(payment_status)) {
      return NextResponse.json({ message: "Invalid payment status" }, { status: 400 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(payment_status && { payment_status }),
        ...(notes !== undefined && { notes }),
        ...(internal_notes !== undefined && { internal_notes }),
        ...(staff_id !== undefined && { staff_id: staff_id || null }),
        ...(slot_date && { slot_date: new Date(slot_date) }),
        ...(slot_time && { slot_time }),
        ...(after_photos_json !== undefined && { after_photos_json }),
      },
      include: { pet: true, service: true, client: true, payments: true, invoices: true },
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

      const existingPayment = await prisma.payment.findFirst({
        where: { booking_id: booking.id, status: "Success" },
      });
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            booking_id: booking.id,
            client_id: booking.client_id,
            amount: totalAmount,
            mode: payment_method || "Manual",
            source: "Admin",
            status: "Success",
            ...(transaction_id ? { transaction_id } : {}),
          },
        });
      }

      const existingInvoice = await prisma.invoice.findUnique({ where: { invoice_id: invoiceNumber } });
      if (!existingInvoice) {
        await prisma.invoice.create({
          data: {
            invoice_id: invoiceNumber,
            booking_id: booking.id,
            client_id: booking.client_id,
            line_items_json: [
              {
                desc: booking.service?.name || "Pet Service",
                qty: 1,
                rate: unitPrice,
                amount: unitPrice,
              },
            ],
            subtotal: unitPrice,
            tax: gstAmount,
            total: totalAmount,
            status: "Paid",
          },
        });
      }

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

    if (status && status !== "Cancelled" && clientEmail) {
      sendBookingStatusEmail(clientEmail, {
        userName: booking.client?.name || "Valued Customer",
        bookingId: booking.booking_id,
        serviceName: booking.service?.name || "Pet Service",
        petName: booking.pet?.name || "Pet",
        status,
        slotDate: slotDateStr,
        slotTime: booking.slot_time || "",
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdmin(session.user.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

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
