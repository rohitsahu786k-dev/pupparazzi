import { NextResponse } from "next/server";
import { requireOperations } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PUBLIC_MEDIA_CATEGORIES, assetFileUrl } from "@/lib/media";

export async function GET(req: Request) {
  if (!await requireOperations()) return NextResponse.json({ message: "Access required" }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const page = Math.max(0, Math.min(10000, Number(params.get("page")) || 0));
  const query = (params.get("q") || "").trim().slice(0, 100);
  const assets = await prisma.asset.findMany({
    where: {
      category: { in: PUBLIC_MEDIA_CATEGORIES },
      AND: [
        ...["client_id", "pet_id", "booking_id", "document_type"].map((field) => ({ OR: [{ [field]: null }, { [field]: { isSet: false } }] })),
        { OR: [".png", ".jpg", ".jpeg", ".webp", ".gif"].map((ext) => ({ filename: { endsWith: ext, mode: "insensitive" as const } })) },
      ],
      ...(query ? { original_name: { contains: query, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, original_name: true, path: true, filename: true },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip: Math.floor(page) * 24, take: 25,
  });
  return NextResponse.json({ items: assets.slice(0, 24).map((asset) => ({ ...asset, path: assetFileUrl(asset) })), hasMore: assets.length > 24 });
}
