import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bookings?userId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  try {
    const bookings = await prisma.booking.findMany({
      where: userId ? { client_id: userId } : {},
      include: { pet: true, service: true, address: true },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("GET bookings error:", error);
    return NextResponse.json({ message: "Failed to fetch bookings", error: String(error) }, { status: 500 });
  }
}

// POST /api/bookings
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      client_id, pet_id, service_id, slot_date, slot_time,
      address_id, notes, addons_json,
    } = body;

    if (!client_id || !pet_id || !service_id || !slot_date || !slot_time) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Verify pet belongs to client
    const pet = await prisma.pet.findUnique({ where: { id: pet_id } });
    if (!pet || pet.owner_id !== client_id) {
      return NextResponse.json({ message: "Pet not found or unauthorized" }, { status: 404 });
    }

    // Generate booking ID
    const count = await prisma.booking.count();
    const booking_id = `BKG-${String(count + 1001).padStart(4, "0")}`;

    const booking = await prisma.booking.create({
      data: {
        booking_id,
        client_id,
        pet_id,
        service_id,
        address_id: address_id || null,
        slot_date: new Date(slot_date),
        slot_time,
        notes: notes || null,
        addons_json: addons_json || null,
        status: "Pending",
        payment_status: "Pending",
      },
      include: { pet: true, service: true, address: true },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("POST booking error:", error);
    return NextResponse.json({ message: "Failed to create booking", error: String(error) }, { status: 500 });
  }
}

// PATCH /api/bookings/:id
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, payment_status, notes } = body;

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(payment_status && { payment_status }),
        ...(notes && { notes }),
      },
      include: { pet: true, service: true },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("PATCH booking error:", error);
    return NextResponse.json({ message: "Failed to update booking", error: String(error) }, { status: 500 });
  }
}

// DELETE /api/bookings/:id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("DELETE booking error:", error);
    return NextResponse.json({ message: "Failed to delete booking", error: String(error) }, { status: 500 });
  }
}
