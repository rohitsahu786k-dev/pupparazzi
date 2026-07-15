/**
 * Shared server helpers for vaccination endpoints: access control, validation,
 * and serialization with derived status. Keeps every route consistent and
 * enforces ownership on the server (never trust the client).
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOperationsRole } from "@/lib/admin";
import { getReminderSettings } from "@/lib/reminders/settings";
import { deriveVaccinationStatus, todayInZone, dayDiff, toUtcMidnight } from "@/lib/reminders/dates";
import { isVaccineType, vaccineLabel, MAX_REMINDER_DAY } from "@/lib/reminders/vaccine-config";
import type { PetVaccination } from "@prisma/client";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

export type PetAccess =
  | { ok: true; userId: string; role: string; canWrite: boolean; pet: { id: string; owner_id: string; name: string } }
  | { ok: false; status: number; message: string };

/** Load a pet and confirm the current user may act on it. */
export async function getPetAccess(petId: string): Promise<PetAccess> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, status: 401, message: "Unauthorized" };
  if (!isObjectId(petId)) return { ok: false, status: 400, message: "Invalid pet id" };

  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { id: true, owner_id: true, name: true } });
  if (!pet) return { ok: false, status: 404, message: "Pet not found" };

  const isOps = isOperationsRole(session.user.role);
  if (!isOps && pet.owner_id !== session.user.id) {
    return { ok: false, status: 403, message: "You can only access your own pet" };
  }
  return { ok: true, userId: session.user.id, role: session.user.role, canWrite: true, pet };
}

// ── Validation ───────────────────────────────────────────────────────────────

export type VaccinationInput = {
  vaccine_type: string;
  custom_vaccine_name?: string | null;
  administered_date?: string | null;
  next_due_date: string;
  reminder_enabled?: boolean;
  reminder_days?: unknown;
  notes?: string | null;
  vet_name?: string | null;
  vet_contact?: string | null;
  certificate_asset_id?: string | null;
  certificate_path?: string | null;
};

export type ValidatedVaccination = {
  vaccine_type: string;
  custom_vaccine_name: string | null;
  administered_date: Date | null;
  next_due_date: Date;
  reminder_enabled: boolean;
  reminder_days_json: number[] | null;
  notes: string | null;
  vet_name: string | null;
  vet_contact: string | null;
  certificate_asset_id: string | null;
  certificate_path: string | null;
};

function parseDateOnly(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return toUtcMidnight(d);
}

export function sanitizeReminderDays(value: unknown): number[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return null;
  const cleaned = Array.from(
    new Set(
      value
        .map((v) => Math.trunc(Number(v)))
        .filter((v) => Number.isFinite(v) && v >= 0 && v <= MAX_REMINDER_DAY),
    ),
  ).sort((a, b) => b - a);
  return cleaned.length ? cleaned : null;
}

/** Validate a create/update payload. Returns typed data or an error message. */
export function validateVaccination(input: VaccinationInput): { ok: true; data: ValidatedVaccination } | { ok: false; message: string } {
  if (!isVaccineType(input.vaccine_type)) {
    return { ok: false, message: "Invalid vaccine type" };
  }
  const customName = (input.custom_vaccine_name || "").trim();
  if (input.vaccine_type === "custom" && !customName) {
    return { ok: false, message: "A name is required for a custom vaccine or treatment" };
  }

  const nextDue = parseDateOnly(input.next_due_date);
  if (!nextDue) return { ok: false, message: "A valid next due date is required" };

  const administered = parseDateOnly(input.administered_date);
  if (administered && administered.getTime() > nextDue.getTime()) {
    return { ok: false, message: "Administered date cannot be after the next due date" };
  }

  if (input.certificate_asset_id && !isObjectId(input.certificate_asset_id)) {
    return { ok: false, message: "Invalid certificate reference" };
  }

  return {
    ok: true,
    data: {
      vaccine_type: input.vaccine_type,
      custom_vaccine_name: input.vaccine_type === "custom" ? customName : null,
      administered_date: administered,
      next_due_date: nextDue,
      reminder_enabled: input.reminder_enabled ?? true,
      reminder_days_json: sanitizeReminderDays(input.reminder_days),
      notes: (input.notes || "").trim() || null,
      vet_name: (input.vet_name || "").trim() || null,
      vet_contact: (input.vet_contact || "").trim() || null,
      certificate_asset_id: input.certificate_asset_id || null,
      certificate_path: input.certificate_path || null,
    },
  };
}

// ── Serialization ────────────────────────────────────────────────────────────

export type SerializedVaccination = {
  id: string;
  pet_id: string;
  vaccine_type: string;
  vaccine_label: string;
  custom_vaccine_name: string | null;
  administered_date: string | null;
  next_due_date: string;
  days_remaining: number;
  status: string;
  reminder_enabled: boolean;
  reminder_days: number[] | null;
  notes: string | null;
  vet_name: string | null;
  vet_contact: string | null;
  certificate_asset_id: string | null;
  certificate_path: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function serializeVaccination(rec: PetVaccination, dueSoonThresholdDays: number, today: Date): SerializedVaccination {
  const due = toUtcMidnight(rec.next_due_date);
  const status = deriveVaccinationStatus(
    {
      nextDueDate: due,
      reminderEnabled: rec.reminder_enabled,
      completedAt: rec.completed_at,
      isTerminalCompleted: Boolean(rec.completed_at && rec.status === "Completed"),
    },
    dueSoonThresholdDays,
    today,
  );
  return {
    id: rec.id,
    pet_id: rec.pet_id,
    vaccine_type: rec.vaccine_type,
    vaccine_label: vaccineLabel(rec.vaccine_type, rec.custom_vaccine_name),
    custom_vaccine_name: rec.custom_vaccine_name,
    administered_date: rec.administered_date ? toUtcMidnight(rec.administered_date).toISOString() : null,
    next_due_date: due.toISOString(),
    days_remaining: dayDiff(due, today),
    status,
    reminder_enabled: rec.reminder_enabled,
    reminder_days: Array.isArray(rec.reminder_days_json) ? (rec.reminder_days_json as number[]) : null,
    notes: rec.notes,
    vet_name: rec.vet_name,
    vet_contact: rec.vet_contact,
    certificate_asset_id: rec.certificate_asset_id,
    certificate_path: rec.certificate_path,
    completed_at: rec.completed_at ? rec.completed_at.toISOString() : null,
    created_at: rec.created_at.toISOString(),
    updated_at: rec.updated_at.toISOString(),
  };
}

/** Convenience: today (in business tz) + due-soon threshold, for serialization. */
export async function serializationContext() {
  const settings = await getReminderSettings();
  const today = todayInZone(settings.timezone);
  return { today, dueSoonThresholdDays: settings.dueSoonThresholdDays, settings };
}
