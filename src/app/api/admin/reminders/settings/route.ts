import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getReminderSettings, saveReminderSettings, sanitizeDays, type ReminderSettings } from "@/lib/reminders/settings";

export const runtime = "nodejs";

// GET /api/admin/reminders/settings
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  return NextResponse.json(await getReminderSettings());
}

// PUT /api/admin/reminders/settings — persist a partial settings update
export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  let body: Partial<ReminderSettings>;
  try {
    body = (await req.json()) as Partial<ReminderSettings>;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const current = await getReminderSettings();
  const patch: Partial<ReminderSettings> = { ...body };

  // Normalise the array/enum-ish fields defensively.
  if (body.birthdayReminderDays !== undefined) patch.birthdayReminderDays = sanitizeDays(body.birthdayReminderDays, current.birthdayReminderDays);
  if (body.vaccinationReminderDays !== undefined) patch.vaccinationReminderDays = sanitizeDays(body.vaccinationReminderDays, current.vaccinationReminderDays);
  if (body.vaccinationOverdueDays !== undefined) patch.vaccinationOverdueDays = sanitizeDays(body.vaccinationOverdueDays, current.vaccinationOverdueDays);
  if (body.feb29Handling !== undefined) patch.feb29Handling = body.feb29Handling === "mar1" ? "mar1" : "feb28";
  if (body.dueSoonThresholdDays !== undefined) {
    const n = Math.trunc(Number(body.dueSoonThresholdDays));
    patch.dueSoonThresholdDays = Number.isFinite(n) && n >= 1 && n <= 365 ? n : current.dueSoonThresholdDays;
  }

  const saved = await saveReminderSettings(patch);
  return NextResponse.json(saved);
}
