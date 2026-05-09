import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readGridFsUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
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
