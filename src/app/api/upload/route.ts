import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveGridFsUpload, saveLocalUpload, shouldUseGridFsUploads } from "@/lib/upload-storage";
import { MAX_UPLOAD_FILE_SIZE_BYTES, UPLOAD_SIZE_ERROR_MESSAGE } from "@/lib/upload-limits";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const CLIENT_DOCUMENT_CATEGORIES = new Set(["KYC", "Documents", "Bookings", "Vaccination"]);

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "general";
}

function safeFilename(name: string) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${base || "asset"}-${Date.now()}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = safeSegment((formData.get("folder") as string) || "uploads");
    const category = (formData.get("category") as string) || "General";
    const documentType = String(formData.get("documentType") || "").trim() || null;
    const clientIdFromForm = String(formData.get("clientId") || "").trim() || null;
    const petId = String(formData.get("petId") || "").trim() || null;
    const bookingId = String(formData.get("bookingId") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;
    const isAdminUpload = session.user.role === "ADMIN" || session.user.role === "STAFF";
    const isPetUpload = folder === "pets" && category === "Pets";
    const isClientDocumentUpload = CLIENT_DOCUMENT_CATEGORIES.has(category);
    if (!isAdminUpload && !isPetUpload && !isClientDocumentUpload) {
      const adminSession = await requireAdmin();
      if (!adminSession) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const uploadedBy = session.user.id;
    const clientId = isAdminUpload ? clientIdFromForm : session.user.id;

    if (!isAdminUpload && bookingId) {
      const booking = await prisma.booking.findFirst({ where: { id: bookingId, client_id: session.user.id }, select: { id: true } });
      if (!booking) return NextResponse.json({ error: "Booking not found or unauthorized" }, { status: 403 });
    }
    if (!isAdminUpload && petId) {
      const pet = await prisma.pet.findFirst({ where: { id: petId, owner_id: session.user.id }, select: { id: true } });
      if (!pet) return NextResponse.json({ error: "Pet not found or unauthorized" }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: UPLOAD_SIZE_ERROR_MESSAGE }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = safeFilename(file.name);

    if (!shouldUseGridFsUploads()) {
      try {
        const relativePath = await saveLocalUpload(folder, filename, buffer);
        const asset = await prisma.asset.create({
          data: {
            filename,
            original_name: file.name,
            path: relativePath,
            category,
            document_type: documentType,
            client_id: clientId,
            pet_id: petId,
            booking_id: bookingId,
            notes,
            ...(uploadedBy ? { uploaded_by: uploadedBy } : {}),
          },
        });

        if (documentType === "Vaccination Certificate" && petId) {
          await prisma.petMedical.upsert({
            where: { pet_id: petId },
            update: { vaccination_certificate_asset_id: asset.id, vaccination_certificate_path: asset.path },
            create: { pet_id: petId, vaccination_certificate_asset_id: asset.id, vaccination_certificate_path: asset.path },
          });
        }

        return NextResponse.json({ ...asset, url: relativePath, secure_url: relativePath });
      } catch (error: any) {
        if (error?.code !== "ENOENT" && error?.code !== "EROFS" && error?.code !== "EACCES") {
          throw error;
        }
      }
    }

    const asset = await prisma.asset.create({
      data: {
        filename,
        original_name: file.name,
        path: "",
        category,
        document_type: documentType,
        client_id: clientId,
        pet_id: petId,
        booking_id: bookingId,
        notes,
        ...(uploadedBy ? { uploaded_by: uploadedBy } : {}),
      },
    });
    const relativePath = await saveGridFsUpload({
      assetId: asset.id,
      filename,
      originalName: file.name,
      contentType: file.type,
      buffer,
    });
    const updatedAsset = await prisma.asset.update({
      where: { id: asset.id },
      data: { path: relativePath },
    });

    if (documentType === "Vaccination Certificate" && petId) {
      await prisma.petMedical.upsert({
        where: { pet_id: petId },
        update: { vaccination_certificate_asset_id: updatedAsset.id, vaccination_certificate_path: updatedAsset.path },
        create: { pet_id: petId, vaccination_certificate_asset_id: updatedAsset.id, vaccination_certificate_path: updatedAsset.path },
      });
    }

    return NextResponse.json({ ...updatedAsset, url: relativePath, secure_url: relativePath });
  } catch (error: any) {
    console.error("Local upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
