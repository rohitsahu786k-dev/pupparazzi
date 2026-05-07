import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const address = await prisma.address.findFirst({
      where: { user_id: id, is_default: true },
    });
    return NextResponse.json(address || null);
  } catch {
    return NextResponse.json({ message: "Failed to fetch address" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { line1, city, state, pincode, phone, label } = await req.json();

    if (!line1 || !city || !pincode) {
      return NextResponse.json({ message: "Address, city and pincode are required" }, { status: 400 });
    }

    const existing = await prisma.address.findFirst({ where: { user_id: id, is_default: true } });

    const data = {
      line1: line1.trim(),
      city: city.trim(),
      state: (state || "").trim(),
      pincode: pincode.trim(),
      phone: phone?.trim() || null,
      label: label || "Home",
    };

    const address = existing
      ? await prisma.address.update({ where: { id: existing.id }, data })
      : await prisma.address.create({ data: { ...data, user_id: id, is_default: true } });

    return NextResponse.json(address);
  } catch {
    return NextResponse.json({ message: "Failed to save address" }, { status: 500 });
  }
}
