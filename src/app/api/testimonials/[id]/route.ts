import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Testimonial not found" }, { status: 404 });

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.pet_name !== undefined ? { pet_name: body.pet_name ? String(body.pet_name).trim() : null } : {}),
      ...(body.pet_breed !== undefined ? { pet_breed: body.pet_breed ? String(body.pet_breed).trim() : null } : {}),
      ...(body.rating !== undefined ? { rating: Math.min(5, Math.max(1, parseInt(body.rating) || 5)) } : {}),
      ...(body.text !== undefined ? { text: String(body.text).trim() } : {}),
      ...(body.image !== undefined ? { image: body.image ? String(body.image).trim() : null } : {}),
      ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
      ...(body.order !== undefined ? { order: parseInt(body.order) || 0 } : {}),
    },
  });

  return NextResponse.json(testimonial);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await params;
  await prisma.testimonial.delete({ where: { id } });
  return NextResponse.json({ message: "Testimonial deleted" });
}
