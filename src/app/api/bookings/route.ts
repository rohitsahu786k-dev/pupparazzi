import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendBookingConfirmation, sendPaymentConfirmation, sendCancellationEmail, sendBookingStatusEmail } from "@/lib/mailer";
import { generateInvoicePdf } from "@/lib/invoice";
import { calculateCouponDiscount, CouponRule, defaultCoupons, serviceBookablePrice } from "@/lib/pet-care-pricing";
import {
  computeBookingPricing,
  discountLabel,
  isDiscountType,
  pricingSnapshot,
} from "@/lib/booking-pricing";
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  expirePastBookings,
  formatBookingDate,
  periodWhere,
} from "@/lib/booking-lifecycle";
import { collectCodPayment } from "@/lib/payment-invoices";
import { bookingDetailFormUrl, detailFormService } from "@/lib/booking-detail-forms";
import { isTimeOptionalService } from "@/lib/service-rules";
import { deleteBookingCascade } from "@/lib/delete-records";

function canManageBookings(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

function isFullAdmin(role?: string | null) {
  return role === "ADMIN";
}

function isStaff(role?: string | null) {
  return role === "STAFF";
}

/**
 * Read a discount off the request body. Only admin/staff may set one; a client
 * sending these fields is ignored rather than rejected, matching how the other
 * privileged fields behave in bookingDetailData.
 *
 * Returns undefined when the caller did not touch the discount at all, so an
 * unrelated PATCH never clears an existing discount.
 */
function discountInput(body: any, admin: boolean) {
  if (!admin) return undefined;
  if (body.discount_type === undefined && body.discount_value === undefined && body.discount_reason === undefined) {
    return undefined;
  }
  const rawType = body.discount_type;
  const rawValue = Number(body.discount_value ?? 0);

  // An empty type, or a zero/blank value, means "remove the discount".
  if (!rawType || !isDiscountType(rawType) || !Number.isFinite(rawValue) || rawValue <= 0) {
    return { type: null, value: 0, reason: null };
  }
  if (rawType === "PERCENT" && rawValue > 100) {
    throw new Error("Percentage discount cannot be more than 100%");
  }
  return {
    type: rawType,
    value: rawValue,
    reason: nullableString(body.discount_reason),
  };
}

async function getCoupons() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "coupons" } });
  return (Array.isArray(setting?.value) ? setting.value : defaultCoupons) as CouponRule[];
}

function dayRange(value: Date) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function nullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function nullableDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function bookingDetailData(body: any, admin: boolean) {
  return {
    ...(body.boarding_type !== undefined ? { boarding_type: nullableString(body.boarding_type) } : {}),
    ...(body.check_in_date !== undefined ? { check_in_date: nullableDate(body.check_in_date) } : {}),
    ...(body.check_out_date !== undefined ? { check_out_date: nullableDate(body.check_out_date) } : {}),
    ...(body.check_in_time !== undefined ? { check_in_time: nullableString(body.check_in_time) } : {}),
    ...(body.check_out_time !== undefined ? { check_out_time: nullableString(body.check_out_time) } : {}),
    ...(body.check_in_slot !== undefined ? { check_in_slot: nullableString(body.check_in_slot) } : {}),
    ...(body.check_out_slot !== undefined ? { check_out_slot: nullableString(body.check_out_slot) } : {}),
    ...(body.weight !== undefined ? { weight: nullableNumber(body.weight) } : {}),
    ...(body.meal_type !== undefined ? { meal_type: nullableString(body.meal_type) } : {}),
    ...(body.companion_name !== undefined ? { companion_name: nullableString(body.companion_name) } : {}),
    ...(body.companion_phone !== undefined ? { companion_phone: nullableString(body.companion_phone) } : {}),
    ...(body.documents_json !== undefined ? { documents_json: body.documents_json || null } : {}),
    ...(body.details_completed !== undefined ? { details_completed: Boolean(body.details_completed) } : {}),
    // Staff/admin-only fields: a client saving their own booking details must never be able to set these.
    ...(admin && body.check_out_weight !== undefined ? { check_out_weight: nullableNumber(body.check_out_weight) } : {}),
    ...(admin && body.kennel !== undefined ? { kennel: nullableString(body.kennel) } : {}),
    ...(admin && body.final_amount !== undefined ? { final_amount: nullableNumber(body.final_amount) } : {}),
    ...(admin && body.late_checkout_fees !== undefined ? { late_checkout_fees: nullableNumber(body.late_checkout_fees) } : {}),
    ...(admin && body.refund_amount !== undefined ? { refund_amount: nullableNumber(body.refund_amount) } : {}),
    ...(admin && body.refund_reason !== undefined ? { refund_reason: nullableString(body.refund_reason) } : {}),
    ...(admin && body.end_time !== undefined ? { end_time: nullableString(body.end_time) } : {}),
    ...(admin && body.staff_name !== undefined ? { staff_name: nullableString(body.staff_name) } : {}),
    ...(admin && body.services_json !== undefined ? { services_json: body.services_json || null } : {}),
  };
}

function missingDetailFields(serviceCategory: string, body: any) {
  const required = serviceCategory === "Boarding"
    ? ["boarding_type", "check_in_date", "check_out_date", "check_in_time", "check_out_time"]
    : serviceCategory === "Grooming"
      ? ["slot_date", "slot_time", "end_time", "staff_name", "services_json"]
      : [];
  return required.filter((field) => {
    const value = body[field];
    if (field === "services_json") return !Array.isArray(value) || value.length === 0;
    return value === undefined || value === null || String(value).trim() === "";
  }).concat(["aadhaar_front", "aadhaar_back", "pan_card", "vaccination_certificate"].filter((field) => {
    const docs = body.documents_json && typeof body.documents_json === "object" ? body.documents_json : {};
    return !docs[field]?.assetId && !docs[field]?.path;
  }));
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
    const operationsUser = canManageBookings(session.user.role);
    const userId = operationsUser ? requestedUserId : session.user.id;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const bookingId = searchParams.get("bookingId");
    const serviceCategory = searchParams.get("serviceCategory");
    const period = searchParams.get("period");

    // AND-composed so a period tab and an explicit date range narrow each other,
    // instead of one silently overwriting the other's slot_date constraint.
    const bookings = await prisma.booking.findMany({
      where: {
        AND: [
          ...(bookingId ? [{ id: bookingId }] : []),
          ...(userId ? [{ client_id: userId }] : []),
          ...(status && status !== "All" ? [{ status }] : []),
          ...(paymentStatus && paymentStatus !== "All" ? [{ payment_status: paymentStatus }] : []),
          ...(serviceCategory && serviceCategory !== "All" ? [{ service: { category: serviceCategory } }] : []),
          ...(period && period !== "all" ? [periodWhere(period)] : []),
          ...((dateFrom || dateTo)
            ? [{
                slot_date: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: dayRange(new Date(dateTo)).end } : {}),
                },
              }]
            : []),
        ],
      },
      include: { pet: true, service: true, address: true, client: true, staff: true, payments: true, invoices: true },
      orderBy: [{ created_at: "desc" }, { slot_date: "desc" }],
    });
    const bookingIds = bookings.map((booking) => booking.id);
    const assets = bookingIds.length
      ? await prisma.asset.findMany({
          where: { booking_id: { in: bookingIds } },
          orderBy: { created_at: "desc" },
        })
      : [];
    const withDocuments = bookings.map((booking) => ({
      ...booking,
      documents: assets.filter((asset) => asset.booking_id === booking.id),
    }));
    return NextResponse.json(bookingId ? withDocuments[0] || null : withDocuments);
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
    const operationsUser = canManageBookings(session.user.role);
    const fullAdmin = operationsUser;
    const clientId = operationsUser && client_id ? client_id : session.user.id;

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
    const timeOptionalService = isTimeOptionalService(service);

    const requestedAddonIds = Array.isArray(addons_json?.addons) ? addons_json.addons.map((addon: any) => String(addon.id)) : [];
    const selectedAddons = service.addons.filter((addon) => requestedAddonIds.includes(addon.id));
    const addonTotal = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    const basePrice = serviceBookablePrice(service);
    const subtotal = basePrice + addonTotal;
    const adminTotalOverride = fullAdmin ? nullableNumber(body.final_amount ?? body.admin_total) : null;
    let couponPayload = null;
    if (addons_json?.coupon?.code) {
      const code = String(addons_json.coupon.code).trim().toUpperCase();
      const coupon = (await getCoupons()).find((item) => item.code.toUpperCase() === code);
      if (!coupon || !coupon.is_active) return NextResponse.json({ message: "Coupon is not active" }, { status: 400 });
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return NextResponse.json({ message: "Coupon has expired" }, { status: 400 });
      if (coupon.category && coupon.category !== service.category) return NextResponse.json({ message: `Coupon is valid only for ${coupon.category}` }, { status: 400 });
      if (subtotal < coupon.minimum_order_amount) return NextResponse.json({ message: `Minimum order amount is ₹${coupon.minimum_order_amount}` }, { status: 400 });
      couponPayload = { code: coupon.code, discount: calculateCouponDiscount(coupon, subtotal), terms: coupon.terms };
    }
    let discount;
    try {
      discount = discountInput(body, fullAdmin);
    } catch (error) {
      return NextResponse.json({ message: String((error as Error).message) }, { status: 400 });
    }

    const baseAddonsJson = {
      addons: selectedAddons.map((addon) => ({ id: addon.id, name: addon.name, price: addon.price })),
      coupon: couponPayload,
      payment: addons_json?.payment && typeof addons_json.payment === "object" ? addons_json.payment : null,
      discount: discount?.type ? { type: discount.type, value: discount.value, reason: discount.reason } : null,
    };

    // The total is always derived server-side — a client-supplied total is never trusted.
    const pricing = computeBookingPricing({
      service,
      addons_json: { ...baseAddonsJson, pricing: { subtotal: adminTotalOverride ?? subtotal } },
      final_amount: adminTotalOverride,
      discount_type: discount?.type ?? null,
      discount_value: discount?.value ?? null,
    });
    const finalAddonsJson = { ...baseAddonsJson, pricing: pricingSnapshot(pricing) };
    const requestedDate = new Date(slot_date);

    if (!timeOptionalService) {
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
    }

    if (!operationsUser && service.category === "Grooming") {
      const { start, end } = dayRange(requestedDate);
      const groomingCount = await prisma.booking.count({
        where: {
          slot_date: { gte: start, lte: end },
          status: { in: ACTIVE_BOOKING_STATUSES },
          service: { category: "Grooming" },
        },
      });
      if (groomingCount >= 15) {
        return NextResponse.json({ message: "Online grooming bookings are full for this date. Please choose another date." }, { status: 409 });
      }
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
        ...(discount
          ? {
              discount_type: discount.type,
              discount_value: discount.type ? discount.value : null,
              discount_amount: pricing.manualDiscount,
              discount_reason: discount.type ? discount.reason : null,
              discount_by: discount.type ? session.user.id : null,
            }
          : {}),
        ...bookingDetailData(body, fullAdmin),
        status: "Pending",
        payment_status: "Pending",
      },
      include: { pet: true, service: true, address: true, client: true },
    });

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
      payment_method, staff_id, service_id, pet_id, address_id, address, client, slot_date, slot_time, after_photos_json, collect_cod,
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
      include: { service: true },
    });
    if (!existingBooking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    const operationsUser = canManageBookings(session.user.role);
    const admin = operationsUser;
    const userSavingOwnDetails = !operationsUser
      && existingBooking.client_id === session.user.id
      && status === undefined
      && payment_status === undefined
      && internal_notes === undefined
      && transaction_id === undefined
      && payment_method === undefined
      && staff_id === undefined
      && service_id === undefined
      && pet_id === undefined
      && address_id === undefined
      && address === undefined
      && client === undefined
      && after_photos_json === undefined
      && collect_cod === undefined
      && body.details_completed !== undefined;
    const userCancellingOwnBooking = !operationsUser
      && existingBooking.client_id === session.user.id
      && status === "Cancelled"
      && payment_status === undefined
      && notes === undefined
      && internal_notes === undefined
      && transaction_id === undefined
      && payment_method === undefined
      && staff_id === undefined
      && service_id === undefined
      && pet_id === undefined
      && address_id === undefined
      && address === undefined
      && client === undefined
      && slot_date === undefined
      && slot_time === undefined
      && after_photos_json === undefined
      && collect_cod === undefined;

    if (!operationsUser && !userCancellingOwnBooking && !userSavingOwnDetails) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }
    if (!operationsUser && userSavingOwnDetails && existingBooking.details_completed) {
      return NextResponse.json({ message: "Booking details are already submitted. Please contact admin for changes." }, { status: 409 });
    }
    if (userCancellingOwnBooking && ["Completed", "Cancelled", "Expired"].includes(existingBooking.status)) {
      return NextResponse.json({ message: `Booking is already ${existingBooking.status.toLowerCase()}` }, { status: 400 });
    }

    if (collect_cod) {
      const result = await collectCodPayment({ bookingId: id, transactionId: transaction_id });
      return NextResponse.json(result.booking);
    }

    if (body.details_completed) {
      const missing = missingDetailFields(existingBooking.service?.category || "", { ...body, slot_date: slot_date || existingBooking.slot_date, slot_time: slot_time || existingBooking.slot_time });
      if (missing.length > 0) {
        return NextResponse.json({ message: `Missing required detail fields: ${missing.join(", ")}` }, { status: 400 });
      }
    }

    if (admin && pet_id) {
      const pet = await prisma.pet.findUnique({ where: { id: pet_id }, select: { owner_id: true } });
      if (!pet || pet.owner_id !== existingBooking.client_id) {
        return NextResponse.json({ message: "Pet not found for this client" }, { status: 400 });
      }
    }

    const nextServiceId = admin && service_id ? String(service_id) : existingBooking.service_id;
    const nextSlotDate = slot_date ? new Date(slot_date) : existingBooking.slot_date;
    const nextSlotTime = slot_time || existingBooking.slot_time;
    if (admin && (service_id || slot_date || slot_time)) {
      const service = await prisma.service.findUnique({ where: { id: nextServiceId }, select: { max_slots_per_day: true, is_active: true } });
      if (!service?.is_active) return NextResponse.json({ message: "Service is not available" }, { status: 404 });
      const existingSlotCount = await prisma.booking.count({
        where: {
          id: { not: id },
          service_id: nextServiceId,
          slot_date: nextSlotDate,
          slot_time: nextSlotTime,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
      });
      if (existingSlotCount >= (service.max_slots_per_day || 1)) {
        return NextResponse.json({ message: "This slot is no longer available" }, { status: 409 });
      }
    }

    let bookingAddressId = address_id !== undefined ? (address_id || null) : undefined;
    if (admin && client && typeof client === "object") {
      await prisma.user.update({
        where: { id: existingBooking.client_id },
        data: {
          ...(client.name !== undefined ? { name: nullableString(client.name) } : {}),
          ...(client.phone !== undefined ? { phone: nullableString(client.phone) } : {}),
          ...(client.email !== undefined ? { email: nullableString(client.email) } : {}),
        },
      });
    }
    if (admin && bookingAddressId === undefined && address?.line1 && address?.city && address?.state && address?.pincode) {
      const addressData = {
        label: address.label || "Service Address",
        line1: String(address.line1).trim(),
        city: String(address.city).trim(),
        state: String(address.state).trim(),
        pincode: String(address.pincode).trim(),
        phone: address.phone ? String(address.phone).trim() : null,
      };
      if (existingBooking.address_id) {
        await prisma.address.update({
          where: { id: existingBooking.address_id },
          data: addressData,
        });
        bookingAddressId = existingBooking.address_id;
      } else {
        const createdAddress = await prisma.address.create({
          data: {
            user_id: existingBooking.client_id,
            ...addressData,
          },
        });
        bookingAddressId = createdAddress.id;
      }
    }

    const adminTotalOverride = admin ? nullableNumber(body.final_amount ?? body.admin_total) : null;

    let discount;
    try {
      discount = discountInput(body, admin);
    } catch (error) {
      return NextResponse.json({ message: String((error as Error).message) }, { status: 400 });
    }

    // Whenever the amount or the discount moves, recompute and re-store the whole
    // pricing snapshot so the list, the invoice and the emails cannot drift apart.
    const pricingChanged = adminTotalOverride !== null || discount !== undefined;
    const existingAddons = (existingBooking.addons_json && typeof existingBooking.addons_json === "object")
      ? existingBooking.addons_json as any
      : {};

    let nextAddonsJson;
    let nextPricing;
    if (pricingChanged) {
      const effectiveDiscount = discount !== undefined
        ? discount
        : { type: existingBooking.discount_type, value: existingBooking.discount_value, reason: existingBooking.discount_reason };

      nextPricing = computeBookingPricing({
        service: existingBooking.service,
        addons_json: {
          ...existingAddons,
          ...(adminTotalOverride !== null
            ? { pricing: { ...(existingAddons.pricing || {}), subtotal: adminTotalOverride } }
            : {}),
        },
        final_amount: adminTotalOverride ?? existingBooking.final_amount,
        discount_type: effectiveDiscount.type,
        discount_value: effectiveDiscount.value,
      });

      nextAddonsJson = {
        ...existingAddons,
        ...(discount !== undefined
          ? { discount: discount.type ? { type: discount.type, value: discount.value, reason: discount.reason } : null }
          : {}),
        pricing: pricingSnapshot(nextPricing),
      };
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status, expiry_locked: true }),
        ...(payment_status && { payment_status }),
        ...(notes !== undefined && { notes }),
        ...(internal_notes !== undefined && { internal_notes }),
        ...(staff_id !== undefined && { staff_id: staff_id || null }),
        ...(admin && service_id ? { service_id: nextServiceId } : {}),
        ...(admin && pet_id ? { pet_id: String(pet_id) } : {}),
        ...(admin && bookingAddressId !== undefined ? { address_id: bookingAddressId } : {}),
        ...(slot_date && { slot_date: new Date(slot_date) }),
        ...(slot_time && { slot_time }),
        ...(after_photos_json !== undefined && { after_photos_json }),
        ...(nextAddonsJson ? { addons_json: nextAddonsJson } : {}),
        ...(discount
          ? {
              discount_type: discount.type,
              discount_value: discount.type ? discount.value : null,
              discount_amount: nextPricing?.manualDiscount ?? 0,
              discount_reason: discount.type ? discount.reason : null,
              discount_by: discount.type ? session.user.id : null,
            }
          : {}),
        ...bookingDetailData(body, admin),
      },
      include: { pet: true, service: true, address: true, client: true, payments: true, invoices: true },
    });

    const clientEmail = booking.client?.email;
    const slotDateStr = booking.slot_date ? formatBookingDate(booking.slot_date) : "";

    // Payment confirmed → generate and send GST invoice
    if (payment_status === "Paid" && clientEmail) {
      const invoiceNumber = `INV-${booking.booking_id}`;
      const pricing = computeBookingPricing(booking);
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
                desc: booking.service?.name || "Pet Service",
                qty: 1,
                rate: pricing.subtotal,
                amount: pricing.subtotal,
              },
              ...(pricing.couponDiscount > 0
                ? [{
                    desc: `Coupon discount${pricing.couponCode ? ` (${pricing.couponCode})` : ""}`,
                    qty: 1,
                    rate: -pricing.couponDiscount,
                    amount: -pricing.couponDiscount,
                  }]
                : []),
              ...(pricing.manualDiscount > 0
                ? [{
                    desc: `Discount${discountLabel(pricing) ? ` (${discountLabel(pricing)})` : ""}${pricing.discountReason ? ` - ${pricing.discountReason}` : ""}`,
                    qty: 1,
                    rate: -pricing.manualDiscount,
                    amount: -pricing.manualDiscount,
                  }]
                : []),
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
        customerAddress: booking.address ? `${booking.address.line1}, ${booking.address.city}, ${booking.address.state} ${booking.address.pincode}` : undefined,
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
    const statusChanged = Boolean(status && status !== existingBooking.status);

    if (statusChanged && status === "Cancelled" && clientEmail) {
      sendCancellationEmail(clientEmail, {
        userName: booking.client?.name || "Valued Customer",
        bookingId: booking.booking_id,
        serviceName: booking.service?.name || "Pet Service",
        slotDate: slotDateStr,
      }).catch(console.error);
    }

    if (statusChanged && status === "Confirmed" && clientEmail) {
      const detailFormLink = bookingDetailFormUrl(booking.id, booking.service);
      sendBookingConfirmation(clientEmail, {
        userName: booking.client?.name || "Valued Customer",
        bookingDatabaseId: booking.id,
        bookingId: booking.booking_id,
        serviceName: booking.service?.name || "Pet Service",
        serviceCategory: booking.service?.category || undefined,
        petName: booking.pet?.name || "Your Pet",
        slotDate: slotDateStr,
        slotTime: booking.slot_time || "",
        price: String(computeBookingPricing(booking).total),
        address: booking.address ? `${booking.address.line1}, ${booking.address.city}` : undefined,
        detailFormLink,
        detailFormService: detailFormService(booking.service),
      }).catch(console.error);
    } else if (statusChanged && status && !["Cancelled", "Confirmed"].includes(status) && clientEmail) {
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
    if (!session?.user?.id || !canManageBookings(session.user.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const result = await deleteBookingCascade(id);
    if (!result.deleted) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Booking deleted successfully", assetsDeleted: result.assetsDeleted });
  } catch (error) {
    console.error("DELETE booking error:", error);
    return NextResponse.json({ message: "Failed to delete booking", error: String(error) }, { status: 500 });
  }
}
