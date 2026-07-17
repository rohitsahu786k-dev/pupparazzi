import { prisma } from "@/lib/prisma";

export const VACCINE_TREATMENT_CATEGORIES = [
  "vaccine",
  "deworming",
  "parasite_prevention",
  "custom_treatment",
] as const;

export type VaccineTreatmentCategory = (typeof VACCINE_TREATMENT_CATEGORIES)[number];

export type StandardVaccineTreatment = {
  key: string;
  display_name: string;
  category: VaccineTreatmentCategory;
  default_interval_months: number | null;
  display_order: number;
  legacy_aliases: string[];
};

export const STANDARD_VACCINE_TREATMENTS: StandardVaccineTreatment[] = [
  {
    key: "anti_rabies",
    display_name: "Anti-Rabies Vaccine",
    category: "vaccine",
    default_interval_months: 12,
    display_order: 10,
    legacy_aliases: ["Anti Rabies", "Anti-Rabies", "Rabies"],
  },
  {
    key: "immunity_7_in_1",
    display_name: "Immunity Vaccine - 7-in-1",
    category: "vaccine",
    default_interval_months: 12,
    display_order: 20,
    legacy_aliases: ["7 in 1", "7-in-1"],
  },
  {
    key: "immunity_10_in_1",
    display_name: "Immunity Vaccine - 10-in-1",
    category: "vaccine",
    default_interval_months: 12,
    display_order: 30,
    legacy_aliases: ["10 in 1", "10-in-1"],
  },
  {
    key: "kennel_cough",
    display_name: "Kennel Cough Vaccine",
    category: "vaccine",
    default_interval_months: 12,
    display_order: 40,
    legacy_aliases: ["Kennel Cough"],
  },
  {
    key: "corona",
    display_name: "Corona Vaccine",
    category: "vaccine",
    default_interval_months: 12,
    display_order: 50,
    legacy_aliases: ["Corona"],
  },
  {
    key: "deworming",
    display_name: "Deworming",
    category: "deworming",
    default_interval_months: 3,
    display_order: 60,
    legacy_aliases: [],
  },
  {
    key: "tick_flea_prevention",
    display_name: "Tick & Flea Prevention",
    category: "parasite_prevention",
    default_interval_months: 1,
    display_order: 70,
    legacy_aliases: ["Tick Prevention", "Tick prevention"],
  },
  {
    key: "custom",
    display_name: "Custom Vaccine or Treatment",
    category: "custom_treatment",
    default_interval_months: null,
    display_order: 80,
    legacy_aliases: [],
  },
];

export function normalizeVaccineTreatmentName(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isVaccineTreatmentCategory(value: unknown): value is VaccineTreatmentCategory {
  return typeof value === "string" && (VACCINE_TREATMENT_CATEGORIES as readonly string[]).includes(value);
}

export async function ensureStandardVaccineTreatmentTypes() {
  for (const item of STANDARD_VACCINE_TREATMENTS) {
    await prisma.vaccineTreatmentType.upsert({
      where: { key: item.key },
      update: {
        display_name: item.display_name,
        normalized_name: normalizeVaccineTreatmentName(item.display_name),
        category: item.category,
        default_interval_months: item.default_interval_months,
        display_order: item.display_order,
        legacy_aliases_json: item.legacy_aliases,
      },
      create: {
        key: item.key,
        display_name: item.display_name,
        normalized_name: normalizeVaccineTreatmentName(item.display_name),
        category: item.category,
        default_interval_months: item.default_interval_months,
        display_order: item.display_order,
        legacy_aliases_json: item.legacy_aliases,
      },
    });
  }
}

export async function listVaccineTreatmentTypes(includeInactive = false) {
  await ensureStandardVaccineTreatmentTypes();
  return prisma.vaccineTreatmentType.findMany({
    where: includeInactive ? {} : { is_active: true, archived_at: null },
    orderBy: [{ display_order: "asc" }, { display_name: "asc" }],
  });
}
