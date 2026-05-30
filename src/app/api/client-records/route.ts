import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// Increase body size limit for bulk imports
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function generateStaticParams() { return []; }


// CSV column mapping to database fields
const CSV_FIELD_MAP: Record<string, string> = {
  "Pet ID": "pet_id_number",
  "Name": "name",
  "Phone Number": "phone",
  "Email": "email",
  "Pet Name": "pet_name",
  "Pet Type": "pet_type",
  "Breed": "breed",
  "Gender": "gender",
  "Pet Birthday": "pet_birthday",
  "Address": "address",
  "Lastest Booking Date": "latest_booking_date",
  "Onboarding Date": "onboarding_date",
  "Number of Bookings": "number_of_bookings",
  "Number of Sessions": "number_of_sessions",
  "Client Tags": "client_tags",
  "Home Outlet": "home_outlet",
  "Coat": "coat",
  "Breed Size": "breed_size",
  "Weight (kg)": "weight_kg",
  "Anti Rabies": "anti_rabies",
  "DHPPiL (9-in-1)": "dhppil",
  "Corona": "corona",
  "Kennel Cough": "kennel_cough",
  "Local Guardian Name": "local_guardian_name",
  "Local Guardian Contact": "local_guardian_contact",
  "Status": "status",
  "Archive Reason": "archive_reason",
  "Pet Social Media Handle": "pet_social_media",
  "Consent To Use Pet Photos": "consent_photos",
  "Special Occasion": "special_occasion",
  "Special Occasion Date": "special_occasion_date",
  "Microchip Number": "microchip_number",
  "Adoption Status": "adoption_status",
  "Neutered Or Spayed": "neutered_or_spayed",
  "Last Heat Month": "last_heat_month",
  "Last Heat Year": "last_heat_year",
  "First Walk Schedule": "first_walk_schedule",
  "Second Walk Schedule": "second_walk_schedule",
  "Third Walk Schedule": "third_walk_schedule",
  "Dietary Preference": "dietary_preference",
  "Additional Meals": "additional_meals",
  "Preferences Or Allergies": "preferences_or_allergies",
  "Vaccination Status": "vaccination_status",
  "Tick Prevention": "tick_prevention",
  "Last Tick Prevention Date": "last_tick_prevention_date",
  "Tick Prevention Method": "tick_prevention_method",
  "Ongoing Medication": "ongoing_medication",
  "Medication Detail": "medication_detail",
  "Major Illness History": "major_illness_history",
  "Deworming Date": "deworming_date",
  "Veterinarian Name": "veterinarian_name",
  "Veterinarian Contact": "veterinarian_contact",
  "T&C Accepted": "tc_accepted",
  "Wallet Balance": "wallet_balance",
  "Outstanding Balance": "outstanding_balance",
};

// GET - List all client records with search/filter
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50")));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status && status !== "All") {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { pet_name: { contains: q, mode: "insensitive" } },
      { breed: { contains: q, mode: "insensitive" } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.clientRecord.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.clientRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// POST - Create single client record OR bulk import
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body. File may be too large or malformed." }, { status: 400 });
  }

  // Bulk import
  if (body.bulk && Array.isArray(body.records)) {
    const records = body.records;
    let imported = 0;
    let errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const data = mapRowToRecord(row);
        if (!data.name || !data.phone) {
          errors.push(`Row ${i + 1}: Name and Phone are required`);
          continue;
        }
        await prisma.clientRecord.create({ data });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || "Unknown error"}`);
      }
    }

    return NextResponse.json({
      message: `Imported ${imported} of ${records.length} records`,
      imported,
      total: records.length,
      errors: errors.slice(0, 20),
    });
  }

  // Single create
  if (!body.name || !body.phone) {
    return NextResponse.json({ message: "Name and Phone are required" }, { status: 400 });
  }

  const data: any = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "bulk" || key === "records") continue;
    if (value !== undefined && value !== null && value !== "") {
      if (key === "pet_id_number" || key === "number_of_bookings" || key === "number_of_sessions") {
        data[key] = parseInt(String(value)) || 0;
      } else if (key === "weight_kg" || key === "wallet_balance" || key === "outstanding_balance") {
        data[key] = parseFloat(String(value)) || 0;
      } else {
        data[key] = String(value).trim();
      }
    }
  }

  const record = await prisma.clientRecord.create({ data });
  return NextResponse.json(record, { status: 201 });
}

// PATCH - Update a client record
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ message: "Record ID is required" }, { status: 400 });

  const existing = await prisma.clientRecord.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ message: "Record not found" }, { status: 404 });

  const data: any = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "created_at" || key === "updated_at") continue;
    if (key === "pet_id_number" || key === "number_of_bookings" || key === "number_of_sessions") {
      data[key] = parseInt(String(value)) || 0;
    } else if (key === "weight_kg" || key === "wallet_balance" || key === "outstanding_balance") {
      data[key] = parseFloat(String(value)) || 0;
    } else {
      data[key] = value === null ? null : String(value).trim();
    }
  }

  const record = await prisma.clientRecord.update({ where: { id: body.id }, data });
  return NextResponse.json(record);
}

// DELETE - Delete one or multiple records
export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const deleteAll = searchParams.get("all");

  if (deleteAll === "true") {
    const result = await prisma.clientRecord.deleteMany({});
    return NextResponse.json({ message: `Deleted ${result.count} records` });
  }

  if (!id) return NextResponse.json({ message: "Record ID is required" }, { status: 400 });

  await prisma.clientRecord.delete({ where: { id } });
  return NextResponse.json({ message: "Record deleted" });
}

// Helper: Map CSV row object to database record
function mapRowToRecord(row: Record<string, string>): any {
  const data: any = {};

  for (const [csvCol, dbField] of Object.entries(CSV_FIELD_MAP)) {
    const value = row[csvCol]?.trim();
    if (!value) continue;

    if (dbField === "pet_id_number" || dbField === "number_of_bookings" || dbField === "number_of_sessions") {
      data[dbField] = parseInt(value) || 0;
    } else if (dbField === "weight_kg" || dbField === "wallet_balance" || dbField === "outstanding_balance") {
      data[dbField] = parseFloat(value) || 0;
    } else {
      data[dbField] = value;
    }
  }

  return data;
}
