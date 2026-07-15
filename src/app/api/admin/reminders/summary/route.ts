import { NextResponse } from "next/server";
import { requireOperations } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getReminderSettings } from "@/lib/reminders/settings";
import { todayInZone, dayDiff, daysUntilBirthday } from "@/lib/reminders/dates";

export const runtime = "nodejs";

// GET /api/admin/reminders/summary — dashboard counters
export async function GET() {
  const session = await requireOperations();
  if (!session) return NextResponse.json({ message: "Staff access required" }, { status: 403 });

  const settings = await getReminderSettings();
  const today = todayInZone(settings.timezone);
  const tomorrowStart = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [pets, vaccinations, sentToday, failedToday, disabledVaccinations, disabledBirthdays] = await Promise.all([
    prisma.pet.findMany({ where: { dob: { not: null }, birthday_reminder_enabled: { not: false } }, select: { dob: true } }),
    prisma.petVaccination.findMany({ where: { reminder_enabled: true }, select: { next_due_date: true, completed_at: true, status: true } }),
    prisma.reminderDelivery.count({ where: { status: "Sent", sent_at: { gte: today } } }),
    prisma.reminderDelivery.count({ where: { status: "Failed", updated_at: { gte: today } } }),
    prisma.petVaccination.count({ where: { reminder_enabled: false } }),
    prisma.pet.count({ where: { birthday_reminder_enabled: false } }),
  ]);

  let birthdaysToday = 0;
  let birthdaysNext7 = 0;
  for (const pet of pets) {
    if (!pet.dob) continue;
    const d = daysUntilBirthday(pet.dob, today, settings.feb29Handling);
    if (d === 0) birthdaysToday += 1;
    else if (d >= 1 && d <= 7) birthdaysNext7 += 1;
  }

  let vaccinationsDueToday = 0;
  let vaccinationsNext7 = 0;
  let vaccinationsOverdue = 0;
  for (const v of vaccinations) {
    if (v.completed_at && v.status === "Completed") continue;
    const d = dayDiff(v.next_due_date, today);
    if (d < 0) vaccinationsOverdue += 1;
    else if (d === 0) vaccinationsDueToday += 1;
    else if (d <= 7) vaccinationsNext7 += 1;
  }

  return NextResponse.json({
    timezone: settings.timezone,
    date: today.toISOString().slice(0, 10),
    birthdaysToday,
    birthdaysNext7,
    vaccinationsDueToday,
    vaccinationsNext7,
    vaccinationsOverdue,
    emailsSentToday: sentToday,
    failedEmailsToday: failedToday,
    disabledReminders: disabledVaccinations + disabledBirthdays,
    _tomorrow: tomorrowStart.toISOString(),
  });
}
