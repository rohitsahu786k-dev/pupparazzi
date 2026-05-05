import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Create a new pet
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      owner_id, name, type, breed, gender, dob, weight, coat_type, size,
      aggression_level, neutered, allergies, dietary_preference, preferences,
      local_guardian_name, local_guardian_contact, tc_accepted,
      walk_schedule_1, walk_schedule_2, walk_schedule_3,
      // Medical info
      vaccination_status, vet_name, vet_contact, ongoing_medication,
      medication_detail, illness_history,
    } = body;

    if (!owner_id || !name || !type) {
      return NextResponse.json({ message: "owner_id, name and type are required" }, { status: 400 });
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
        neutered: neutered ?? false,
        allergies: allergies || null,
        dietary_preference: dietary_preference || null,
        preferences: preferences || null,
        walk_schedule_1: walk_schedule_1 || null,
        walk_schedule_2: walk_schedule_2 || null,
        walk_schedule_3: walk_schedule_3 || null,
        local_guardian_name: local_guardian_name || null,
        local_guardian_contact: local_guardian_contact || null,
        tc_accepted: tc_accepted ?? false,
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
    return NextResponse.json({ message: "Failed to create pet" }, { status: 500 });
  }
}

// Get all pets (for admin use)
export async function GET() {
  try {
    const pets = await prisma.pet.findMany({ include: { medical: true }, orderBy: { created_at: "desc" } });
    return NextResponse.json(pets);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch pets" }, { status: 500 });
  }
}
