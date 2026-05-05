import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const pets = await prisma.pet.findMany({
      where: { owner_id: id },
      include: { medical: true },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(pets);
  } catch (error) {
    console.error("GET pets error:", error);
    return NextResponse.json({ message: "Failed to fetch pets" }, { status: 500 });
  }
}
