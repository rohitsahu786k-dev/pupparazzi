import { NextResponse } from "next/server";
import { runReminderProcessor } from "@/lib/reminders/processor";

// Nodemailer needs Node APIs — must not run on the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Authorise a cron invocation. Accepts either:
 *  - Authorization: Bearer <CRON_SECRET>   (manual / external schedulers)
 *  - Vercel Cron, which sends the same header when CRON_SECRET is configured.
 * If CRON_SECRET is unset we allow the call (matches the existing bookings cron),
 * so local development works without extra setup.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Some setups pass the secret as a query param (?secret=) — support it too.
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

async function handle(req: Request, trigger: string) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runReminderProcessor({ trigger });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/reminders] failed:", error);
    return NextResponse.json({ success: false, message: "Reminder processing failed" }, { status: 500 });
  }
}

// Vercel Cron issues GET requests.
export async function GET(req: Request) {
  return handle(req, "vercel-cron");
}

// POST is accepted for manual/external triggers.
export async function POST(req: Request) {
  return handle(req, "manual-post");
}
