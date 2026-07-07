import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications – notifications for the signed-in user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const notifications = await prisma.notification.findMany({
      where: { user_id: session.user.id, channel: "Email", status: "Sent" },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET notifications error:", error);
    return NextResponse.json({ message: "Failed to fetch notifications", error: String(error) }, { status: 500 });
  }
}
