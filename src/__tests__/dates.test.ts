import { describe, it, expect } from "vitest";
import {
  zonedParts,
  todayInZone,
  toUtcMidnight,
  dayDiff,
  isLeapYear,
  calculateAge,
  formatAge,
  nextBirthday,
  daysUntilBirthday,
  deriveVaccinationStatus,
  addMonthsUtc,
  formatCalendarDate,
} from "../lib/reminders/dates";

describe("Date and Birthday logic", () => {
  it("computes zoned parts correctly", () => {
    // 2026-07-15T22:30:00Z is 2026-07-16T04:00:00 in Asia/Kolkata (IST = UTC + 5:30)
    const instant = new Date("2026-07-15T22:30:00Z");
    const parts = zonedParts(instant, "Asia/Kolkata");
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(7);
    expect(parts.day).toBe(16);
  });

  it("todayInZone boundary around midnight", () => {
    // 15th July 11:30 PM (23:30) IST is 15th July 6:00 PM (18:00) UTC
    const date1 = new Date("2026-07-15T18:00:00Z");
    const today1 = todayInZone("Asia/Kolkata", date1);
    expect(today1.getUTCDate()).toBe(15);

    // 16th July 12:30 AM (00:30) IST is 15th July 7:00 PM (19:00) UTC
    const date2 = new Date("2026-07-15T19:00:00Z");
    const today2 = todayInZone("Asia/Kolkata", date2);
    expect(today2.getUTCDate()).toBe(16);
  });

  it("normalizes to UTC midnight", () => {
    const d = new Date("2026-07-15T14:35:10Z");
    const mid = toUtcMidnight(d);
    expect(mid.getUTCFullYear()).toBe(2026);
    expect(mid.getUTCMonth()).toBe(6); // 0-indexed July
    expect(mid.getUTCDate()).toBe(15);
    expect(mid.getUTCHours()).toBe(0);
    expect(mid.getUTCMinutes()).toBe(0);
  });

  it("computes dayDiff correctly", () => {
    const d1 = new Date(Date.UTC(2026, 6, 15));
    const d2 = new Date(Date.UTC(2026, 6, 20));
    expect(dayDiff(d2, d1)).toBe(5);
    expect(dayDiff(d1, d2)).toBe(-5);
  });

  it("checks leap years", () => {
    expect(isLeapYear(2020)).toBe(true);
    expect(isLeapYear(2021)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it("calculates age correctly", () => {
    const dob = new Date(Date.UTC(2020, 4, 10)); // 10 May 2020
    const today = new Date(Date.UTC(2023, 6, 15)); // 15 July 2023
    const age = calculateAge(dob, today);
    expect(age.years).toBe(3);
    expect(age.months).toBe(2);
    expect(age.days).toBe(5);
  });

  it("formats age correctly", () => {
    const dob1 = new Date(Date.UTC(2023, 6, 10));
    const today1 = new Date(Date.UTC(2023, 6, 15));
    expect(formatAge(dob1, today1)).toBe("5 days");

    const dob2 = new Date(Date.UTC(2022, 10, 15));
    const today2 = new Date(Date.UTC(2023, 6, 15));
    expect(formatAge(dob2, today2)).toBe("8 months");

    const dob3 = new Date(Date.UTC(2020, 4, 15));
    const today3 = new Date(Date.UTC(2023, 6, 15));
    expect(formatAge(dob3, today3)).toBe("3 years 2 months");

    const dob4 = new Date(Date.UTC(2020, 2, 15));
    const today4 = new Date(Date.UTC(2023, 6, 15));
    expect(formatAge(dob4, today4)).toBe("3 years 4 months");
  });

  it("computes next birthday crossing year boundary, tomorrow, and today", () => {
    const dob = new Date(Date.UTC(2020, 6, 15)); // 15 July 2020

    // Today is before birthday in 2026: 14 July 2026
    const todayBefore = new Date(Date.UTC(2026, 6, 14));
    const next1 = nextBirthday(dob, todayBefore);
    expect(next1.getUTCFullYear()).toBe(2026);
    expect(next1.getUTCMonth()).toBe(6);
    expect(next1.getUTCDate()).toBe(15);
    expect(daysUntilBirthday(dob, todayBefore)).toBe(1); // Birthday tomorrow!

    // Today is birthday: 15 July 2026
    const todayIs = new Date(Date.UTC(2026, 6, 15));
    const next2 = nextBirthday(dob, todayIs);
    expect(next2.getUTCFullYear()).toBe(2026);
    expect(next2.getUTCMonth()).toBe(6);
    expect(next2.getUTCDate()).toBe(15);
    expect(daysUntilBirthday(dob, todayIs)).toBe(0); // Birthday today!

    // Today is after birthday: 16 July 2026
    const todayAfter = new Date(Date.UTC(2026, 6, 16));
    const next3 = nextBirthday(dob, todayAfter);
    expect(next3.getUTCFullYear()).toBe(2027); // Crosses into next year
    expect(next3.getUTCMonth()).toBe(6);
    expect(next3.getUTCDate()).toBe(15);
  });

  it("handles February 29 birthdays on leap and non-leap years", () => {
    const dob = new Date(Date.UTC(2020, 1, 29)); // 29 Feb 2020 (leap year)

    // Next birthday in a non-leap year (2021) handled as Feb 28
    const today1 = new Date(Date.UTC(2021, 0, 1));
    const nextFeb28 = nextBirthday(dob, today1, "feb28");
    expect(nextFeb28.getUTCFullYear()).toBe(2021);
    expect(nextFeb28.getUTCMonth()).toBe(1); // Feb
    expect(nextFeb28.getUTCDate()).toBe(28);

    // Next birthday in a non-leap year (2021) handled as March 1
    const nextMar1 = nextBirthday(dob, today1, "mar1");
    expect(nextMar1.getUTCFullYear()).toBe(2021);
    expect(nextMar1.getUTCMonth()).toBe(2); // March
    expect(nextMar1.getUTCDate()).toBe(1);

    // Next birthday in a leap year (2024) should remain Feb 29
    const today2 = new Date(Date.UTC(2024, 0, 1));
    const nextLeap = nextBirthday(dob, today2, "feb28");
    expect(nextLeap.getUTCFullYear()).toBe(2024);
    expect(nextLeap.getUTCMonth()).toBe(1); // Feb
    expect(nextLeap.getUTCDate()).toBe(29);
  });
});

describe("Vaccination status transitions", () => {
  const threshold = 7; // due soon within 7 days
  const today = new Date(Date.UTC(2026, 6, 15));

  it("derives correct status", () => {
    // Overdue (next due date is yesterday)
    const overdue = deriveVaccinationStatus(
      { nextDueDate: new Date(Date.UTC(2026, 6, 14)), reminderEnabled: true },
      threshold,
      today
    );
    expect(overdue).toBe("Overdue");

    // Due Today (next due date is today)
    const dueToday = deriveVaccinationStatus(
      { nextDueDate: new Date(Date.UTC(2026, 6, 15)), reminderEnabled: true },
      threshold,
      today
    );
    expect(dueToday).toBe("Due Today");

    // Due Soon (next due date is tomorrow)
    const dueSoon = deriveVaccinationStatus(
      { nextDueDate: new Date(Date.UTC(2026, 6, 16)), reminderEnabled: true },
      threshold,
      today
    );
    expect(dueSoon).toBe("Due Soon");

    // Upcoming (next due date is 10 days in future)
    const upcoming = deriveVaccinationStatus(
      { nextDueDate: new Date(Date.UTC(2026, 6, 25)), reminderEnabled: true },
      threshold,
      today
    );
    expect(upcoming).toBe("Upcoming");

    // Completed (terminal completed)
    const completed = deriveVaccinationStatus(
      { nextDueDate: new Date(Date.UTC(2026, 6, 25)), reminderEnabled: true, isTerminalCompleted: true },
      threshold,
      today
    );
    expect(completed).toBe("Completed");

    // Disabled (reminderEnabled is false)
    const disabled = deriveVaccinationStatus(
      { nextDueDate: new Date(Date.UTC(2026, 6, 14)), reminderEnabled: false },
      threshold,
      today
    );
    expect(disabled).toBe("Disabled");
  });
});
