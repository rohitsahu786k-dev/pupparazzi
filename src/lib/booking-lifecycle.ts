import { prisma } from "@/lib/prisma";
import {
  sendBookingReminderEmail,
  sendBookingStatusEmail,
} from "@/lib/mailer";

export const BOOKING_STATUSES = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled", "Expired"];
export const ACTIVE_BOOKING_STATUSES = ["Pending", "Confirmed", "In Progress"];
export const PAYMENT_STATUSES = ["Pending", "Advance Paid", "Partially Paid", "Paid", "Failed", "Cancelled", "Refunded"];

type BookingForLifecycle = {
  id: string;
  booking_id: string;
  client_id: string;
  slot_date: Date;
  slot_time: string;
  status: string;
  client?: { name?: string | null; email?: string | null } | null;
  pet?: { name?: string | null } | null;
  service?: { name?: string | null } | null;
};

function parseSlotTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return { hours: 23, minutes: 59 };
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const suffix = match[3]?.toUpperCase();
  if (suffix === "PM" && hours < 12) hours += 12;
  if (suffix === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

export function bookingSlotAt(slotDate: Date, slotTime: string) {
  const { hours, minutes } = parseSlotTime(slotTime);
  return new Date(Date.UTC(
    slotDate.getUTCFullYear(),
    slotDate.getUTCMonth(),
    slotDate.getUTCDate(),
    hours,
    minutes,
  ) - 330 * 60 * 1000);
}

export function formatBookingDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function notificationAlreadyCreated(userId: string, type: string) {
  const existing = await prisma.notification.findFirst({
    where: { user_id: userId, type },
    select: { id: true },
  });
  return Boolean(existing);
}

async function recordNotification(userId: string, type: string, subject: string, body: string, status: "Sent" | "Failed") {
  await prisma.notification.create({
    data: {
      user_id: userId,
      channel: "Email",
      type,
      subject,
      body,
      status,
      sent_at: status === "Sent" ? new Date() : undefined,
    },
  });
}

export async function expirePastBookings() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ACTIVE_BOOKING_STATUSES },
      slot_date: { lte: new Date() },
    },
    include: { client: true, pet: true, service: true },
  });

  const now = new Date();
  const expired = bookings.filter((booking) => bookingSlotAt(booking.slot_date, booking.slot_time) < now);
  if (!expired.length) return { expired: 0 };

  for (const booking of expired) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "Expired" },
    });
    await sendExpiredEmailOnce(booking);
  }

  return { expired: expired.length };
}

export async function sendExpiredEmailOnce(booking: BookingForLifecycle) {
  const to = booking.client?.email;
  if (!to) return;
  const type = `BookingExpired:${booking.id}`;
  if (await notificationAlreadyCreated(booking.client_id, type)) return;

  const result = await sendBookingStatusEmail(to, {
    userName: booking.client?.name || "Valued Customer",
    bookingId: booking.booking_id,
    serviceName: booking.service?.name || "Pet Service",
    petName: booking.pet?.name || "Pet",
    status: "Expired",
    slotDate: formatBookingDate(booking.slot_date),
    slotTime: booking.slot_time || "",
  });

  await recordNotification(
    booking.client_id,
    type,
    `Booking expired - ${booking.booking_id}`,
    `Booking ${booking.booking_id} has expired.`,
    result.success ? "Sent" : "Failed",
  );
}

export async function sendReminderEmailOnce(booking: BookingForLifecycle, label: "24h" | "2h") {
  const to = booking.client?.email;
  if (!to) return;
  const type = `BookingReminder:${label}:${booking.id}`;
  if (await notificationAlreadyCreated(booking.client_id, type)) return;

  const result = await sendBookingReminderEmail(to, {
    userName: booking.client?.name || "Valued Customer",
    bookingId: booking.booking_id,
    serviceName: booking.service?.name || "Pet Service",
    petName: booking.pet?.name || "Pet",
    slotDate: formatBookingDate(booking.slot_date),
    slotTime: booking.slot_time || "",
    reminderLabel: label === "24h" ? "tomorrow" : "soon",
  });

  await recordNotification(
    booking.client_id,
    type,
    `Booking reminder - ${booking.booking_id}`,
    `Reminder sent for booking ${booking.booking_id}.`,
    result.success ? "Sent" : "Failed",
  );
}

export async function sendDueBookingReminders() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ACTIVE_BOOKING_STATUSES },
      slot_date: { gte: today, lte: in25Hours },
    },
    include: { client: true, pet: true, service: true },
  });

  let sent = 0;
  for (const booking of bookings) {
    const slotAt = bookingSlotAt(booking.slot_date, booking.slot_time);
    const minutesUntil = (slotAt.getTime() - now.getTime()) / 60000;
    if (minutesUntil > 23 * 60 && minutesUntil <= 25 * 60) {
      await sendReminderEmailOnce(booking, "24h");
      sent += 1;
    }
    if (minutesUntil > 90 && minutesUntil <= 150) {
      await sendReminderEmailOnce(booking, "2h");
      sent += 1;
    }
  }

  return { checked: bookings.length, sent };
}
