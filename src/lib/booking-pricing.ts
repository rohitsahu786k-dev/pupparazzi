import { serviceBookablePrice } from "@/lib/pet-care-pricing";

/**
 * Single source of truth for what a booking costs.
 *
 * Before this module there were two calculators that disagreed: the bookings API
 * recomputed from the live service price (silently dropping the admin's
 * final_amount override) while the payment/invoice path preferred the stored
 * pricing snapshot. Every total — UI, invoice, payment, email — now comes from
 * computeBookingPricing so a discount cannot be applied in one place and lost in
 * another.
 */

export const DISCOUNT_TYPES = ["PERCENT", "FLAT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export type BookingPricing = {
  servicePrice: number;
  addonTotal: number;
  /** Price before any discount. An admin override replaces the computed figure. */
  subtotal: number;
  couponDiscount: number;
  manualDiscount: number;
  /** couponDiscount + manualDiscount, never more than the subtotal. */
  discountTotal: number;
  /** What the customer actually pays. */
  total: number;
  couponCode?: string;
  discountType: DiscountType | null;
  discountValue: number;
  discountReason?: string;
};

type PricingBooking = {
  service?: { price?: number | null; discounted_price?: number | null } | null;
  addons_json?: unknown;
  final_amount?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_reason?: string | null;
};

function money(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

export function isDiscountType(value: unknown): value is DiscountType {
  return DISCOUNT_TYPES.includes(String(value) as DiscountType);
}

/**
 * Resolve a discount into rupees. A percent discount is clamped to 0–100 and a
 * flat discount can never exceed the amount it is being taken off, so a total
 * can never go negative.
 */
export function resolveDiscountAmount(type: unknown, value: unknown, base: number) {
  const amount = Number(value || 0);
  const cap = money(base);
  if (!Number.isFinite(amount) || amount <= 0 || cap <= 0) return 0;
  if (type === "PERCENT") {
    const percent = Math.min(100, amount);
    return money((cap * percent) / 100);
  }
  if (type === "FLAT") return money(Math.min(cap, amount));
  return 0;
}

export function computeBookingPricing(booking: PricingBooking): BookingPricing {
  const data = asObject(booking.addons_json);
  const storedPricing = asObject(data.pricing);
  const storedDiscount = asObject(data.discount);

  const servicePrice = money(serviceBookablePrice(booking.service || {}));
  const addonTotal = Array.isArray(data.addons)
    ? money(data.addons.reduce((sum: number, addon: any) => sum + Number(addon?.price || 0), 0))
    : 0;

  // An explicit admin override wins; then the snapshot stored at booking time (so
  // an old booking is not repriced when a service's price later changes); then the
  // live computation.
  const subtotal = booking.final_amount != null
    ? money(booking.final_amount)
    : storedPricing.subtotal != null
      ? money(storedPricing.subtotal)
      : money(servicePrice + addonTotal);

  const couponDiscount = Math.min(subtotal, money(asObject(data.coupon).discount));

  // Booking columns are authoritative; addons_json.discount is the fallback for
  // rows written before the columns existed.
  const rawType = booking.discount_type ?? storedDiscount.type;
  const rawValue = booking.discount_value ?? storedDiscount.value;
  const discountType = isDiscountType(rawType) ? rawType : null;
  const discountValue = discountType ? Number(rawValue || 0) : 0;

  // The manual discount is taken off what is left after the coupon, so coupon +
  // manual can never exceed the subtotal.
  const manualDiscount = resolveDiscountAmount(discountType, discountValue, subtotal - couponDiscount);
  const discountTotal = Math.min(subtotal, money(couponDiscount + manualDiscount));

  return {
    servicePrice,
    addonTotal,
    subtotal,
    couponDiscount,
    manualDiscount,
    discountTotal,
    total: money(Math.max(0, subtotal - discountTotal)),
    couponCode: asObject(data.coupon).code,
    discountType,
    discountValue,
    discountReason: booking.discount_reason ?? storedDiscount.reason ?? undefined,
  };
}

/** Convenience for the many callers that only need the payable amount. */
export function bookingTotal(booking: PricingBooking) {
  return computeBookingPricing(booking).total;
}

/**
 * The pricing snapshot to persist on addons_json so older readers (and the admin
 * list UI) keep working without a backfill.
 */
export function pricingSnapshot(pricing: BookingPricing) {
  return {
    servicePrice: pricing.servicePrice,
    addonTotal: pricing.addonTotal,
    subtotal: pricing.subtotal,
    couponDiscount: pricing.couponDiscount,
    manualDiscount: pricing.manualDiscount,
    discountTotal: pricing.discountTotal,
    total: pricing.total,
  };
}

/** Human-readable label for a discount, e.g. "10% off" or "Rs. 250 off". */
export function discountLabel(pricing: BookingPricing) {
  if (!pricing.discountType || pricing.manualDiscount <= 0) return "";
  return pricing.discountType === "PERCENT"
    ? `${pricing.discountValue}% off`
    : `Rs. ${pricing.discountValue.toLocaleString("en-IN")} off`;
}
