/**
 * Timezone-aware date helpers for the reminder system.
 *
 * Convention (matching the rest of this codebase): calendar dates such as
 * Pet.dob and PetVaccination.next_due_date are stored as UTC midnight of the
 * intended calendar day (e.g. a due date of 6 May 2025 is 2025-05-06T00:00Z).
 *
 * "Today" is always resolved in the configured *business* timezone, never the
 * server's local time, so a UTC-hosted server does not roll the day over at the
 * wrong moment. We use Intl to support any IANA timezone (default Asia/Kolkata).
 */

import type { VaccinationStatus } from "@/lib/reminders/vaccine-config";
import type { Feb29Handling } from "@/lib/reminders/settings";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Year/month/day of an instant, as seen in a given IANA timezone. */
export function zonedParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * UTC-midnight Date representing the current calendar day in `timeZone`.
 * This is the canonical "today" used for all reminder day-diff maths.
 */
export function todayInZone(timeZone: string, now: Date = new Date()): Date {
  const { year, month, day } = zonedParts(now, timeZone);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Normalise any stored DateTime to the UTC-midnight of its calendar day. */
export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Whole calendar days from `from` to `to` (positive => to is in the future). */
export function dayDiff(to: Date, from: Date): number {
  return Math.round((toUtcMidnight(to).getTime() - toUtcMidnight(from).getTime()) / MS_PER_DAY);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// ── Age ──────────────────────────────────────────────────────────────────────

export type Age = { years: number; months: number; days: number };

/** Date-aware age (not a naive year subtraction). `today` should be tz-adjusted. */
export function calculateAge(dob: Date, today: Date = new Date()): Age {
  const d = toUtcMidnight(dob);
  const t = toUtcMidnight(today);
  let years = t.getUTCFullYear() - d.getUTCFullYear();
  let months = t.getUTCMonth() - d.getUTCMonth();
  let days = t.getUTCDate() - d.getUTCDate();
  if (days < 0) {
    months -= 1;
    // days in the month preceding `today`
    const prevMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

/** "3 years", "1 year 4 months", "8 months", "12 days". */
export function formatAge(dob: Date | null | undefined, today: Date = new Date()): string {
  if (!dob) return "Unknown";
  const { years, months, days } = calculateAge(dob, today);
  if (years <= 0 && months <= 0 && days <= 0) return "Newborn";
  if (years <= 0 && months <= 0) return `${days} day${days === 1 ? "" : "s"}`;
  if (years <= 0) {
    const m = `${months} month${months === 1 ? "" : "s"}`;
    return months >= 3 || days === 0 ? m : `${m} ${days} day${days === 1 ? "" : "s"}`;
  }
  const y = `${years} year${years === 1 ? "" : "s"}`;
  if (months <= 0) return y;
  return `${y} ${months} month${months === 1 ? "" : "s"}`;
}

// ── Birthdays ────────────────────────────────────────────────────────────────

/**
 * The next birthday occurrence at or after `today`, as a UTC-midnight Date.
 * Feb-29 birthdays in non-leap years resolve to Feb 28 or Mar 1 per `feb29`.
 * Returns the birthday even when it is today (days = 0).
 */
export function nextBirthday(dob: Date, today: Date = new Date(), feb29: Feb29Handling = "feb28"): Date {
  const d = toUtcMidnight(dob);
  const t = toUtcMidnight(today);
  const bMonth = d.getUTCMonth();
  const bDay = d.getUTCDate();

  const occurrence = (year: number): Date => {
    if (bMonth === 1 && bDay === 29 && !isLeapYear(year)) {
      return feb29 === "mar1" ? new Date(Date.UTC(year, 2, 1)) : new Date(Date.UTC(year, 1, 28));
    }
    return new Date(Date.UTC(year, bMonth, bDay));
  };

  let candidate = occurrence(t.getUTCFullYear());
  if (candidate.getTime() < t.getTime()) {
    candidate = occurrence(t.getUTCFullYear() + 1);
  }
  return candidate;
}

export function daysUntilBirthday(dob: Date, today: Date = new Date(), feb29: Feb29Handling = "feb28"): number {
  return dayDiff(nextBirthday(dob, today, feb29), today);
}

// ── Vaccination status ───────────────────────────────────────────────────────

export type VaccinationStatusInput = {
  nextDueDate: Date;
  reminderEnabled: boolean;
  completedAt?: Date | null;
  /** Set when the record was completed and no follow-up cycle exists yet. */
  isTerminalCompleted?: boolean;
};

/**
 * Derive the current status from dates — never trust a stale stored value.
 * `today` should already be tz-adjusted (see todayInZone).
 */
export function deriveVaccinationStatus(
  input: VaccinationStatusInput,
  dueSoonThresholdDays: number,
  today: Date = new Date(),
): VaccinationStatus {
  if (input.isTerminalCompleted) return "Completed";
  if (!input.reminderEnabled) return "Disabled";
  const diff = dayDiff(input.nextDueDate, today); // >0 future, 0 today, <0 past
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due Today";
  if (diff <= dueSoonThresholdDays) return "Due Soon";
  return "Upcoming";
}

/** Add whole months to a UTC-midnight date, clamping day overflow. */
export function addMonthsUtc(date: Date, months: number): Date {
  const d = toUtcMidnight(date);
  const targetMonth = d.getUTCMonth() + months;
  const result = new Date(Date.UTC(d.getUTCFullYear(), targetMonth, d.getUTCDate()));
  // Handle e.g. Jan 31 + 1 month → Feb 28/29 instead of Mar 3.
  if (result.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setUTCDate(0);
  }
  return result;
}

/** Format a UTC-midnight calendar date for display, e.g. "06 May 2025". */
export function formatCalendarDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return toUtcMidnight(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
