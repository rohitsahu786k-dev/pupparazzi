import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listVaccineTreatmentTypes } from "@/lib/vaccine-treatment-types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const rows = await listVaccineTreatmentTypes(false);
  return NextResponse.json(rows.map((row) => ({
    id: row.id,
    key: row.key,
    display_name: row.display_name,
    category: row.category,
    default_interval_months: row.default_interval_months,
    display_order: row.display_order,
  })));
}
