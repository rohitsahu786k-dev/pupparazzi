import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { expirePastBookings, istDayWindow, periodWhere, serviceOverlapWhere } from "@/lib/booking-lifecycle";

function canManageBookings(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

/**
 * Badge counts for the Today / Active / Upcoming / Past tabs.
 *
 * The tabs overlap by design (a confirmed booking scheduled today is both Today
 * and Active), so these are four independent counts and are not expected to add
 * up to `all`. Every non-period filter the list is using is applied here too, so
 * the badge always matches what the tab will actually show.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Keep counts consistent with the list, which also expires stale bookings first.
    await expirePastBookings();

    const { searchParams } = new URL(req.url);
    const operationsUser = canManageBookings(session.user.role);
    const requestedUserId = searchParams.get("userId");
    // A client may only ever count their own bookings.
    const userId = operationsUser ? requestedUserId : session.user.id;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const serviceCategory = searchParams.get("serviceCategory");

    const baseFilters = [
      ...(userId ? [{ client_id: userId }] : []),
      ...(status && status !== "All" ? [{ status }] : []),
      ...(paymentStatus && paymentStatus !== "All" ? [{ payment_status: paymentStatus }] : []),
      ...(serviceCategory && serviceCategory !== "All" ? [{ service: { category: serviceCategory } }] : []),
    ];

    const count = (period?: string) =>
      prisma.booking.count({
        where: { AND: [...baseFilters, ...(period ? [periodWhere(period)] : [])] },
      });

    const [all, today, active, upcoming, past] = await Promise.all([
      count(),
      count("today"),
      count("active"),
      count("upcoming"),
      count("past"),
    ]);

    const todayRange = istDayWindow();
    const activeServiceTodayWhere = {
      AND: [
        ...baseFilters,
        serviceOverlapWhere(todayRange.start, todayRange.end),
        { status: { notIn: ["Cancelled", "Expired"] } },
      ],
    };
    const bookedTodayWhere = {
      AND: [
        ...baseFilters,
        { created_at: { gte: todayRange.start, lte: todayRange.end } },
        { status: { notIn: ["Cancelled", "Expired"] } },
      ],
    };
    const [serviceToday, bookedToday, paymentsToday] = await Promise.all([
      prisma.booking.count({ where: activeServiceTodayWhere }),
      prisma.booking.count({ where: bookedTodayWhere }),
      prisma.payment.findMany({
        where: {
          status: "Success",
          created_at: { gte: todayRange.start, lte: todayRange.end },
          ...(userId ? { client_id: userId } : {}),
        },
        select: { amount: true },
      }),
    ]);
    const collectedToday = paymentsToday.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return NextResponse.json({
      all,
      today,
      active,
      upcoming,
      past,
      metrics: {
        serviceToday,
        bookedToday,
        collectedToday,
        timezone: "Asia/Kolkata",
        paidLabel: "Collected today",
      },
    });
  } catch (error) {
    console.error("GET booking counts error:", error);
    return NextResponse.json({ message: "Failed to load booking counts", error: String(error) }, { status: 500 });
  }
}
