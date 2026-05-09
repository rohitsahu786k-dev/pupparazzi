import { NextResponse } from "next/server";
import { expirePastBookings, sendDueBookingReminders } from "@/lib/booking-lifecycle";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const expired = await expirePastBookings();
  const reminders = await sendDueBookingReminders();
  return NextResponse.json({ ok: true, expired, reminders });
}
