import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const admin = searchParams.get("admin") === "true";

  if (admin) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const testimonials = await prisma.testimonial.findMany({
    where: admin ? {} : { is_active: true },
    orderBy: [{ order: "asc" }, { created_at: "desc" }],
  });

  return NextResponse.json(testimonials);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.text) {
    return NextResponse.json({ message: "Name and review text are required" }, { status: 400 });
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      name: String(body.name).trim(),
      pet_name: body.pet_name ? String(body.pet_name).trim() : null,
      pet_breed: body.pet_breed ? String(body.pet_breed).trim() : null,
      rating: Math.min(5, Math.max(1, parseInt(body.rating) || 5)),
      text: String(body.text).trim(),
      image: body.image ? String(body.image).trim() : null,
      is_active: body.is_active !== false,
      order: parseInt(body.order) || 0,
    },
  });

  return NextResponse.json(testimonial, { status: 201 });
}
