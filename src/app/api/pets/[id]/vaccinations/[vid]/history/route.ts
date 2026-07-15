import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPetAccess, isObjectId } from "@/lib/reminders/vaccination-service";

export const runtime = "nodejs";

// GET /api/pets/:id/vaccinations/:vid/history — reminder delivery history for a record
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params;
  const access = await getPetAccess(id);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
  if (!isObjectId(vid)) return NextResponse.json({ message: "Invalid record id" }, { status: 400 });

  const deliveries = await prisma.reminderDelivery.findMany({
    where: { vaccination_id: vid },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true, reminder_type: true, status: true, recipient: true, subject: true,
      scheduled_for: true, sent_at: true, error_message: true, attempt_count: true, created_at: true,
    },
  });

  return NextResponse.json(deliveries);
}
