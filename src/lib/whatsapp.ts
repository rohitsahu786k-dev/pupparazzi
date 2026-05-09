import { COD_ADVANCE_AMOUNT, bookingTotal } from "@/lib/payment-invoices";

function digits(value?: string | null) {
  const cleaned = String(value || "").replace(/\D/g, "");
  if (!cleaned) return "";
  return cleaned.length === 10 ? `91${cleaned}` : cleaned;
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const number = digits(phone);
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function whatsappTemplates(booking: any) {
  const total = bookingTotal(booking);
  const paid = Array.isArray(booking.payments)
    ? booking.payments.filter((payment: any) => payment.status === "Success").reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    : 0;
  const advance = paid || COD_ADVANCE_AMOUNT;
  const remaining = Math.max(0, total - advance);
  const customerName = booking.client?.name || "there";
  const bookingId = booking.booking_id;

  return {
    codAdvancePaid: `Hello ${customerName},\nYour advance payment of Rs. ${advance} has been received successfully. Your booking ${bookingId} is now confirmed.\nRemaining COD Amount: Rs. ${remaining}\nThank you for booking with us.`,
    codReminder: `Hello ${customerName},\nThis is a reminder that Rs. ${remaining} is pending for your booking #${bookingId}.\nPlease pay the remaining amount during service completion. Thank you.`,
    fullPayment: `Hello ${customerName},\nYour payment for booking #${bookingId} has been completed successfully. Invoice has been generated successfully.\nThank you for choosing us.`,
    bookingConfirmation: `Hello ${customerName},\nYour booking #${bookingId} is confirmed for ${booking.service?.name || "your service"}.\nThank you for choosing Pupparazzi.`,
    cancellation: `Hello ${customerName},\nYour booking #${bookingId} has been cancelled. Please contact us if you need any help.`,
  };
}
