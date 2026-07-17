import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPetAccess,
  validateVaccination,
  serializeVaccination,
  serializationContext,
} from "@/lib/reminders/vaccination-service";

export const runtime = "nodejs";

// GET /api/pets/:id/vaccinations — list vaccination records for a pet
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  const records = await prisma.petVaccination.findMany({
    where: { pet_id: id, archived_at: null },
    orderBy: [{ administered_date: "desc" }, { next_due_date: "asc" }],
  });
  const { today, dueSoonThresholdDays } = await serializationContext();
  return NextResponse.json(records.map((r) => serializeVaccination(r, dueSoonThresholdDays, today)));
}

// POST /api/pets/:id/vaccinations — create a vaccination record
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const payload = {
    ...(body as Record<string, unknown>),
    source: (body as Record<string, unknown>)?.source || (access.role === "ADMIN" ? "admin" : access.role === "STAFF" ? "staff" : "customer"),
    verification_status: (body as Record<string, unknown>)?.verification_status || (access.role === "CLIENT" ? "Submitted" : "Verified"),
  };
  const validated = validateVaccination(payload as never);
  if (!validated.ok) return NextResponse.json({ message: validated.message }, { status: 400 });

  const created = await prisma.petVaccination.create({
    data: {
      pet_id: id,
      created_by: access.userId,
      ...validated.data,
      reminder_days_json: validated.data.reminder_days_json ?? undefined,
      status: "Upcoming",
    },
  });

  const { today, dueSoonThresholdDays } = await serializationContext();
  return NextResponse.json(serializeVaccination(created, dueSoonThresholdDays, today), { status: 201 });
}
