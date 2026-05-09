import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccess(sessionUserId?: string, role?: string | null, userId?: string) {
  return Boolean(sessionUserId && (sessionUserId === userId || role === "ADMIN" || role === "STAFF"));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    if (!canAccess(session?.user?.id, session?.user?.role, id)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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
