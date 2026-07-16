/**
 * Backfill PetVaccination + Pet.dob from the legacy ClientRecord fields.
 *
 * Legacy fields handled:
 *   pet_birthday                 -> Pet.dob (only when currently empty)
 *   anti_rabies                  -> PetVaccination "anti_rabies"
 *   dhppil                       -> PetVaccination "dhppl"
 *   corona                       -> PetVaccination "corona"
 *   kennel_cough                 -> PetVaccination "kennel_cough"
 *   deworming_date               -> PetVaccination "deworming"
 *   last_tick_prevention_date    -> PetVaccination "tick_prevention"
 *
 * SAFETY / CORRECTNESS (per spec §5):
 *   - Dates are parsed STRICTLY. We NEVER guess DD/MM vs MM/DD. A value like
 *     "05/06/2024" (both parts <= 12) is reported as AMBIGUOUS and skipped.
 *   - A value with no 4-digit year (e.g. "Mar 01") is reported as INVALID/yearless
 *     and skipped — we never invent a year.
 *   - Non-date junk ("Vaccinated", "Bravecto", "Yes"…) is ignored.
 *   - Owner matched by phone/email; pet matched by name under that owner.
 *   - Idempotent: an existing (pet, vaccine_type, administered_date) is skipped;
 *     an existing Pet.dob is never overwritten. Re-running is safe.
 *   - Legacy ClientRecord data is never modified or deleted.
 *   - A detailed JSON report is written to scripts/reports/.
 *
 * Usage:
 *   npx tsx scripts/migrate-client-record-reminders.ts            # dry run (default)
 *   npx tsx scripts/migrate-client-record-reminders.ts --apply    # write records
 */

import { promises as fs } from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { VACCINE_DEFINITIONS, type VaccineType } from "../src/lib/reminders/vaccine-config";
import { addMonthsUtc, toUtcMidnight } from "../src/lib/reminders/dates";

const APPLY = process.argv.includes("--apply");

type ClientRecordKey = "anti_rabies" | "dhppil" | "corona" | "kennel_cough" | "deworming_date" | "last_tick_prevention_date";
const VACCINE_MAP: { field: ClientRecordKey; type: VaccineType }[] = [
  { field: "anti_rabies", type: "anti_rabies" },
  { field: "dhppil", type: "dhppl" },
  { field: "corona", type: "corona" },
  { field: "kennel_cough", type: "kennel_cough" },
  { field: "deworming_date", type: "deworming" },
  { field: "last_tick_prevention_date", type: "tick_prevention" },
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

type ParseResult =
  | { kind: "empty" }
  | { kind: "invalid"; reason: string }
  | { kind: "ambiguous"; reason: string }
  | { kind: "ok"; date: Date };

const MIN_YEAR = 1990;
const MAX_YEAR = new Date().getUTCFullYear() + 1;

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function build(y: number, m: number, d: number): ParseResult {
  if (y < MIN_YEAR || y > MAX_YEAR) return { kind: "invalid", reason: `year ${y} out of range` };
  if (!isRealDate(y, m, d)) return { kind: "invalid", reason: "not a real calendar date" };
  return { kind: "ok", date: new Date(Date.UTC(y, m - 1, d)) };
}

/**
 * Strict date parser. Returns ok only for unambiguous, year-bearing dates.
 * Never guesses DD/MM vs MM/DD.
 */
export function parseStrictDate(raw: string | null | undefined): ParseResult {
  const text = String(raw ?? "").trim();
  if (!text) return { kind: "empty" };
  const lower = text.toLowerCase();
  if (/^(not available|not vaccinated|vaccinated|partial|no|n\/a|na|nil|none|yes|-|--)$/i.test(lower)) return { kind: "empty" };
  if (!/\d/.test(text)) return { kind: "empty" }; // clearly not a date (brand names, notes…)

  // Month-name formats: "05 May 2024", "May 05 2024", "5-Jun-2023", "May 5, 2024"
  const nameMatch = text.match(/^(\d{1,2})[\s\-,]+([a-zA-Z]{3,4})[\s\-,]+(\d{4})$/)
    || text.match(/^([a-zA-Z]{3,4})[\s\-,]+(\d{1,2})[\s\-,]+(\d{4})$/);
  if (nameMatch) {
    const a = nameMatch[1], b = nameMatch[2], c = nameMatch[3];
    let day: number, mon: number, year: number;
    if (/[a-zA-Z]/.test(a)) { mon = MONTHS[a.toLowerCase()]; day = Number(b); year = Number(c); }
    else { day = Number(a); mon = MONTHS[b.toLowerCase()]; year = Number(c); }
    if (!mon) return { kind: "invalid", reason: `unknown month "${/[a-zA-Z]/.test(a) ? a : b}"` };
    return build(year, mon, day);
  }
  // A month name but NO 4-digit year (e.g. "Mar 01") -> yearless, never invent.
  if (/[a-zA-Z]{3}/.test(text) && !/\b\d{4}\b/.test(text)) {
    return { kind: "invalid", reason: "yearless (no 4-digit year)" };
  }

  // Numeric separated: g1 SEP g2 SEP g3
  const num = text.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})$/);
  if (num) {
    const g1 = Number(num[1]), g2 = Number(num[2]), g3 = Number(num[3]);
    // ISO-ish: YYYY-MM-DD
    if (num[1].length === 4) {
      if (g2 > 12 && g3 <= 12) return { kind: "ambiguous", reason: "YYYY with day/month order unclear" };
      return build(g1, g2, g3);
    }
    // D/M/YYYY or M/D/YYYY
    if (num[3].length === 4) {
      const year = g3;
      if (g1 > 12 && g2 <= 12) return build(year, g2, g1);        // DD/MM
      if (g2 > 12 && g1 <= 12) return build(year, g1, g2);        // MM/DD
      if (g1 <= 12 && g2 <= 12) return { kind: "ambiguous", reason: "DD/MM vs MM/DD both <= 12" };
      return { kind: "invalid", reason: "both parts > 12" };
    }
    return { kind: "invalid", reason: "yearless numeric date" };
  }

  // Bare 4-digit year, or anything else → not safely usable.
  return { kind: "invalid", reason: "unrecognized date format" };
}

function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

type Issue = { client: string; pet: string; field: string; value: string; reason: string };

async function main() {
  console.log(`ClientRecord backfill — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}`);

  const records = await prisma.clientRecord.findMany({
    select: {
      id: true, name: true, email: true, phone: true, pet_name: true, pet_birthday: true,
      anti_rabies: true, dhppil: true, corona: true, kennel_cough: true,
      deworming_date: true, last_tick_prevention_date: true,
      veterinarian_name: true, veterinarian_contact: true,
    },
  });

  const counts = {
    rows: records.length, matchedPets: 0, unmatchedClient: 0, unmatchedPet: 0,
    candidates: 0, migrated: 0, skippedExisting: 0, ambiguous: 0, invalid: 0,
    birthdaysSet: 0, birthdaysSkippedExisting: 0, birthdaysInvalid: 0,
  };
  const ambiguousSamples: Issue[] = [];
  const invalidSamples: Issue[] = [];

  for (const record of records) {
    const petName = record.pet_name?.trim();
    if (!petName) continue;

    const phone = normalizePhone(record.phone);
    const email = record.email?.trim().toLowerCase() || "";
    const or: { phone?: string; email?: string }[] = [];
    if (phone) or.push({ phone });
    if (email) or.push({ email });
    if (!or.length) { counts.unmatchedClient += 1; continue; }

    const owner = await prisma.user.findFirst({ where: { OR: or }, select: { id: true, name: true } });
    if (!owner) { counts.unmatchedClient += 1; continue; }

    const pet = await prisma.pet.findFirst({
      where: { owner_id: owner.id, name: { equals: petName, mode: "insensitive" } },
      select: { id: true, name: true, dob: true },
    });
    if (!pet) { counts.unmatchedPet += 1; continue; }
    counts.matchedPets += 1;

    // Birthday → Pet.dob (only if empty; strict parse; not in future)
    const bday = parseStrictDate(record.pet_birthday);
    if (bday.kind === "ok") {
      if (bday.date.getTime() > Date.now()) {
        counts.birthdaysInvalid += 1;
      } else if (pet.dob) {
        counts.birthdaysSkippedExisting += 1;
      } else {
        counts.birthdaysSet += 1;
        if (APPLY) await prisma.pet.update({ where: { id: pet.id }, data: { dob: bday.date } });
      }
    } else if (bday.kind === "ambiguous") {
      counts.ambiguous += 1;
      if (ambiguousSamples.length < 100) ambiguousSamples.push({ client: owner.name || "", pet: pet.name, field: "pet_birthday", value: String(record.pet_birthday), reason: bday.reason });
    } else if (bday.kind === "invalid") {
      counts.birthdaysInvalid += 1;
    }

    // Vaccination dates
    for (const { field, type } of VACCINE_MAP) {
      const res = parseStrictDate(record[field]);
      if (res.kind === "empty") continue;
      counts.candidates += 1;
      if (res.kind === "ambiguous") {
        counts.ambiguous += 1;
        if (ambiguousSamples.length < 100) ambiguousSamples.push({ client: owner.name || "", pet: pet.name, field, value: String(record[field]), reason: res.reason });
        continue;
      }
      if (res.kind === "invalid") {
        counts.invalid += 1;
        if (invalidSamples.length < 100) invalidSamples.push({ client: owner.name || "", pet: pet.name, field, value: String(record[field]), reason: res.reason });
        continue;
      }
      const administered = toUtcMidnight(res.date);
      if (administered.getTime() > Date.now()) {
        counts.invalid += 1;
        if (invalidSamples.length < 100) invalidSamples.push({ client: owner.name || "", pet: pet.name, field, value: String(record[field]), reason: "administered date in the future" });
        continue;
      }
      const cycle = VACCINE_DEFINITIONS[type].defaultCycleMonths ?? 12;
      const nextDue = addMonthsUtc(administered, cycle);

      const existing = await prisma.petVaccination.findFirst({
        where: { pet_id: pet.id, vaccine_type: type, administered_date: administered },
        select: { id: true },
      });
      if (existing) { counts.skippedExisting += 1; continue; }

      counts.migrated += 1;
      if (APPLY) {
        await prisma.petVaccination.create({
          data: {
            pet_id: pet.id, vaccine_type: type, administered_date: administered, next_due_date: nextDue,
            reminder_enabled: true, vet_name: record.veterinarian_name || null, vet_contact: record.veterinarian_contact || null,
            notes: "Imported from legacy ClientRecord.", status: "Upcoming",
          },
        });
      }
    }
  }

  // Report
  const reportDir = path.join(process.cwd(), "scripts", "reports");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `clientrecord-migration-${APPLY ? "apply" : "dryrun"}-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify({ mode: APPLY ? "apply" : "dryrun", counts, ambiguousSamples, invalidSamples }, null, 2));

  console.log("\nSummary");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(24)}: ${v}`);
  console.log(`\nReport written to: ${reportPath}`);
  if (!APPLY) console.log("Re-run with --apply to write these records.");
}

main()
  .catch((err) => { console.error("Migration failed:", err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
