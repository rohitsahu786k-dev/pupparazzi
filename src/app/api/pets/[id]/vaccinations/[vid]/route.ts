import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPetAccess,
  validateVaccination,
  serializeVaccination,
  serializationContext,
  isObjectId,
  type VaccinationInput,
} from "@/lib/reminders/vaccination-service";

export const runtime = "nodejs";

async function loadRecord(petId: string, vid: string) {
  if (!isObjectId(vid)) return null;
  const rec = await prisma.petVaccination.findUnique({ where: { id: vid } });
  if (!rec || rec.pet_id !== petId) return null;
  return rec;
}

// PATCH /api/pets/:id/vaccinations/:vid — edit / reschedule / toggle reminder
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  const existing = await loadRecord(id, vid);
  if (!existing) return NextResponse.json({ message: "Vaccination record not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  // Merge provided fields over the existing record, then validate the whole thing
  // so invariants (administered <= due, custom name required) always hold.
  const merged: VaccinationInput = {
    vaccine_type_id: "vaccine_type_id" in body ? (body.vaccine_type_id as string | null) : existing.vaccine_type_id,
    vaccine_type: (body.vaccine_type as string) ?? existing.vaccine_type,
    type_display_name: "type_display_name" in body ? (body.type_display_name as string | null) : existing.type_display_name,
    category: "category" in body ? (body.category as string | null) : existing.category,
    custom_vaccine_name: (body.custom_vaccine_name as string) ?? existing.custom_vaccine_name,
    administered_date: "administered_date" in body ? (body.administered_date as string | null) : existing.administered_date?.toISOString() ?? null,
    next_due_date: (body.next_due_date as string) ?? existing.next_due_date.toISOString(),
    recommended_interval_months: "recommended_interval_months" in body ? (body.recommended_interval_months as string | number | null) : existing.recommended_interval_months,
    reminder_enabled: "reminder_enabled" in body ? Boolean(body.reminder_enabled) : existing.reminder_enabled,
    reminder_recipient: "reminder_recipient" in body ? (body.reminder_recipient as string | null) : existing.reminder_recipient,
    reminder_days: "reminder_days" in body ? body.reminder_days : (existing.reminder_days_json ?? undefined),
    notes: "notes" in body ? (body.notes as string | null) : existing.notes,
    vet_name: "vet_name" in body ? (body.vet_name as string | null) : existing.vet_name,
    vet_contact: "vet_contact" in body ? (body.vet_contact as string | null) : existing.vet_contact,
    provider_name: "provider_name" in body ? (body.provider_name as string | null) : existing.provider_name,
    administered_by: "administered_by" in body ? (body.administered_by as string | null) : existing.administered_by,
    dose_number: "dose_number" in body ? (body.dose_number as string | null) : existing.dose_number,
    batch_lot_number: "batch_lot_number" in body ? (body.batch_lot_number as string | null) : existing.batch_lot_number,
    certificate_asset_id: "certificate_asset_id" in body ? (body.certificate_asset_id as string | null) : existing.certificate_asset_id,
    certificate_path: "certificate_path" in body ? (body.certificate_path as string | null) : existing.certificate_path,
    source: "source" in body ? (body.source as string | null) : existing.source,
    verification_status: "verification_status" in body ? (body.verification_status as string | null) : existing.verification_status,
  };

  const validated = validateVaccination(merged);
  if (!validated.ok) return NextResponse.json({ message: validated.message }, { status: 400 });

  const updated = await prisma.petVaccination.update({
    where: { id: vid },
    data: {
      ...validated.data,
      reminder_days_json: validated.data.reminder_days_json ?? undefined,
      updated_by: access.userId,
      // Rescheduling a completed record reopens it.
      ...(body.next_due_date && existing.completed_at ? { completed_at: null, status: "Upcoming" } : {}),
    },
  });

  const { today, dueSoonThresholdDays } = await serializationContext();
  return NextResponse.json(serializeVaccination(updated, dueSoonThresholdDays, today));
}

// DELETE /api/pets/:id/vaccinations/:vid
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  const existing = await loadRecord(id, vid);
  if (!existing) return NextResponse.json({ message: "Vaccination record not found" }, { status: 404 });

  if (access.role !== "ADMIN") {
    return NextResponse.json({ message: "Only admins can archive vaccination records" }, { status: 403 });
  }
  await prisma.petVaccination.update({ where: { id: vid }, data: { archived_at: new Date(), updated_by: access.userId } });
  return NextResponse.json({ message: "Vaccination record archived" });
}
