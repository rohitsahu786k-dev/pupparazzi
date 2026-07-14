import { boardingCalculatedAmount, boardingDurationHours, boardingSlabLabel } from "@/lib/pet-care-pricing";
import { computeBookingPricing } from "@/lib/booking-pricing";

/**
 * Extending a boarding stay: the pet stays longer, so the check-out moves out and
 * the extra time is charged at the same boarding slab rates as the original stay.
 *
 * Extension is deliberately limited to Boarding. Grooming is priced per service
 * rather than per hour, so "staying longer" has no price meaning there — those
 * bookings are rescheduled through the normal edit instead.
 */

export const EXTENSION_STATUSES = ["Requested", "Approved", "Rejected"] as const;
export type ExtensionStatus = (typeof EXTENSION_STATUSES)[number];

/** Statuses where a stay can still meaningfully be extended. */
const EXTENDABLE_STATUSES = ["Pending", "Confirmed", "In Progress"];

export type ExtendableBooking = {
  status?: string | null;
  service?: { category?: string | null; name?: string | null; service_group?: string | null; price?: number | null; discounted_price?: number | null } | null;
  check_in_date?: string | Date | null;
  check_out_date?: string | Date | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  addons_json?: unknown;
  final_amount?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
};

export function isBoardingBooking(booking: ExtendableBooking) {
  return String(booking.service?.category || "").toLowerCase() === "boarding";
}

/**
 * A stay can be extended only if it is a boarding booking, is not already
 * finished, and actually has a check-in/check-out schedule to move.
 */
export function canExtendBooking(booking: ExtendableBooking) {
  return Boolean(
    isBoardingBooking(booking)
    && EXTENDABLE_STATUSES.includes(String(booking.status || ""))
    && booking.check_in_date
    && booking.check_out_date
    && booking.check_in_time
    && booking.check_out_time,
  );
}

export type ExtensionQuote = {
  ok: boolean;
  error?: string;
  currentHours: number;
  newHours: number;
  currentSlab: string;
  newSlab: string;
  /** Pre-discount price of the stay today. */
  currentSubtotal: number;
  /** Pre-discount price of the stay after extending. */
  newSubtotal: number;
  /** The additional charge the extension adds, before discount. */
  extraAmount: number;
  /** Payable today vs payable after the extension, both discount-inclusive. */
  currentTotal: number;
  newTotal: number;
};

const EMPTY_QUOTE: ExtensionQuote = {
  ok: false,
  currentHours: 0,
  newHours: 0,
  currentSlab: "",
  newSlab: "",
  currentSubtotal: 0,
  newSubtotal: 0,
  extraAmount: 0,
  currentTotal: 0,
  newTotal: 0,
};

function money(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/**
 * Price an extension to a new check-out.
 *
 * The extra is the *difference between the slab prices* of the old and new
 * durations, added to whatever the booking's current subtotal is. It is
 * deliberately not a fresh recalculation of the whole stay: doing that would
 * throw away a manual price the admin may have set on this booking. Any discount
 * on the booking then re-applies to the new subtotal through the shared pricing
 * engine, so a 10%-off booking stays 10% off after being extended.
 */
export function quoteExtension(
  booking: ExtendableBooking,
  newCheckOutDate: string | Date | null | undefined,
  newCheckOutTime: string | null | undefined,
): ExtensionQuote {
  if (!canExtendBooking(booking)) {
    return { ...EMPTY_QUOTE, error: "Only an active boarding booking can be extended." };
  }
  if (!newCheckOutDate || !newCheckOutTime) {
    return { ...EMPTY_QUOTE, error: "New check-out date and time are required." };
  }

  const currentHours = boardingDurationHours({
    check_in_date: booking.check_in_date,
    check_out_date: booking.check_out_date,
    check_in_time: booking.check_in_time,
    check_out_time: booking.check_out_time,
  });
  const newHours = boardingDurationHours({
    check_in_date: booking.check_in_date,
    check_out_date: newCheckOutDate,
    check_in_time: booking.check_in_time,
    check_out_time: newCheckOutTime,
  });

  if (currentHours == null || newHours == null) {
    return { ...EMPTY_QUOTE, error: "Check-in and check-out schedule is invalid." };
  }
  if (newHours <= currentHours) {
    return {
      ...EMPTY_QUOTE,
      currentHours,
      newHours,
      error: "The new check-out must be later than the current check-out.",
    };
  }

  const pricing = computeBookingPricing(booking);
  const currentSlabAmount = boardingCalculatedAmount(currentHours, booking.service);
  const newSlabAmount = boardingCalculatedAmount(newHours, booking.service);
  const extraAmount = money(Math.max(0, newSlabAmount - currentSlabAmount));
  const newSubtotal = money(pricing.subtotal + extraAmount);

  // Re-price through the shared engine so the booking's discount applies to the
  // extended subtotal exactly as it would anywhere else.
  const newPricing = computeBookingPricing({
    ...booking,
    final_amount: newSubtotal,
  });

  return {
    ok: true,
    currentHours,
    newHours,
    currentSlab: boardingSlabLabel(currentHours),
    newSlab: boardingSlabLabel(newHours),
    currentSubtotal: pricing.subtotal,
    newSubtotal,
    extraAmount,
    currentTotal: pricing.total,
    newTotal: newPricing.total,
  };
}
