import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bookings?userId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  try {
    const bookings = await prisma.booking.findMany({
      where: userId ? { client_id: userId } : {},
      include: { pet: true, service: true },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch bookings" }, { status: 500 });
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
      include: { pet: true, service: true },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("POST booking error:", error);
    return NextResponse.json({ message: "Failed to create booking" }, { status: 500 });
  }
}
