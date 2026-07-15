/**
 * On-demand (non-cron) reminder helpers: send a confirmation when a vaccination
 * is updated/completed, and build/send the current reminder for a record via the
 * admin "Send now" / "Send test" actions. Reuses the cron branding resolver and
 * templates so on-demand mail looks identical to scheduled mail.
 */

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { getSetting, DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from "@/lib/settings";
import { getReminderSettings } from "@/lib/reminders/settings";
import { resolveBranding } from "@/lib/reminders/processor";
import { todayInZone, dayDiff, toUtcMidnight, formatCalendarDate } from "@/lib/reminders/dates";
import { vaccineLabel } from "@/lib/reminders/vaccine-config";
import {
  type Branding,
  type BuiltEmail,
  vaccinationReminderEmail,
  vaccinationUpdatedEmail,
} from "@/lib/reminders/emails";
import type { PetVaccination } from "@prisma/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NotifyContext = {
  brand: Branding;
  today: Date;
  dueSoonThresholdDays: number;
  profileUrl: string;
};

export async function buildNotifyContext(): Promise<NotifyContext> {
  const reminder = await getReminderSettings();
  const business = await getSetting<BusinessSettings>("business", DEFAULT_BUSINESS_SETTINGS);
  const brand = await resolveBranding(reminder, business);
  return {
    brand,
    today: todayInZone(reminder.timezone),
    dueSoonThresholdDays: reminder.dueSoonThresholdDays,
    profileUrl: `${brand.appUrl}/dashboard/pets`,
  };
}

function photoUrl(profilePhoto: string | null | undefined, appUrl: string): string | null {
  if (!profilePhoto) return null;
  if (/^https?:\/\//i.test(profilePhoto)) return profilePhoto;
  if (profilePhoto.startsWith("/") && appUrl) return `${appUrl}${profilePhoto}`;
  return null;
}

type PetLite = { id: string; name: string; profile_photo: string | null; owner: { id: string; name: string | null; email: string | null } | null };

/** Build the reminder email that matches the record's current derived status. */
export function buildVaccinationEmail(rec: PetVaccination, pet: PetLite, ctx: NotifyContext): BuiltEmail {
  const due = toUtcMidnight(rec.next_due_date);
  const diff = dayDiff(due, ctx.today);
  const variant = diff < 0 ? "overdue" : diff === 0 ? "due_today" : "due_soon";
  return vaccinationReminderEmail({
    ownerName: pet.owner?.name || "Pet Parent",
    petName: pet.name,
    petPhotoUrl: photoUrl(pet.profile_photo, ctx.brand.appUrl),
    petProfileUrl: ctx.profileUrl,
    brand: ctx.brand,
    variant,
    vaccineName: vaccineLabel(rec.vaccine_type, rec.custom_vaccine_name),
    administeredDate: rec.administered_date ? formatCalendarDate(rec.administered_date) : null,
    nextDueDate: formatCalendarDate(due),
    daysUntilDue: Math.max(0, diff),
    daysOverdue: diff < 0 ? Math.abs(diff) : 0,
    vetName: rec.vet_name,
    vetContact: rec.vet_contact,
  });
}

/** Send a confirmation email after a vaccination is updated or completed. Best-effort. */
export async function sendVaccinationConfirmation(rec: PetVaccination, pet: PetLite, completed: boolean): Promise<void> {
  const to = pet.owner?.email?.trim() || "";
  if (!pet.owner?.id || !EMAIL_RE.test(to)) return;
  const ctx = await buildNotifyContext();
  const email = vaccinationUpdatedEmail({
    ownerName: pet.owner.name || "Pet Parent",
    petName: pet.name,
    petProfileUrl: ctx.profileUrl,
    brand: ctx.brand,
    vaccineName: vaccineLabel(rec.vaccine_type, rec.custom_vaccine_name),
    nextDueDate: formatCalendarDate(rec.next_due_date),
    completed,
    administeredDate: rec.administered_date ? formatCalendarDate(rec.administered_date) : null,
  });
  const result = await sendMail({ to, subject: email.subject, html: email.html, text: email.text, replyTo: ctx.brand.replyTo });
  await prisma.notification.create({
    data: {
      user_id: pet.owner.id,
      channel: "Email",
      type: completed ? "vaccination_completed" : "vaccination_updated",
      subject: email.subject,
      body: email.text.slice(0, 1000),
      status: result.success ? "Sent" : "Failed",
      sent_at: result.success ? new Date() : null,
      pet_id: pet.id,
      vaccination_id: rec.id,
      template_key: completed ? "vaccination_completed" : "vaccination_updated",
      recipient: to,
      error_message: result.success ? null : (result as { error: string }).error.slice(0, 300),
    },
  }).catch(() => {});
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}
