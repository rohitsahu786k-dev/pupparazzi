import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const CSV_HEADERS = [
  "Pet ID", "Name", "Phone Number", "Email", "Pet Name", "Pet Type", "Breed", "Gender",
  "Pet Birthday", "Address", "Lastest Booking Date", "Onboarding Date", "Number of Bookings",
  "Number of Sessions", "Client Tags", "Home Outlet", "Coat", "Breed Size", "Weight (kg)",
  "Anti Rabies", "DHPPiL (9-in-1)", "Corona", "Kennel Cough", "Local Guardian Name",
  "Local Guardian Contact", "Status", "Archive Reason", "Pet Social Media Handle",
  "Consent To Use Pet Photos", "Special Occasion", "Special Occasion Date", "Microchip Number",
  "Adoption Status", "Neutered Or Spayed", "Last Heat Month", "Last Heat Year",
  "First Walk Schedule", "Second Walk Schedule", "Third Walk Schedule", "Dietary Preference",
  "Additional Meals", "Preferences Or Allergies", "Vaccination Status", "Tick Prevention",
  "Last Tick Prevention Date", "Tick Prevention Method", "Ongoing Medication", "Medication Detail",
  "Major Illness History", "Deworming Date", "Veterinarian Name", "Veterinarian Contact",
  "T&C Accepted", "Wallet Balance", "Outstanding Balance"
];

const DB_TO_CSV: Record<string, string> = {
  pet_id_number: "Pet ID",
  name: "Name",
  phone: "Phone Number",
  email: "Email",
  pet_name: "Pet Name",
  pet_type: "Pet Type",
  breed: "Breed",
  gender: "Gender",
  pet_birthday: "Pet Birthday",
  address: "Address",
  latest_booking_date: "Lastest Booking Date",
  onboarding_date: "Onboarding Date",
  number_of_bookings: "Number of Bookings",
  number_of_sessions: "Number of Sessions",
  client_tags: "Client Tags",
  home_outlet: "Home Outlet",
  coat: "Coat",
  breed_size: "Breed Size",
  weight_kg: "Weight (kg)",
  anti_rabies: "Anti Rabies",
  dhppil: "DHPPiL (9-in-1)",
  corona: "Corona",
  kennel_cough: "Kennel Cough",
  local_guardian_name: "Local Guardian Name",
  local_guardian_contact: "Local Guardian Contact",
  status: "Status",
  archive_reason: "Archive Reason",
  pet_social_media: "Pet Social Media Handle",
  consent_photos: "Consent To Use Pet Photos",
  special_occasion: "Special Occasion",
  special_occasion_date: "Special Occasion Date",
  microchip_number: "Microchip Number",
  adoption_status: "Adoption Status",
  neutered_or_spayed: "Neutered Or Spayed",
  last_heat_month: "Last Heat Month",
  last_heat_year: "Last Heat Year",
  first_walk_schedule: "First Walk Schedule",
  second_walk_schedule: "Second Walk Schedule",
  third_walk_schedule: "Third Walk Schedule",
  dietary_preference: "Dietary Preference",
  additional_meals: "Additional Meals",
  preferences_or_allergies: "Preferences Or Allergies",
  vaccination_status: "Vaccination Status",
  tick_prevention: "Tick Prevention",
  last_tick_prevention_date: "Last Tick Prevention Date",
  tick_prevention_method: "Tick Prevention Method",
  ongoing_medication: "Ongoing Medication",
  medication_detail: "Medication Detail",
  major_illness_history: "Major Illness History",
  deworming_date: "Deworming Date",
  veterinarian_name: "Veterinarian Name",
  veterinarian_contact: "Veterinarian Contact",
  tc_accepted: "T&C Accepted",
  wallet_balance: "Wallet Balance",
  outstanding_balance: "Outstanding Balance",
};

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const records = await prisma.clientRecord.findMany({ orderBy: { created_at: "desc" } });

  // Build CSV
  const rows: string[] = [];
  rows.push(CSV_HEADERS.map(escapeCsvField).join(","));

  for (const record of records) {
    const row: string[] = [];
    for (const header of CSV_HEADERS) {
      // Find the db field for this header
      const dbField = Object.entries(DB_TO_CSV).find(([, csvHeader]) => csvHeader === header)?.[0];
      const value = dbField ? (record as any)[dbField] : "";
      row.push(escapeCsvField(value));
    }
    rows.push(row.join(","));
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
