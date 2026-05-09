import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccess(sessionUserId?: string, role?: string | null, userId?: string) {
  return Boolean(sessionUserId && (sessionUserId === userId || role === "ADMIN" || role === "STAFF"));
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    if (!canAccess(session?.user?.id, session?.user?.role, id)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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
    const session = await getServerSession(authOptions);
    const { id } = await params;
    if (!canAccess(session?.user?.id, session?.user?.role, id)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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
