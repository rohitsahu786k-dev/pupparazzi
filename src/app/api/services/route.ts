import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all services
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { is_active: true },
      include: { addons: { where: { is_active: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch services" }, { status: 500 });
  }
}
