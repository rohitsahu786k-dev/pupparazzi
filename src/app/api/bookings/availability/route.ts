import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = ["Pending", "Confirmed", "In Progress"];

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("serviceId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!serviceId || !from || !to) {
      return NextResponse.json({ message: "serviceId, from and to are required" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, slot_duration_mins: true, max_slots_per_day: true, is_active: true },
    });

    if (!service?.is_active) {
      return NextResponse.json({ message: "Service is not available" }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        service_id: serviceId,
        status: { in: ACTIVE_STATUSES },
        slot_date: {
          gte: startOfDay(new Date(from)),
          lte: endOfDay(new Date(to)),
        },
      },
      select: {
        id: true,
        slot_date: true,
        slot_time: true,
        staff_id: true,
        status: true,
      },
    });

    const slotCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};

    for (const booking of bookings) {
      const day = dateKey(booking.slot_date);
      const slotKey = `${day}|${booking.slot_time}`;
      slotCounts[slotKey] = (slotCounts[slotKey] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }

    return NextResponse.json({
      service,
      slotCounts,
      dayCounts,
      bookedSlots: bookings,
    });
  } catch (error) {
    console.error("GET booking availability error:", error);
    return NextResponse.json({ message: "Failed to fetch availability", error: String(error) }, { status: 500 });
  }
}
