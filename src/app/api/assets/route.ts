import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const assets = await prisma.asset.findMany({
      where: category && category !== "All" ? { category } : {},
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("GET assets error:", error);
    return NextResponse.json({ message: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "Asset ID is required" }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", asset.path.replace(/^\//, ""));
    if (filePath.startsWith(path.join(process.cwd(), "public", "uploads"))) {
      await unlink(filePath).catch(() => undefined);
    }
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ message: "Asset deleted" });
  } catch (error) {
    console.error("DELETE asset error:", error);
    return NextResponse.json({ message: "Failed to delete asset" }, { status: 500 });
  }
}
