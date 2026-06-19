import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deleteStoredUpload } from "@/lib/upload-storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const clientId = searchParams.get("clientId");
    const petId = searchParams.get("petId");
    const bookingId = searchParams.get("bookingId");
    const documentType = searchParams.get("documentType");
    const assets = await prisma.asset.findMany({
      where: {
        ...(category && category !== "All" ? { category } : {}),
        ...(clientId ? { client_id: clientId } : {}),
        ...(petId ? { pet_id: petId } : {}),
        ...(bookingId ? { booking_id: bookingId } : {}),
        ...(documentType && documentType !== "All" ? { document_type: documentType } : {}),
      },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "Asset ID is required" }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    const isOwner = asset.client_id === session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await deleteStoredUpload(asset.path, asset.id);
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ message: "Asset deleted" });
  } catch (error) {
    console.error("DELETE asset error:", error);
    return NextResponse.json({ message: "Failed to delete asset" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id, is_verified } = await req.json();
    if (!id) {
      return NextResponse.json({ message: "Asset ID is required" }, { status: 400 });
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: { is_verified: !!is_verified },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error("PATCH asset error:", error);
    return NextResponse.json({ message: "Failed to update asset" }, { status: 500 });
  }
}
