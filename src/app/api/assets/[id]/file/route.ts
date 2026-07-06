import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readGridFsUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const isOwner = asset.client_id === session.user.id;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const stored = await readGridFsUpload(id);
  if (!stored) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  return new NextResponse(stored.buffer, {
    headers: {
      "Content-Type": stored.contentType,
      "Content-Disposition": `inline; filename="${asset.original_name || stored.filename}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
