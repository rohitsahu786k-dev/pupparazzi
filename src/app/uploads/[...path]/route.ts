import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as getAssetFile } from "@/app/api/assets/[id]/file/route";

export const runtime = "nodejs";

// Next's startup public-file manifest does not include files uploaded later.
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.some((part) => part === ".." || part.includes("/") || part.includes("\\"))) {
    return NextResponse.json({ message: "Invalid file path" }, { status: 400 });
  }
  const asset = await prisma.asset.findFirst({ where: { path: `/uploads/${path.join("/")}` }, select: { id: true } });
  if (!asset) return NextResponse.json({ message: "File not found" }, { status: 404 });
  return getAssetFile(req, { params: Promise.resolve({ id: asset.id }) });
}
