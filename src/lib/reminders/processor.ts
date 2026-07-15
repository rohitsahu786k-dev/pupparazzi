/**
 * Reminder processor — the idempotent engine invoked by the daily cron and by
 * the admin "Run now" button. Server-only (uses Nodemailer + Prisma).
 *
 * Idempotency (spec §18): before sending, we atomically reserve a
 * ReminderDelivery row keyed by a deterministic reminder_key (unique index).
 * If the row already exists as Sent/Processing we skip; a Failed row is retried
 * up to MAX_ATTEMPTS. This makes double-fires and concurrent runs safe.
 */

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { getSetting } from "@/lib/settings";
import { DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from "@/lib/settings";
import { getReminderSettings, type ReminderSettings } from "@/lib/reminders/settings";
import {
  todayInZone,
  dayDiff,
  daysUntilBirthday,
  nextBirthday,
  formatCalendarDate,
  formatAge,
  toUtcMidnight,
} from "@/lib/reminders/dates";
import { vaccineLabel } from "@/lib/reminders/vaccine-config";
import {
  type Branding,
  type BuiltEmail,
  birthdayReminderEmail,
  birthdayGreetingEmail,
  vaccinationReminderEmail,
  adminSummaryEmail,
} from "@/lib/reminders/emails";

const MAX_ATTEMPTS = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReminderRunResult = {
  success: boolean;
  ranAt: string;
  timezone: string;
  birthdayCandidates: number;
  vaccinationCandidates: number;
  sent: number;
  skipped: number;
  failed: number;
};

type ReserveOutcome = { action: "send"; deliveryId: string } | { action: "skip" };

/** Resolve email branding from reminder + business settings, with BUSINESS fallback. */
export async function resolveBranding(reminder: ReminderSettings, business: BusinessSettings): Promise<Branding> {
  const appUrl =
    reminder.primaryButtonUrl || business.website || process.env.APP_URL || process.env.NEXTAUTH_URL || "";
  return {
    businessName: reminder.businessName || business.name || DEFAULT_BUSINESS_SETTINGS.name,
    logoUrl: reminder.logoUrl || business.logoUrl || "",
    supportEmail: reminder.supportEmail || business.email || "",
    supportPhone: reminder.supportPhone || business.phone || "",
    replyTo: reminder.replyToEmail || business.email || "",
    footerText: reminder.footerText || "",
    appUrl: appUrl.replace(/\/$/, ""),
  };
}

function resolvePhotoUrl(profilePhoto: string | null | undefined, appUrl: string): string | null {
  if (!profilePhoto) return null;
  if (/^https?:\/\//i.test(profilePhoto)) return profilePhoto;
  if (profilePhoto.startsWith("/") && appUrl) return `${appUrl}${profilePhoto}`;
  return null;
}

/**
 * Atomically reserve a delivery. Returns action "send" when this caller owns the
 * attempt, or "skip" when another run already claimed/sent it.
 */
async function reserveDelivery(key: string, base: {
  user_id?: string | null;
  pet_id?: string | null;
  vaccination_id?: string | null;
  reminder_type: string;
  scheduled_for: Date;
  recipient?: string | null;
  subject?: string | null;
}): Promise<ReserveOutcome> {
  try {
    const created = await prisma.reminderDelivery.create({
      data: {
        reminder_key: key,
        user_id: base.user_id ?? null,
        pet_id: base.pet_id ?? null,
        vaccination_id: base.vaccination_id ?? null,
        reminder_type: base.reminder_type,
        channel: "Email",
        scheduled_for: base.scheduled_for,
        recipient: base.recipient ?? null,
        subject: base.subject ?? null,
        status: "Processing",
        attempt_count: 1,
      },
      select: { id: true },
    });
    return { action: "send", deliveryId: created.id };
  } catch (err) {
    // Unique conflict → row exists. Retry only if it previously Failed and has attempts left.
    if (isUniqueConflict(err)) {
      const claimed = await prisma.reminderDelivery.updateMany({
        where: { reminder_key: key, status: "Failed", attempt_count: { lt: MAX_ATTEMPTS } },
        data: { status: "Processing", attempt_count: { increment: 1 }, updated_at: new Date() },
      });
      if (claimed.count === 1) {
        const row = await prisma.reminderDelivery.findUnique({ where: { reminder_key: key }, select: { id: true } });
        if (row) return { action: "send", deliveryId: row.id };
      }
      return { action: "skip" };
    }
    throw err;
  }
}

function isUniqueConflict(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002");
}

async function markSkipped(key: string, reason: string) {
  await prisma.reminderDelivery.update({
    where: { reminder_key: key },
    data: { status: "Skipped", error_message: reason.slice(0, 300), updated_at: new Date() },
  }).catch(() => {});
}

/** Send a reserved delivery, update the ledger, and mirror to an in-app Notification. */
async function dispatch(params: {
  deliveryId: string;
  key: string;
  to: string;
  userId: string;
  petId?: string | null;
  vaccinationId?: string | null;
  reminderType: string;
  templateKey: string;
  email: BuiltEmail;
  replyTo: string;
  scheduledFor: Date;
}): Promise<"sent" | "failed"> {
  const result = await sendMail({
    to: params.to,
    subject: params.email.subject,
    html: params.email.html,
    text: params.email.text,
    replyTo: params.replyTo,
  });

  if (result.success) {
    await prisma.reminderDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: "Sent",
        sent_at: new Date(),
        provider_message_id: result.messageId ?? null,
        error_message: null,
        updated_at: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        user_id: params.userId,
        channel: "Email",
        type: params.reminderType,
        subject: params.email.subject,
        body: params.email.text.slice(0, 1000),
        status: "Sent",
        sent_at: new Date(),
        pet_id: params.petId ?? null,
        vaccination_id: params.vaccinationId ?? null,
        template_key: params.templateKey,
        recipient: params.to,
        provider_message_id: result.messageId ?? null,
        scheduled_for: params.scheduledFor,
      },
    });
    return "sent";
  }

  await prisma.reminderDelivery.update({
    where: { id: params.deliveryId },
    data: { status: "Failed", error_message: result.error.slice(0, 300), updated_at: new Date() },
  });
  await prisma.notification.create({
    data: {
      user_id: params.userId,
      channel: "Email",
      type: params.reminderType,
      subject: params.email.subject,
      body: `Delivery failed: ${result.error.slice(0, 300)}`,
      status: "Failed",
      pet_id: params.petId ?? null,
      vaccination_id: params.vaccinationId ?? null,
      template_key: params.templateKey,
      recipient: params.to,
      scheduled_for: params.scheduledFor,
    },
  });
  return "failed";
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function runReminderProcessor(options: { now?: Date; trigger?: string } = {}): Promise<ReminderRunResult> {
  const now = options.now ?? new Date();
  const reminder = await getReminderSettings();
  const business = await getSetting<BusinessSettings>("business", DEFAULT_BUSINESS_SETTINGS);
  const brand = await resolveBranding(reminder, business);
  const tz = reminder.timezone || "Asia/Kolkata";
  const today = todayInZone(tz, now);
  const profileUrl = `${brand.appUrl}/dashboard/pets`;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`[reminders] start trigger=${options.trigger ?? "manual"} tz=${tz} today=${today.toISOString().slice(0, 10)}`);

  // ── Birthdays ──────────────────────────────────────────────────────────────
  let birthdayCandidates = 0;
  if (reminder.birthdayRemindersEnabled) {
    const pets = await prisma.pet.findMany({
      where: { dob: { not: null }, birthday_reminder_enabled: { not: false } },
      select: {
        id: true, name: true, dob: true, profile_photo: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    for (const pet of pets) {
      if (!pet.dob) continue;
      const untilBirthday = daysUntilBirthday(pet.dob, today, reminder.feb29Handling);
      const bday = nextBirthday(pet.dob, today, reminder.feb29Handling);
      const year = bday.getUTCFullYear();
      const ownerEmail = pet.owner?.email?.trim() || "";

      for (const dayBefore of reminder.birthdayReminderDays) {
        if (untilBirthday !== dayBefore) continue;
        birthdayCandidates += 1;

        const isDay = dayBefore === 0;
        const useGreeting = isDay && reminder.birthdaySendGreetingOnDay;
        const reminderType = useGreeting ? "birthday_greeting" : "birthday";
        const key = useGreeting ? `birthday_greeting:${pet.id}:${year}` : `birthday:${pet.id}:${year}:${dayBefore}`;

        const email = useGreeting
          ? birthdayGreetingEmail({ ownerName: pet.owner?.name || "Pet Parent", petName: pet.name, petPhotoUrl: resolvePhotoUrl(pet.profile_photo, brand.appUrl), petProfileUrl: profileUrl, brand, petAge: formatAge(pet.dob, today) })
          : birthdayReminderEmail({ ownerName: pet.owner?.name || "Pet Parent", petName: pet.name, petPhotoUrl: resolvePhotoUrl(pet.profile_photo, brand.appUrl), petProfileUrl: profileUrl, brand, birthdayDate: formatCalendarDate(bday), daysUntilBirthday: dayBefore, petAge: formatAge(pet.dob, today) });

        const reserve = await reserveDelivery(key, {
          user_id: pet.owner?.id, pet_id: pet.id, reminder_type: reminderType,
          scheduled_for: today, recipient: ownerEmail, subject: email.subject,
        });
        if (reserve.action === "skip") { skipped += 1; continue; }

        if (!pet.owner?.id || !EMAIL_RE.test(ownerEmail)) {
          await markSkipped(key, "Owner email missing or invalid");
          skipped += 1;
          continue;
        }

        const outcome = await dispatch({
          deliveryId: reserve.deliveryId, key, to: ownerEmail, userId: pet.owner.id, petId: pet.id,
          reminderType, templateKey: reminderType, email, replyTo: brand.replyTo, scheduledFor: today,
        });
        if (outcome === "sent") sent += 1; else failed += 1;
      }
    }
  }

  // ── Vaccinations ───────────────────────────────────────────────────────────
  let vaccinationCandidates = 0;
  if (reminder.vaccinationRemindersEnabled) {
    const records = await prisma.petVaccination.findMany({
      where: { reminder_enabled: true },
      include: {
        pet: { select: { id: true, name: true, profile_photo: true, owner: { select: { id: true, name: true, email: true } } } },
      },
    });

    for (const rec of records) {
      // A completed record with no live follow-up produces no reminders.
      if (rec.completed_at && rec.status === "Completed") continue;
      const due = toUtcMidnight(rec.next_due_date);
      const dueIso = due.toISOString().slice(0, 10);
      const untilDue = dayDiff(due, today); // >0 future, 0 today, <0 past
      const ownerEmail = rec.pet?.owner?.email?.trim() || "";
      const name = vaccineLabel(rec.vaccine_type, rec.custom_vaccine_name);
      const perRecordDays = Array.isArray(rec.reminder_days_json)
        ? (rec.reminder_days_json as unknown[]).map((v) => Math.trunc(Number(v))).filter((v) => Number.isFinite(v) && v >= 0)
        : null;
      const beforeDays = perRecordDays?.length ? perRecordDays : reminder.vaccinationReminderDays;

      type Job = { key: string; type: string; variant: "due_soon" | "due_today" | "overdue"; daysOverdue: number };
      const jobs: Job[] = [];

      // Before / on due date
      for (const day of beforeDays) {
        if (untilDue === day) {
          const variant = day === 0 ? "due_today" : "due_soon";
          jobs.push({ key: `vaccination:${rec.id}:${dueIso}:${day}`, type: `vaccination_${variant}`, variant, daysOverdue: 0 });
        }
      }
      // Overdue
      for (const day of reminder.vaccinationOverdueDays) {
        if (untilDue === -day) {
          jobs.push({ key: `vaccination_overdue:${rec.id}:${dueIso}:${day}`, type: "vaccination_overdue", variant: "overdue", daysOverdue: day });
        }
      }

      for (const job of jobs) {
        vaccinationCandidates += 1;
        const email = vaccinationReminderEmail({
          ownerName: rec.pet?.owner?.name || "Pet Parent",
          petName: rec.pet?.name || "your pet",
          petPhotoUrl: resolvePhotoUrl(rec.pet?.profile_photo, brand.appUrl),
          petProfileUrl: profileUrl,
          brand,
          variant: job.variant,
          vaccineName: name,
          administeredDate: rec.administered_date ? formatCalendarDate(rec.administered_date) : null,
          nextDueDate: formatCalendarDate(due),
          daysUntilDue: Math.max(0, untilDue),
          daysOverdue: job.daysOverdue,
          vetName: rec.vet_name,
          vetContact: rec.vet_contact,
        });

        const reserve = await reserveDelivery(job.key, {
          user_id: rec.pet?.owner?.id, pet_id: rec.pet_id, vaccination_id: rec.id,
          reminder_type: job.type, scheduled_for: today, recipient: ownerEmail, subject: email.subject,
        });
        if (reserve.action === "skip") { skipped += 1; continue; }

        if (!rec.pet?.owner?.id || !EMAIL_RE.test(ownerEmail)) {
          await markSkipped(job.key, "Owner email missing or invalid");
          skipped += 1;
          continue;
        }

        const outcome = await dispatch({
          deliveryId: reserve.deliveryId, key: job.key, to: ownerEmail, userId: rec.pet.owner.id,
          petId: rec.pet_id, vaccinationId: rec.id, reminderType: job.type, templateKey: job.type,
          email, replyTo: brand.replyTo, scheduledFor: today,
        });
        if (outcome === "sent") sent += 1; else failed += 1;
      }
    }
  }

  // ── Admin daily summary (best-effort, never blocks the run) ─────────────────
  if (reminder.adminSummaryEnabled && reminder.adminSummaryRecipient && EMAIL_RE.test(reminder.adminSummaryRecipient)) {
    const key = `admin_summary:${today.toISOString().slice(0, 10)}`;
    const reserve = await reserveDelivery(key, {
      reminder_type: "admin_summary", scheduled_for: today, recipient: reminder.adminSummaryRecipient,
    });
    if (reserve.action === "send") {
      const email = adminSummaryEmail({
        brand, dateLabel: formatCalendarDate(today),
        birthdayCount: birthdayCandidates, vaccinationDueCount: vaccinationCandidates,
        overdueCount: 0, sent, failed, skipped,
      });
      const res = await sendMail({ to: reminder.adminSummaryRecipient, subject: email.subject, html: email.html, text: email.text, replyTo: brand.replyTo });
      await prisma.reminderDelivery.update({
        where: { id: reserve.deliveryId },
        data: res.success
          ? { status: "Sent", sent_at: new Date(), provider_message_id: res.messageId ?? null }
          : { status: "Failed", error_message: res.error.slice(0, 300) },
      }).catch(() => {});
    }
  }

  console.log(`[reminders] done sent=${sent} skipped=${skipped} failed=${failed} birthdays=${birthdayCandidates} vaccinations=${vaccinationCandidates}`);

  return {
    success: true,
    ranAt: now.toISOString(),
    timezone: tz,
    birthdayCandidates,
    vaccinationCandidates,
    sent,
    skipped,
    failed,
  };
}
