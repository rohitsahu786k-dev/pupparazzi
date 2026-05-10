import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendBookingConfirmation, sendPaymentConfirmation, sendCancellationEmail, sendBookingStatusEmail } from "@/lib/mailer";
import { generateInvoicePdf } from "@/lib/invoice";
import { calculateCouponDiscount, CouponRule, defaultCoupons, serviceBookablePrice } from "@/lib/pet-care-pricing";
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  expirePastBookings,
  formatBookingDate,
} from "@/lib/booking-lifecycle";
import { collectCodPayment } from "@/lib/payment-invoices";

function isAdmin(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

function bookingPricing(service: { price?: number | null; discounted_price?: number | null }, addonsJson: unknown) {
  const base = serviceBookablePrice(service);
  const data = addonsJson && typeof addonsJson === "object" ? addonsJson as any : {};
  const addonTotal = Array.isArray(data.addons)
    ? data.addons.reduce((sum: number, addon: any) => sum + Number(addon.price || 0), 0)
    : 0;
  const couponDiscount = Number(data.coupon?.discount || 0);
  const subtotal = base + addonTotal;
  return {
    base,
    addonTotal,
    couponDiscount,
    subtotal,
    total: Math.max(0, subtotal - couponDiscount),
    couponCode: data.coupon?.code,
  };
}

async function getCoupons() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "coupons" } });
  return (Array.isArray(setting?.value) ? setting.value : defaultCoupons) as CouponRule[];
}

// GET /api/bookings?userId=xxx&status=Pending&paymentStatus=Paid&dateFrom=2026-05-01&dateTo=2026-05-31
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await expirePastBookings();

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

    const service = await prisma.service.findUnique({ where: { id: service_id }, include: { addons: { where: { is_active: true } } } });
    if (!service || !service.is_active) {
      return NextResponse.json({ message: "Service is not available" }, { status: 404 });
    }

    const requestedAddonIds = Array.isArray(addons_json?.addons) ? addons_json.addons.map((addon: any) => String(addon.id)) : [];
    const selectedAddons = service.addons.filter((addon) => requestedAddonIds.includes(addon.id));
    const addonTotal = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    const basePrice = serviceBookablePrice(service);
    const subtotal = basePrice + addonTotal;
    let couponPayload = null;
    if (addons_json?.coupon?.code) {
      const code = String(addons_json.coupon.code).trim().toUpperCase();
      const coupon = (await getCoupons()).find((item) => item.code.toUpperCase() === code);
      if (!coupon || !coupon.is_active) return NextResponse.json({ message: "Coupon is not active" }, { status: 400 });
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return NextResponse.json({ message: "Coupon has expired" }, { status: 400 });
      if (coupon.category && coupon.category !== service.category) return NextResponse.json({ message: `Coupon is valid only for ${coupon.category}` }, { status: 400 });
      if (subtotal < coupon.minimum_order_amount) return NextResponse.json({ message: `Minimum order amount is Rs. ${coupon.minimum_order_amount}` }, { status: 400 });
      couponPayload = { code: coupon.code, discount: calculateCouponDiscount(coupon, subtotal), terms: coupon.terms };
    }
    const finalAddonsJson = {
      addons: selectedAddons.map((addon) => ({ id: addon.id, name: addon.name, price: addon.price })),
      coupon: couponPayload,
      payment: addons_json?.payment && typeof addons_json.payment === "object" ? addons_json.payment : null,
      pricing: {
        servicePrice: basePrice,
        addonTotal,
        subtotal,
        couponDiscount: couponPayload?.discount || 0,
        total: Math.max(0, subtotal - (couponPayload?.discount || 0)),
      },
    };
    const requestedDate = new Date(slot_date);

    const duplicateUserBooking = await prisma.booking.findFirst({
      where: {
        client_id: clientId,
        pet_id,
        service_id,
        slot_date: requestedDate,
        slot_time,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: { id: true, booking_id: true },
    });
    if (duplicateUserBooking) {
      return NextResponse.json(
        { message: `This booking already exists as ${duplicateUserBooking.booking_id}.` },
        { status: 409 }
      );
    }

    const existingSlotCount = await prisma.booking.count({
      where: {
        service_id,
        slot_date: requestedDate,
        slot_time,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    });
    const slotCapacity = service.max_slots_per_day || 1;
    if (existingSlotCount >= slotCapacity) {
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

    const booking_id = `BKG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const booking = await prisma.booking.create({
      data: {
        booking_id,
        client_id: clientId,
        pet_id,
        service_id,
        address_id: bookingAddressId,
        slot_date: requestedDate,
        slot_time,
        notes: notes || null,
        addons_json: finalAddonsJson,
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
        price: String(bookingPricing(booking.service, booking.addons_json).total),
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
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id, status, payment_status, notes, internal_notes, transaction_id,
      payment_method, staff_id, slot_date, slot_time, after_photos_json, collect_cod,
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

    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { client_id: true, status: true },
    });
    if (!existingBooking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    const admin = isAdmin(session.user.role);
    const userCancellingOwnBooking = !admin
      && existingBooking.client_id === session.user.id
      && status === "Cancelled"
      && payment_status === undefined
      && notes === undefined
      && internal_notes === undefined
      && transaction_id === undefined
      && payment_method === undefined
      && staff_id === undefined
      && slot_date === undefined
      && slot_time === undefined
      && after_photos_json === undefined
      && collect_cod === undefined;

    if (!admin && !userCancellingOwnBooking) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }
    if (userCancellingOwnBooking && ["Completed", "Cancelled", "Expired"].includes(existingBooking.status)) {
      return NextResponse.json({ message: `Booking is already ${existingBooking.status.toLowerCase()}` }, { status: 400 });
    }

    if (collect_cod) {
      const result = await collectCodPayment({ bookingId: id, transactionId: transaction_id });
      return NextResponse.json(result.booking);
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
    const slotDateStr = booking.slot_date ? formatBookingDate(booking.slot_date) : "";

    // Payment confirmed → generate and send GST invoice
    if (payment_status === "Paid" && clientEmail) {
      const invoiceNumber = `INV-${booking.booking_id}`;
      const pricing = bookingPricing(booking.service, booking.addons_json);
      const unitPrice = pricing.total;
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
                desc: pricing.couponCode ? `${booking.service?.name || "Pet Service"} (${pricing.couponCode} applied)` : booking.service?.name || "Pet Service",
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

    const paymentCount = await prisma.payment.count({ where: { booking_id: id } });
    const invoiceCount = await prisma.invoice.count({ where: { booking_id: id } });
    if (paymentCount > 0 || invoiceCount > 0) {
      await prisma.booking.update({ where: { id }, data: { status: "Cancelled" } });
      return NextResponse.json({ message: "Booking has payments/invoices, so it was cancelled instead of deleted" });
    }
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("DELETE booking error:", error);
    return NextResponse.json({ message: "Failed to delete booking", error: String(error) }, { status: 500 });
  }
}
