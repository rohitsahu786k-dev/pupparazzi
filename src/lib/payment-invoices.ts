import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoice";
import { sendBookingConfirmation, sendPaymentConfirmation } from "@/lib/mailer";
import { formatBookingDate } from "@/lib/booking-lifecycle";
import { bookingDetailFormUrl, detailFormService } from "@/lib/booking-detail-forms";

// Totals come from the shared calculator so a manual discount, a coupon and an
// admin override all reach the payment and the invoice.
export { bookingTotal } from "@/lib/booking-pricing";
import { bookingTotal, computeBookingPricing, discountLabel } from "@/lib/booking-pricing";

export const COD_ADVANCE_AMOUNT = 100;

export type PaymentPlan = "FULL_ONLINE" | "COD_ADVANCE";

export function bookingPaymentPlan(booking: any): PaymentPlan {
  const data = booking?.addons_json && typeof booking.addons_json === "object" ? booking.addons_json : {};
  return data.payment?.plan === "COD_ADVANCE" ? "COD_ADVANCE" : "FULL_ONLINE";
}

export function expectedPaymentAmount(booking: any, paymentType: "full" | "advance") {
  return paymentType === "advance" ? COD_ADVANCE_AMOUNT : bookingTotal(booking);
}

function invoiceDate() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Service, then each discount as its own negative line, so the customer can see
 * exactly what came off. Ends at the payable total.
 */
function serviceLineItems(booking: any) {
  const pricing = computeBookingPricing(booking);
  return [
    { desc: booking.service?.name || "Pet Service", qty: 1, rate: pricing.subtotal, amount: pricing.subtotal },
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
  ];
}

function invoicePdf(booking: any, invoiceNumber: string, amount: number) {
  return generateInvoicePdf({
    invoiceNumber,
    invoiceDate: invoiceDate(),
    bookingId: booking.booking_id,
    customerName: booking.client?.name || "Customer",
    customerEmail: booking.client?.email || "",
    customerPhone: booking.client?.phone || undefined,
    customerAddress: booking.address ? `${booking.address.line1}, ${booking.address.city}, ${booking.address.state} ${booking.address.pincode}` : undefined,
    serviceName: booking.service?.name || "Pet Service",
    petName: booking.pet?.name || "Pet",
    slotDate: formatBookingDate(booking.slot_date),
    slotTime: booking.slot_time || "",
    quantity: 1,
    unitPrice: amount,
    gstRate: 0,
  });
}

async function upsertInvoice(params: {
  booking: any;
  invoiceId: string;
  type: "Advance" | "Final";
  subtotal: number;
  total: number;
  status: "Partially Paid" | "Paid";
  lineItems: unknown;
}) {
  return prisma.invoice.upsert({
    where: { invoice_id: params.invoiceId },
    update: {
      line_items_json: params.lineItems as any,
      subtotal: params.subtotal,
      tax: 0,
      total: params.total,
      status: params.status,
    },
    create: {
      invoice_id: params.invoiceId,
      booking_id: params.booking.id,
      client_id: params.booking.client_id,
      line_items_json: params.lineItems as any,
      subtotal: params.subtotal,
      tax: 0,
      total: params.total,
      status: params.status,
    },
  });
}

export async function recordSuccessfulOnlinePayment(params: {
  bookingId: string;
  clientId: string;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  source?: string;
  mode?: string;
  paymentType: "full" | "advance";
}) {
  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, client_id: params.clientId },
    include: { service: true, pet: true, address: true, client: true, invoices: true },
  });
  if (!booking) throw new Error("Booking not found");

  const total = bookingTotal(booking);
  const paid = Math.min(Number(params.amount || 0), total);
  const isAdvance = params.paymentType === "advance";
  const remaining = Math.max(0, total - paid);
  const paymentStatus = isAdvance && remaining > 0 ? "Partially Paid" : "Paid";

  await prisma.payment.create({
    data: {
      booking_id: booking.id,
      client_id: params.clientId,
      amount: paid,
      mode: params.mode || (isAdvance ? "Advance Online" : "Online"),
      source: params.source || "Razorpay",
      razorpay_order_id: params.razorpayOrderId,
      razorpay_payment_id: params.razorpayPaymentId,
      transaction_id: params.transactionId || params.razorpayPaymentId,
      status: "Success",
      invoice_type: isAdvance ? "Advance" : "Final",
    },
  });

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "Confirmed",
      payment_status: paymentStatus,
    },
    include: { service: true, pet: true, address: true, client: true },
  });

  const invoiceId = isAdvance ? `INV-${booking.booking_id}-ADV` : `INV-${booking.booking_id}-FINAL`;
  await upsertInvoice({
    booking,
    invoiceId,
    type: isAdvance ? "Advance" : "Final",
    subtotal: isAdvance ? paid : total,
    total: isAdvance ? paid : total,
    status: isAdvance ? "Partially Paid" : "Paid",
    lineItems: [
      ...serviceLineItems(booking),
      ...(isAdvance ? [
        { desc: "Advance paid online", qty: 1, rate: paid, amount: paid },
        { desc: "Remaining COD amount", qty: 1, rate: remaining, amount: remaining },
      ] : []),
    ],
  });

  if (updatedBooking.client?.email) {
    sendBookingConfirmation(updatedBooking.client.email, {
      userName: updatedBooking.client?.name || "Valued Customer",
      bookingDatabaseId: updatedBooking.id,
      bookingId: updatedBooking.booking_id,
      serviceName: updatedBooking.service?.name || "Pet Service",
      serviceCategory: updatedBooking.service?.category || undefined,
      petName: updatedBooking.pet?.name || "Pet",
      slotDate: formatBookingDate(updatedBooking.slot_date),
      slotTime: updatedBooking.slot_time || "",
      price: String(total),
      address: updatedBooking.address ? `${updatedBooking.address.line1}, ${updatedBooking.address.city}` : undefined,
      detailFormLink: bookingDetailFormUrl(updatedBooking.id, updatedBooking.service),
      detailFormService: detailFormService(updatedBooking.service),
    }).catch(console.error);

    const pdf = invoicePdf(updatedBooking, invoiceId, isAdvance ? paid : total);
    sendPaymentConfirmation(updatedBooking.client.email, {
      userName: updatedBooking.client?.name || "Valued Customer",
      bookingId: updatedBooking.booking_id,
      invoiceNumber: invoiceId,
      serviceName: updatedBooking.service?.name || "Pet Service",
      petName: updatedBooking.pet?.name || "Pet",
      slotDate: formatBookingDate(updatedBooking.slot_date),
      slotTime: updatedBooking.slot_time || "",
      subtotal: String(isAdvance ? paid : total),
      gstAmount: "0",
      totalAmount: String(isAdvance ? paid : total),
      paymentMethod: isAdvance ? "COD + Advance" : "Online",
      transactionId: params.transactionId || params.razorpayPaymentId,
    }, pdf).catch(console.error);
  }

  return { booking: updatedBooking, total, paid, remaining, invoiceId };
}

export async function collectCodPayment(params: {
  bookingId: string;
  amount?: number;
  transactionId?: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { service: true, pet: true, address: true, client: true, payments: true },
  });
  if (!booking) throw new Error("Booking not found");

  const total = bookingTotal(booking);
  const alreadyPaid = booking.payments
    .filter((payment) => payment.status === "Success")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const codAmount = Number(params.amount || Math.max(0, total - alreadyPaid));
  if (codAmount <= 0) throw new Error("No COD amount is pending");

  await prisma.payment.create({
    data: {
      booking_id: booking.id,
      client_id: booking.client_id,
      amount: codAmount,
      mode: "COD",
      source: "Admin",
      transaction_id: params.transactionId || `COD-${booking.booking_id}-${Date.now()}`,
      status: "Success",
      invoice_type: "Final",
    },
  });

  const finalInvoiceId = `INV-${booking.booking_id}-FINAL`;
  await upsertInvoice({
    booking,
    invoiceId: finalInvoiceId,
    type: "Final",
    subtotal: total,
    total,
    status: "Paid",
    lineItems: [
      ...serviceLineItems(booking),
      { desc: "Advance paid online", qty: 1, rate: alreadyPaid, amount: alreadyPaid },
      { desc: "COD collected", qty: 1, rate: codAmount, amount: codAmount },
    ],
  });

  await prisma.invoice.updateMany({
    where: { booking_id: booking.id, invoice_id: { not: finalInvoiceId } },
    data: { status: "Paid" },
  });

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: { payment_status: "Paid" },
    include: { service: true, pet: true, address: true, client: true },
  });

  if (updatedBooking.client?.email) {
    const pdf = invoicePdf(updatedBooking, finalInvoiceId, total);
    sendPaymentConfirmation(updatedBooking.client.email, {
      userName: updatedBooking.client?.name || "Valued Customer",
      bookingId: updatedBooking.booking_id,
      invoiceNumber: finalInvoiceId,
      serviceName: updatedBooking.service?.name || "Pet Service",
      petName: updatedBooking.pet?.name || "Pet",
      slotDate: formatBookingDate(updatedBooking.slot_date),
      slotTime: updatedBooking.slot_time || "",
      subtotal: String(total),
      gstAmount: "0",
      totalAmount: String(total),
      paymentMethod: "COD + Advance",
      transactionId: params.transactionId,
    }, pdf).catch(console.error);
  }

  return { booking: updatedBooking, invoiceId: finalInvoiceId, codAmount };
}
