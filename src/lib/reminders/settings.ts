import { getSetting, setSetting } from "@/lib/settings";

/**
 * Admin-configurable settings for the reminder system. Persisted under the
 * AppSetting key "reminders" using the project's existing settings pattern.
 * `getReminderSettings()` always merges over DEFAULT_REMINDER_SETTINGS so new
 * fields are safe to add without a migration.
 */

export const REMINDER_SETTINGS_KEY = "reminders";

export type Feb29Handling = "feb28" | "mar1";

export type ReminderSettings = {
  // General
  birthdayRemindersEnabled: boolean;
  vaccinationRemindersEnabled: boolean;
  timezone: string; // IANA, e.g. Asia/Kolkata
  adminSummaryEnabled: boolean;
  adminSummaryRecipient: string;

  // Birthday
  birthdayReminderDays: number[]; // days before birthday, plus 0 for the day itself
  birthdaySendGreetingOnDay: boolean;
  feb29Handling: Feb29Handling;
  allowClientsDisableBirthday: boolean;

  // Vaccination
  vaccinationReminderDays: number[]; // days before due date (positive)
  vaccinationOverdueDays: number[]; // days after due date (positive)
  dueSoonThresholdDays: number; // status "Due Soon" window
  allowCustomPerVaccineSchedule: boolean;

  // Email branding (falls back to business settings / env when blank)
  senderName: string;
  fromEmail: string;
  replyToEmail: string;
  businessName: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  footerText: string;
  primaryButtonUrl: string;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  birthdayRemindersEnabled: true,
  vaccinationRemindersEnabled: true,
  timezone: process.env.APP_TIMEZONE || "Asia/Kolkata",
  adminSummaryEnabled: false,
  adminSummaryRecipient: process.env.REMINDER_ADMIN_EMAIL || "",

  birthdayReminderDays: [7, 1, 0],
  birthdaySendGreetingOnDay: true,
  feb29Handling: "feb28",
  allowClientsDisableBirthday: true,

  vaccinationReminderDays: [30, 14, 7, 3, 1, 0],
  vaccinationOverdueDays: [3, 7],
  dueSoonThresholdDays: 30,
  allowCustomPerVaccineSchedule: true,

  senderName: "",
  fromEmail: "",
  replyToEmail: process.env.SMTP_REPLY_TO || "",
  businessName: "",
  logoUrl: process.env.APP_LOGO_URL || "",
  supportEmail: process.env.APP_SUPPORT_EMAIL || "",
  supportPhone: process.env.APP_SUPPORT_PHONE || "",
  footerText: "",
  primaryButtonUrl: process.env.APP_URL || process.env.NEXTAUTH_URL || "",
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const stored = await getSetting<ReminderSettings>(REMINDER_SETTINGS_KEY, DEFAULT_REMINDER_SETTINGS);
  // Defend against malformed persisted arrays.
  return {
    ...stored,
    birthdayReminderDays: sanitizeDays(stored.birthdayReminderDays, DEFAULT_REMINDER_SETTINGS.birthdayReminderDays),
    vaccinationReminderDays: sanitizeDays(stored.vaccinationReminderDays, DEFAULT_REMINDER_SETTINGS.vaccinationReminderDays),
    vaccinationOverdueDays: sanitizeDays(stored.vaccinationOverdueDays, DEFAULT_REMINDER_SETTINGS.vaccinationOverdueDays),
  };
}

export async function saveReminderSettings(patch: Partial<ReminderSettings>): Promise<ReminderSettings> {
  const current = await getReminderSettings();
  const next: ReminderSettings = { ...current, ...patch };
  await setSetting(REMINDER_SETTINGS_KEY, next);
  return next;
}

/** Dedupe, coerce to non-negative integers, sort descending. Falls back if empty/invalid. */
export function sanitizeDays(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback];
  const cleaned = Array.from(
    new Set(
      value
        .map((v) => Math.trunc(Number(v)))
        .filter((v) => Number.isFinite(v) && v >= 0 && v <= 400),
    ),
  ).sort((a, b) => b - a);
  return cleaned.length ? cleaned : [...fallback];
}
