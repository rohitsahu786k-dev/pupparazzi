/**
 * Centralised configuration for the Pet Birthday & Vaccination Reminder System.
 *
 * Every vaccine/treatment label, default schedule and threshold lives here so
 * the rest of the application never hardcodes these values. Reminder intervals
 * defined here are the *defaults*; an admin can override them globally
 * (AppSetting key "reminders", see lib/reminders/settings.ts) and an individual
 * PetVaccination record can override the schedule via reminder_days_json.
 */

export const VACCINE_TYPES = [
  "anti_rabies",
  "immunity_7_in_1",
  "immunity_10_in_1",
  "dhppl",
  "corona",
  "kennel_cough",
  "deworming",
  "tick_prevention",
  "tick_flea_prevention",
  "custom",
] as const;

export type VaccineType = (typeof VACCINE_TYPES)[number];

export type VaccineDefinition = {
  key: VaccineType;
  label: string;
  /** Typical months between administration and the next due date. Convenience only. */
  defaultCycleMonths: number | null;
  /** Maps to the legacy PetMedical.<field> that stores the last administered date. */
  legacyDateField:
    | "anti_rabies_date"
    | "dhppl_date"
    | "corona_date"
    | "kennel_cough_date"
    | "deworming_date"
    | "tick_prevention_date"
    | null;
};

export const VACCINE_DEFINITIONS: Record<VaccineType, VaccineDefinition> = {
  anti_rabies: { key: "anti_rabies", label: "Anti-Rabies Vaccine", defaultCycleMonths: 12, legacyDateField: "anti_rabies_date" },
  immunity_7_in_1: { key: "immunity_7_in_1", label: "Immunity Vaccine - 7-in-1", defaultCycleMonths: 12, legacyDateField: null },
  immunity_10_in_1: { key: "immunity_10_in_1", label: "Immunity Vaccine - 10-in-1", defaultCycleMonths: 12, legacyDateField: null },
  dhppl: { key: "dhppl", label: "Legacy Immunity Vaccine (review)", defaultCycleMonths: 12, legacyDateField: "dhppl_date" },
  corona: { key: "corona", label: "Corona Vaccine", defaultCycleMonths: 12, legacyDateField: "corona_date" },
  kennel_cough: { key: "kennel_cough", label: "Kennel Cough Vaccine", defaultCycleMonths: 12, legacyDateField: "kennel_cough_date" },
  deworming: { key: "deworming", label: "Deworming", defaultCycleMonths: 3, legacyDateField: "deworming_date" },
  tick_prevention: { key: "tick_prevention", label: "Tick & Flea Prevention", defaultCycleMonths: 1, legacyDateField: "tick_prevention_date" },
  tick_flea_prevention: { key: "tick_flea_prevention", label: "Tick & Flea Prevention", defaultCycleMonths: 1, legacyDateField: null },
  custom: { key: "custom", label: "Custom Vaccine or Treatment", defaultCycleMonths: null, legacyDateField: null },
};

export const VACCINE_TYPE_OPTIONS = VACCINE_TYPES.map((key) => ({
  value: key,
  label: VACCINE_DEFINITIONS[key].label,
}));

export function isVaccineType(value: unknown): value is VaccineType {
  return typeof value === "string" && (VACCINE_TYPES as readonly string[]).includes(value);
}

/** Human label for a record, using the custom name when the type is custom. */
export function vaccineLabel(type: string, customName?: string | null): string {
  if (type === "custom") return (customName || "Custom Treatment").trim();
  return isVaccineType(type) ? VACCINE_DEFINITIONS[type].label : type;
}

/** Convenience repeat intervals offered in the "mark completed" UI (months). */
export const REPEAT_INTERVAL_OPTIONS = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
] as const;

// ── Derived status vocabulary ────────────────────────────────────────────────

export const VACCINATION_STATUSES = [
  "Upcoming",
  "Due Soon",
  "Due Today",
  "Overdue",
  "Completed",
  "Disabled",
] as const;

export type VaccinationStatus = (typeof VACCINATION_STATUSES)[number];

/** Theme-token classes for status badges, matching the app's Tailwind palette. */
export const STATUS_BADGE_CLASS: Record<VaccinationStatus, string> = {
  Upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  "Due Soon": "bg-amber-50 text-amber-700 border-amber-200",
  "Due Today": "bg-orange-50 text-orange-700 border-orange-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Disabled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const MAX_REMINDER_DAY = 400;
