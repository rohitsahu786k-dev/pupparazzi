import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { getPetAccess, isObjectId } from "@/lib/reminders/vaccination-service";
import { isOperationsRole } from "@/lib/admin";
import { buildNotifyContext, buildVaccinationEmail, isValidEmail } from "@/lib/reminders/notify";

export const runtime = "nodejs";

/**
 * Best-effort in-memory rate limiter. In serverless each instance keeps its own
 * bucket, so this caps bursts per warm instance rather than globally — adequate
 * for abuse protection on manual actions. A shared store (Redis) would be used
 * for hard global limits in a larger deployment.
 */
const buckets = new Map<string, number[]>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

/**
 * POST /api/pets/:id/vaccinations/:vid/send
 * Body: { mode: "now" | "test", to?: string }
 *  - "now": sends the current reminder to the pet owner and logs it.
 *  - "test": sends to `to` (ops only) so admins can preview real delivery.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
  if (!isObjectId(vid)) return NextResponse.json({ message: "Invalid record id" }, { status: 400 });

  if (rateLimited(`send:${access.userId}`, 10, 60_000)) {
    return NextResponse.json({ message: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let body: { mode?: string; to?: string };
  try {
    body = (await req.json()) as { mode?: string; to?: string };
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }
  const mode = body.mode === "test" ? "test" : "now";

  const rec = await prisma.petVaccination.findUnique({ where: { id: vid } });
  if (!rec || rec.pet_id !== id) return NextResponse.json({ message: "Vaccination record not found" }, { status: 404 });

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { id: true, name: true, profile_photo: true, owner: { select: { id: true, name: true, email: true } } },
  });
  if (!pet) return NextResponse.json({ message: "Pet not found" }, { status: 404 });

  const ctx = await buildNotifyContext();
  const email = buildVaccinationEmail(rec, pet, ctx);

  if (mode === "test") {
    if (!isOperationsRole(access.role)) {
      return NextResponse.json({ message: "Only staff or admins can send test emails" }, { status: 403 });
    }
    const to = (body.to || "").trim();
    if (!isValidEmail(to)) return NextResponse.json({ message: "A valid test recipient email is required" }, { status: 400 });
    const result = await sendMail({ to, subject: `[TEST] ${email.subject}`, html: email.html, text: email.text, replyTo: ctx.brand.replyTo });
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  }

  // mode === "now"
  const to = pet.owner?.email?.trim() || "";
  if (!pet.owner?.id || !isValidEmail(to)) {
    return NextResponse.json({ message: "The pet owner does not have a valid email on file" }, { status: 400 });
  }

  const result = await sendMail({ to, subject: email.subject, html: email.html, text: email.text, replyTo: ctx.brand.replyTo });

  // Manual sends are always allowed; the key carries a timestamp so it never
  // collides with the deterministic cron keys or previous manual sends.
  await prisma.reminderDelivery.create({
    data: {
      reminder_key: `manual:${vid}:${Date.now()}`,
      user_id: pet.owner.id,
      pet_id: id,
      vaccination_id: vid,
      reminder_type: "vaccination_manual",
      channel: "Email",
      scheduled_for: ctx.today,
      recipient: to,
      subject: email.subject,
      status: result.success ? "Sent" : "Failed",
      sent_at: result.success ? new Date() : null,
      provider_message_id: result.success ? (result.messageId ?? null) : null,
      error_message: result.success ? null : (result as { error: string }).error.slice(0, 300),
      attempt_count: 1,
    },
  }).catch(() => {});

  await prisma.notification.create({
    data: {
      user_id: pet.owner.id,
      channel: "Email",
      type: "vaccination_manual",
      subject: email.subject,
      body: email.text.slice(0, 1000),
      status: result.success ? "Sent" : "Failed",
      sent_at: result.success ? new Date() : null,
      pet_id: id,
      vaccination_id: vid,
      template_key: "vaccination_manual",
      recipient: to,
    },
  }).catch(() => {});

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
