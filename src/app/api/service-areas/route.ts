import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/service-areas          — list all areas
// GET /api/service-areas?pincode= — check if pincode is serviceable
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode");
  try {
    if (pincode) {
      if (!/^\d{6}$/.test(pincode)) {
        return NextResponse.json({ serviceable: false, message: "Invalid pincode format" });
      }
      const area = await prisma.serviceArea.findFirst({ where: { pincode, is_active: true } });
      return NextResponse.json({ serviceable: !!area, area: area || null });
    }
    const areas = await prisma.serviceArea.findMany({
      orderBy: [{ city: "asc" }, { pincode: "asc" }],
    });
    return NextResponse.json(areas);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch service areas", error: String(error) }, { status: 500 });
  }
}

// POST /api/service-areas — add new area (admin)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pincode, city, area_name, state, country } = body;

    if (!pincode || !city) {
      return NextResponse.json({ message: "Pincode and city are required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ message: "Pincode must be exactly 6 digits" }, { status: 400 });
    }

    const existing = await prisma.serviceArea.findUnique({ where: { pincode } });
    if (existing) {
      return NextResponse.json({ message: "This pincode already exists" }, { status: 409 });
    }

    const area = await prisma.serviceArea.create({
      data: {
        pincode,
        city: city.trim(),
        area_name: area_name?.trim() || undefined,
        state: state || "Gujarat",
        country: country || "India",
      },
    });
    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create service area", error: String(error) }, { status: 500 });
  }
}

// PATCH /api/service-areas — toggle active/inactive
export async function PATCH(req: Request) {
  try {
    const { id, is_active } = await req.json();
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });
    const area = await prisma.serviceArea.update({ where: { id }, data: { is_active } });
    return NextResponse.json(area);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update service area", error: String(error) }, { status: 500 });
  }
}

// DELETE /api/service-areas?id=xxx
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });
    await prisma.serviceArea.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete service area", error: String(error) }, { status: 500 });
  }
}
