import { NextResponse } from "next/server";
import { requireOperations } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { VACCINE_DEFINITIONS, VACCINE_TYPES, type VaccineType } from "@/lib/reminders/vaccine-config";
import { normalizeVaccineTreatmentName } from "@/lib/vaccine-treatment-types";

export const runtime = "nodejs";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

// GET /api/admin/reminders/deliveries
//   ?type=&status=&from=&to=&page=&pageSize=&petId=&clientId=&vaccineType=&q=
export async function GET(req: Request) {
  const session = await requireOperations();
  if (!session) return NextResponse.json({ message: "Staff access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const petId = searchParams.get("petId") || "";
  const clientId = searchParams.get("clientId") || "";
  const vaccineType = searchParams.get("vaccineType") || "";
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize")) || 25));

  const and: Prisma.ReminderDeliveryWhereInput[] = [];
  if (type) and.push({ reminder_type: type });
  if (status) and.push({ status });
  if (petId && OBJECT_ID_RE.test(petId)) and.push({ pet_id: petId });
  if (clientId && OBJECT_ID_RE.test(clientId)) and.push({ user_id: clientId });
  if (from || to) {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
    and.push({ scheduled_for: range });
  }

  // Vaccine type → resolve to matching vaccination_ids, then filter.
  if (vaccineType) {
    const vaccs = await prisma.petVaccination.findMany({
      where: { OR: [{ vaccine_type: vaccineType }, ...(OBJECT_ID_RE.test(vaccineType) ? [{ vaccine_type_id: vaccineType }] : [])] },
      select: { id: true },
    });
    and.push({ vaccination_id: { in: vaccs.length ? vaccs.map((v) => v.id) : ["000000000000000000000000"] } });
  }

  // Free-text search across recipient/subject/type + related pet, owner, vaccine.
  if (q) {
    const ci = { contains: q, mode: "insensitive" as const };
    const [pets, users, vaccs] = await Promise.all([
      prisma.pet.findMany({ where: { name: ci }, select: { id: true } }),
      prisma.user.findMany({ where: { OR: [{ name: ci }, { email: ci }, { phone: ci }] }, select: { id: true } }),
      prisma.petVaccination.findMany({
        where: {
          OR: [
            { custom_vaccine_name: ci },
            { type_display_name: ci },
            // Match a built-in vaccine label typed as free text (e.g. "rabies").
            { vaccine_type: { in: matchVaccineTypesByLabel(q) } },
          ],
        },
        select: { id: true },
      }),
    ]);
    const or: Prisma.ReminderDeliveryWhereInput[] = [
      { recipient: ci },
      { subject: ci },
      { reminder_type: ci },
    ];
    if (pets.length) or.push({ pet_id: { in: pets.map((p) => p.id) } });
    if (users.length) or.push({ user_id: { in: users.map((u) => u.id) } });
    if (vaccs.length) or.push({ vaccination_id: { in: vaccs.map((v) => v.id) } });
    and.push({ OR: or });
  }

  const where: Prisma.ReminderDeliveryWhereInput = and.length ? { AND: and } : {};

  const [total, rows] = await Promise.all([
    prisma.reminderDelivery.count({ where }),
    prisma.reminderDelivery.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const petIds = Array.from(new Set(rows.map((r) => r.pet_id).filter(Boolean))) as string[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
  const [pets, users] = await Promise.all([
    petIds.length ? prisma.pet.findMany({ where: { id: { in: petIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, phone: true } }) : Promise.resolve([]),
  ]);
  const petMap = new Map(pets.map((p) => [p.id, p]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  const items = rows.map((r) => ({
    id: r.id,
    reminder_type: r.reminder_type,
    status: r.status,
    recipient: r.recipient,
    subject: r.subject,
    scheduled_for: r.scheduled_for,
    sent_at: r.sent_at,
    error_message: r.error_message,
    attempt_count: r.attempt_count,
    created_at: r.created_at,
    pet_name: r.pet_id ? petMap.get(r.pet_id)?.name ?? null : null,
    owner_name: r.user_id ? userMap.get(r.user_id)?.name ?? null : null,
    owner_email: r.user_id ? userMap.get(r.user_id)?.email ?? null : null,
    owner_phone: r.user_id ? userMap.get(r.user_id)?.phone ?? null : null,
  }));

  return NextResponse.json({ total, page, pageSize, items });
}

function matchVaccineTypesByLabel(q: string): VaccineType[] {
  const needle = q.toLowerCase();
  const normalizedNeedle = normalizeVaccineTreatmentName(q);
  return (VACCINE_TYPES as readonly VaccineType[]).filter((t) => (
    VACCINE_DEFINITIONS[t].label.toLowerCase().includes(needle) || t.includes(normalizedNeedle)
  ));
}
