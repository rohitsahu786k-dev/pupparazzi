import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPetAccess,
  serializeVaccination,
  serializationContext,
  isObjectId,
} from "@/lib/reminders/vaccination-service";
import { toUtcMidnight } from "@/lib/reminders/dates";
import { sendVaccinationConfirmation } from "@/lib/reminders/notify";

export const runtime = "nodejs";

function parseDateOnly(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : toUtcMidnight(d);
}

/**
 * POST /api/pets/:id/vaccinations/:vid/complete
 * Marks a dose administered and (optionally) opens the next cycle.
 * Body: { administered_date, next_due_date?, vet_name?, vet_contact?, notes?,
 *         reminder_enabled?, create_next_cycle?, certificate_asset_id?, certificate_path? }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
  if (!isObjectId(vid)) return NextResponse.json({ message: "Invalid record id" }, { status: 400 });

  const existing = await prisma.petVaccination.findUnique({ where: { id: vid } });
  if (!existing || existing.pet_id !== id) {
    return NextResponse.json({ message: "Vaccination record not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const administered = parseDateOnly(body.administered_date) ?? existing.administered_date ?? toUtcMidnight(new Date());
  const nextDue = parseDateOnly(body.next_due_date);
  const createNext = Boolean(body.create_next_cycle) && nextDue !== null;

  if (nextDue && nextDue.getTime() < administered.getTime()) {
    return NextResponse.json({ message: "Next due date cannot be before the administered date" }, { status: 400 });
  }

  const vetName = body.vet_name !== undefined ? (String(body.vet_name).trim() || null) : existing.vet_name;
  const vetContact = body.vet_contact !== undefined ? (String(body.vet_contact).trim() || null) : existing.vet_contact;
  const notes = body.notes !== undefined ? (String(body.notes).trim() || null) : existing.notes;
  const certAssetId = body.certificate_asset_id !== undefined ? (body.certificate_asset_id as string | null) : existing.certificate_asset_id;
  const certPath = body.certificate_path !== undefined ? (body.certificate_path as string | null) : existing.certificate_path;

  // Mark the current record completed.
  const completed = await prisma.petVaccination.update({
    where: { id: vid },
    data: {
      administered_date: administered,
      vet_name: vetName,
      vet_contact: vetContact,
      notes,
      certificate_asset_id: certAssetId,
      certificate_path: certPath,
      status: "Completed",
      completed_at: new Date(),
    },
  });

  // Optionally open the next cycle — guarding against duplicates.
  if (createNext && nextDue) {
    const dupe = await prisma.petVaccination.findFirst({
      where: {
        pet_id: id,
        vaccine_type: existing.vaccine_type,
        custom_vaccine_name: existing.custom_vaccine_name,
        next_due_date: nextDue,
        completed_at: null,
      },
      select: { id: true },
    });
    if (!dupe) {
      await prisma.petVaccination.create({
        data: {
          pet_id: id,
          created_by: access.userId,
          vaccine_type: existing.vaccine_type,
          custom_vaccine_name: existing.custom_vaccine_name,
          administered_date: administered,
          next_due_date: nextDue,
          reminder_enabled: body.reminder_enabled !== undefined ? Boolean(body.reminder_enabled) : existing.reminder_enabled,
          reminder_days_json: existing.reminder_days_json ?? undefined,
          vet_name: vetName,
          vet_contact: vetContact,
          status: "Upcoming",
        },
      });
    }
  }

  // Confirmation email + notification (best-effort, never blocks the response).
  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { id: true, name: true, profile_photo: true, owner: { select: { id: true, name: true, email: true } } },
  });
  if (pet) await sendVaccinationConfirmation(completed, pet, true);

  const { today, dueSoonThresholdDays } = await serializationContext();
  return NextResponse.json(serializeVaccination(completed, dueSoonThresholdDays, today));
}
