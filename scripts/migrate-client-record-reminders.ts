/**
 * Backfill PetVaccination records from the legacy ClientRecord fields.
 *
 * For each ClientRecord row, we match the owner by email/phone and then match
 * the pet by name. For every populated vaccine date string (anti_rabies,
 * dhppil, corona, kennel_cough, deworming_date, last_tick_prevention_date),
 * we convert it to a PetVaccination whose:
 *   - administered_date = the parsed legacy date string
 *   - next_due_date     = administered_date + the vaccine's default cycle months
 *
 * The script is IDEMPOTENT: it skips any (pet, vaccine_type, administered_date)
 * combination that already exists, so running it repeatedly never duplicates or
 * loses data. Legacy ClientRecord data is never modified or deleted.
 *
 * Usage:
 *   npx tsx scripts/migrate-client-record-reminders.ts            # dry run (default)
 *   npx tsx scripts/migrate-client-record-reminders.ts --apply    # write records
 */

import { prisma } from "../src/lib/prisma";
import { VACCINE_DEFINITIONS, type VaccineType } from "../src/lib/reminders/vaccine-config";
import { addMonthsUtc, toUtcMidnight } from "../src/lib/reminders/dates";

const APPLY = process.argv.includes("--apply");

// Legacy ClientRecord fields to migrate
type ClientRecordKey = "anti_rabies" | "dhppil" | "corona" | "kennel_cough" | "deworming_date" | "last_tick_prevention_date";

const VACCINE_MAP: { field: ClientRecordKey; type: VaccineType }[] = [
  { field: "anti_rabies", type: "anti_rabies" },
  { field: "dhppil", type: "dhppl" },
  { field: "corona", type: "corona" },
  { field: "kennel_cough", type: "kennel_cough" },
  { field: "deworming_date", type: "deworming" },
  { field: "last_tick_prevention_date", type: "tick_prevention" },
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePhone(value: unknown): string {
  const digits = clean(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function parseDateString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  if (
    !text ||
    text.toLowerCase() === "not available" ||
    text.toLowerCase() === "not vaccinated" ||
    text.toLowerCase() === "no"
  ) {
    return null;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
  console.log(`ClientRecord vaccination backfill — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}`);

  const records = await prisma.clientRecord.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      pet_name: true,
      anti_rabies: true,
      dhppil: true,
      corona: true,
      kennel_cough: true,
      deworming_date: true,
      last_tick_prevention_date: true,
      veterinarian_name: true,
      veterinarian_contact: true,
    },
  });

  let matchedPets = 0;
  let unmatchedClients = 0;
  let unmatchedPets = 0;
  let created = 0;
  let skipped = 0;
  let candidates = 0;

  for (const record of records) {
    const phone = normalizePhone(record.phone);
    const email = record.email?.trim().toLowerCase();
    const petName = record.pet_name?.trim();

    if (!petName) {
      continue;
    }

    // 1. Find owner User
    const orConditions: any[] = [];
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });

    if (orConditions.length === 0) {
      unmatchedClients++;
      continue;
    }

    const owner = await prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
      select: { id: true, name: true },
    });

    if (!owner) {
      unmatchedClients++;
      continue;
    }

    // 2. Find Pet under owner (case-insensitive match on name)
    const pet = await prisma.pet.findFirst({
      where: {
        owner_id: owner.id,
        name: {
          equals: petName,
          mode: "insensitive",
        },
      },
      select: { id: true, name: true },
    });

    if (!pet) {
      unmatchedPets++;
      continue;
    }

    matchedPets++;

    // 3. Check and migrate each vaccine field
    for (const { field, type } of VACCINE_MAP) {
      const rawVal = record[field];
      const parsedDate = parseDateString(rawVal);
      if (!parsedDate) continue;

      candidates += 1;
      const administered = toUtcMidnight(parsedDate);
      const cycle = VACCINE_DEFINITIONS[type].defaultCycleMonths ?? 12;
      const nextDue = addMonthsUtc(administered, cycle);

      const existing = await prisma.petVaccination.findFirst({
        where: {
          pet_id: pet.id,
          vaccine_type: type,
          administered_date: administered,
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      if (APPLY) {
        await prisma.petVaccination.create({
          data: {
            pet_id: pet.id,
            vaccine_type: type,
            administered_date: administered,
            next_due_date: nextDue,
            reminder_enabled: true,
            vet_name: record.veterinarian_name || null,
            vet_contact: record.veterinarian_contact || null,
            notes: "Imported from legacy ClientRecord.",
            status: "Upcoming",
          },
        });
      }

      created += 1;
      console.log(
        `  ${APPLY ? "created" : "would create"}: pet=${pet.name} (${pet.id}) owner=${owner.name} ${type} administered=${administered.toISOString().slice(0, 10)} due=${nextDue.toISOString().slice(0, 10)}`
      );
    }
  }

  console.log("\nSummary");
  console.log(`  ClientRecord rows     : ${records.length}`);
  console.log(`  Matched to pets       : ${matchedPets}`);
  console.log(`  Unmatched client owner: ${unmatchedClients}`);
  console.log(`  Unmatched pet names   : ${unmatchedPets}`);
  console.log(`  Date candidates       : ${candidates}`);
  console.log(`  ${APPLY ? "Created" : "Would create"}         : ${created}`);
  console.log(`  Skipped (existing)    : ${skipped}`);
  if (!APPLY) console.log("\nRe-run with --apply to write these records.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
