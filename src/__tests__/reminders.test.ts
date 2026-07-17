import { describe, it, expect, vi, beforeEach } from "vitest";
import { runReminderProcessor, resolveBranding } from "../lib/reminders/processor";
import { prisma } from "../lib/prisma";
import { sendMail } from "../lib/mailer";

vi.mock("../lib/prisma", () => {
  return {
    prisma: {
      appSetting: {
        findUnique: vi.fn(),
      },
      pet: {
        findMany: vi.fn(),
      },
      petVaccination: {
        findMany: vi.fn(),
      },
      reminderDelivery: {
        create: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock("../lib/mailer", () => {
  return {
    sendMail: vi.fn(),
    baseLayout: vi.fn((html) => html),
    escapeHtml: vi.fn((str) =>
      String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
    ),
    infoRow: vi.fn((label, value) => `<tr><td>${label}</td><td>${value}</td></tr>`),
    primaryButton: vi.fn((label, url) => `<a href="${url}">${label}</a>`),
    sectionTitle: vi.fn((text) => `<h2>${text}</h2>`),
  };
});

describe("Reminder processor idempotency and concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends birthday and vaccination reminders when candidates match and reservations succeed", async () => {
    // 1. Mock settings: enable birthday and vaccination reminders
    vi.mocked(prisma.appSetting.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.key === "reminder_settings") {
        return {
          key: "reminder_settings",
          value: {
            timezone: "Asia/Kolkata",
            birthdayRemindersEnabled: true,
            birthdayReminderDays: [0], // on day of birthday
            birthdaySendGreetingOnDay: true,
            vaccinationRemindersEnabled: true,
            vaccinationReminderDays: [0],
            vaccinationOverdueDays: [1],
          },
        };
      }
      return null;
    });

    // 2. Mock pets: one pet whose birthday is today
    const mockToday = new Date(Date.UTC(2026, 6, 15)); // 15 July 2026
    vi.mocked(prisma.pet.findMany).mockResolvedValue([
      {
        id: "pet-1",
        name: "Buddy",
        dob: new Date(Date.UTC(2020, 6, 15)), // 15 July 2020 (birthday is today)
        profile_photo: null,
        owner: {
          id: "owner-1",
          name: "Alice",
          email: "alice@example.com",
        },
      },
    ] as any);

    // 3. Mock vaccinations: one vaccination due today
    vi.mocked(prisma.petVaccination.findMany).mockResolvedValue([
      {
        id: "vacc-1",
        pet_id: "pet-1",
        vaccine_type: "anti_rabies",
        custom_vaccine_name: null,
        next_due_date: new Date(Date.UTC(2026, 6, 15)), // due today
        reminder_enabled: true,
        reminder_days_json: null,
        completed_at: null,
        status: "Upcoming",
        vet_name: null,
        vet_contact: null,
        pet: {
          id: "pet-1",
          name: "Buddy",
          profile_photo: null,
          owner: {
            id: "owner-1",
            name: "Alice",
            email: "alice@example.com",
          },
        },
      },
    ] as any);

    // 4. Mock reservation success
    vi.mocked(prisma.reminderDelivery.create).mockResolvedValue({ id: "delivery-1" } as any);
    vi.mocked(sendMail).mockResolvedValue({ success: true, messageId: "msg-1" } as any);

    const result = await runReminderProcessor({ now: mockToday });

    expect(result.birthdayCandidates).toBe(1);
    expect(result.vaccinationCandidates).toBe(1);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);

    // Verify reminder delivery rows are created (reserved)
    expect(prisma.reminderDelivery.create).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("skips sending if double-fired (idempotency unique constraint violation)", async () => {
    // Mock settings
    vi.mocked(prisma.appSetting.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.key === "reminder_settings") {
        return {
          key: "reminder_settings",
          value: {
            timezone: "Asia/Kolkata",
            birthdayRemindersEnabled: false,
            vaccinationRemindersEnabled: true,
            vaccinationReminderDays: [0],
          },
        };
      }
      return null;
    });

    const mockToday = new Date(Date.UTC(2026, 6, 15));
    vi.mocked(prisma.pet.findMany).mockResolvedValue([]);
    vi.mocked(prisma.petVaccination.findMany).mockResolvedValue([
      {
        id: "vacc-1",
        pet_id: "pet-1",
        vaccine_type: "anti_rabies",
        next_due_date: new Date(Date.UTC(2026, 6, 15)),
        reminder_enabled: true,
        completed_at: null,
        status: "Upcoming",
        pet: {
          id: "pet-1",
          name: "Buddy",
          owner: { id: "owner-1", email: "alice@example.com" },
        },
      },
    ] as any);

    // Throw P2002 unique conflict error on reservation create to simulate already reserved/sent
    const p2002Error = new Error("Unique constraint failed");
    (p2002Error as any).code = "P2002";
    vi.mocked(prisma.reminderDelivery.create).mockRejectedValue(p2002Error);

    // Mock updateMany to return 0 rows updated (meaning the delivery is not in Failed status or already maxed out)
    vi.mocked(prisma.reminderDelivery.updateMany).mockResolvedValue({ count: 0 });

    const result = await runReminderProcessor({ now: mockToday });

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1); // skipped because reservation failed and couldn't be claimed
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("retries a previously failed reminder if attempts are below limit", async () => {
    vi.mocked(prisma.appSetting.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.key === "reminder_settings") {
        return {
          key: "reminder_settings",
          value: {
            timezone: "Asia/Kolkata",
            birthdayRemindersEnabled: false,
            vaccinationRemindersEnabled: true,
            vaccinationReminderDays: [0],
          },
        };
      }
      return null;
    });

    const mockToday = new Date(Date.UTC(2026, 6, 15));
    vi.mocked(prisma.pet.findMany).mockResolvedValue([]);
    vi.mocked(prisma.petVaccination.findMany).mockResolvedValue([
      {
        id: "vacc-1",
        pet_id: "pet-1",
        vaccine_type: "anti_rabies",
        next_due_date: new Date(Date.UTC(2026, 6, 15)),
        reminder_enabled: true,
        completed_at: null,
        status: "Upcoming",
        pet: {
          id: "pet-1",
          name: "Buddy",
          owner: { id: "owner-1", email: "alice@example.com" },
        },
      },
    ] as any);

    // First, reservation create throws unique constraint conflict P2002
    const p2002Error = new Error("Unique constraint failed");
    (p2002Error as any).code = "P2002";
    vi.mocked(prisma.reminderDelivery.create).mockRejectedValue(p2002Error);

    // Mock updateMany to return count: 1, meaning we successfully locked the previously failed delivery for retry
    vi.mocked(prisma.reminderDelivery.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.reminderDelivery.findUnique).mockResolvedValue({ id: "existing-delivery-id" } as any);

    vi.mocked(sendMail).mockResolvedValue({ success: true, messageId: "msg-retry-1" } as any);

    const result = await runReminderProcessor({ now: mockToday });

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(prisma.reminderDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "existing-delivery-id" },
        data: expect.objectContaining({ status: "Sent" }),
      })
    );
  });
});
