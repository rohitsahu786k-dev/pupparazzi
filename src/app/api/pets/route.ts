import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isOperations(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

// Create a new pet
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      owner_id, name, type, breed, gender, dob, weight, coat_type, size,
      aggression_level, neutered, allergies, dietary_preference, preferences,
      profile_photo, photos_array,
      local_guardian_name, local_guardian_contact, tc_accepted,
      walk_schedule_1, walk_schedule_2, walk_schedule_3,
      // Medical info
      vaccination_status, vet_name, vet_contact, ongoing_medication,
      medication_detail, illness_history,
    } = body;

    if (!owner_id || !name || !type) {
      return NextResponse.json({ message: "owner_id, name and type are required" }, { status: 400 });
    }
    if (!isOperations(session.user.role) && owner_id !== session.user.id) {
      return NextResponse.json({ message: "You can only create pets for your own account" }, { status: 403 });
    }

    // Verify owner exists
    const owner = await prisma.user.findUnique({ where: { id: owner_id } });
    if (!owner) {
      return NextResponse.json({ message: "Owner not found" }, { status: 404 });
    }

    const pet = await prisma.pet.create({
      data: {
        owner_id,
        name,
        type,
        breed: breed || null,
        gender: gender || null,
        dob: dob ? new Date(dob) : null,
        weight: weight ? parseFloat(weight) : null,
        coat_type: coat_type || null,
        size: size || null,
        aggression_level: aggression_level ? parseInt(aggression_level) : 1,
        profile_photo: profile_photo || null,
        photos_array: Array.isArray(photos_array) ? photos_array : [],
        neutered: neutered ?? false,
        allergies: allergies || null,
        dietary_preference: dietary_preference || null,
        preferences: preferences || null,
        walk_schedule_1: walk_schedule_1 || null,
        walk_schedule_2: walk_schedule_2 || null,
        walk_schedule_3: walk_schedule_3 || null,
        local_guardian_name: local_guardian_name || null,
        local_guardian_contact: local_guardian_contact || null,
        tc_accepted: tc_accepted ?? true,
        medical: (vaccination_status || vet_name || ongoing_medication !== undefined) ? {
          create: {
            vaccination_status: vaccination_status || null,
            vet_name: vet_name || null,
            vet_contact: vet_contact || null,
            ongoing_medication: ongoing_medication ?? false,
            medication_detail: medication_detail || null,
            illness_history: illness_history || null,
          }
        } : undefined,
      },
      include: { medical: true },
    });

    return NextResponse.json(pet, { status: 201 });
  } catch (error) {
    console.error("POST pet error:", error);
    return NextResponse.json({ message: "Failed to create pet", error: String(error) }, { status: 500 });
  }
}

// Get all pets (for admin use)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isOperations(session.user.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const pets = await prisma.pet.findMany({
      include: { medical: true, owner: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { created_at: "desc" }
    });
    return NextResponse.json(pets);
  } catch (error) {
    console.error("GET pets error:", error);
    return NextResponse.json({ message: "Failed to fetch pets", error: String(error) }, { status: 500 });
  }
}

// Update a pet
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ message: "Pet ID is required" }, { status: 400 });
    }

    const existing = await prisma.pet.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "Pet not found" }, { status: 404 });
    if (!isOperations(session.user.role) && existing.owner_id !== session.user.id) {
      return NextResponse.json({ message: "You can only update your own pet" }, { status: 403 });
    }

    const { medical, owner, bookings, ...safeUpdateData } = updateData;
    const pet = await prisma.pet.update({
      where: { id },
      data: {
        ...safeUpdateData,
        updated_at: new Date(),
      },
      include: { medical: true },
    });

    return NextResponse.json(pet);
  } catch (error) {
    console.error("PUT pet error:", error);
    return NextResponse.json({ message: "Failed to update pet", error: String(error) }, { status: 500 });
  }
}

// Delete a pet
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Pet ID is required" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) return NextResponse.json({ message: "Pet not found" }, { status: 404 });
    if (!isOperations(session.user.role) && pet.owner_id !== session.user.id) {
      return NextResponse.json({ message: "You can only delete your own pet" }, { status: 403 });
    }

    const bookingCount = await prisma.booking.count({ where: { pet_id: id } });
    if (bookingCount > 0) {
      return NextResponse.json({ message: "Pets with bookings cannot be deleted. Update the profile instead." }, { status: 409 });
    }
    await prisma.pet.delete({ where: { id } });
    return NextResponse.json({ message: "Pet deleted successfully" });
  } catch (error) {
    console.error("DELETE pet error:", error);
    return NextResponse.json({ message: "Failed to delete pet", error: String(error) }, { status: 500 });
  }
}
