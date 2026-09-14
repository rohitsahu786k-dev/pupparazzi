import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openGridFsUpload, openLocalUpload } from "@/lib/upload-storage";
import { isPublicMedia } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ message: "Invalid asset" }, { status: 400 });
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const publicImage = isPublicMedia(asset);
  if (!publicImage) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isOwner = asset.client_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";
    if (!isOwner && !isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (asset.path.startsWith("https://")) return NextResponse.redirect(asset.path);

  // Stored bytes never change for an asset id, so a revalidation can answer from the
  // browser cache without re-reading GridFS or disk. Documents stay private and
  // re-check authorization on every revalidation.
  const etag = `"asset-${asset.id}"`;
  const cacheControl = publicImage ? "public, max-age=86400" : "private, no-cache";
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": cacheControl } });
  }

  const stored = asset.path.startsWith("/uploads/") ? await openLocalUpload(asset.path) : await openGridFsUpload(id);
  if (!stored) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  return new NextResponse(stored.body, {
    headers: {
      "Content-Type": stored.contentType,
      "Content-Length": String(stored.length),
      "Content-Disposition": `${new URL(req.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.original_name || stored.filename)}`,
      "Cache-Control": cacheControl,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
