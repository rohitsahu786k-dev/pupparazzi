import { NextResponse } from "next/server";
import { requireOperations } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/admin/reminders/deliveries?type=&status=&page=&pageSize=&from=&to=
export async function GET(req: Request) {
  const session = await requireOperations();
  if (!session) return NextResponse.json({ message: "Staff access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize")) || 25));

  const where: Prisma.ReminderDeliveryWhereInput = {};
  if (type) where.reminder_type = type;
  if (status) where.status = status;
  if (from || to) {
    where.scheduled_for = {};
    if (from) (where.scheduled_for as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) (where.scheduled_for as Prisma.DateTimeFilter).lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [total, rows] = await Promise.all([
    prisma.reminderDelivery.count({ where }),
    prisma.reminderDelivery.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Enrich with pet + owner names (batched).
  const petIds = Array.from(new Set(rows.map((r) => r.pet_id).filter(Boolean))) as string[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
  const [pets, users] = await Promise.all([
    petIds.length ? prisma.pet.findMany({ where: { id: { in: petIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
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
  }));

  return NextResponse.json({ total, page, pageSize, items });
}
