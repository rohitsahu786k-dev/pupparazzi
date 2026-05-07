import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const payments = await prisma.payment.findMany({
    include: { client: true, booking: { include: { service: true, pet: true } } },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(payments);
}
