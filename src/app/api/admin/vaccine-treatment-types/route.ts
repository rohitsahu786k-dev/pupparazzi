import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import {
  ensureStandardVaccineTreatmentTypes,
  isVaccineTreatmentCategory,
  normalizeVaccineTreatmentName,
} from "@/lib/vaccine-treatment-types";

export const runtime = "nodejs";

function cleanName(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

async function historicalReferenceCount(id: string, key: string) {
  return prisma.petVaccination.count({
    where: { OR: [{ vaccine_type_id: id }, { vaccine_type: key }] },
  });
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  await ensureStandardVaccineTreatmentTypes();
  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const rows = await prisma.vaccineTreatmentType.findMany({
    where: includeInactive ? {} : { archived_at: null },
    orderBy: [{ display_order: "asc" }, { display_name: "asc" }],
  });
  const counts = await Promise.all(rows.map((row) => historicalReferenceCount(row.id, row.key)));
  return NextResponse.json(rows.map((row, index) => ({ ...row, reference_count: counts[index] })));
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const displayName = cleanName(body?.display_name);
  const category = body?.category;
  if (!displayName) return NextResponse.json({ message: "Display name is required" }, { status: 400 });
  if (!isVaccineTreatmentCategory(category)) return NextResponse.json({ message: "Valid category is required" }, { status: 400 });

  const normalized = normalizeVaccineTreatmentName(displayName);
  const duplicate = await prisma.vaccineTreatmentType.findUnique({ where: { normalized_name: normalized } });
  if (duplicate) return NextResponse.json({ message: "A vaccine or treatment with this name already exists" }, { status: 409 });

  const created = await prisma.vaccineTreatmentType.create({
    data: {
      key: normalized,
      display_name: displayName,
      normalized_name: normalized,
      category,
      default_interval_months: body.default_interval_months === null || body.default_interval_months === ""
        ? null
        : Math.max(0, Math.trunc(Number(body.default_interval_months || 0))) || null,
      is_active: body.is_active !== false,
      display_order: Math.trunc(Number(body.display_order || 1000)),
      legacy_aliases_json: Array.isArray(body.legacy_aliases) ? body.legacy_aliases.map(cleanName).filter(Boolean) : [],
      created_by: session.user.id,
      updated_by: session.user.id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  const existing = id ? await prisma.vaccineTreatmentType.findUnique({ where: { id } }) : null;
  if (!existing) return NextResponse.json({ message: "Vaccine or treatment type not found" }, { status: 404 });

  const displayName = body.display_name !== undefined ? cleanName(body.display_name) : existing.display_name;
  if (!displayName) return NextResponse.json({ message: "Display name is required" }, { status: 400 });
  const normalized = normalizeVaccineTreatmentName(displayName);
  const duplicate = await prisma.vaccineTreatmentType.findUnique({ where: { normalized_name: normalized } });
  if (duplicate && duplicate.id !== existing.id) {
    return NextResponse.json({ message: "A vaccine or treatment with this name already exists" }, { status: 409 });
  }

  const category = body.category !== undefined ? body.category : existing.category;
  if (!isVaccineTreatmentCategory(category)) return NextResponse.json({ message: "Valid category is required" }, { status: 400 });

  const updated = await prisma.vaccineTreatmentType.update({
    where: { id },
    data: {
      display_name: displayName,
      normalized_name: normalized,
      category,
      default_interval_months: body.default_interval_months === undefined
        ? existing.default_interval_months
        : body.default_interval_months === null || body.default_interval_months === ""
          ? null
          : Math.max(0, Math.trunc(Number(body.default_interval_months || 0))) || null,
      ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
      ...(body.display_order !== undefined ? { display_order: Math.trunc(Number(body.display_order || 0)) } : {}),
      ...(body.archived === true ? { archived_at: new Date(), is_active: false } : {}),
      ...(body.archived === false ? { archived_at: null } : {}),
      updated_by: session.user.id,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const existing = id ? await prisma.vaccineTreatmentType.findUnique({ where: { id } }) : null;
  if (!existing) return NextResponse.json({ message: "Vaccine or treatment type not found" }, { status: 404 });

  const references = await historicalReferenceCount(existing.id, existing.key);
  if (references > 0) {
    const archived = await prisma.vaccineTreatmentType.update({
      where: { id },
      data: { archived_at: new Date(), is_active: false, updated_by: session.user.id },
    });
    return NextResponse.json({ message: "Archived because historical records reference this type", item: archived, references });
  }

  await prisma.vaccineTreatmentType.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
