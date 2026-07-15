/**
 * Backfill PetVaccination records from the legacy PetMedical administered dates.
 *
 * For each PetMedical row, every populated vaccine date (anti_rabies_date,
 * dhppl_date, corona_date, kennel_cough_date, deworming_date,
 * tick_prevention_date) becomes a PetVaccination whose:
 *   - administered_date = the legacy date
 *   - next_due_date     = administered_date + the vaccine's default cycle months
 *
 * The script is IDEMPOTENT: it skips any (pet, vaccine_type, administered_date)
 * combination that already exists, so running it repeatedly never duplicates or
 * loses data. Legacy PetMedical data is never modified or deleted.
 *
 * Usage:
 *   npx tsx scripts/migrate-pet-vaccinations.ts            # dry run (default)
 *   npx tsx scripts/migrate-pet-vaccinations.ts --apply    # write records
 */

import { prisma } from "../src/lib/prisma";
import { VACCINE_DEFINITIONS, type VaccineType } from "../src/lib/reminders/vaccine-config";
import { addMonthsUtc, toUtcMidnight } from "../src/lib/reminders/dates";

const APPLY = process.argv.includes("--apply");

// Legacy PetMedical.<field> → vaccine type.
const LEGACY_MAP: { field: keyof LegacyMedical; type: VaccineType }[] = [
  { field: "anti_rabies_date", type: "anti_rabies" },
  { field: "dhppl_date", type: "dhppl" },
  { field: "corona_date", type: "corona" },
  { field: "kennel_cough_date", type: "kennel_cough" },
  { field: "deworming_date", type: "deworming" },
  { field: "tick_prevention_date", type: "tick_prevention" },
];

type LegacyMedical = {
  pet_id: string;
  anti_rabies_date: Date | null;
  dhppl_date: Date | null;
  corona_date: Date | null;
  kennel_cough_date: Date | null;
  deworming_date: Date | null;
  tick_prevention_date: Date | null;
  vet_name: string | null;
  vet_contact: string | null;
  vaccination_certificate_asset_id: string | null;
  vaccination_certificate_path: string | null;
};

async function main() {
  console.log(`Pet vaccination backfill — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}`);

  const medicals = (await prisma.petMedical.findMany({
    select: {
      pet_id: true,
      anti_rabies_date: true,
      dhppl_date: true,
      corona_date: true,
      kennel_cough_date: true,
      deworming_date: true,
      tick_prevention_date: true,
      vet_name: true,
      vet_contact: true,
      vaccination_certificate_asset_id: true,
      vaccination_certificate_path: true,
    },
  })) as LegacyMedical[];

  let created = 0;
  let skipped = 0;
  let candidates = 0;

  for (const med of medicals) {
    // Only attach the certificate to the most recent legacy date to avoid
    // duplicating the same file across many records.
    for (const { field, type } of LEGACY_MAP) {
      const raw = med[field] as Date | null;
      if (!raw) continue;
      candidates += 1;

      const administered = toUtcMidnight(raw);
      const cycle = VACCINE_DEFINITIONS[type].defaultCycleMonths ?? 12;
      const nextDue = addMonthsUtc(administered, cycle);

      const existing = await prisma.petVaccination.findFirst({
        where: { pet_id: med.pet_id, vaccine_type: type, administered_date: administered },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      if (APPLY) {
        await prisma.petVaccination.create({
          data: {
            pet_id: med.pet_id,
            vaccine_type: type,
            administered_date: administered,
            next_due_date: nextDue,
            reminder_enabled: true,
            vet_name: med.vet_name,
            vet_contact: med.vet_contact,
            certificate_asset_id: type === "anti_rabies" ? med.vaccination_certificate_asset_id : null,
            certificate_path: type === "anti_rabies" ? med.vaccination_certificate_path : null,
            notes: "Imported from legacy medical record.",
            status: "Upcoming",
          },
        });
      }
      created += 1;
      console.log(`  ${APPLY ? "created" : "would create"}: pet=${med.pet_id} ${type} administered=${administered.toISOString().slice(0, 10)} due=${nextDue.toISOString().slice(0, 10)}`);
    }
  }

  console.log("\nSummary");
  console.log(`  Legacy medical rows : ${medicals.length}`);
  console.log(`  Date candidates     : ${candidates}`);
  console.log(`  ${APPLY ? "Created" : "Would create"}       : ${created}`);
  console.log(`  Skipped (existing)  : ${skipped}`);
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
