import { describe, it, expect, vi } from "vitest";
import { validateVaccination, serializeVaccination } from "../lib/reminders/vaccination-service";
import { VACCINE_DEFINITIONS } from "../lib/reminders/vaccine-config";

describe("Vaccination CRUD & Validation logic", () => {
  it("successfully validates standard vaccine entry with valid inputs", () => {
    const input = {
      vaccine_type: "anti_rabies",
      administered_date: "2026-07-10",
      next_due_date: "2027-07-10",
      reminder_enabled: true,
      vet_name: "Dr. Smith",
      vet_contact: "9999999999",
      notes: "Annual shot",
    };

    const res = validateVaccination(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.vaccine_type).toBe("anti_rabies");
      expect(res.data.custom_vaccine_name).toBeNull();
      expect(res.data.administered_date?.getUTCDate()).toBe(10);
      expect(res.data.next_due_date.getUTCDate()).toBe(10);
      expect(res.data.reminder_enabled).toBe(true);
      expect(res.data.vet_name).toBe("Dr. Smith");
      expect(res.data.vet_contact).toBe("9999999999");
    }
  });

  it("fails validation for custom vaccine type if name is missing", () => {
    const input = {
      vaccine_type: "custom",
      custom_vaccine_name: "", // empty
      next_due_date: "2026-07-20",
    };

    const res = validateVaccination(input);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toContain("name is required for a custom vaccine");
    }
  });

  it("validates admin-managed vaccine types selected from master data", () => {
    const res = validateVaccination({
      vaccine_type_id: "60c72b2f9b1d8b2d88888888",
      vaccine_type: "leptospirosis-booster",
      type_display_name: "Leptospirosis Booster",
      category: "vaccine",
      next_due_date: "2026-08-20",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.vaccine_type).toBe("leptospirosis-booster");
      expect(res.data.vaccine_type_id).toBe("60c72b2f9b1d8b2d88888888");
      expect(res.data.type_display_name).toBe("Leptospirosis Booster");
    }
  });

  it("fails validation if administered date is after next due date", () => {
    const input = {
      vaccine_type: "anti_rabies",
      administered_date: "2026-07-21",
      next_due_date: "2026-07-20", // before administered date
    };

    const res = validateVaccination(input);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toContain("Administered date cannot be after the next due date");
    }
  });

  it("accepts certificate_asset_id and certificate_path", () => {
    const input = {
      vaccine_type: "anti_rabies",
      next_due_date: "2026-07-20",
      certificate_asset_id: "60c72b2f9b1d8b2d88888888", // Valid 24-hex ObjectId string
      certificate_path: "/uploads/cert.pdf",
    };

    const res = validateVaccination(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.certificate_asset_id).toBe("60c72b2f9b1d8b2d88888888");
      expect(res.data.certificate_path).toBe("/uploads/cert.pdf");
    }
  });

  it("fails validation if certificate_asset_id is not a valid ObjectId", () => {
    const input = {
      vaccine_type: "anti_rabies",
      next_due_date: "2026-07-20",
      certificate_asset_id: "invalid-id",
    };

    const res = validateVaccination(input);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toContain("Invalid certificate reference");
    }
  });

  it("serializes vaccination records with derived status correctly", () => {
    const record = {
      id: "rec-123",
      pet_id: "pet-123",
      vaccine_type: "anti_rabies",
      custom_vaccine_name: null,
      administered_date: new Date(Date.UTC(2025, 6, 15)),
      next_due_date: new Date(Date.UTC(2026, 6, 15)),
      status: "Upcoming",
      reminder_enabled: true,
      reminder_days_json: [0, 7],
      notes: "First dose",
      vet_name: "Dr. Watson",
      vet_contact: "12345",
      certificate_asset_id: "60c72b2f9b1d8b2d88888888",
      certificate_path: "/uploads/rabies.pdf",
      completed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const today = new Date(Date.UTC(2026, 6, 15)); // due today
    const res = serializeVaccination(record, 7, today);

    expect(res.id).toBe("rec-123");
    expect(res.vaccine_label).toBe("Anti-Rabies Vaccine");
    expect(res.status).toBe("Due Today"); // Derived due today
    expect(res.certificate_path).toBe("/uploads/rabies.pdf");
  });

  it("exposes clear standard vaccine and treatment labels", () => {
    expect(VACCINE_DEFINITIONS.anti_rabies.label).toBe("Anti-Rabies Vaccine");
    expect(VACCINE_DEFINITIONS.immunity_7_in_1.label).toBe("Immunity Vaccine - 7-in-1");
    expect(VACCINE_DEFINITIONS.immunity_10_in_1.label).toBe("Immunity Vaccine - 10-in-1");
    expect(VACCINE_DEFINITIONS.tick_flea_prevention.label).toBe("Tick & Flea Prevention");
    expect(VACCINE_DEFINITIONS.dhppl.label).toContain("Legacy");
  });
});
